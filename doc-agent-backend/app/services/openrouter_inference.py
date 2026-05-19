"""
openrouter_inference.py
-----------------------
Inference backend powered by OpenRouter (Llama 3.3 70B Instruct).

This replaces the multimodal Gemini path with a text-based LLM path.
It relies heavily on high-quality OCR text provided by Tesseract.
"""

from __future__ import annotations
import base64
import json
import logging
import re
import httpx
from typing import Any

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Primary model for classification and entity extraction (auto picks best available)
LLAMA_MODEL = "openrouter/auto"

# ALL free models — fired in PARALLEL, first valid response wins the race!
# If one is rate-limited or returns null, the others pick it up immediately.
ALL_FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",          # Very reliable, large context
    "deepseek/deepseek-v4-flash:free",                  # Strong reasoning, fast
    "google/gemma-4-31b-it:free",                       # Google Gemma 4 flagship
    "google/gemma-4-26b-a4b-it:free",                   # Google Gemma 4 compact
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", # Nvidia reasoning model
    "google/gemma-3-27b-it:free",                       # Gemma 3 strong fallback
]

# Use the same pool for QA
QA_MODELS = ALL_FREE_MODELS

def _get_headers(api_key: str):
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/google-deepmind/doc-agent",
        "X-Title": "DocAgent AI",
    }

CLASS_NAMES = [
    "letter", "memo", "email", "filefolder", "form", "handwritten",
    "invoice", "advertisement", "budget", "news", "presentation",
    "scientific_publication", "questionnaire", "resume",
    "scientific_report", "specification",
]

def _parse_json_from_response(text: str) -> Any:
    """Extract JSON from LLM response, handling markdown fences."""
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
    raise ValueError(f"Could not parse JSON from OpenRouter response: {text[:300]}")

async def _call_openrouter(prompt: str, api_key: str) -> str:
    payload = {
        "model": LLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You are an expert document analysis system. Respond ONLY with valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(OPENROUTER_URL, headers=_get_headers(api_key), json=payload, timeout=60.0)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

def classify_document_openrouter(ocr_text: str, api_key: str) -> dict:
    """Classify document based on OCR text using OpenRouter."""
    class_list = ", ".join(CLASS_NAMES)
    prompt = f"""Analyze the following OCR text from a document and classify it into EXACTLY ONE of these categories:
{class_list}

OCR Text:
\"\"\"
{ocr_text[:4000]}
\"\"\"

Return ONLY a JSON object:
{{
  "class": "<category_name>",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<brief explanation>"
}}"""

    try:
        with httpx.Client() as client:
            payload = {
                "model": LLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": "You are an expert document classifier. Respond ONLY with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
            }
            response = client.post(OPENROUTER_URL, headers=_get_headers(api_key), json=payload, timeout=60.0)
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            
        data = _parse_json_from_response(content)
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
            "source": "openrouter_auto"
        }
    except Exception as exc:
        logger.error("OpenRouter classification failed: %s", exc)
        return {"class": "unknown", "confidence": 0.0, "source": "openrouter_error"}

def extract_entities_openrouter(ocr_text: str, api_key: str) -> list[dict]:
    """Extract entities from OCR text using OpenRouter."""
    prompt = f"""Extract important information from the following OCR text.
Target types: date, total, company, address, phone, email, invoice_number, tax, name.

OCR Text:
\"\"\"
{ocr_text[:4000]}
\"\"\"

Return ONLY a JSON array of objects:
[
  {{"type": "<type>", "value": "<value>", "confidence": <0.0-1.0>}}
]
If none found, return []."""

    try:
        with httpx.Client() as client:
            payload = {
                "model": LLAMA_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
            }
            response = client.post(OPENROUTER_URL, headers=_get_headers(api_key), json=payload, timeout=60.0)
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            
        data = _parse_json_from_response(content)
        return data if isinstance(data, list) else []
    except Exception as exc:
        logger.error("OpenRouter extraction failed: %s", exc)
        return []

def _call_single_model_qa(model: str, prompt: str, api_key: str) -> dict:
    """Call one text-only OpenRouter model for QA and return parsed result."""
    try:
        with httpx.Client() as client:
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are an expert document analyst. Read all provided "
                            "text carefully and answer questions thoroughly. "
                            "Respond ONLY with valid JSON."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 2048,
            }
            response = client.post(
                OPENROUTER_URL,
                headers=_get_headers(api_key),
                json=payload,
                timeout=120.0,
            )
            response.raise_for_status()
            raw_content = response.json()["choices"][0]["message"]["content"]
            # Guard against None responses from the model
            if not raw_content:
                raise ValueError("Model returned empty/null content")
            content = raw_content
        data = _parse_json_from_response(content)
        answer = str(data.get("answer", "")).strip()
        confidence = float(data.get("confidence", 0.0))
        found = bool(data.get("found", bool(answer)))
        return {"answer": answer, "confidence": confidence, "found": found, "model": model}
    except Exception as exc:
        logger.warning("Model %s QA failed: %s", model, exc)
        return {"answer": "", "confidence": 0.0, "found": False, "model": model}


def _call_gemma_vision_qa(
    file_bytes: bytes,
    mime_type: str,
    question: str,
    context_text: str,
    api_key: str,
    max_vision_pages: int = 20,
) -> dict:
    """
    Call Gemma 4 31B with BOTH document images AND text context.
    Gemma 4 is multimodal: it reads the visual layout, tables, figures and
    handwriting directly — not just OCR text.

    For images: sends the image inline.
    For PDFs:   converts up to max_vision_pages most-relevant pages to JPEG
                and sends each as an image_url part.
    """
    model = "google/gemma-4-31b-it:free"
    image_contents: list[dict] = []

    try:
        if mime_type == "application/pdf":
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            mat = fitz.Matrix(120 / 72, 120 / 72)  # 120 DPI — good quality, compact
            total = len(doc)

            # Score pages by keyword relevance (reuse same logic as text RAG)
            stopwords = {
                "the","and","for","that","this","with","are","what","how",
                "when","where","who","why","was","were","has","have","can",
                "will","please","tell","give","list","show","describe",
                "explain","about","from","all","any","its","not","but",
            }
            q_words = [
                w.lower() for w in re.findall(r"\b\w+\b", question)
                if len(w) >= 3 and w.lower() not in stopwords
            ]

            # Split OCR by page for scoring
            page_texts = re.split(r"---\s*Page\s+\d+\s*---", context_text)
            page_texts = [p.strip() for p in page_texts if p.strip()]

            # Score based on text, fallback to uniform if not available
            scores = [0] * total
            for i, pt in enumerate(page_texts[:total]):
                ptl = pt.lower()
                scores[i] = sum(ptl.count(w) for w in q_words)

            # Always include first 2 + last 2
            always = set(range(min(2, total))) | {i for i in range(max(0, total - 2), total)}
            ranked = sorted(range(total), key=lambda i: scores[i], reverse=True)
            selected = set(always)
            for idx in ranked:
                if len(selected) >= max_vision_pages:
                    break
                selected.add(idx)

            for idx in sorted(selected):
                pix = doc[idx].get_pixmap(matrix=mat)
                b64 = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")
                image_contents.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                })
            logger.info("Gemma vision: sending %d page images", len(image_contents))
        else:
            # Single image document
            b64 = base64.b64encode(file_bytes).decode("utf-8")
            image_contents.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{b64}"},
            })
    except Exception as exc:
        logger.warning("Gemma vision image prep failed: %s — falling back to text", exc)

    # Build multimodal message: images + text prompt
    text_part = {
        "type": "text",
        "text": f"""You are an expert document analyst with vision capabilities.

Analyze the document image(s) above AND the OCR text below. Use both visual
layout and text content to answer the question accurately.

OCR text (supplementary, may have minor formatting noise):
\"\"\"
{context_text[:8000]}
\"\"\"

INSTRUCTIONS:
- Read the visual document AND the OCR text.
- Find information on ANY page — do not stop at the first page.
- For section questions (References, Conclusion, etc.), locate that heading visually.
- Provide a complete, thorough answer.
- Only say absent if truly not in the document.

Question: {question}

Return ONLY valid JSON:
{{"answer": "<complete answer>", "confidence": <0.0-1.0>, "found": <true/false>}}""",
    }

    user_content = image_contents + [text_part]

    try:
        with httpx.Client() as client:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": user_content}],
                "temperature": 0.1,
                "max_tokens": 2048,
            }
            response = client.post(
                OPENROUTER_URL,
                headers=_get_headers(api_key),
                json=payload,
                timeout=120.0,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
        data = _parse_json_from_response(content)
        answer = str(data.get("answer", "")).strip()
        confidence = float(data.get("confidence", 0.0))
        found = bool(data.get("found", bool(answer)))
        return {"answer": answer, "confidence": confidence, "found": found, "model": model + "_vision"}
    except Exception as exc:
        logger.warning("Gemma vision QA failed: %s", exc)
        return {"answer": "", "confidence": 0.0, "found": False, "model": model + "_vision_error"}


def answer_question_openrouter(
    ocr_text: str,
    question: str,
    api_key: str,
    file_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
) -> dict:
    """
    Answer a question from full multi-page OCR text using smart page selection.

    Splits OCR by page markers, scores each page by keyword relevance to the
    question, always includes first 2 + last 2 pages (TOC & references), and
    sends the top relevant pages (up to 250,000 chars) to the model.
    """
    MAX_CONTEXT_CHARS = 250_000

    # ── Smart page selection ─────────────────────────────────────────────────
    pages = re.split(r"---\s*Page\s+\d+\s*---", ocr_text)
    pages = [p.strip() for p in pages if p.strip()]

    if not pages or len(ocr_text) <= MAX_CONTEXT_CHARS:
        # Short document — send everything
        context = ocr_text[:MAX_CONTEXT_CHARS]
    else:
        stopwords = {
            "the","and","for","that","this","with","are","what","how","when",
            "where","who","why","was","were","has","have","can","will","please",
            "tell","give","list","show","describe","explain","about","from",
            "all","any","its","not","but","page","section",
        }
        q_words = [
            w.lower() for w in re.findall(r"\b\w+\b", question)
            if len(w) >= 3 and w.lower() not in stopwords
        ]

        total = len(pages)
        scores = []
        for page in pages:
            pl = page.lower()
            score = sum(pl.count(w) for w in q_words)
            for n in range(2, min(5, len(q_words) + 1)):
                if " ".join(q_words[:n]) in pl:
                    score += 5 * n
            scores.append(score)

        # Always include first 2 + last 2 pages
        always = set(range(min(2, total))) | {i for i in range(max(0, total - 2), total)}
        ranked = sorted(range(total), key=lambda i: scores[i], reverse=True)

        selected = set(always)
        running = sum(len(pages[i]) for i in selected)
        for idx in ranked:
            if idx in selected:
                continue
            if running + len(pages[idx]) > MAX_CONTEXT_CHARS:
                break
            selected.add(idx)
            running += len(pages[idx])

        selected_sorted = sorted(selected)
        logger.info(
            "OpenRouter RAG: q=%r → pages %s / %d total",
            question[:60], selected_sorted, total
        )
        parts = [f"--- Page {i+1} ---\n{pages[i]}" for i in selected_sorted]
        context = "\n\n".join(parts)[:MAX_CONTEXT_CHARS]

    # ── Build prompt ─────────────────────────────────────────────────────────
    prompt = f"""You are an expert document analyst.

The text below is extracted from a document (OCR — may have minor formatting noise).
Read ALL provided pages carefully before answering.

Document text:
\"\"\"
{context}
\"\"\"

INSTRUCTIONS:
- Answer the question using information found ANYWHERE in the text above.
- For section questions (References, Introduction, Conclusion, etc.), find that
  section heading and extract its full content.
- Provide a complete, thorough answer. Do not cut off lists or enumerations.
- If OCR has minor typos, interpret intelligently.
- Only say information is absent if it truly does not appear in the text.

Question: {question}

Return ONLY a valid JSON object (no markdown, no explanation):
{{
  "answer": "<complete answer from the document>",
  "confidence": <float 0.0-1.0>,
  "found": <true/false>
}}"""

    # ── Run all QA models in parallel ────────────────────────────────────────
    # Gemma 4 uses vision (images + text); others use smart-chunked OCR text
    from concurrent.futures import ThreadPoolExecutor, as_completed

    # 🏁 RACING PATTERN: Fire ALL free models simultaneously.
    # The FIRST model to return any valid non-empty answer wins immediately.
    # Rate-limited or null responses are silently skipped.
    executor = ThreadPoolExecutor(max_workers=len(QA_MODELS))
    futures = {
        executor.submit(_call_single_model_qa, model, prompt, api_key): model
        for model in QA_MODELS
    }

    best = None
    results = []
    for future in as_completed(futures):
        res = future.result()
        results.append(res)
        # ✅ Exit as soon as ANY model returns a non-empty answer
        if res.get("answer") and str(res["answer"]).strip():
            best = res
            logger.info(
                "🏆 QA race winner: model=%s confidence=%.2f",
                best.get("model"), best.get("confidence", 0.0)
            )
            break

    # Kill remaining background threads immediately — we have our answer
    executor.shutdown(wait=False, cancel_futures=True)

    # If all models failed (empty/null/rate-limited), pick best of what we have
    if not best:
        found_results = [r for r in results if r.get("found") and r.get("answer")]
        if found_results:
            best = max(found_results, key=lambda r: r["confidence"])
        elif results:
            best = max(results, key=lambda r: r.get("confidence", 0.0))
        else:
            return {"answer": "All models are currently rate-limited. Please try again in a moment.", "confidence": 0.0, "source": "openrouter_all_failed"}

        logger.info(
            "QA fallback winner: model=%s confidence=%.2f",
            best.get("model"), best.get("confidence", 0.0),
        )

    return {
        "answer": best["answer"],
        "confidence": best.get("confidence", 0.8),
        "source": f"openrouter_race_winner ({best.get('model', 'unknown')})",
    }
