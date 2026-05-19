from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document
from app.services.inference import answer_question
from app.services.ocr import run_ocr
import aiofiles

router = APIRouter(prefix="/api/qa", tags=["qa"])

class QARequest(BaseModel):
    document_id: str
    question: str

@router.post("")
async def query_document(
    request: QARequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(Document.id == request.document_id, Document.user_id == current_user.id)
    doc = (await db.execute(query)).scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.status != "done":
        raise HTTPException(status_code=400, detail="Document is not processed yet")
        
    try:
        async with aiofiles.open(doc.stored_path, "rb") as f:
            file_bytes = await f.read()
    except OSError:
        raise HTTPException(status_code=500, detail="Could not read document file from disk")
        
    result = answer_question(file_bytes, doc.ocr_text or "", request.question, mime_type=doc.mime_type)

    return {
        "answer": result["answer"],
        "confidence": result["confidence"],
        "needs_review": result.get("needs_review", False),
        "source": result.get("source", "rule"),
        "document_id": doc.id,
    }

@router.post("/inline")
async def query_inline(
    question: str = Form(...),
    file: UploadFile = File(...),
):
    file_bytes = await file.read()
    
    ocr_text = run_ocr(file_bytes, file.content_type or "image/jpeg")
    result = answer_question(file_bytes, ocr_text, question, mime_type=file.content_type or "image/jpeg")

    return {
        "answer": result["answer"],
        "confidence": result["confidence"],
        "needs_review": result.get("needs_review", False),
        "source": result.get("source", "rule"),
        "document_id": None,
    }
