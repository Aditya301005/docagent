"""
gemini_inference.py
-----------------------
Inference backend powered by Google Gemini (gemini-2.5-flash).

Replaces OpenRouter to process text and multimodal images.
"""

from __future__ import annotations
import base64
import json
import json_repair
import logging
import re
import httpx
from typing import Any

logger = logging.getLogger(__name__)

# Base Gemini URL pattern
GEMINI_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
MODEL_NAME = "gemini-2.5-flash"

CLASS_NAMES = [
    "letter", "memo", "email", "filefolder", "form", "handwritten",
    "invoice", "advertisement", "budget", "news", "presentation",
    "scientific_publication", "questionnaire", "resume",
    "scientific_report", "specification",
]

def _parse_json_from_response(text: str) -> Any:
    """Extract JSON from LLM response, handling markdown fences and broken JSON using json_repair."""
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
        
    try:
        return json_repair.loads(text)
    except Exception:
        pass

    match = re.search(r"(\{[\s\S]+\}|\[[\s\S]+\])", text)
    if match:
        try:
            return json_repair.loads(match.group(1))
        except Exception:
            pass
            
    raise ValueError(f"Could not parse JSON from Gemini response: {text[:300]}")

def _call_gemini_generic(
    prompt: str,
    system_message: str,
    api_key: str,
    file_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
) -> dict:
    """Call Google Gemini (text or vision) and return parsed JSON."""
    try:
        parts = []
        if file_bytes:
            if mime_type == "application/pdf":
                # Convert PDF first page to image for Gemini vision fallback
                try:
                    import fitz
                    doc = fitz.open(stream=file_bytes, filetype="pdf")
                    mat = fitz.Matrix(120 / 72, 120 / 72)
                    for idx in range(min(3, len(doc))):
                        pix = doc[idx].get_pixmap(matrix=mat)
                        b64 = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")
                        parts.append({
                            "inlineData": {
                                "mimeType": "image/jpeg",
                                "data": b64
                            }
                        })
                except Exception as exc:
                    logger.warning("PDF vision render failed in gemini_inference: %s", exc)
            else:
                try:
                    b64 = base64.b64encode(file_bytes).decode("utf-8")
                    parts.append({
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": b64
                        }
                    })
                except Exception as exc:
                    logger.warning("Image base64 encoding failed: %s", exc)

        parts.append({"text": prompt})

        payload = {
            "systemInstruction": {
                "parts": [{"text": system_message}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": parts
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 8192,
            }
        }

        url = GEMINI_URL_TEMPLATE.format(model=MODEL_NAME, key=api_key)

        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                with httpx.Client() as client:
                    response = client.post(url, json=payload, timeout=120.0)
                    response.raise_for_status()
                    
                    data = response.json()
                    if "candidates" not in data or not data["candidates"]:
                        raise ValueError("Model returned empty candidates")
                        
                    raw_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    if not raw_content:
                        raise ValueError("Model returned empty text")
                        
                parsed_data = _parse_json_from_response(raw_content)
                return {"data": parsed_data, "model": MODEL_NAME}
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < max_retries - 1:
                    logger.warning(f"Rate limited (429). Retrying in {2 ** attempt} seconds...")
                    time.sleep(5)
                    continue
                raise
        
    except Exception as exc:
        logger.warning("Gemini failed: %s", exc)
        return {"error": str(exc), "model": MODEL_NAME}

def classify_document_gemini(
    ocr_text: str,
    api_key: str,
    file_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
) -> dict:
    """Classify document based on OCR text or image using Gemini."""
    class_list = ", ".join(CLASS_NAMES)
    prompt = f"""Analyze the following document (OCR text and/or page images provided) and classify it into EXACTLY ONE of these categories:
{class_list}

OCR Text (if available):
\"\"\"
{ocr_text[:4000]}
\"\"\"

Return ONLY a JSON object:
{{
  "class": "<category_name>",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<brief explanation>"
}}"""

    system_msg = "You are an expert document classifier. Respond ONLY with valid JSON."
    
    res = _call_gemini_generic(prompt, system_msg, api_key, file_bytes, mime_type)
    
    if "data" not in res or not isinstance(res["data"], dict) or "class" not in res["data"]:
        logger.error("Classification failed completely.")
        return {"class": "unknown", "confidence": 0.0, "source": "gemini_error"}

    data = res["data"]
    doc_class = str(data.get("class", "unknown")).lower().replace(" ", "_")
    
    if doc_class not in CLASS_NAMES:
        for name in CLASS_NAMES:
            if name in doc_class or doc_class in name:
                doc_class = name
                break
        else:
            doc_class = "unknown"

    return {
        "class": doc_class,
        "confidence": float(data.get("confidence", 0.8)),
        "reasoning": data.get("reasoning", ""),
        "source": f"gemini ({res.get('model')})"
    }

def extract_entities_gemini(
    ocr_text: str,
    api_key: str,
    file_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
) -> list[dict]:
    """Extract entities from OCR text or image using Gemini."""
    prompt = f"""Extract important information from the following document (OCR text and/or page images provided).
Target types: date, total, company, address, phone, email, invoice_number, tax, name.

OCR Text (if available):
\"\"\"
{ocr_text[:4000]}
\"\"\"

Return ONLY a JSON array of objects:
[
  {{
    "type": "<type_from_target_list>",
    "value": "<extracted_string>",
    "confidence": <float 0.0-1.0>
  }}
]"""
    system_msg = "You are an expert data extractor. Respond ONLY with a valid JSON array."
    
    res = _call_gemini_generic(prompt, system_msg, api_key, file_bytes, mime_type)
    
    if "data" not in res or not isinstance(res["data"], list):
        logger.error("Entity extraction failed.")
        return []
        
    return res["data"]

def analyze_document_gemini(
    ocr_text: str,
    api_key: str,
    file_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
) -> dict:
    """Classify and extract rich structured enterprise entities in ONE pass using Gemini."""
    class_list = ", ".join(CLASS_NAMES)
    prompt = f"""Analyze the following document (OCR text provided). You must act as an enterprise-grade document intelligence system.
    
1) Classify the document into EXACTLY ONE of these categories: {class_list}
2) Extract highly detailed structured entities, document structure, financial data, risk analysis, and normalized CSV data.

OCR Text:
\"\"\"
{ocr_text[:30000]}
\"\"\"

Return ONLY a valid JSON object matching this exact schema (no markdown, no explanation):
{{
  "document_metadata": {{
    "document_type": "",
    "title": "",
    "language": "",
    "page_count": "",
    "processing_timestamp": "",
    "confidence_score": ""
  }},
  "classification": {{
    "primary_category": "<category_from_list>",
    "secondary_category": "",
    "tags": []
  }},
  "entities": {{
    "people": [],
    "organizations": [],
    "emails": [],
    "phone_numbers": [],
    "addresses": [],
    "dates": [],
    "currencies": [],
    "amounts": [],
    "invoice_numbers": [],
    "contract_ids": []
  }},
  "document_structure": {{
    "headings": [],
    "sections": [],
    "tables": [],
    "line_items": []
  }},
  "financial_information": {{
    "subtotal": "",
    "tax": "",
    "total_amount": "",
    "payment_terms": "",
    "currency": ""
  }},
  "summary": {{
    "short_summary": "",
    "detailed_summary": "",
    "key_points": []
  }},
  "risk_analysis": {{
    "important_clauses": [],
    "missing_information": [],
    "potential_risks": []
  }},
  "csv_export_data": [
    {{
      "field": "",
      "value": "",
      "category": ""
    }}
  ]
}}"""

    system_msg = "You are an expert enterprise document analyst. Read the OCR text carefully. Respond ONLY with valid JSON strictly matching the requested schema."
    
    res = _call_gemini_generic(prompt, system_msg, api_key, file_bytes, mime_type)
    
    if "data" not in res or not isinstance(res["data"], dict):
        logger.error("Unified analysis failed completely.")
        return {
            "classification": {"class": "unknown", "confidence": 0.0, "source": "gemini_error"},
            "entities": [],
            "structured_data": {}
        }

    data = res["data"]
    best_model = res.get("model", "unknown")
    
    # Parse Classification
    clf_data = data.get("classification", {})
    doc_class = str(clf_data.get("primary_category", "unknown")).lower().replace(" ", "_")
    if doc_class not in CLASS_NAMES:
        for name in CLASS_NAMES:
            if name in doc_class or doc_class in name:
                doc_class = name
                break
        else:
            doc_class = "unknown"
            
    classification = {
        "class": doc_class,
        "confidence": 0.95, # Mock confidence for now
        "reasoning": str(clf_data.get("tags", [])),
        "source": f"gemini_unified ({best_model})"
    }
    
    # Parse Entities for legacy frontend chips compatibility
    legacy_entities = []
    entities_dict = data.get("entities", {})
    
    mapping = {
        "organizations": "company",
        "dates": "date",
        "addresses": "address",
        "amounts": "total",
        "people": "name",
        "phone_numbers": "phone",
        "emails": "email"
    }
    
    if isinstance(entities_dict, dict):
        for k, v in entities_dict.items():
            mapped_type = mapping.get(k, k)
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, str) and item:
                        legacy_entities.append({"type": mapped_type, "value": item, "confidence": 0.95})
                    elif isinstance(item, dict) and "value" in item:
                        legacy_entities.append({"type": mapped_type, "value": str(item["value"]), "confidence": 0.95})

    # The rest goes into structured_data
    structured_data = {
        "document_metadata": data.get("document_metadata", {}),
        "document_structure": data.get("document_structure", {}),
        "financial_information": data.get("financial_information", {}),
        "summary": data.get("summary", {}),
        "risk_analysis": data.get("risk_analysis", {}),
        "csv_export_data": data.get("csv_export_data", [])
    }

    return {
        "classification": classification,
        "entities": legacy_entities,
        "structured_data": structured_data
    }

def answer_question_gemini(
    ocr_text: str,
    question: str,
    api_key: str,
    file_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
) -> dict:
    """Answer a user question based on the document."""
    prompt = f"""Answer the user's question based strictly on the provided document (OCR text and/or images).
If the answer is not contained in the document, say so.

User Question: {question}

OCR Text:
\"\"\"
{ocr_text[:4000]}
\"\"\"

Return ONLY a JSON object:
{{
  "answer": "<your concise answer>",
  "confidence": <float 0.0-1.0>,
  "source_quote": "<optional quote from text supporting answer>"
}}"""
    system_msg = "You are an expert document QA assistant. Respond ONLY with valid JSON."
    
    res = _call_gemini_generic(prompt, system_msg, api_key, file_bytes, mime_type)
    
    if "data" not in res or not isinstance(res["data"], dict) or "answer" not in res["data"]:
        logger.error("QA failed.")
        return {"answer": "I could not analyze the document successfully.", "confidence": 0.0, "source_quote": None, "source": "gemini_error"}
        
    data = res["data"]
    data["source"] = f"gemini ({res.get('model')})"
    return data
