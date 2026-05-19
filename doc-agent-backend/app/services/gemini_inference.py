"""
gemini_inference.py
--------------------
Inference backend powered by Google Gemini API (gemini-2.0-flash).

Replaces the local ONNX / LayoutLMv3 models for:
  • Document classification
  • Named-entity extraction
  • Question answering (VQA)

The API is called with both the raw image (base64) AND the OCR text so
Gemini can cross-reference visual layout with extracted text for higher
accuracy.

All public functions return the same dict/list shapes as the old ONNX
functions so the rest of the codebase requires no changes.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import re
from typing import Any

import google.generativeai as genai
from PIL import Image

logger = logging.getLogger(__name__)

# ── Supported document classes (same list as the old classifier) ────────────
CLASS_NAMES = [
    "letter", "memo", "email", "filefolder", "form", "handwritten",
    "invoice", "advertisement", "budget", "news", "presentation",
    "scientific_publication", "questionnaire", "resume",
    "scientific_report", "specification",
]

# ── Gemini model to use ─────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-1.5-flash"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _init_client(api_key: str) -> genai.GenerativeModel:
    """Configure the SDK and return a model instance."""
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(GEMINI_MODEL)


def _get_content_parts(file_bytes: bytes, mime_type: str) -> list[dict]:
    """
    Convert a file to a list of Gemini inline-data image parts.
    - For PDFs: every page is rendered and returned as a separate JPEG part.
      This lets Gemini see and understand ALL pages of multi-page documents.
    - For images: returns a single part.
    """
    parts = []

    if mime_type == "application/pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            # Render every page at 150 DPI — good quality without huge payloads
            mat = fitz.Matrix(150 / 72, 150 / 72)
            for page_num in range(len(doc)):
                pix = doc[page_num].get_pixmap(matrix=mat)
                jpeg_bytes = pix.tobytes("jpeg")
                b64 = base64.b64encode(jpeg_bytes).decode("utf-8")
                parts.append({"inline_data": {"mime_type": "image/jpeg", "data": b64}})
            logger.info("PDF split into %d page image(s) for Gemini.", len(parts))
        except Exception as exc:
            logger.warning("PDF→images conversion failed: %s — sending raw bytes.", exc)
            b64 = base64.b64encode(file_bytes).decode("utf-8")
            parts.append({"inline_data": {"mime_type": "application/pdf", "data": b64}})
    else:
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        parts.append({"inline_data": {"mime_type": mime_type, "data": b64}})

    return parts


def _select_relevant_pages(
    ocr_text: str,
    question: str,
    max_pages: int = 10,
) -> tuple[list[int], str]:
    """
    For large multi-page documents: score each page by keyword relevance to the
    question and return the indices (0-based) of the top pages + their combined
    OCR text.

    Always includes:
      - First 2 pages  (cover / table of contents)
      - Last 2 pages   (references / conclusion)
      - Top scored pages up to max_pages total
    """
    # Split OCR into per-page chunks using the markers added by run_ocr()
    page_chunks = re.split(r"---\s*Page\s+\d+\s*---", ocr_text)
    # First split element before any marker may be empty — filter
    page_chunks = [p.strip() for p in page_chunks if p.strip()]
    total = len(page_chunks)

    if total == 0:
        return [], ocr_text  # No page markers — return everything

    if total <= max_pages:
        # Small doc: just use all pages
        return list(range(total)), ocr_text

    # ── Keyword scoring ──────────────────────────────────────────────────────
    # Tokenize question into meaningful words (≥3 chars, ignore stopwords)
    stopwords = {
        "the", "and", "for", "that", "this", "with", "are", "what", "how",
        "when", "where", "who", "why", "was", "were", "has", "have", "can",
        "will", "please", "tell", "give", "list", "show", "describe", "explain",
        "about", "from", "all", "any", "its", "not", "but",
    }
    q_words = [
        w.lower() for w in re.findall(r"\b\w+\b", question)
        if len(w) >= 3 and w.lower() not in stopwords
    ]

    scores = []
    for chunk in page_chunks:
        chunk_lower = chunk.lower()
        # Score = sum of keyword hits (with bonus for exact phrase matches)
        score = sum(chunk_lower.count(w) for w in q_words)
        # Boost for exact question sub-phrases
        for n in range(2, min(5, len(q_words) + 1)):
            phrase = " ".join(q_words[:n])
            if phrase in chunk_lower:
                score += 5 * n
        scores.append(score)

    # ── Always include first 2 + last 2 pages ──────────────────────────────
    always_include = set(range(min(2, total))) | {
        i for i in range(max(0, total - 2), total)
    }

    # ── Pick top scored pages until we hit max_pages ────────────────────────
    ranked = sorted(range(total), key=lambda i: scores[i], reverse=True)
    selected = set(always_include)
    for idx in ranked:
        if len(selected) >= max_pages:
            break
        selected.add(idx)

    selected_sorted = sorted(selected)
    logger.info(
        "RAG: question=%r → selected pages %s of %d total",
        question[:60], selected_sorted, total,
    )

    # Build the filtered OCR text with page labels
    filtered_text_parts = [
        f"--- Page {i + 1} ---\n{page_chunks[i]}"
        for i in selected_sorted
    ]
    return selected_sorted, "\n\n".join(filtered_text_parts)


def _get_pdf_page_parts(file_bytes: bytes, page_indices: list[int]) -> list[dict]:
    """
    Render only the specified page indices (0-based) of a PDF as Gemini image parts.
    """
    parts = []
    try:
        import fitz
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        mat = fitz.Matrix(150 / 72, 150 / 72)
        for idx in page_indices:
            if 0 <= idx < len(doc):
                pix = doc[idx].get_pixmap(matrix=mat)
                b64 = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")
                parts.append({"inline_data": {"mime_type": "image/jpeg", "data": b64}})
    except Exception as exc:
        logger.warning("Selective PDF page render failed: %s", exc)
    return parts


def _parse_json_from_response(text: str) -> Any:
    """
    Extract the first JSON object/array from a Gemini response string.
    Gemini sometimes wraps JSON in markdown fences — this strips them.
    """
    # Strip markdown code fences if present
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find the first {...} or [...] block
    match = re.search(r"(\{[\s\S]+\}|\[[\s\S]+\])", text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from Gemini response: {text[:300]}")


# ---------------------------------------------------------------------------
# Public inference functions
# ---------------------------------------------------------------------------

def classify_document_gemini(
    file_bytes: bytes,
    ocr_text: str,
    mime_type: str,
    api_key: str,
) -> dict:
    """
    Classify a document using Gemini multimodal.

    Returns:
        {
            "class": str,          # one of CLASS_NAMES
            "confidence": float,   # 0.0 – 1.0
            "all_scores": dict,    # label → score (optional, best-effort)
            "source": "gemini"
        }
    """
    model = _init_client(api_key)
    image_parts = _get_content_parts(file_bytes, mime_type)

    class_list = ", ".join(CLASS_NAMES)
    # Use full OCR text — no arbitrary cap
    ocr_snippet = (ocr_text or "")

    prompt = f"""You are an expert document classifier.

Analyze ALL the document page images provided and the OCR text below, then classify the document
into EXACTLY ONE of the following categories:
{class_list}

OCR text (from all pages):
\"\"\"
{ocr_snippet}
\"\"\"

Respond with ONLY valid JSON in this exact format (no extra text):
{{
  "class": "<category_name>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<one sentence explanation>"
}}"""

    try:
        response = model.generate_content([*image_parts, prompt])
        data = _parse_json_from_response(response.text)

        doc_class = str(data.get("class", "unknown")).lower().replace(" ", "_")
        # Validate against known list
        if doc_class not in CLASS_NAMES:
            # Try fuzzy match — pick closest
            for name in CLASS_NAMES:
                if name in doc_class or doc_class in name:
                    doc_class = name
                    break
            else:
                doc_class = "unknown"

        confidence = float(data.get("confidence", 0.85))
        confidence = max(0.0, min(1.0, confidence))

        return {
            "class": doc_class,
            "confidence": round(confidence, 4),
            "reasoning": data.get("reasoning", ""),
            "source": "gemini",
        }

    except Exception as exc:
        logger.error("Gemini classification failed: %s", exc)
        return {"class": "unknown", "confidence": 0.0, "source": "gemini_error"}


def extract_entities_gemini(
    file_bytes: bytes,
    ocr_text: str,
    mime_type: str,
    api_key: str,
) -> list[dict]:
    """
    Extract named entities from a document using Gemini multimodal.

    Returns a list of:
        {"type": str, "value": str, "confidence": float}

    Supported types: date, total, company, address, phone, email,
                     invoice_number, tax, line_item, name, reference
    """
    model = _init_client(api_key)
    image_parts = _get_content_parts(file_bytes, mime_type)

    # Use full OCR text across all pages
    ocr_snippet = (ocr_text or "")

    prompt = f"""You are an expert document information extractor.

Analyze ALL document page images and OCR text below. Extract ALL important named
entities and key-value pairs present anywhere in the document (all pages).

OCR text (from all pages):
\"\"\"
{ocr_snippet}
\"\"\"

Extract entities of these types (use only what is present):
  - date          (any dates: invoice date, due date, delivery date, etc.)
  - total         (monetary totals, subtotals, grand totals, amounts)
  - company       (company names, vendor names, client names)
  - address       (full or partial addresses)
  - phone         (phone numbers, fax numbers)
  - email         (email addresses)
  - invoice_number (invoice #, PO #, order #, reference #)
  - tax           (tax amounts, VAT, GST)
  - name          (person names, signatories)
  - line_item     (individual line items with quantity/price)
  - reference     (any other important reference numbers or codes)

Respond with ONLY a valid JSON array (no extra text):
[
  {{"type": "<entity_type>", "value": "<extracted_value>", "confidence": <0.0-1.0>}},
  ...
]

If no entities are found, return an empty array: []"""

    try:
        response = model.generate_content([*image_parts, prompt])
        data = _parse_json_from_response(response.text)

        if not isinstance(data, list):
            logger.warning("Gemini NER returned non-list: %s", type(data))
            return []

        entities = []
        for item in data:
            if not isinstance(item, dict):
                continue
            entity_type = str(item.get("type", "unknown")).lower().strip()
            value = str(item.get("value", "")).strip()
            confidence = float(item.get("confidence", 0.85))
            confidence = max(0.0, min(1.0, confidence))

            if value:  # skip empty values
                entities.append({
                    "type": entity_type,
                    "value": value,
                    "confidence": round(confidence, 4),
                })

        return entities

    except Exception as exc:
        logger.error("Gemini entity extraction failed: %s", exc)
        return []


def answer_question_gemini(
    file_bytes: bytes,
    ocr_text: str,
    question: str,
    mime_type: str,
    api_key: str,
) -> dict:
    """
    Answer a question about a document using Gemini multimodal.

    Strategy:
      - For PDFs: send the raw PDF as a native application/pdf part so Gemini
        can read ALL pages with its own internal OCR engine (supports up to 300
        pages natively). Supplemented with Tesseract OCR text for reliability.
      - For images: send the image inline as before.

    Returns:
        {"answer": str, "confidence": float, "source": "gemini"}
    """
    model = _init_client(api_key)

    # ── Build content parts ──────────────────────────────────────────────────
    if mime_type == "application/pdf":
        # Send raw PDF directly — Gemini natively understands PDFs, reads all
        # pages with its own OCR. No conversion to JPEGs, no page selection.
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        doc_part = {"inline_data": {"mime_type": "application/pdf", "data": b64}}
        content_parts = [doc_part]
        context_note = "The full PDF document has been provided above."
    else:
        # Single image
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        doc_part = {"inline_data": {"mime_type": mime_type, "data": b64}}
        content_parts = [doc_part]
        context_note = "The document image has been provided above."

    # Include Tesseract OCR as supplementary text context (helps with accuracy)
    ocr_context = ""
    if ocr_text and ocr_text.strip():
        # Cap OCR at 15000 chars as supplementary context only
        ocr_snippet = ocr_text[:15000]
        ocr_context = f"""
Supplementary OCR text (use this alongside the document above):
\"\"\"
{ocr_snippet}
\"\"\""""

    prompt = f"""You are an expert document analyst and question-answering system.

{context_note}
{ocr_context}

INSTRUCTIONS:
- Read the ENTIRE document carefully, including all pages from beginning to end.
- Answer the question based on information found ANYWHERE in the document.
- Do NOT give up if information seems to be on a later page — read all pages.
- For section-based questions (References, Conclusion, Introduction, etc.), locate that section and extract its content.
- If OCR text is imperfect, use the visual document to cross-reference.
- Provide complete, thorough answers. Do not truncate lists or sections.
- Only say information is absent if it genuinely does not exist in the document.

Question: {question}

Respond with ONLY valid JSON (no extra text):
{{
  "answer": "<complete, thorough answer drawn from the document>",
  "confidence": <float 0.0-1.0>,
  "found_in_document": <true or false>
}}

If the information is truly absent from the entire document, set answer to "" and found_in_document to false."""

    try:
        response = model.generate_content([*content_parts, prompt])
        data = _parse_json_from_response(response.text)

        answer = str(data.get("answer", "")).strip()
        confidence = float(data.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))

        return {
            "answer": answer,
            "confidence": round(confidence, 4),
            "found_in_document": bool(data.get("found_in_document", bool(answer))),
            "source": "gemini",
        }

    except Exception as exc:
        logger.error("Gemini Q&A failed: %s", exc)
        return {"answer": "", "confidence": 0.0, "source": "gemini_error"}
