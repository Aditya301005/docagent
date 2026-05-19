from __future__ import annotations

import logging
from typing import Optional

import torch
import torch.nn.functional as F

from app.services import model_registry

logger = logging.getLogger(__name__)


def classify_document_ml(
    image,
    words: list[str],
    boxes: list[list[int]],
) -> dict:
    processor = model_registry.get_processor()
    model = model_registry.get_classifier()

    if processor is None or model is None:
        raise RuntimeError("LayoutLMv3 classifier not available")

    device = next(model.parameters()).device
    words = words[:512]
    boxes = boxes[:512]

    encoding = processor(
        image,
        words,
        boxes=boxes,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding="max_length",
    )
    encoding = {k: v.to(device) for k, v in encoding.items()}

    with torch.no_grad():
        outputs = model(**encoding)

    logits = outputs.logits[0]
    probs = F.softmax(logits, dim=-1).cpu().tolist()
    id2label = {int(k): v for k, v in model.config.id2label.items()}

    best_id = int(torch.argmax(logits).item())
    return {
        "class": id2label[best_id],
        "confidence": round(float(probs[best_id]), 4),
        "all_scores": {id2label[i]: round(float(p), 4) for i, p in enumerate(probs)},
    }


_TAG_TO_ENTITY_TYPE: dict[str, str] = {
    "DATE": "date",
    "TOTAL": "total",
    "COMPANY": "company",
    "ADDRESS": "address",
    "PHONE": "phone",
    "EMAIL": "email",
    "HEADER": "header",
    "QUESTION": "question",
    "ANSWER": "answer",
}


def extract_entities_ml(
    image,
    words: list[str],
    boxes: list[list[int]],
) -> list[dict]:
    processor = model_registry.get_processor()
    model = model_registry.get_ner_model()

    if processor is None or model is None:
        raise RuntimeError("LayoutLMv3 NER model not available")

    device = next(model.parameters()).device
    words_trunc = words[:512]
    boxes_trunc = boxes[:512]

    encoding = processor(
        image,
        words_trunc,
        boxes=boxes_trunc,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding="max_length",
    )
    encoding = {k: v.to(device) for k, v in encoding.items()}

    with torch.no_grad():
        outputs = model(**encoding)

    logits = outputs.logits[0]
    probs = F.softmax(logits, dim=-1)
    pred_ids = torch.argmax(logits, dim=-1).cpu().tolist()
    pred_probs = probs.max(dim=-1).values.cpu().tolist()
    id2label = {int(k): v for k, v in model.config.id2label.items()}

    word_ids = None
    try:
        word_ids = encoding.word_ids(batch_index=0)
    except Exception:
        try:
            word_ids = encoding.word_ids()
        except Exception:
            word_ids = None

    entities: list[dict] = []
    current_type: Optional[str] = None
    current_tokens: list[str] = []
    current_conf: list[float] = []

    def flush():
        nonlocal current_type, current_tokens, current_conf
        if current_type and current_tokens:
            entity_type = _TAG_TO_ENTITY_TYPE.get(current_type, current_type.lower())
            value = " ".join(current_tokens)
            confidence = round(sum(current_conf) / len(current_conf), 4)
            entities.append({"type": entity_type, "value": value, "confidence": confidence})
        current_type = None
        current_tokens = []
        current_conf = []

    prev_word_id = None
    for idx, (label_id, prob) in enumerate(zip(pred_ids, pred_probs)):
        label = id2label.get(label_id, "O")
        word_id = word_ids[idx] if word_ids else idx

        if word_id is None or word_id == prev_word_id:
            continue
        prev_word_id = word_id

        if label == "O":
            flush()
            continue

        bio, tag = label.split("-", 1) if "-" in label else ("B", label)
        if bio == "B":
            flush()
            current_type = tag
            if word_id < len(words):
                current_tokens = [words[word_id]]
            current_conf = [float(prob)]
        elif bio == "I" and current_type == tag:
            if word_id < len(words):
                current_tokens.append(words[word_id])
            current_conf.append(float(prob))
        else:
            flush()

    flush()
    return entities


def answer_question_ml(
    image,
    words: list[str],
    boxes: list[list[int]],
    question: str,
) -> dict:
    tokenizer = model_registry.get_qa_tokenizer()
    model = model_registry.get_qa_model()

    if tokenizer is None or model is None:
        raise RuntimeError("QA model not available")

    device = next(model.parameters()).device
    context = " ".join(words)
    encoding = tokenizer(
        question,
        context,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    )
    encoding = {k: v.to(device) for k, v in encoding.items()}

    with torch.no_grad():
        outputs = model(**encoding)

    start_logits = outputs.start_logits[0]
    end_logits = outputs.end_logits[0]
    start_idx = int(torch.argmax(start_logits).item())
    end_idx = int(torch.argmax(end_logits).item())

    if start_idx > end_idx:
        return {"answer": "", "confidence": 0.0}

    answer_ids = encoding["input_ids"][0][start_idx : end_idx + 1]
    answer = tokenizer.decode(answer_ids, skip_special_tokens=True).strip()
    start_probs = F.softmax(start_logits, dim=-1)
    end_probs = F.softmax(end_logits, dim=-1)
    confidence = float(start_probs[start_idx] * end_probs[end_idx])

    return {
        "answer": answer,
        "confidence": round(confidence, 4),
    }
