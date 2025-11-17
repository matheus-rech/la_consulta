"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime



class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None



class DocumentBase(BaseModel):
    filename: str
    total_pages: Optional[int] = None


class DocumentCreate(DocumentBase):
    file_size: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class DocumentResponse(DocumentBase):
    id: int
    user_id: int
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    upload_date: datetime
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True



class ExtractionBase(BaseModel):
    field_name: str
    text: str
    page: Optional[int] = None
    coordinates: Optional[Dict[str, float]] = None
    method: Optional[str] = "manual"


class ExtractionCreate(ExtractionBase):
    document_id: int


class ExtractionResponse(ExtractionBase):
    id: int
    user_id: int
    document_id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True



class TextChunkBase(BaseModel):
    chunk_index: int
    page_number: int
    text: str
    bbox_x: float
    bbox_y: float
    bbox_width: float
    bbox_height: float
    font_name: Optional[str] = None
    font_size: Optional[float] = None
    is_heading: bool = False
    is_bold: bool = False
    confidence: float = 1.0
    extraction_method: str = "pdfjs"


class TextChunkCreate(TextChunkBase):
    document_id: int


class TextChunkResponse(TextChunkBase):
    id: int
    document_id: int
    
    class Config:
        from_attributes = True



class GeminiRequest(BaseModel):
    """Request schema for Gemini API proxy"""
    model: str = Field(..., description="Gemini model name (e.g., gemini-2.5-flash)")
    contents: List[Dict[str, Any]] = Field(..., description="Message contents")
    config: Optional[Dict[str, Any]] = Field(None, description="Generation config")


class GeminiResponse(BaseModel):
    """Response schema for Gemini API proxy"""
    text: str
    model: str
    usage: Optional[Dict[str, Any]] = None



class PICOTRequest(BaseModel):
    """Request schema for PICO-T extraction"""
    document_text: str = Field(..., description="Full document text")


class PICOTResponse(BaseModel):
    """Response schema for PICO-T extraction"""
    population: str
    intervention: str
    comparator: str
    outcomes: str
    timing: str
    studyType: str



class ValidationRequest(BaseModel):
    """Request schema for field validation"""
    field_value: str
    document_text: str


class ValidationResponse(BaseModel):
    """Response schema for field validation"""
    is_supported: bool
    quote: str
    confidence: float



class MetadataRequest(BaseModel):
    """Request schema for metadata search"""
    document_text: str


class MetadataResponse(BaseModel):
    """Response schema for metadata search"""
    doi: str
    pmid: str
    journal: str
    year: str
