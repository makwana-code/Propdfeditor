from http.server import BaseHTTPRequestHandler
from email.parser import BytesParser
from email.policy import default
import json
import fitz


MAX_UPLOAD_BYTES = 4_000_000


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        doc = None
        try:
            length = int(self.headers.get("content-length", "0"))
            if length <= 0 or length > MAX_UPLOAD_BYTES:
                return self._json(413, {"error": "PDF must be smaller than 4 MB for this editor endpoint."})

            content_type = self.headers.get("content-type", "")
            if "multipart/form-data" not in content_type.lower():
                return self._json(400, {"error": "Expected multipart PDF upload."})

            raw = self.rfile.read(length)
            message = BytesParser(policy=default).parsebytes(
                b"Content-Type: " + content_type.encode("ascii") + b"\r\nMIME-Version: 1.0\r\n\r\n" + raw
            )

            pdf_bytes = None
            edits = None
            for part in message.iter_parts():
                name = part.get_param("name", header="content-disposition")
                payload = part.get_payload(decode=True) or b""
                if name == "file" or part.get_filename():
                    pdf_bytes = payload
                elif name == "edits":
                    edits = json.loads(payload.decode("utf-8"))

            if not pdf_bytes or not isinstance(edits, list) or not edits:
                return self._json(400, {"error": "Missing PDF or original-text edits."})

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            resolved = []

            # Resolve all selections before applying any redactions.
            for edit in edits:
                page_no = int(edit["page"]) - 1
                if page_no < 0 or page_no >= len(doc):
                    raise ValueError("Invalid page number.")

                page = doc[page_no]
                rect_data = edit.get("rect") or {}
                page_rect = page.rect
                target = fitz.Rect(
                    float(rect_data["x0"]) * page_rect.width,
                    float(rect_data["y0"]) * page_rect.height,
                    float(rect_data["x1"]) * page_rect.width,
                    float(rect_data["y1"]) * page_rect.height,
                )
                old_text = str(edit.get("originalText", "")).strip()
                if not old_text or target.is_empty or not target.is_valid:
                    raise ValueError("Invalid original text selection.")

                candidates = []
                for block in page.get_text("dict").get("blocks", []):
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            span_text = span.get("text", "").strip()
                            span_rect = fitz.Rect(span["bbox"])
                            if span_text == old_text:
                                candidates.append((span_rect, span))
                if not candidates:
                    raise ValueError("Original PDF text could not be matched exactly: " + old_text[:80])

                chosen_rect, span = min(
                    candidates,
                    key=lambda item: abs(item[0].x0 - target.x0) + abs(item[0].y0 - target.y0),
                )
                distance = abs(chosen_rect.x0 - target.x0) + abs(chosen_rect.y0 - target.y0)
                if not chosen_rect.intersects(target) and distance > 18:
                    raise ValueError("Text match was ambiguous; no changes were applied.")
                resolved.append((page_no, chosen_rect, span, edit))

            by_page = {}
            for entry in resolved:
                by_page.setdefault(entry[0], []).append(entry)

            for page_no, entries in by_page.items():
                page = doc[page_no]
                for _, source_rect, _, _ in entries:
                    page.add_redact_annot(source_rect, fill=(1, 1, 1), cross_out=False)

                page.apply_redactions(images=0, graphics=0, text=0)

                for _, source_rect, span, edit in entries:
                    replacement = str(edit.get("text", ""))
                    if not replacement:
                        continue

                    font_size = float(edit.get("size") or span.get("size", 10))
                    color_int = int(edit.get("color", span.get("color", 0)))
                    color = (
                        ((color_int >> 16) & 255) / 255,
                        ((color_int >> 8) & 255) / 255,
                        (color_int & 255) / 255,
                    )

                    box_data = edit.get("box") or {}
                    page_rect = page.rect
                    box = fitz.Rect(
                        float(box_data.get("x0", edit["rect"]["x0"])) * page_rect.width,
                        float(box_data.get("y0", edit["rect"]["y0"])) * page_rect.height,
                        float(box_data.get("x1", edit["rect"]["x1"])) * page_rect.width,
                        float(box_data.get("y1", edit["rect"]["y1"])) * page_rect.height,
                    )
                    box.x1 = max(box.x1, box.x0 + 4)
                    box.y1 = max(box.y1, box.y0 + font_size * 1.4)

                    source_font = span.get("font", "").lower()
                    font_name = "cour" if "mono" in source_font else (
                        "tiro" if any(term in source_font for term in ("times", "serif")) else "helv"
                    )
                    inserted = page.insert_textbox(
                        box,
                        replacement,
                        fontname=font_name,
                        fontsize=font_size,
                        color=color,
                        overlay=True,
                    )
                    if inserted < 0:
                        raise ValueError(
                            "Replacement text does not fit the selected PDF text area. "
                            "Increase the text box height or reduce the font size."
                        )

            output = doc.tobytes(garbage=4, deflate=True)
            doc.close()
            doc = None

            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Disposition", 'attachment; filename="edited-original-text.pdf"')
            self.send_header("Content-Length", str(len(output)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(output)
        except Exception as exc:
            self._json(422, {"error": str(exc)})
        finally:
            if doc is not None:
                doc.close()

    def _json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)
