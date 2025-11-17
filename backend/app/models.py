"""
SQLAlchemy database models and Pydantic schemas for the application
"""
from datetime import datetime
from typing import Dict, List, Optional, Any
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr, validator
from .database import Base


# ============================================================================
# SQLAlchemy ORM Models (Database Tables)
# ============================================================================


class UserModel(Base):
    """User table"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    
    # Relationships
    documents = relationship("DocumentModel", back_populates="user", cascade="all, delete-orphan")
    extractions = relationship("ExtractionModel", back_populates="user", cascade="all, delete-orphan")
    annotations = relationship("AnnotationModel", back_populates="user", cascade="all, delete-orphan")
    api_requests = relationship("APIRequestModel", back_populates="user", cascade="all, delete-orphan")


class DocumentModel(Base):
    """Document table"""
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    total_pages = Column(Integer, nullable=False)
    upload_date = Column(DateTime, nullable=False)
    pdf_data = Column(Text, nullable=False)  # Base64 encoded PDF data
    metadata = Column(JSON, default={})
    
    # Relationships
    user = relationship("UserModel", back_populates="documents")
    extractions = relationship("ExtractionModel", back_populates="document", cascade="all, delete-orphan")
    annotations = relationship("AnnotationModel", back_populates="document", cascade="all, delete-orphan")
    text_chunks = relationship("TextChunkModel", back_populates="document", cascade="all, delete-orphan")


class ExtractionModel(Base):
    """Extraction table"""
    __tablename__ = "extractions"
    
    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String, nullable=False, index=True)
    text = Column(Text, nullable=False)
    page = Column(Integer, nullable=False)
    coordinates = Column(JSON, nullable=False)  # {x, y, width, height}
    method = Column(String, nullable=False)  # 'manual', 'gemini-pico', 'gemini-summary', etc.
    timestamp = Column(DateTime, nullable=False)
    
    # Relationships
    user = relationship("UserModel", back_populates="extractions")
    document = relationship("DocumentModel", back_populates="extractions")


class TextChunkModel(Base):
    """Text chunk table for storing processed PDF text"""
    __tablename__ = "text_chunks"
    
    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    
    # Relationships
    document = relationship("DocumentModel", back_populates="text_chunks")


class AnnotationModel(Base):
    """Annotation table"""
    __tablename__ = "annotations"
    
    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    page_num = Column(Integer, nullable=False)
    type = Column(String, nullable=False)  # 'highlight', 'note', 'rectangle', 'circle', 'arrow', 'freehand'
    coordinates = Column(JSON, nullable=False)
    content = Column(Text, nullable=False)
    color = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    
    # Relationships
    user = relationship("UserModel", back_populates="annotations")
    document = relationship("DocumentModel", back_populates="annotations")


class APIRequestModel(Base):
    """API request tracking table for monitoring and rate limiting"""
    __tablename__ = "api_requests"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = Column(String, nullable=False, index=True)
    method = Column(String, nullable=False)  # GET, POST, PUT, DELETE
    status_code = Column(Integer, nullable=False)
    request_data = Column(JSON, default={})
    response_data = Column(JSON, default={})
    error_message = Column(Text, nullable=True)
    duration_ms = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # Relationships
    user = relationship("UserModel", back_populates="api_requests")


# ============================================================================
# Pydantic Schemas (Request/Response Models)
# ============================================================================


class User(BaseModel):
    """User schema"""
    id: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """User creation request"""
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c.isalpha() for c in v):
            raise ValueError('Password must contain at least one letter')
        return v


class UserResponse(BaseModel):
    """User response (without password)"""
    id: str
    email: EmailStr
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    email: Optional[str] = None


class Document(BaseModel):
    """Document schema"""
    id: str
    user_id: str
    filename: str
    total_pages: int
    upload_date: datetime
    pdf_data: str
    metadata: Dict[str, Any] = {}
    
    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    """Document creation request"""
    filename: str
    total_pages: int
    pdf_data: str
    metadata: Dict[str, Any] = {}


class DocumentResponse(BaseModel):
    """Document response (without PDF data)"""
    id: str
    user_id: str
    filename: str
    total_pages: int
    upload_date: datetime
    metadata: Dict[str, Any]
    
    class Config:
        from_attributes = True


class DocumentDetail(BaseModel):
    """Document detail response (with PDF data)"""
    id: str
    user_id: str
    filename: str
    total_pages: int
    upload_date: datetime
    pdf_data: str
    metadata: Dict[str, Any]
    
    class Config:
        from_attributes = True


class Coordinates(BaseModel):
    """Coordinates for text extraction"""
    x: float
    y: float
    width: float
    height: float


class Extraction(BaseModel):
    """Extraction schema"""
    id: str
    document_id: str
    user_id: str
    field_name: str
    text: str
    page: int
    coordinates: Coordinates
    method: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class ExtractionCreate(BaseModel):
    """Extraction creation request"""
    document_id: str
    field_name: str
    text: str
    page: int
    coordinates: Coordinates
    method: str


class ExtractionBatchCreate(BaseModel):
    """Batch extraction creation request"""
    document_id: str
    extractions: List[ExtractionCreate]


class ExtractionResponse(BaseModel):
    """Extraction response"""
    id: str
    document_id: str
    user_id: str
    field_name: str
    text: str
    page: int
    coordinates: Coordinates
    method: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class TextChunk(BaseModel):
    """Text chunk schema"""
    id: str
    document_id: str
    page_number: int
    chunk_index: int
    text: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class TextChunkCreate(BaseModel):
    """Text chunk creation request"""
    document_id: str
    page_number: int
    chunk_index: int
    text: str


class Annotation(BaseModel):
    """Annotation schema"""
    id: str
    document_id: str
    user_id: str
    page_num: int
    type: str
    coordinates: Dict[str, Any]
    content: str
    color: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class AnnotationCreate(BaseModel):
    """Annotation creation request"""
    document_id: str
    page_num: int
    type: str
    coordinates: Dict[str, Any]
    content: str
    color: str


class AnnotationUpdate(BaseModel):
    """Annotation update request"""
    coordinates: Optional[Dict[str, Any]] = None
    content: Optional[str] = None
    color: Optional[str] = None


class AnnotationResponse(BaseModel):
    """Annotation response"""
    id: str
    document_id: str
    user_id: str
    page_num: int
    type: str
    coordinates: Dict[str, Any]
    content: str
    color: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class APIRequest(BaseModel):
    """API request schema"""
    id: str
    user_id: str
    endpoint: str
    method: str
    status_code: int
    request_data: Dict[str, Any] = {}
    response_data: Dict[str, Any] = {}
    error_message: Optional[str] = None
    duration_ms: float
    timestamp: datetime
    
    class Config:
        from_attributes = True


class PICORequest(BaseModel):
    """PICO-T generation request"""
    document_id: str
    pdf_text: str


class PICOResponse(BaseModel):
    """PICO-T generation response"""
    population: str
    intervention: str
    comparator: str
    outcomes: str
    timing: str
    study_type: str


class SummaryRequest(BaseModel):
    """Summary generation request"""
    document_id: str
    pdf_text: str


class SummaryResponse(BaseModel):
    """Summary generation response"""
    summary: str


class ValidationRequest(BaseModel):
    """Field validation request"""
    document_id: str
    field_id: str
    field_value: str
    pdf_text: str


class ValidationResponse(BaseModel):
    """Field validation response"""
    is_supported: bool
    quote: str
    confidence: float


class MetadataRequest(BaseModel):
    """Metadata extraction request"""
    document_id: str
    pdf_text: str


class MetadataResponse(BaseModel):
    """Metadata extraction response"""
    doi: Optional[str] = None
    pmid: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None


class TableExtractionRequest(BaseModel):
    """Table extraction request"""
    document_id: str
    pdf_text: str


class TableData(BaseModel):
    """Table data structure"""
    title: str
    description: str
    data: List[List[str]]


class TableExtractionResponse(BaseModel):
    """Table extraction response"""
    tables: List[TableData]


class ImageAnalysisRequest(BaseModel):
    """Image analysis request"""
    document_id: str
    image_base64: str
    prompt: str


class ImageAnalysisResponse(BaseModel):
    """Image analysis response"""
    analysis: str


class DeepAnalysisRequest(BaseModel):
    """Deep analysis request"""
    document_id: str
    pdf_text: str
    prompt: str


class DeepAnalysisResponse(BaseModel):
    """Deep analysis response"""
    analysis: str
