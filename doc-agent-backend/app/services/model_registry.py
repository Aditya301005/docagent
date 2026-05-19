from __future__ import annotations

import logging
import threading
from typing import Optional

logger = logging.getLogger(__name__)

_lock = threading.Lock()

_clf_model: Optional[object] = None
_ner_model: Optional[object] = None
_processor: Optional[object] = None
_qa_model: Optional[object] = None
_qa_tokenizer: Optional[object] = None

_layout_loaded = False
_qa_loaded = False


def get_processor() -> Optional[object]:
    _load_layout_models()
    return _processor


def get_classifier() -> Optional[object]:
    _load_layout_models()
    return _clf_model


def get_ner_model() -> Optional[object]:
    _load_layout_models()
    return _ner_model


def get_qa_model() -> Optional[object]:
    _load_qa_model()
    return _qa_model


def get_qa_tokenizer() -> Optional[object]:
    _load_qa_model()
    return _qa_tokenizer


def _load_layout_models() -> None:
    global _layout_loaded, _processor, _clf_model, _ner_model

    if _layout_loaded:
        return

    with _lock:
        if _layout_loaded:
            return

        try:
            from transformers import (
                LayoutLMv3ForSequenceClassification,
                LayoutLMv3ForTokenClassification,
                LayoutLMv3Processor,
            )
            from app.core.config import settings

            clf_checkpoint = settings.MODEL_DIR or "app/models/classifier"
            ner_checkpoint = settings.NER_MODEL_DIR or "app/models/ner"
            device = settings.INFERENCE_DEVICE

            logger.info(
                "Loading local LayoutLMv3 models (classifier=%s, ner=%s, device=%s)",
                clf_checkpoint,
                ner_checkpoint,
                device,
            )

            _processor = LayoutLMv3Processor.from_pretrained(clf_checkpoint, apply_ocr=False)
            _clf_model = LayoutLMv3ForSequenceClassification.from_pretrained(clf_checkpoint)
            _ner_model = LayoutLMv3ForTokenClassification.from_pretrained(ner_checkpoint)

            _clf_model.eval()
            _ner_model.eval()

            if device != "cpu":
                try:
                    _clf_model = _clf_model.to(device)
                    _ner_model = _ner_model.to(device)
                except Exception:
                    logger.warning("Could not move LayoutLMv3 models to %s, using cpu", device)

            logger.info("Local LayoutLMv3 models loaded successfully.")
        except Exception as exc:
            logger.warning("Failed to load local LayoutLMv3 models: %s", exc)
            _processor = None
            _clf_model = None
            _ner_model = None
        finally:
            _layout_loaded = True


def _load_qa_model() -> None:
    global _qa_loaded, _qa_model, _qa_tokenizer

    if _qa_loaded:
        return

    with _lock:
        if _qa_loaded:
            return

        try:
            from transformers import AutoModelForQuestionAnswering, AutoTokenizer
            from app.core.config import settings

            qa_checkpoint = settings.QA_MODEL_DIR or "app/models/vqa"
            device = settings.INFERENCE_DEVICE

            logger.info("Loading local QA model from %s (device=%s)", qa_checkpoint, device)

            _qa_tokenizer = AutoTokenizer.from_pretrained(qa_checkpoint)
            _qa_model = AutoModelForQuestionAnswering.from_pretrained(qa_checkpoint)
            _qa_model.eval()

            if device != "cpu":
                try:
                    _qa_model = _qa_model.to(device)
                except Exception:
                    logger.warning("Could not move QA model to %s, using cpu", device)

            logger.info("Local QA model loaded successfully.")
        except Exception as exc:
            logger.warning("Failed to load local QA model: %s", exc)
            _qa_model = None
            _qa_tokenizer = None
        finally:
            _qa_loaded = True
