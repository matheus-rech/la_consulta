"""
In-memory database models for the application
"""
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, EmailStr
import uuid
import json
import logging
from pathlib import Path



class User(BaseModel):
    """User model"""
    id: str
    email: EmailStr
    password_hash: str
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    """User creation request"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response (without password)"""
    id: str
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    email: Optional[str] = None



class Document(BaseModel):
    """Document model"""
    id: str
    user_id: str
    filename: str
    total_pages: int
    upload_date: datetime
    pdf_data: str  # Base64 encoded PDF data
    metadata: Dict[str, Any] = {}


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


class DocumentDetail(BaseModel):
    """Document detail response (with PDF data)"""
    id: str
    user_id: str
    filename: str
    total_pages: int
    upload_date: datetime
    pdf_data: str
    metadata: Dict[str, Any]



class Coordinates(BaseModel):
    """Coordinates for text extraction"""
    x: float
    y: float
    width: float
    height: float


class Extraction(BaseModel):
    """Extraction model"""
    id: str
    document_id: str
    user_id: str
    field_name: str
    text: str
    page: int
    coordinates: Coordinates
    method: str  # 'manual', 'gemini-pico', 'gemini-summary', etc.
    timestamp: datetime


class ExtractionCreate(BaseModel):
    """Extraction creation request"""
    document_id: str
    field_name: str
    text: str
    page: int
    coordinates: Coordinates
    method: str


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



class Annotation(BaseModel):
    """Annotation model"""
    id: str
    document_id: str
    user_id: str
    page_num: int
    type: str  # 'highlight', 'note', 'rectangle', 'circle', 'arrow', 'freehand'
    coordinates: Dict[str, Any]
    content: str
    color: str
    created_at: datetime


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



class InMemoryDatabase:
    """Simple in-memory database for proof of concept with disk persistence"""
    
    def __init__(self, persistence_dir: str = "data"):
        self.users: Dict[str, User] = {}
        self.documents: Dict[str, Document] = {}
        self.extractions: Dict[str, Extraction] = {}
        self.annotations: Dict[str, Annotation] = {}
        
        self.users_by_email: Dict[str, str] = {}  # email -> user_id
        self.documents_by_user: Dict[str, List[str]] = {}  # user_id -> [document_ids]
        self.extractions_by_document: Dict[str, List[str]] = {}  # document_id -> [extraction_ids]
        self.extractions_by_user: Dict[str, List[str]] = {}  # user_id -> [extraction_ids]
        self.annotations_by_document: Dict[str, List[str]] = {}  # document_id -> [annotation_ids]
        self.annotations_by_user: Dict[str, List[str]] = {}  # user_id -> [annotation_ids]
        
        # Set up logging
        self.logger = logging.getLogger(__name__)
        
        # Persistence configuration
        self.persistence_dir = Path(persistence_dir)
        self.persistence_enabled = True
        
        # Log warning about in-memory database limitations
        self.logger.warning(
            "=" * 80
        )
        self.logger.warning(
            "IMPORTANT: In-memory database is active (proof of concept mode)"
        )
        self.logger.warning(
            "Data persistence: Automatic snapshots to disk are enabled as a stopgap measure"
        )
        self.logger.warning(
            "Persistence directory: %s", self.persistence_dir.absolute()
        )
        self.logger.warning(
            "LIMITATION: In production, migrate to a proper database (PostgreSQL/MongoDB)"
        )
        self.logger.warning(
            "WARNING: Disk persistence is NOT a replacement for proper database replication"
        )
        self.logger.warning(
            "=" * 80
        )
        
        # Create persistence directory if it doesn't exist
        if self.persistence_enabled:
            self.persistence_dir.mkdir(parents=True, exist_ok=True)
            # Attempt to load existing data
            self._load_from_disk()
    
    def generate_id(self) -> str:
        """Generate a unique ID"""
        return str(uuid.uuid4())
    
    def _serialize_for_json(self, data: Any) -> Any:
        """Convert Pydantic models and datetime objects to JSON-serializable format"""
        if isinstance(data, BaseModel):
            return data.model_dump(mode='json')
        elif isinstance(data, datetime):
            return data.isoformat()
        elif isinstance(data, dict):
            return {k: self._serialize_for_json(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._serialize_for_json(item) for item in data]
        return data
    
    def _deserialize_from_json(self, data: dict, model_class) -> Any:
        """Convert JSON data back to Pydantic models"""
        if model_class is None:
            return data
        
        # Handle datetime fields
        if hasattr(model_class, 'model_fields'):
            for field_name, field_info in model_class.model_fields.items():
                if field_name in data:
                    # Check if field is datetime
                    if field_info.annotation == datetime or (
                        hasattr(field_info.annotation, '__origin__') and 
                        field_info.annotation.__origin__ == datetime
                    ):
                        if isinstance(data[field_name], str):
                            data[field_name] = datetime.fromisoformat(data[field_name])
        
        return model_class(**data)
    
    def _save_to_disk(self):
        """Persist current database state to disk"""
        if not self.persistence_enabled:
            return
        
        try:
            # Serialize each collection
            data = {
                'users': self._serialize_for_json(self.users),
                'documents': self._serialize_for_json(self.documents),
                'extractions': self._serialize_for_json(self.extractions),
                'annotations': self._serialize_for_json(self.annotations),
                'users_by_email': self.users_by_email,
                'documents_by_user': self.documents_by_user,
                'extractions_by_document': self.extractions_by_document,
                'extractions_by_user': self.extractions_by_user,
                'annotations_by_document': self.annotations_by_document,
                'annotations_by_user': self.annotations_by_user,
            }
            
            # Write to temporary file first, then rename (atomic operation)
            temp_file = self.persistence_dir / "db_snapshot.json.tmp"
            final_file = self.persistence_dir / "db_snapshot.json"
            
            with open(temp_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            # Atomic rename
            temp_file.replace(final_file)
            
            self.logger.debug("Database snapshot saved to %s", final_file)
        except Exception as e:
            self.logger.error("Failed to save database snapshot: %s", str(e))
    
    def _load_from_disk(self):
        """Load database state from disk if available"""
        if not self.persistence_enabled:
            return
        
        snapshot_file = self.persistence_dir / "db_snapshot.json"
        
        if not snapshot_file.exists():
            self.logger.info("No existing database snapshot found. Starting with empty database.")
            return
        
        try:
            with open(snapshot_file, 'r') as f:
                data = json.load(f)
            
            # Deserialize each collection
            self.users = {
                k: self._deserialize_from_json(v, User) 
                for k, v in data.get('users', {}).items()
            }
            self.documents = {
                k: self._deserialize_from_json(v, Document) 
                for k, v in data.get('documents', {}).items()
            }
            self.extractions = {
                k: self._deserialize_from_json(v, Extraction) 
                for k, v in data.get('extractions', {}).items()
            }
            self.annotations = {
                k: self._deserialize_from_json(v, Annotation) 
                for k, v in data.get('annotations', {}).items()
            }
            
            # Load index mappings
            self.users_by_email = data.get('users_by_email', {})
            self.documents_by_user = data.get('documents_by_user', {})
            self.extractions_by_document = data.get('extractions_by_document', {})
            self.extractions_by_user = data.get('extractions_by_user', {})
            self.annotations_by_document = data.get('annotations_by_document', {})
            self.annotations_by_user = data.get('annotations_by_user', {})
            
            # Log recovery stats
            self.logger.info("Database snapshot loaded successfully from %s", snapshot_file)
            self.logger.info("Recovered: %d users, %d documents, %d extractions, %d annotations",
                           len(self.users), len(self.documents), 
                           len(self.extractions), len(self.annotations))
        except Exception as e:
            self.logger.error("Failed to load database snapshot: %s. Starting with empty database.", str(e))
    
    def persist(self):
        """Manually trigger persistence to disk"""
        self._save_to_disk()


db = InMemoryDatabase()
