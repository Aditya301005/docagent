"""
export.py  (API route)
----------------------
Serves document extraction results in JSON, CSV, SQL, or plain-OCR-text format.
Delegates serialisation to app.services.export so the route stays thin.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
import io
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document
from app.services.export import to_json, to_csv, to_sql_insert

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/{doc_id}")
async def export_document(
    doc_id: str,
    format: Optional[str] = "json",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export extraction results for a processed document.

    Query params
    ------------
    format : str  — one of  json | csv | sql | txt   (default: json)
    """
    query = (
        select(Document)
        .where(Document.id == doc_id, Document.user_id == current_user.id)
        .options(selectinload(Document.result))
    )
    doc = (await db.execute(query)).scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Allow export for both "done" and "review" statuses
    if doc.status not in ("done", "review"):
        raise HTTPException(
            status_code=400,
            detail=f"Document is not fully processed yet (status={doc.status})",
        )

    if not doc.result:
        raise HTTPException(status_code=404, detail="No extraction results found for this document")

    # ── JSON ────────────────────────────────────────────────────────────────
    if format == "json":
        json_str = to_json(doc.result)
        return JSONResponse(content=json.loads(json_str))

    # ── CSV ─────────────────────────────────────────────────────────────────
    elif format == "csv":
        csv_str = to_csv(doc.result)
        mem = io.BytesIO(csv_str.encode("utf-8"))
        return StreamingResponse(
            mem,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="doc_{doc.id}_results.csv"'
            },
        )

    # ── SQL ─────────────────────────────────────────────────────────────────
    elif format == "sql":
        sql_str = to_sql_insert(doc.result)
        mem = io.BytesIO(sql_str.encode("utf-8"))
        return StreamingResponse(
            mem,
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="doc_{doc.id}_insert.sql"'
            },
        )

    # ── Plain OCR text ───────────────────────────────────────────────────────
    elif format == "txt":
        ocr = doc.ocr_text or ""
        mem = io.BytesIO(ocr.encode("utf-8"))
        return StreamingResponse(
            mem,
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="doc_{doc.id}_ocr.txt"'
            },
        )

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid format. Supported formats: json, csv, sql, txt",
        )
