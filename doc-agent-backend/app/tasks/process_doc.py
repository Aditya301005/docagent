"""
process_doc.py
--------------
Celery task that runs the full ADPA pipeline for a given document ID.

Pipeline:
  1. Load document record from DB
  2. Run Tesseract OCR  →  plain text + update doc.ocr_text
  3. Run run_inference()  →  classification + entities + confidence
  4. Apply Local Validation Layer decision:
       confidence >= threshold  →  doc.status = "done"
       confidence <  threshold  →  doc.status = "review"  (needs human check)
  5. Persist ExtractionResult + updated Document to DB
"""

import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.tasks.celery_app import celery_app
from app.core.config import settings
from app.models.document import Document
from app.models.result import ExtractionResult
from app.services.ocr import run_ocr
from app.services.inference import run_inference

SYNC_DATABASE_URL = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(SYNC_DATABASE_URL)
SessionLocal = sessionmaker(bind=sync_engine)


@celery_app.task(bind=True, max_retries=3)
def process_document_task(self, document_id: str):
    session = SessionLocal()
    try:
        doc = session.query(Document).filter_by(id=document_id).first()
        if not doc:
            return

        doc.status = "processing"
        session.commit()

        start_time = time.time()

        # 1. Read file bytes
        with open(doc.stored_path, "rb") as f:
            file_bytes = f.read()

        # 2. OCR – plain text for rule-engine fallback + to persist on the record
        text = run_ocr(file_bytes, doc.mime_type)
        doc.ocr_text = text

        # 3. Run full inference (ML or rule-based with automatic fallback)
        results = run_inference(file_bytes, text, mime_type=doc.mime_type)

        # 4. Persist extraction result
        ext_result = ExtractionResult(
            document_id=doc.id,
            entities=results.get("entities", []),
            classification=results.get("classification", {}),
            structured_data=results.get("structured_data", {}),
            processing_time_ms=int((time.time() - start_time) * 1000),
        )
        session.add(ext_result)

        # 5. Update document record
        doc.doc_type = results.get("doc_type")
        doc.confidence = results.get("confidence")

        # Local Validation Layer: flag docs that need human review
        if results.get("needs_review", False):
            doc.status = "review"
        else:
            doc.status = "done"

        session.commit()

    except Exception as exc:
        session.rollback()
        # Try to mark the document as errored before re-raising
        try:
            doc = session.query(Document).filter_by(id=document_id).first()
            if doc:
                doc.status = "error"
                session.commit()
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=5)

    finally:
        session.close()
