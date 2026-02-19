"""
Pydantic models for API request/response schemas
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class OcrTextBlock(BaseModel):
    """Single text block from OCR result"""
    text: str
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: List[int] = Field(default_factory=list)  # [x1, y1, x2, y2]

class OcrSuggestion(BaseModel):
    """Suggested field value with confidence"""
    field: str
    value: Any
    confidence: float = Field(ge=0.0, le=1.0)

class OcrResponse(BaseModel):
    """Response from OCR extraction endpoint"""
    extracted_data: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(ge=0.0, le=1.0)
    raw_ocr: List[Dict[str, Any]] = Field(default_factory=list)
    suggestions: List[OcrSuggestion] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    document_type: str = "unknown"

class ValidationResponse(BaseModel):
    """Response from field validation endpoint"""
    matches: bool
    extracted_value: str = ""
    confidence: float = Field(ge=0.0, le=1.0)
    message: str = ""
