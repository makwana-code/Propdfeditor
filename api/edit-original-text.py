from http.server import BaseHTTPRequestHandler
from email.parser import BytesParser
from email.policy import default
import json
import re
import difflib
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


def rect_area(rect):
    # Compatible with PyMuPDF Rect versions without get_area().
    return max(0.0, rect.width) * max(0.0, rect.height)


def resolve_original_text(page, old_text, target):
    """Resolve PDF.js text geometry to native PDF spans before trying text search."""
    wanted = clean_text(old_text)
    if not wanted:
        raise ValueError("Selected text is empty.")

    candidates = []
    target_area = max(1.0, rect_area(target))

    # The browser's text layer may combine/split PDF text runs differently
    # from PyMuPDF. Resolve the selected on-screen rectangle against the
    # actual native spans first; this avoids matching a repeated phrase elsewhere.
    for block in page.get_text("dict").get("blocks", []):
        for line in block.get("lines", []):
            selected = []
            for span in line.get("spans", []):
                rect = fitz.Rect(span.get("bbox", (0, 0, 0, 0)))
                if rect.is_empty or not rect.intersects(target):
                    continue
                overlap = rect & target
                if rect_area(overlap) < min(rect_area(rect), target_area) * 0.035:
                    continue
                selected.append((rect, span, overlap))
            if not selected:
                continue
            selected.sort(key=lambda item: item[0].x0)
            union = fitz.Rect(selected[0][0])
            parts = []
            previous = None
            for rect, span, _ in selected:
                if previous is not None:
                    gap = rect.x0 - previous.x1
                    if gap > max(rect.height, previous.height) * 0.18:
                        parts.append(" ")
                parts.append(str(span.get("text", "")))
                union |= rect
                previous = rect
            extracted = clean_text("".join(parts))
            overlap_area = sum(rect_area(item[2]) for item in selected)
            coverage = min(1.0, overlap_area / target_area)
            similarity = difflib.SequenceMatcher(None, clean_text(extracted).lower(), wanted.lower()).ratio()
            distance = rect_distance(union, target)
            # Geometry is the primary signal; text similarity breaks ties.
            score = coverage * 4.0 + similarity * 2.0 - distance / max(20.0, target.width + target.height)
            candidates.append((score, union, selected[0][1], similarity, coverage))

    if candidates:
        candidates.sort(key=lambda item: item[0], reverse=True)
        score, chosen, span, similarity, coverage = candidates[0]
        if coverage >= 0.22 and (similarity >= 0.35 or coverage >= 0.72):
            return chosen, span

    # Exact native text search remains a fallback for documents whose text
    # geometry differs substantially from the PDF.js viewport coordinates.
    try:
        matches = page.search_for(old_text, quads=False)
    except Exception:
        matches = []
    exact = [(fitz.Rect(rect), None) for rect in matches if not fitz.Rect(rect).is_empty]
    if exact:
        exact.sort(key=lambda item: rect_distance(item[0], target))
        chosen, _ = exact[0]
        nearest = []
        for block in page.get_text("dict").get("blocks", []):
            for line in block.get("lines", []):
                for candidate_span in line.get("spans", []):
                    candidate_rect = fitz.Rect(candidate_span.get("bbox", (0, 0, 0, 0)))
                    if candidate_rect.intersects(chosen):
                        overlap = candidate_rect & chosen
                        nearest.append((-rect_area(overlap), rect_distance(candidate_rect, chosen), candidate_span))
        span = None
        if nearest:
            nearest.sort(key=lambda item: (item[0], item[1]))
            span = nearest[0][2]
        if chosen.intersects(target) or rect_distance(chosen, target) <= max(24, target.width * 0.35):
            return chosen, span

    if candidates:
        candidates.sort(key=lambda item: item[0], reverse=True)
        score, chosen, span, similarity, coverage = candidates[0]
        if coverage >= 0.12:
            return chosen, span

    raise ValueError(
        "Could not confidently locate the selected native PDF text. "
        "Scanned or outlined text needs OCR/image replacement instead."
    )



def resolve_embedded_font(doc, page, source_span, requested_font, bold, italic):
    """Reuse an embedded PDF font when the requested family is present in the file."""
    def normal(value):
        value = re.sub(r"^[A-Z]{6,8}\\+", "", str(value or ""))
        return re.sub(r"[^a-z0-9]", "", value.lower())

    wanted = normal(requested_font)
    if not wanted:
        wanted = normal((source_span or {}).get("font", ""))
    if not wanted:
        return None

    candidates = []
    seen = set()
    try:
        for page_index in range(len(doc)):
            for entry in doc[page_index].get_fonts(full=True):
                xref = int(entry[0])
                if not xref or xref in seen:
                    continue
                seen.add(xref)
                basefont = str(entry[3] or entry[4] or "")
                base = normal(basefont)
                if not base or not (wanted in base or base in wanted):
                    continue
                name = basefont.lower()
                has_bold = bool(re.search(r"bold|demi|heavy|black|semibold", name))
                has_italic = bool(re.search(r"italic|oblique", name))
                score = (4 if has_bold == bool(bold) else 0) + (4 if has_italic == bool(italic) else 0)
                candidates.append((score, xref))
    except Exception:
        return None

    candidates.sort(reverse=True)
    for _, xref in candidates:
        try:
            extracted = doc.extract_font(xref)
            font_bytes = extracted[3] if extracted and len(extracted) > 3 else None
            if not font_bytes:
                continue
            alias = "PDFEditFont" + str(xref)
            page.insert_font(fontname=alias, fontbuffer=font_bytes)
            return alias
        except Exception:
            continue
    return None


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
                # Preserve the sampled page background when replacing text.
                # This avoids hard-coded white patches on tinted forms/tables.
                mask = str(edit.get("maskColor") or "#ffffff").lstrip("#")
                if len(mask) != 6 or not re.fullmatch(r"[0-9a-fA-F]{6}", mask):
                    mask = "ffffff"
                mask_rgb = tuple(int(mask[i:i + 2], 16) / 255 for i in (0, 2, 4))
                resolved.append((page_no, source_rect, span, edit, mask_rgb))

            by_page = {}
            for entry in resolved:
                by_page.setdefault(entry[0], []).append(entry)

            for page_no, entries in by_page.items():
                page = doc[page_no]
                for _, source_rect, _, _, mask_rgb in entries:
                    page.add_redact_annot(source_rect, fill=mask_rgb, cross_out=False)
                page.apply_redactions(images=0, graphics=0, text=0)

                for _, source_rect, span, edit, _mask_rgb in entries:
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

                    requested_font = str(edit.get("font") or edit.get("sourceFontFamily") or (span or {}).get("font", ""))
                    bold = bool(edit.get("bold", False))
                    italic = bool(edit.get("italic", False))
                    # Prefer the actual embedded face from this PDF. This keeps
                    # the source document's typography instead of substituting
                    # Helvetica for every unrecognised family.
                    font_name = resolve_embedded_font(doc, page, span, requested_font, bold, italic)
                    if not font_name:
                        is_mono = any(term in requested_font.lower() for term in ("courier", "mono", "consolas"))
                        is_times = any(term in requested_font.lower() for term in ("times", "cambria", "georgia", "garamond", "palatino", "serif"))
                        family_prefix = "cour" if is_mono else ("ti" if is_times else "helv")
                        font_name = {
                            ("cour", False, False): "cour",
                            ("cour", True, False): "cobo",
                            ("cour", False, True): "coit",
                            ("cour", True, True): "cobi",
                            ("ti", False, False): "tiro",
                            ("ti", True, False): "tibo",
                            ("ti", False, True): "tiit",
                            ("ti", True, True): "tibi",
                            ("helv", False, False): "helv",
                            ("helv", True, False): "hebo",
                            ("helv", False, True): "heit",
                            ("helv", True, True): "hebi",
                        }[(family_prefix, bold, italic)]

                    box = edit.get("box") or {}
                    page_rect = page.rect
                    destination_visible = fitz.Rect(
                        float(box.get("x0", edit["rect"]["x0"])) * page_rect.width,
                        float(box.get("y0", edit["rect"]["y0"])) * page_rect.height,
                        float(box.get("x1", edit["rect"]["x1"])) * page_rect.width,
                        float(box.get("y1", edit["rect"]["y1"])) * page_rect.height,
                    )
                    destination = destination_visible * page.derotation_matrix if page.rotation else destination_visible
                    destination &= page.cropbox
                    if destination.is_empty:
                        raise ValueError("Replacement text box is outside the PDF page.")

                    # Allow text to flow to the right and down within the page,
                    # just as a word processor does, while keeping the original
                    # point size whenever the available area is sufficient.
                    available = fitz.Rect(destination)
                    explicit_lines = replacement.splitlines() or [replacement]
                    required_width = max(
                        [fitz.get_text_length(line, fontname=font_name, fontsize=font_size) for line in explicit_lines if line]
                        or [font_size]
                    )
                    required_height = max(font_size * 1.45, len(explicit_lines) * font_size * 1.25)
                    available.x1 = max(available.x1, min(page.cropbox.x1, available.x0 + max(source_rect.width, font_size * 2, required_width + font_size * 0.3)))
                    available.y1 = max(available.y1, min(page.cropbox.y1, available.y0 + max(destination.height, required_height)))
                    align_value = {"left": 0, "center": 1, "right": 2}.get(str(edit.get("align", "left")).lower(), 0)
                    inserted = -1
                    chosen_size = font_size
                    for attempt in range(28):
                        inserted = page.insert_textbox(
                            available, replacement,
                            fontname=font_name, fontsize=chosen_size,
                            color=color, align=align_value,
                            lineheight=1.12, overlay=True,
                        )
                        if inserted >= 0:
                            break
                        chosen_size *= 0.94
                    if inserted < 0:
                        raise ValueError("The replacement text does not fit on the page. Shorten the text or use a smaller font size.")

                    if bool(edit.get("underline", False)):
                        # Underline each rendered line using the same baseline
                        # metrics as the inserted text.
                        line_height = chosen_size * 1.12
                        for line_index, line_text in enumerate(replacement.splitlines() or [replacement]):
                            if not line_text:
                                continue
                            text_width = fitz.get_text_length(line_text, fontname=font_name, fontsize=chosen_size)
                            baseline = available.y0 + chosen_size * (1.02 + line_index * 1.12)
                            if align_value == 1:
                                line_x = available.x0 + max(0, (available.width - text_width) / 2)
                            elif align_value == 2:
                                line_x = available.x1 - text_width
                            else:
                                line_x = available.x0
                            page.draw_line((line_x, baseline), (min(available.x1, line_x + text_width), baseline),
                                           color=color, width=max(0.35, chosen_size * 0.045), overlay=True)

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
