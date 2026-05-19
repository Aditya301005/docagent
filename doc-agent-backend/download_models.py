#!/usr/bin/env python
"""
download_models.py
------------------
One-shot helper script that pre-downloads and caches both ML models so the
FastAPI server starts instantly without fetching anything at request time.

Usage
-----
    cd doc-agent-backend
    python download_models.py

The script reads MODEL_DIR and QA_MODEL_DIR from the .env file.
  - If MODEL_DIR is set  → saves LayoutLMv3 there
  - If MODEL_DIR is ""   → saves to HuggingFace default cache (~/.cache/huggingface)
  - Same logic for QA_MODEL_DIR / impira/layoutlm-document-qa
"""

import os
import sys
import time
from pathlib import Path

# ── Load .env so settings are available outside of uvicorn ─────────────────
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    print(f"OK  Loaded env from {env_path}")
except ImportError:
    print("python-dotenv not installed - reading env vars directly.")

MODEL_DIR    = os.getenv("MODEL_DIR", "").strip()
QA_MODEL_DIR = os.getenv("QA_MODEL_DIR", "").strip()
DEVICE       = os.getenv("INFERENCE_DEVICE", "cpu").strip()

CLF_HUB_ID = "microsoft/layoutlmv3-base"
QA_HUB_ID  = "impira/layoutlm-document-qa"


def _hr():
    print("-" * 60)


def download_layoutlmv3():
    _hr()
    if MODEL_DIR and os.path.exists(MODEL_DIR) and os.listdir(MODEL_DIR):
        src = MODEL_DIR
    else:
        src = CLF_HUB_ID
    dest = MODEL_DIR or "(HuggingFace cache)"
    print(f"[1/2] Downloading LayoutLMv3  -  {src}")
    print(f"      Save location : {dest}")
    print()

    try:
        from transformers import LayoutLMv3Processor, LayoutLMv3ForSequenceClassification, LayoutLMv3ForTokenClassification
    except ImportError:
        print("ERROR: `transformers` is not installed.")
        print("       Run:  pip install transformers timm sentencepiece")
        sys.exit(1)

    t0 = time.time()

    kwargs = {}
    if MODEL_DIR:
        # If MODEL_DIR already contains a saved model, use it; otherwise download to cache
        pass  # from_pretrained handles both local paths and Hub IDs

    print("  -> Downloading / loading processor ...")
    processor = LayoutLMv3Processor.from_pretrained(src, apply_ocr=False)

    print("  -> Downloading / loading SequenceClassification model ...")
    clf = LayoutLMv3ForSequenceClassification.from_pretrained(src, ignore_mismatched_sizes=True)

    print("  -> Downloading / loading TokenClassification model ...")
    ner = LayoutLMv3ForTokenClassification.from_pretrained(src, ignore_mismatched_sizes=True)

    if MODEL_DIR:
        save_dir = Path(MODEL_DIR)
        save_dir.mkdir(parents=True, exist_ok=True)
        print(f"  -> Saving to {save_dir} ...")
        processor.save_pretrained(save_dir)
        clf.save_pretrained(save_dir)
        # NER shares the same backbone; save with a distinct sub-folder if desired
        # For MVP we use the same checkpoint dir for both heads.

    elapsed = time.time() - t0
    print(f"  OK  LayoutLMv3 ready in {elapsed:.1f}s")


def download_qa_model():
    _hr()
    if QA_MODEL_DIR and os.path.exists(QA_MODEL_DIR) and os.listdir(QA_MODEL_DIR):
        src = QA_MODEL_DIR
    else:
        src = QA_HUB_ID
    dest = QA_MODEL_DIR or "(HuggingFace cache)"
    print(f"[2/2] Downloading QA model  -  {src}")
    print(f"      Save location : {dest}")
    print()

    try:
        from transformers import pipeline as hf_pipeline
    except ImportError:
        print("ERROR: `transformers` is not installed.")
        sys.exit(1)

    t0 = time.time()
    device_id = 0 if DEVICE == "cuda" else -1

    print("  -> Downloading / loading layoutlm-document-qa pipeline ...")
    pipe = hf_pipeline(
        "document-question-answering",
        model=src,
        device=device_id,
    )

    if QA_MODEL_DIR:
        save_dir = Path(QA_MODEL_DIR)
        save_dir.mkdir(parents=True, exist_ok=True)
        print(f"  -> Saving to {save_dir} ...")
        pipe.model.save_pretrained(save_dir)
        pipe.tokenizer.save_pretrained(save_dir)

    elapsed = time.time() - t0
    print(f"  OK  QA pipeline ready in {elapsed:.1f}s")


def print_disk_usage():
    _hr()
    import shutil
    cache_dir = Path.home() / ".cache" / "huggingface"
    if cache_dir.exists():
        total, used, free = shutil.disk_usage(str(cache_dir))
        # walk the hub subfolder to estimate model size
        hub_dir = cache_dir / "hub"
        size_mb = sum(f.stat().st_size for f in hub_dir.rglob("*") if f.is_file()) / 1e6 if hub_dir.exists() else 0
        print(f"HuggingFace cache : {cache_dir}")
        print(f"Approx model size : {size_mb:.0f} MB")
    else:
        print("HuggingFace cache not found (models may be in custom MODEL_DIR).")


if __name__ == "__main__":
    print()
    print("=" * 58)
    print("      ADPA  -  Model Pre-download & Cache Script          ")
    print("=" * 58)
    print()
    print(f"  INFERENCE_DEVICE : {DEVICE}")
    print(f"  MODEL_DIR        : {MODEL_DIR or '(HuggingFace default cache)'}")
    print(f"  QA_MODEL_DIR     : {QA_MODEL_DIR or '(HuggingFace default cache)'}")
    print()

    download_layoutlmv3()
    download_qa_model()
    print_disk_usage()

    _hr()
    print()
    print("OK  All models downloaded.  Start the server with:")
    print("    uvicorn app.main:app --reload")
    print()
