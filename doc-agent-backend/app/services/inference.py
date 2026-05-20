"""
inference.py
------------
Central inference dispatcher for the DocAgent pipeline.

Priority order:
  1. Google Gemini API  — if GEMINI_API_KEY is set in .env  (best quality)
  2. LayoutLMv3 local   — if local model checkpoints exist   (medium quality)
  3. ONNX fallback      — if .onnx files exist               (basic fallback)

Setting GEMINI_API_KEY in .env automatically enables the Gemini path.
No code change is required — just restart the backend after adding the key.
"""

from __future__ import annotations

import io
import logging
import time

import numpy as np

logger = logging.getLogger(__name__)


# ─── Resolve settings lazily to avoid import-time circular deps ─────────────
def _settings():
    from app.core.config import settings
    return settings


# ─── Determine which backend is active ──────────────────────────────────────
def _get_gemini_key() -> str:
    try:
        key = _settings().GEMINI_API_KEY or ""
        if key.startswith("your-") or not key.strip(): return ""
        return key.strip()
    except Exception: return ""

def _get_openrouter_key() -> str:
    try:
        key = _settings().OPENROUTER_API_KEY or ""
        if key.startswith("your-") or not key.strip(): return ""
        return key.strip()
    except Exception: return ""

def _use_gemini() -> bool:
    return bool(_get_gemini_key())

def _use_openrouter() -> bool:
    return bool(_get_openrouter_key())


# ─── Lazy ONNX session loader (only initialised if Gemini is NOT used) ───────
_onnx_loaded = False
_clf_session = None
_ner_session = None
_vqa_session = None
_clf_processor = None
_ner_processor = None
_vqa_tokenizer = None

CLASS_NAMES = [
    "letter", "memo", "email", "filefolder", "form", "handwritten",
    "invoice", "advertisement", "budget", "news", "presentation",
    "scientific_publication", "questionnaire", "resume",
    "scientific_report", "specification",
]

NER_LABELS = [
    "O",
    "B-COMPANY", "I-COMPANY",
    "B-DATE", "I-DATE",
    "B-ADDRESS", "I-ADDRESS",
    "B-TOTAL", "I-TOTAL",
]


def _load_onnx_models():
    """Load ONNX sessions once, on first use (not at module import time)."""
    global _onnx_loaded, _clf_session, _ner_session, _vqa_session
    global _clf_processor, _ner_processor, _vqa_tokenizer

    if _onnx_loaded:
        return

    _onnx_loaded = True  # set early so we don't retry on repeated failure

    try:
        import onnxruntime as ort
        from transformers import DistilBertTokenizerFast, LayoutLMv3Processor

        _clf_session = ort.InferenceSession("app/models/classifier.onnx")
        _ner_session = ort.InferenceSession("app/models/ner_fixed.onnx")
        _vqa_session = ort.InferenceSession("app/models/vqa.onnx")

        _clf_processor = LayoutLMv3Processor.from_pretrained("app/models/classifier")
        _ner_processor = LayoutLMv3Processor.from_pretrained(
            "app/models/ner", apply_ocr=False
        )
        _vqa_tokenizer = DistilBertTokenizerFast.from_pretrained("app/models/vqa")

        logger.info("ONNX fallback models loaded successfully.")
    except Exception as exc:
        logger.warning("ONNX fallback models could not be loaded: %s", exc)


# ─── Validation layer ────────────────────────────────────────────────────────
def _apply_validation_layer(result: dict) -> dict:
    try:
        threshold = _settings().CONFIDENCE_THRESHOLD
    except Exception:
        threshold = 0.70
    conf = result.get("confidence", 1.0)
    result["needs_review"] = bool(conf < threshold)
    return result


# ─── Classify ────────────────────────────────────────────────────────────────
def classify_document(
    file_bytes: bytes, ocr_text: str, mime_type: str = "image/jpeg"
) -> dict:
    # ── Path 1: OpenRouter (Llama 3.3) ───────────────────────────────────
    if _use_openrouter():
        try:
            from app.services.openrouter_inference import classify_document_openrouter
            result = classify_document_openrouter(ocr_text, _get_openrouter_key(), file_bytes, mime_type)
            return _apply_validation_layer(result)
        except Exception as exc:
            logger.error("OpenRouter classification failed: %s", exc)

    # ── Path 2: Gemini ────────────────────────────────────────────────────
    if _use_gemini():
        try:
            from app.services.gemini_inference import classify_document_gemini
            result = classify_document_gemini(
                file_bytes, ocr_text, mime_type, _get_gemini_key()
            )
            return _apply_validation_layer(result)
        except Exception as exc:
            logger.error("Gemini classification failed, trying local: %s", exc)

    # ── Path 3: LayoutLMv3 local ─────────────────────────────────────────
    try:
        from app.services.layoutlmv3_inference import classify_document_ml
        from app.services.ocr import run_ocr_for_layoutlm

        layoutlm_data = run_ocr_for_layoutlm(file_bytes, mime_type)
        result = classify_document_ml(
            layoutlm_data["image"],
            layoutlm_data["words"],
            layoutlm_data["boxes"],
        )
        result["source"] = "layoutlmv3_local"
        return _apply_validation_layer(result)
    except Exception as exc:
        logger.warning("Local LayoutLMv3 classifier failed, trying ONNX: %s", exc)

    # ── Path 3: ONNX fallback ─────────────────────────────────────────────
    try:
        from PIL import Image
        from app.services.ocr import run_ocr_for_layoutlm

        _load_onnx_models()
        if _clf_session is None or _clf_processor is None:
            raise RuntimeError("ONNX models not available")

        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        encoding = _clf_processor(image, return_tensors="np")
        outputs = _clf_session.run(None, {k: v for k, v in encoding.items()})
        logits = outputs[0][0]
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / exp_logits.sum()
        pred_idx = int(np.argmax(probs))
        result = {
            "class": CLASS_NAMES[pred_idx],
            "confidence": float(probs[pred_idx]),
            "source": "layoutlmv3_onnx",
        }
        return _apply_validation_layer(result)
    except Exception as exc:
        logger.error("All classification backends failed: %s", exc)
        return _apply_validation_layer(
            {"class": "unknown", "confidence": 0.0, "source": "error"}
        )


# ─── Extract entities ─────────────────────────────────────────────────────────
def extract_entities(
    file_bytes: bytes, ocr_text: str, mime_type: str = "image/jpeg"
) -> list[dict]:
    # ── Path 1: OpenRouter (Llama 3.3) ───────────────────────────────────
    if _use_openrouter():
        try:
            from app.services.openrouter_inference import extract_entities_openrouter
            return extract_entities_openrouter(ocr_text, _get_openrouter_key(), file_bytes, mime_type)
        except Exception as exc:
            logger.error("OpenRouter entity extraction failed: %s", exc)

    # ── Path 2: Gemini ────────────────────────────────────────────────────
    if _use_gemini():
        try:
            from app.services.gemini_inference import extract_entities_gemini
            return extract_entities_gemini(
                file_bytes, ocr_text, mime_type, _get_gemini_key()
            )
        except Exception as exc:
            logger.error("Gemini entity extraction failed, trying local: %s", exc)

    # ── Path 3: LayoutLMv3 local ─────────────────────────────────────────
    try:
        from app.services.layoutlmv3_inference import extract_entities_ml
        from app.services.ocr import run_ocr_for_layoutlm

        layoutlm_data = run_ocr_for_layoutlm(file_bytes, mime_type)
        return extract_entities_ml(
            layoutlm_data["image"],
            layoutlm_data["words"],
            layoutlm_data["boxes"],
        )
    except Exception as exc:
        logger.warning("Local LayoutLMv3 NER failed, trying ONNX: %s", exc)

    # ── Path 3: ONNX fallback ─────────────────────────────────────────────
    try:
        from app.services.ocr import run_ocr_for_layoutlm

        _load_onnx_models()
        if _ner_session is None or _ner_processor is None:
            raise RuntimeError("ONNX NER model not available")

        layoutlm_data = run_ocr_for_layoutlm(file_bytes, mime_type)
        if not layoutlm_data or not layoutlm_data.get("words"):
            return []

        image = layoutlm_data["image"]
        words = layoutlm_data["words"]
        boxes = layoutlm_data["boxes"]

        encoding = _ner_processor(image, words, boxes=boxes, return_tensors="np")
        outputs = _ner_session.run(None, {k: v for k, v in encoding.items()})
        logits = outputs[0][0]
        preds = np.argmax(logits, axis=-1)
        word_ids = encoding.word_ids(batch_index=0)

        entities: list[dict] = []
        prev_word_idx = -1
        current_entity = None

        for idx, pred_idx in enumerate(preds):
            word_idx = word_ids[idx]
            if word_idx is None or word_idx == prev_word_idx:
                continue
            prev_word_idx = word_idx

            label = NER_LABELS[pred_idx]
            word = words[word_idx]

            if label == "O":
                if current_entity:
                    entities.append(current_entity)
                    current_entity = None
            elif label.startswith("B-"):
                if current_entity:
                    entities.append(current_entity)
                exp_l = np.exp(logits[idx] - np.max(logits[idx]))
                p = exp_l / exp_l.sum()
                current_entity = {
                    "type": label[2:].lower(),
                    "value": word,
                    "confidence": float(p[pred_idx]),
                }
            elif label.startswith("I-"):
                if current_entity and current_entity["type"] == label[2:].lower():
                    current_entity["value"] += f" {word}"

        if current_entity:
            entities.append(current_entity)

        return entities
    except Exception as exc:
        logger.error("All NER backends failed: %s", exc)
        return []


# ─── Answer question ──────────────────────────────────────────────────────────
def answer_question(
    file_bytes: bytes,
    ocr_text: str,
    question: str,
    mime_type: str = "image/jpeg",
) -> dict:
    # ── Path 1: OpenRouter (Llama 3.3) ───────────────────────────────────
    if _use_openrouter():
        try:
            from app.services.openrouter_inference import answer_question_openrouter
            result = answer_question_openrouter(
                    ocr_text, question, _get_openrouter_key(),
                    file_bytes=file_bytes, mime_type=mime_type,
                )
            return _apply_validation_layer(result)
        except Exception as exc:
            logger.error("OpenRouter Q&A failed: %s", exc)

    # ── Path 2: Gemini ────────────────────────────────────────────────────
    if _use_gemini():
        try:
            from app.services.gemini_inference import answer_question_gemini
            result = answer_question_gemini(
                file_bytes, ocr_text, question, mime_type, _get_gemini_key()
            )
            return _apply_validation_layer(result)
        except Exception as exc:
            logger.error("Gemini Q&A failed, trying local: %s", exc)

    # ── Path 3: LayoutLMv3 local ─────────────────────────────────────────
    try:
        from app.services.layoutlmv3_inference import answer_question_ml
        from app.services.ocr import run_ocr_for_layoutlm

        layoutlm_data = run_ocr_for_layoutlm(file_bytes, mime_type)
        result = answer_question_ml(
            layoutlm_data["image"],
            layoutlm_data["words"],
            layoutlm_data["boxes"],
            question,
        )
        result["source"] = "qa_local"
        return _apply_validation_layer(result)
    except Exception as exc:
        logger.warning("Local QA failed, trying ONNX: %s", exc)

    # ── Path 3: ONNX fallback ─────────────────────────────────────────────
    try:
        _load_onnx_models()
        if _vqa_session is None or _vqa_tokenizer is None:
            raise RuntimeError("ONNX VQA model not available")

        encoding = _vqa_tokenizer(
            question, ocr_text, return_tensors="np", truncation=True, max_length=512
        )
        outputs = _vqa_session.run(None, {k: v for k, v in encoding.items()})
        start_logits, end_logits = outputs[0][0], outputs[1][0]
        start_idx = int(np.argmax(start_logits))
        end_idx = int(np.argmax(end_logits))

        if start_idx <= end_idx:
            answer_ids = encoding["input_ids"][0][start_idx: end_idx + 1]
            answer = _vqa_tokenizer.decode(answer_ids, skip_special_tokens=True)
            start_exp = np.exp(start_logits - np.max(start_logits))
            start_p = start_exp / start_exp.sum()
            end_exp = np.exp(end_logits - np.max(end_logits))
            end_p = end_exp / end_exp.sum()
            conf = float(start_p[start_idx] * end_p[end_idx])
            result = {
                "answer": answer.strip(),
                "confidence": min(1.0, conf),
                "source": "vqa_onnx",
            }
            return _apply_validation_layer(result)

        return _apply_validation_layer(
            {"answer": "", "confidence": 0.0, "source": "vqa_onnx"}
        )
    except Exception as exc:
        logger.error("All Q&A backends failed: %s", exc)
        return _apply_validation_layer(
            {"answer": "", "confidence": 0.0, "source": "error"}
        )


# ─── Main pipeline entry point (called by Celery task) ───────────────────────
def run_inference(
    file_bytes: bytes, ocr_text: str, mime_type: str = "image/jpeg"
) -> dict:
    """
    Run the full inference pipeline: classify + extract entities.
    Called by the Celery process_document_task.
    """
    t0 = time.perf_counter()

    if _use_openrouter():
        backend = "openrouter_llama3_3"
    elif _use_gemini():
        backend = "gemini"
    else:
        backend = "local"
        
    logger.info("run_inference: using backend=%s", backend)

    classification = classify_document(file_bytes, ocr_text, mime_type)
    entities = extract_entities(file_bytes, ocr_text, mime_type)

    processing_time_ms = int((time.perf_counter() - t0) * 1000)

    result = {
        "doc_type": classification.get("class", "unknown"),
        "confidence": classification.get("confidence", 0.0),
        "classification": classification,
        "entities": entities,
        "raw_text": ocr_text,
        "processing_time_ms": processing_time_ms,
        "inference_backend": backend,
    }

    _apply_validation_layer(result)
    return result
