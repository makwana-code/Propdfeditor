from http.server import BaseHTTPRequestHandler
from email.parser import BytesParser
from email.policy import default
import json
import re
import fitz


MAX_UPLOAD_BYTES = 4_000_000


def clean_text(value):
    # PDF.js and PyMuPDF can expose the same glyph run with different
    # whitespace, soft-hyphen and ligature representations.
    value = str(value or "").replace("\u00ad", "")
    value = value.replace("\ufb00", "ff").replace("\ufb01", "fi")
    value = value.replace("\ufb02", "fl").replace("\ufb03", "ffi")
    value = value.replace("\ufb04", "ffl")
    return re.sub(r"\s+", " ", value).strip()


def rect_distance(a, b):
    return abs(a.x0 - b.x0) + abs(a.y0 - b.y0)


def resolve_original_text(page, old_text, target):
    """Resolve a PDF.js hit against native PDF text, even across span splits."""
    wanted = clean_text(old_text)
    if not wanted:
        raise ValueError("Selected text is empty.")

    # Native text search works across many PyMuPDF span boundaries.
    try:
        matches = page.search_for(old_text, quads=False)
    except Exception:
        matches = []

    # Fallback: compare the selected geometry against native spans. A PDF.js
    # item can be one run while PyMuPDF reports several adjacent spans.
    spans = []
    for block in page.get_text("dict").get("blocks", []):
        for line in block.get("lines", []):
            line_spans = []
            for span in line.get("spans", []):
                text = clean_text(span.get("text", ""))
                rect = fitz.Rect(span["bbox"])
                if text and rect.intersects(target):
                    line_spans.append((rect, span, text))
            if line_spans:
                spans.append(line_spans)

    candidates = [(fitz.Rect(r), None) for r in matches if not fitz.Rect(r).is_empty]
    for line_spans in spans:
        line_spans.sort(key=lambda item: (round(item[0].y0, 1), item[0].x0))
        combined = ""
        selected = []
        for rect, span, text in line_spans:
            combined = (combined + " " + text).strip()
            selected.append((rect, span))
            if clean_text(combined) == wanted:
                union = fitz.Rect(selected[0][0])
                for item_rect, _ in selected[1:]:
                    union |= item_rect
                candidates.append((union, selected[0][1]))
                break
            # Do not let a long unrelated line grow without bound.
            if len(clean_text(combined)) > len(wanted) + 24:
                break

    # Geometry-first fallback: PDF.js text runs and native PDF spans often
    # differ in whitespace, ligatures, or run boundaries. If exact text matching
    # fails, use the actual selected rectangle to gather the native spans it covers.
    if not candidates:
        geometric = []
        for block in page.get_text("dict").get("blocks", []):
            for line in block.get("lines", []):
                selected_spans = []
                for candidate_span in line.get("spans", []):
                    candidate_rect = fitz.Rect(candidate_span.get("bbox", (0, 0, 0, 0)))
                    if candidate_rect.is_empty or not candidate_rect.intersects(target):
                        continue
                    overlap = candidate_rect & target
                    # Ignore incidental glyph touches at the edge of a hit box.
                    if overlap.get_area() < min(candidate_rect.get_area(), target.get_area()) * 0.12:
                        continue
                    selected_spans.append((candidate_rect, candidate_span))
                if selected_spans:
                    selected_spans.sort(key=lambda item: item[0].x0)
                    union = fitz.Rect(selected_spans[0][0])
                    for candidate_rect, _ in selected_spans[1:]:
                        union |= candidate_rect
                    # Keep only the spans that substantially overlap the target.
                    if union.intersects(target):
                        geometric.append((union, selected_spans[0][1]))
        if geometric:
            geometric.sort(key=lambda item: rect_distance(item[0], target))
            candidates.extend(geometric)

    if not candidates:
        raise ValueError(
            "Could not locate editable native PDF text in this selected area. "
            "Scanned or outlined text needs OCR/image replacement instead."
        )

    candidates.sort(key=lambda item: rect_distance(item[0], target))
    chosen, span = candidates[0]
    # page.search_for() returns the best exact rectangle but not its font span.
    # Recover the nearest overlapping native span so replacement inherits the
    # source font metrics, colour and baseline instead of silently defaulting.
    if span is None:
        nearest = []
        for block in page.get_text("dict").get("blocks", []):
            for line in block.get("lines", []):
                for candidate_span in line.get("spans", []):
                    candidate_rect = fitz.Rect(candidate_span.get("bbox", (0, 0, 0, 0)))
                    if candidate_rect.intersects(chosen):
                        overlap = candidate_rect & chosen
                        nearest.append((-(overlap.get_area()), rect_distance(candidate_rect, chosen), candidate_span))
        if nearest:
            nearest.sort(key=lambda item: (item[0], item[1]))
            span = nearest[0][2]
    if len(candidates) > 1 and rect_distance(candidates[1][0], target) + 1 < rect_distance(chosen, target):
        # The nearest geometric match wins; do not reject merely because the
        # same phrase occurs elsewhere in the document.
        pass
    if not chosen.intersects(target) and rect_distance(chosen, target) > max(24, target.width * 0.35):
        raise ValueError("Could not confidently match the selected text position. No changes were applied.")
    return chosen, span


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        doc = None
        try:
            length = int(self.headers.get("content-length", "0"))
            if length <= 0 or length > MAX_UPLOAD_BYTES:
                return self._json(413, {"error": "PDF upload is too large for this editor endpoint (maximum 4 MB)."})

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
                if name == "file":
                    pdf_bytes = payload
                elif name == "edits":
                    edits = json.loads(payload.decode("utf-8"))

            if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
                return self._json(400, {"error": "The uploaded file is not a valid PDF."})
            if not isinstance(edits, list) or not edits:
                return self._json(400, {"error": "No original-text edits were supplied."})

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            resolved = []

            # Resolve every selection before applying any redaction, so one
            # bad selection cannot leave a partially modified document.
            for edit in edits:
                page_no = int(edit["page"]) - 1
                if page_no < 0 or page_no >= len(doc):
                    raise ValueError("Invalid page number.")

                page = doc[page_no]
                rect_data = edit.get("rect") or {}
                page_rect = page.rect
                visible_rect = fitz.Rect(
                    float(rect_data["x0"]) * page_rect.width,
                    float(rect_data["y0"]) * page_rect.height,
                    float(rect_data["x1"]) * page_rect.width,
                    float(rect_data["y1"]) * page_rect.height,
                )
                # PDF.js reports coordinates in the displayed (rotated)
                # viewport; PyMuPDF text coordinates are unrotated.
                target = visible_rect * page.derotation_matrix if page.rotation else visible_rect
                target &= page.cropbox
                if target.is_empty or not target.is_valid:
                    raise ValueError("Selected text coordinates are outside the PDF page.")

                old_text = str(edit.get("originalText", ""))
                source_rect, span = resolve_original_text(page, old_text, target)
                resolved.append((page_no, source_rect, span, edit))

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

                    font_size = float(edit.get("size") or (span or {}).get("size", 10))
                    color_int = int(edit.get("color", (span or {}).get("color", 0)))
                    color = (
                        ((color_int >> 16) & 255) / 255,
                        ((color_int >> 8) & 255) / 255,
                        (color_int & 255) / 255,
                    )

                    # Use the native text span's baseline when available. The UI
                    # overlay box is only a visual editor; it must not redefine the
                    # source PDF coordinates during export.
                    source_font = ((span or {}).get("font", "")).lower()
                    font_name = "cour" if "mono" in source_font else (
                        "tiro" if any(term in source_font for term in ("times", "serif")) else "helv"
                    )
                    origin = (span or {}).get("origin")
                    baseline_y = float(origin[1]) if origin and len(origin) > 1 else source_rect.y1 - max(1, font_size * 0.18)
                    inserted = page.insert_text(
                        (source_rect.x0, baseline_y), replacement,
                        fontname=font_name, fontsize=font_size,
                        color=color, overlay=True,
                    )
                    if inserted <= 0:
                        raise ValueError("The original text was removed but the replacement could not be inserted.")

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
