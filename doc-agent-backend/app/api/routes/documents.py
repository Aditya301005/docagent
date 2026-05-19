from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document
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
        
    query = query.order_by(desc(Document.created_at))
    
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
