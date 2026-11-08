from http.server import BaseHTTPRequestHandler
import json
import fitz

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("content-length", "0"))
            if length <= 0 or length > 4_000_000:
                return self._json(413, {"error": "PDF must be smaller than 4 MB for this editor endpoint."})
            raw = self.rfile.read(length)
            boundary = self.headers.get("content-type", "").split("boundary=")[-1].encode()
            if not boundary:
                return self._json(400, {"error": "Expected multipart PDF upload."})
            parts = raw.split(b"--" + boundary)
            pdf_bytes = None
            edits = None
            for part in parts:
                if b"filename=" in part and b"application/pdf" in part:
                    pdf_bytes = part.split(b"\r\n\r\n", 1)[1].rsplit(b"\r\n", 1)[0]
                elif b'name="edits"' in part:
                    payload = part.split(b"\r\n\r\n", 1)[1].rsplit(b"\r\n", 1)[0]
                    edits = json.loads(payload.decode("utf-8"))
            if not pdf_bytes or not isinstance(edits, list) or not edits:
                return self._json(400, {"error": "Missing PDF or original-text edits."})
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            # Resolve every edit against an actual selectable text span before mutating anything.
            resolved = []
            for edit in edits:
                page_no = int(edit["page"]) - 1
                if page_no < 0 or page_no >= len(doc):
                    raise ValueError("Invalid page number.")
                page = doc[page_no]
                rect = edit.get("rect", {})
                page_rect = page.rect\n                target = fitz.Rect(float(rect["x0"])*page_rect.width, float(rect["y0"])*page_rect.height, float(rect["x1"])*page_rect.width, float(rect["y1"])*page_rect.height)
                old_text = str(edit.get("originalText", "")).strip()
                if not old_text or target.is_empty or not target.is_valid:
                    raise ValueError("Invalid original text selection.")
                candidates = []
                for block in page.get_text("dict")["blocks"]:
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            span_text = span.get("text", "").strip()
                            span_rect = fitz.Rect(span["bbox"])
                            if span_text == old_text or old_text in span_text or span_text in old_text:
                                candidates.append((span_rect, span))
                if not candidates:
                    raise ValueError("Original PDF text could not be matched: " + old_text[:80])
                chosen_rect, span = min(candidates, key=lambda item: abs(item[0].x0-target.x0)+abs(item[0].y0-target.y0))
                if chosen_rect.intersects(target) is False and abs(chosen_rect.x0-target.x0)+abs(chosen_rect.y0-target.y0) > 12:
                    raise ValueError("Text match was ambiguous; no changes were applied.")
                resolved.append((page_no, chosen_rect, span, edit))
            # Apply redactions per page in a single pass so overlapping edits do not erase each other.
            by_page = {}
            for page_no, rect, span, edit in resolved:
                by_page.setdefault(page_no, []).append((rect, span, edit))
            for page_no, entries in by_page.items():
                page = doc[page_no]
                for rect, span, edit in entries:
                    page.add_redact_annot(rect, fill=(1, 1, 1), cross_out=False)
                page.apply_redactions(images=0, graphics=0, text=0)
                for rect, span, edit in entries:
                    replacement = str(edit.get("text", ""))
                    if not replacement:
                        continue
                    font_size = float(edit.get("size", span.get("size", 10)))
                    color_int = int(edit.get("color", span.get("color", 0)))
                    color = ((color_int >> 16 & 255)/255, (color_int >> 8 & 255)/255, (color_int & 255)/255)
                    # Keep the source run's dimensions and use its baseline-aligned font size.
                    box_data = edit.get("box", {})\n                    box = fitz.Rect(float(box_data.get("x0", edit["rect"]["x0"]))*page.rect.width, float(box_data.get("y0", edit["rect"]["y0"]))*page.rect.height, float(box_data.get("x1", edit["rect"]["x1"]))*page.rect.width, float(box_data.get("y1", edit["rect"]["y1"]))*page.rect.height)\n                    box.x1 = max(box.x1, box.x0 + 4)\n                    box.y1 = max(box.y1, box.y0 + font_size*1.25)
                    font_name = "cour" if "mono" in span.get("font", "").lower() else ("tiro" if any(k in span.get("font", "").lower() for k in ("times","serif")) else "helv")
                    inserted = page.insert_textbox(box, replacement, fontname=font_name, fontsize=font_size, color=color, overlay=True)\n                    if inserted < 0:\n                        raise ValueError("Replacement text does not fit the selected PDF text area. Increase the text box height or reduce the font size.")
            output = doc.tobytes(garbage=4, deflate=True)
            doc.close()
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Disposition", 'attachment; filename="edited-original-text.pdf"')
            self.send_header("Content-Length", str(len(output)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(output)
        except Exception as exc:
            self._json(422, {"error": str(exc)})

    def _json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
