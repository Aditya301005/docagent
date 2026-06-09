from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import Optional
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.result import ExtractionResult
from app.schemas.document import DocumentResponse, DocumentStatusUpdate, DocumentLockUpdate
from app.services.file_handler import save_upload, delete_file

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Save file and get its metadata including the SHA256 hash
    file_info = await save_upload(file, current_user.id)

    # ── Duplicate Detection ─────────────────────────────────────────────────
    # Check if this user has already uploaded a file with the same SHA256 hash
    dup_query = select(Document).where(
        Document.user_id == current_user.id,
        Document.file_hash == file_info["file_hash"]
    )
    dup_result = await db.execute(dup_query)
    existing_doc = dup_result.scalar_one_or_none()

    if existing_doc:
        # Clean up the just-saved duplicate file from disk before raising error
        await delete_file(file_info["stored_path"])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate invoice detected. This file has already been uploaded."
        )
    # ────────────────────────────────────────────────────────────────────────

    # Generate the database record
    new_doc = Document(
        user_id=current_user.id,
        filename=file_info["filename"],
        stored_path=file_info["stored_path"],
        file_size_bytes=file_info["file_size_bytes"],
        mime_type=file_info["mime_type"],
        file_hash=file_info["file_hash"],
        status="pending"
    )
    
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    
    return new_doc

@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(Document.user_id == current_user.id)

    if status is not None:
        query = query.where(Document.status == status)
    if doc_type is not None:
        query = query.where(Document.doc_type == doc_type)

    # Eager-load the extraction result so entities + classification are
    # included in the list response — the frontend uses these to populate
    # the history screen without a second per-document fetch.
    query = query.options(selectinload(Document.result)).order_by(desc(Document.created_at))

    result = await db.execute(query)
    documents = result.scalars().all()

    return documents

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Explicitly load the relational nested 'result' mapping for the schema output
    query = select(Document).where(
        Document.id == doc_id, 
        Document.user_id == current_user.id
    ).options(selectinload(Document.result))
    
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return doc

@router.patch("/{doc_id}/status", response_model=DocumentResponse)
async def update_document_status(
    doc_id: str,
    payload: DocumentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update the processing status of a document.
    Allowed values: Processing, Completed, Pending Review, Approved, Rejected.
    """
    query = select(Document).where(
        Document.id == doc_id,
        Document.user_id == current_user.id
    )
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.status = payload.status
    await db.commit()
    await db.refresh(doc)

    return doc

@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(Document.id == doc_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Strictly scope deletion logic to explicitly authorized users
    if doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")
        
    # Free disk resources
    await delete_file(doc.stored_path)
    
    # Remove entity; SQLAlchemy deletes relational child entities (ExtractionResult) via CASCADE mapping 
    await db.delete(doc)
    await db.commit()
    
    return {"message": "deleted"}

@router.patch("/{doc_id}/lock", response_model=DocumentResponse)
async def patch_document_lock(
    doc_id: str,
    payload: DocumentLockUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle the biometric lock status of a document.
    """
    query = select(Document).where(
        Document.id == doc_id,
        Document.user_id == current_user.id
    )
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.is_locked = 1 if payload.is_locked else 0
    await db.commit()
    await db.refresh(doc)

    return doc


@router.post("/sync", response_model=DocumentResponse)
async def sync_processed_document(
    file: UploadFile = File(...),
    doc_type: str = Form(None),
    confidence: float = Form(0),
    entities_json: str = Form("[]"),
    classification_json: str = Form("{}"),
    structured_data_json: str = Form("{}"),
    ocr_text: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Persist a document that was processed client-side via the one-shot
    /api/process endpoint. The mobile app sends the image file together
    with the processing results so they can be fetched on re-login.
    
    This endpoint is idempotent — if a file with the same SHA256 hash
    already exists for this user, the existing record is returned without
    creating a duplicate.
    """
    # Save the uploaded file to disk (also computes SHA256 hash)
    file_info = await save_upload(file, current_user.id)

    # ── Duplicate Detection ─────────────────────────────────────────────
    dup_query = select(Document).where(
        Document.user_id == current_user.id,
        Document.file_hash == file_info["file_hash"],
    ).options(selectinload(Document.result))
    dup_result = await db.execute(dup_query)
    existing_doc = dup_result.scalar_one_or_none()

    if existing_doc:
        # Already synced — clean up the just-saved duplicate file
        await delete_file(file_info["stored_path"])
        return existing_doc
    # ────────────────────────────────────────────────────────────────────

    # Create the Document record
    new_doc = Document(
        user_id=current_user.id,
        filename=file_info["filename"],
        stored_path=file_info["stored_path"],
        file_size_bytes=file_info["file_size_bytes"],
        mime_type=file_info["mime_type"],
        file_hash=file_info["file_hash"],
        status="done",
        doc_type=doc_type,
        confidence=confidence,
        ocr_text=ocr_text,
    )
    db.add(new_doc)
    await db.flush()  # get new_doc.id

    # Save the ExtractionResult
    try:
        entities = json.loads(entities_json) if entities_json else []
        classification = json.loads(classification_json) if classification_json else {}
        structured_data = json.loads(structured_data_json) if structured_data_json else {}
    except json.JSONDecodeError:
        entities, classification, structured_data = [], {}, {}

    extraction = ExtractionResult(
        document_id=new_doc.id,
        entities=entities,
        classification=classification,
        structured_data=structured_data if structured_data else None,
    )
    db.add(extraction)

    await db.commit()

    # Re-fetch with the result relationship loaded
    result = await db.execute(
        select(Document)
        .where(Document.id == new_doc.id)
        .options(selectinload(Document.result))
    )
    return result.scalar_one()

