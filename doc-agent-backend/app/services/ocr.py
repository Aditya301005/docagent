import io
import fitz  # PyMuPDF
from PIL import Image, ImageEnhance
import pytesseract
from pytesseract import Output
from app.core.config import settings
from app.services.file_handler import infer_mime_type

# Explicitly bind tesseract command from Windows environment setup
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


def _enhance_image(image: Image.Image) -> Image.Image:
    """Enhance for OCR: convert to grayscale, increase contrast slightly."""
    image = image.convert("L")
    image = ImageEnhance.Contrast(image).enhance(1.5)
    return image


def run_ocr(file_bytes: bytes, mime_type: str) -> str:
    """
    Extract text from image or PDF bytes.
    For PDFs: iterates ALL pages and concatenates OCR text from each.
    Returns plain text string.
    """
    detected_mime = infer_mime_type(file_bytes, mime_type)

    if detected_mime == "application/pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        all_text_parts = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            mat = fitz.Matrix(200 / 72, 200 / 72)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_bytes))
            image = _enhance_image(image)
            text = pytesseract.image_to_string(image, lang="eng").strip()
            if text:
                all_text_parts.append(f"--- Page {page_num + 1} ---\n{text}")
        return "\n\n".join(all_text_parts)
    else:
        image = Image.open(io.BytesIO(file_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")
        image = _enhance_image(image)
        return pytesseract.image_to_string(image, lang="eng").strip()


def run_ocr_with_boxes(file_bytes: bytes, mime_type: str) -> list[dict]:
    """Returns list of {text, left, top, width, height, conf} for each word.
    For PDFs, runs on the first page only (used for layout analysis)."""
    detected_mime = infer_mime_type(file_bytes, mime_type)

    if detected_mime == "application/pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page = doc[0]
        mat = fitz.Matrix(200 / 72, 200 / 72)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_bytes))
    else:
        image = Image.open(io.BytesIO(file_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")

    image = _enhance_image(image)
    data = pytesseract.image_to_data(image, lang="eng", output_type=Output.DICT)

    results = []
    n_boxes = len(data["text"])

    for i in range(n_boxes):
        conf = int(data["conf"][i])
        text = data["text"][i].strip()

        if text and conf >= 0:
            results.append(
                {
                    "text": text,
                    "left": data["left"][i],
                    "top": data["top"][i],
                    "width": data["width"][i],
                    "height": data["height"][i],
                    "conf": conf,
                }
            )

    return results


def run_ocr_for_layoutlm(file_bytes: bytes, mime_type: str) -> dict:
    """
    Run Tesseract OCR and return the three inputs that LayoutLMv3Processor
    expects:
        - words  : list[str]           — one token per word
        - boxes  : list[list[int]]     — [x0, y0, x1, y1] normalised to 0-1000
        - image  : PIL.Image (RGB)     — the original (un-enhanced) page image

    Boxes are normalised per the LayoutLMv3 / LayoutLM convention where
    the full page width and height each map to 1000.
    """
    # Use the *un-enhanced* RGB image so the model sees real colours/layout.
    detected_mime = infer_mime_type(file_bytes, mime_type)
    if detected_mime == "application/pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page = doc[0]
        mat = fitz.Matrix(200 / 72, 200 / 72)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    else:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")

    img_w, img_h = image.size

    # Run OCR on an enhanced copy for better recognition accuracy.
    enhanced = _enhance_image(image.copy())
    data = pytesseract.image_to_data(enhanced, lang="eng", output_type=Output.DICT)

    words: list[str] = []
    boxes: list[list[int]] = []

    n = len(data["text"])
    for i in range(n):
        conf = int(data["conf"][i])
        text = data["text"][i].strip()
        if not text or conf < 0:
            continue

        left = data["left"][i]
        top = data["top"][i]
        width = data["width"][i]
        height = data["height"][i]

        # Normalise to [0, 1000] as required by LayoutLMv3
        x0 = max(0, min(1000, int(left * 1000 / img_w)))
        y0 = max(0, min(1000, int(top * 1000 / img_h)))
        x1 = max(0, min(1000, int((left + width) * 1000 / img_w)))
        y1 = max(0, min(1000, int((top + height) * 1000 / img_h)))

        words.append(text)
        boxes.append([x0, y0, x1, y1])

    return {"words": words, "boxes": boxes, "image": image}
