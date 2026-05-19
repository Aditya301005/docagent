from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import uuid
import datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.models.document import Document

class ExtractionResult(Base):
    __tablename__ = "extraction_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # one-to-one relationship with documents
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), unique=True, index=True)
    
    # Store list of dicts: {"type": "PERSON", "value": "John Doe", "confidence": 0.95}
    entities: Mapped[Any] = mapped_column(JSON, default=list)
    
    # Store classification details: {"class": "invoice", "confidence": 0.98, "all_scores": {...}}
    classification: Mapped[Any] = mapped_column(JSON, default=dict)
    
    processing_time_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    document: Mapped["Document"] = relationship("Document", back_populates="result")

    def __repr__(self):
        return f"<ExtractionResult(id={self.id}, document_id={self.document_id})>"
