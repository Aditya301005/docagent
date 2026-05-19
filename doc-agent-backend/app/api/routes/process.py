from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.rate_limiter import limiter
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document
from app.schemas.result import ExtractionResultResponse
from app.tasks.process_doc import process_document_task
from app.services.file_handler import infer_mime_type
from app.services.ocr import run_ocr
from app.services.inference import run_inference

router = APIRouter(prefix="/api", tags=["process"])

@router.post("/documents/{doc_id}/process")
async def process_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    doc = (await db.execute(query)).scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.status == "processing":
        raise HTTPException(status_code=400, detail="Document is already actively queued for processing")
        
    task = process_document_task.delay(doc_id)
    doc.task_id = task.id
    
    await db.commit()
    
    return {"job_id": task.id, "status": "queued"}

@router.get("/documents/{doc_id}/status")
async def get_document_status(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(Document.id == doc_id, Document.user_id == current_user.id).options(selectinload(Document.result))
    doc = (await db.execute(query)).scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    response = {
        "status": doc.status,
        "doc_type": doc.doc_type,
        "confidence": doc.confidence
    }
    
    if doc.status == "done" and doc.result:
        response["result_summary"] = doc.result.classification
        
    return response

@router.get("/documents/{doc_id}/results", response_model=ExtractionResultResponse)
async def get_document_results(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(Document.id == doc_id, Document.user_id == current_user.id).options(selectinload(Document.result))
    doc = (await db.execute(query)).scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.status != "done" or not doc.result:
        raise HTTPException(status_code=404, detail="Results are not fully computed yet")
        
    return doc.result

@router.post("/process")
@limiter.limit("10/minute")
async def process_one_shot(
    request: Request,
    task_type: str = "classify",
    file: UploadFile = File(...),
):
    """Synchronous shortcut endpoint used by mobile to bypass queue logic."""
    file_bytes = await file.read()
    mime_type = infer_mime_type(file_bytes, file.content_type, file.filename)

    text = run_ocr(file_bytes, mime_type)
    results = run_inference(file_bytes, text, mime_type=mime_type)

    return results
