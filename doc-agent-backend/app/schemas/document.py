from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, Literal
from datetime import datetime
from app.schemas.result import ExtractionResultResponse

VALID_STATUSES = ["Processing", "Completed", "Pending Review", "Approved", "Rejected", "pending"]

class DocumentResponse(BaseModel):
    id: str
    filename: str
    status: str
    is_locked: bool = False
    file_hash: Optional[str] = None
    doc_type: Optional[str] = None
    confidence: Optional[float] = None
    created_at: datetime
    result: Optional[ExtractionResultResponse] = None
    
    model_config = ConfigDict(from_attributes=True)


class DocumentLockUpdate(BaseModel):
    """Payload for PATCH /documents/{id}/lock endpoint."""
    is_locked: bool


class DocumentStatusUpdate(BaseModel):
    """Payload for PATCH /documents/{id}/status endpoint."""
    status: str

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = ["Processing", "Completed", "Pending Review", "Approved", "Rejected"]
        if v not in allowed:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(allowed)}")
        return v
