from pydantic import BaseModel, ConfigDict
from typing import Any, Optional
from datetime import datetime

class ExtractionResultResponse(BaseModel):
    id: str
    document_id: str
    entities: list[Any]
    classification: dict[str, Any]
    structured_data: Optional[dict[str, Any]] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
