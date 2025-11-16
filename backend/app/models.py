"""
Database models for Clinical Extractor
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    extractions = relationship("Extraction", back_populates="user", cascade="all, delete-orphan")


class Document(Base):
    """PDF document model"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String)  # Cloud storage path
    file_size = Column(Integer)  # Size in bytes
    total_pages = Column(Integer)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    doc_metadata = Column(JSON)  # Store additional metadata
    
    user = relationship("User", back_populates="documents")
    extractions = relationship("Extraction", back_populates="document", cascade="all, delete-orphan")
    text_chunks = relationship("TextChunk", back_populates="document", cascade="all, delete-orphan")


class Extraction(Base):
    """Extraction tracking model"""
    __tablename__ = "extractions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    field_name = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    page = Column(Integer)
    coordinates = Column(JSON)  # {x, y, width, height}
    method = Column(String)  # 'manual', 'gemini-pico', 'gemini-summary', etc.
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="extractions")
    document = relationship("Document", back_populates="extractions")


class TextChunk(Base):
    """Text chunks with coordinates for provenance"""
    __tablename__ = "text_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_width = Column(Float, nullable=False)
    bbox_height = Column(Float, nullable=False)
    
    font_name = Column(String)
    font_size = Column(Float)
    is_heading = Column(Boolean, default=False)
    is_bold = Column(Boolean, default=False)
    
    confidence = Column(Float, default=1.0)
    extraction_method = Column(String, default='pdfjs')
    
    document = relationship("Document", back_populates="text_chunks")


class APIRequest(Base):
    """API request tracking for rate limiting"""
    __tablename__ = "api_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(String, nullable=False)
    method = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    response_time_ms = Column(Integer)
    status_code = Column(Integer)
