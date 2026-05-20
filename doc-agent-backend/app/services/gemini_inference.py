"""
gemini_inference.py
--------------------
Inference backend powered by Google Gemini API (gemini-2.5-flash).

Uses the new `google-genai` SDK (replaces the deprecated `google-generativeai`).

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

from google import genai
from google.genai import types as genai_types

logger = logging.getLogger(__name__)

# ── Supported document classes (same list as the old classifier) ────────────
CLASS_NAMES = [
    "letter", "memo", "email", "filefolder", "form", "handwritten",
    "invoice", "advertisement", "budget", "news", "presentation",
    "scientific_publication", "questionnaire", "resume",
    "scientific_report", "specification",
]

# ── Gemini model to use ─────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-2.5-flash"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _init_client(api_key: str) -> genai.Client:
    """Configure the SDK and return a client instance."""
    return genai.Client(api_key=api_key)


def _get_content_parts(file_bytes: bytes, mime_type: str) -> list:
    """
    Convert a file to a list of Gemini inline-data image parts.
    - For PDFs: every page is rendered and returned as a separate JPEG part.
    - For images: returns a single part.
    """
    parts = []

    if mime_type == "application/pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            mat = fitz.Matrix(150 / 72, 150 / 72)
            for page_num in range(len(doc)):
                pix = doc[page_num].get_pixmap(matrix=mat)
                jpeg_bytes = pix.tobytes("jpeg")
                parts.append(
                    genai_types.Part.from_bytes(data=jpeg_bytes, mime_type="image/jpeg")
                )
            logger.info("PDF split into %d page image(s) for Gemini.", len(parts))
        except Exception as exc:
            logger.warning("PDF→images conversion failed: %s — sending raw bytes.", exc)
            parts.append(
                genai_types.Part.from_bytes(data=file_bytes, mime_type="application/pdf")
            )
    else:
        parts.append(
            genai_types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        )

    return parts


def _parse_json_from_response(text: str) -> Any:
    """
    Extract the first JSON object/array from a Gemini response string.
    Gemini sometimes wraps JSON in markdown fences — this strips them.
    """
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

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
    client = _init_client(api_key)
    image_parts = _get_content_parts(file_bytes, mime_type)

    class_list = ", ".join(CLASS_NAMES)
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
        contents = [*image_parts, prompt]
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
        )
        data = _parse_json_from_response(response.text)

        doc_class = str(data.get("class", "unknown")).lower().replace(" ", "_")
        if doc_class not in CLASS_NAMES:
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
    """
    client = _init_client(api_key)
    image_parts = _get_content_parts(file_bytes, mime_type)

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
        contents = [*image_parts, prompt]
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
        )
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

            if value:
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

    Returns:
        {"answer": str, "confidence": float, "source": "gemini"}
    """
    client = _init_client(api_key)

    # ── Build content parts ──────────────────────────────────────────────────
    if mime_type == "application/pdf":
        doc_part = genai_types.Part.from_bytes(data=file_bytes, mime_type="application/pdf")
        content_parts = [doc_part]
        context_note = "The full PDF document has been provided above."
    else:
        doc_part = genai_types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        content_parts = [doc_part]
        context_note = "The document image has been provided above."

    ocr_context = ""
    if ocr_text and ocr_text.strip():
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
        contents = [*content_parts, prompt]
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
        )
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
