"""
Extraction management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/api/extractions", tags=["extractions"])


@router.post("/", response_model=schemas.ExtractionResponse, status_code=status.HTTP_201_CREATED)
async def create_extraction(
    extraction: schemas.ExtractionCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new extraction"""
    document = db.query(models.Document).filter(
        models.Document.id == extraction.document_id,
        models.Document.user_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    db_extraction = models.Extraction(
        user_id=current_user.id,
        document_id=extraction.document_id,
        field_name=extraction.field_name,
        text=extraction.text,
        page=extraction.page,
        coordinates=extraction.coordinates,
        method=extraction.method
    )
    
    db.add(db_extraction)
    db.commit()
    db.refresh(db_extraction)
    
    return db_extraction


@router.get("/", response_model=List[schemas.ExtractionResponse])
async def list_extractions(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
    document_id: int = None,
    skip: int = 0,
    limit: int = 100
):
    """List extractions for current user"""
    query = db.query(models.Extraction).filter(
        models.Extraction.user_id == current_user.id
    )
    
    if document_id:
        query = query.filter(models.Extraction.document_id == document_id)
    
    extractions = query.offset(skip).limit(limit).all()
    
    return extractions


@router.get("/{extraction_id}", response_model=schemas.ExtractionResponse)
async def get_extraction(
    extraction_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific extraction"""
    extraction = db.query(models.Extraction).filter(
        models.Extraction.id == extraction_id,
        models.Extraction.user_id == current_user.id
    ).first()
    
    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction not found"
        )
    
    return extraction


@router.delete("/{extraction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_extraction(
    extraction_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete an extraction"""
    extraction = db.query(models.Extraction).filter(
        models.Extraction.id == extraction_id,
        models.Extraction.user_id == current_user.id
    ).first()
    
    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extraction not found"
        )
    
    db.delete(extraction)
    db.commit()
    
    return None


@router.post("/batch", response_model=List[schemas.ExtractionResponse], status_code=status.HTTP_201_CREATED)
async def create_batch_extractions(
    extractions: List[schemas.ExtractionCreate],
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create multiple extractions at once"""
    db_extractions = []
    
    for extraction in extractions:
        document = db.query(models.Document).filter(
            models.Document.id == extraction.document_id,
            models.Document.user_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {extraction.document_id} not found"
            )
        
        db_extraction = models.Extraction(
            user_id=current_user.id,
            document_id=extraction.document_id,
            field_name=extraction.field_name,
            text=extraction.text,
            page=extraction.page,
            coordinates=extraction.coordinates,
            method=extraction.method
        )
        
        db_extractions.append(db_extraction)
    
    db.add_all(db_extractions)
    db.commit()
    
    for extraction in db_extractions:
        db.refresh(extraction)
    
    return db_extractions
