"""
Gemini API proxy routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import google.generativeai as genai
from typing import Dict, Any
from app import models, schemas, auth
from app.database import get_db
from app.config import get_settings
from app.middleware import gemini_circuit_breaker

router = APIRouter(prefix="/api/gemini", tags=["gemini"])
settings = get_settings()

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)


@router.post("/generate", response_model=schemas.GeminiResponse)
async def generate_content(
    request: schemas.GeminiRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Proxy endpoint for Gemini API content generation
    Keeps API key secure on server-side
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API key not configured"
        )
    
    try:
        def call_gemini():
            model = genai.GenerativeModel(request.model)
            
            generation_config = request.config or {}
            
            response = model.generate_content(
                request.contents,
                generation_config=generation_config
            )
            
            return response
        
        response = gemini_circuit_breaker.call(call_gemini)
        
        api_request = models.APIRequest(
            user_id=current_user.id,
            endpoint="/api/gemini/generate",
            method="POST",
            status_code=200
        )
        db.add(api_request)
        db.commit()
        
        return {
            "text": response.text,
            "model": request.model,
            "usage": {
                "prompt_tokens": response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else None,
                "completion_tokens": response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else None,
            }
        }
        
    except Exception as e:
        api_request = models.APIRequest(
            user_id=current_user.id,
            endpoint="/api/gemini/generate",
            method="POST",
            status_code=500
        )
        db.add(api_request)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini API error: {str(e)}"
        )


@router.post("/pico", response_model=schemas.PICOTResponse)
async def extract_pico(
    request: schemas.PICOTRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Extract PICO-T information from document text
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API key not configured"
        )
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        system_prompt = """You are an expert clinical research assistant specializing in systematic reviews. 
Your task is to extract PICO-TT (Population, Intervention, Comparator, Outcomes, Timing, and sTudy Type) 
information from the provided clinical study text using the PICO-TT framework methodology. 
This framework is essential for systematic review quality and research reproducibility. 
Return the information as a JSON object. Be concise and accurate. 
If information is not found, return an empty string for that field."""
        
        response = model.generate_content(
            f"{system_prompt}\n\nHere is the clinical study text:\n\n{request.document_text}",
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "population": {"type": "string"},
                        "intervention": {"type": "string"},
                        "comparator": {"type": "string"},
                        "outcomes": {"type": "string"},
                        "timing": {"type": "string"},
                        "studyType": {"type": "string"}
                    }
                }
            }
        )
        
        import json
        data = json.loads(response.text)
        
        return data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PICO-T extraction error: {str(e)}"
        )


@router.post("/validate", response_model=schemas.ValidationResponse)
async def validate_field(
    request: schemas.ValidationRequest,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Validate a field's content against the PDF text
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API key not configured"
        )
    
    try:
        model = genai.GenerativeModel("gemini-2.5-pro")
        
        system_prompt = """You are a fact-checking assistant. Your task is to verify if the given claim 
is supported by the provided document text. Return a JSON object with:
- is_supported: boolean indicating if the claim is supported
- quote: the exact quote from the document that supports or contradicts the claim
- confidence: a float between 0 and 1 indicating your confidence in the assessment"""
        
        response = model.generate_content(
            f"{system_prompt}\n\nClaim: {request.field_value}\n\nDocument text:\n\n{request.document_text}",
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "is_supported": {"type": "boolean"},
                        "quote": {"type": "string"},
                        "confidence": {"type": "number"}
                    }
                }
            }
        )
        
        import json
        data = json.loads(response.text)
        
        return data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation error: {str(e)}"
        )


@router.post("/metadata", response_model=schemas.MetadataResponse)
async def find_metadata(
    request: schemas.MetadataRequest,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Find study metadata (DOI, PMID, journal, year) using Google Search grounding
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API key not configured"
        )
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        system_prompt = """You are a research librarian assistant. Extract the following metadata from the study:
- DOI (Digital Object Identifier)
- PMID (PubMed ID)
- Journal name
- Publication year
Use Google Search if needed to find accurate information. Return as JSON."""
        
        response = model.generate_content(
            f"{system_prompt}\n\nStudy text:\n\n{request.document_text[:2000]}",
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "doi": {"type": "string"},
                        "pmid": {"type": "string"},
                        "journal": {"type": "string"},
                        "year": {"type": "string"}
                    }
                }
            },
            tools=[{"google_search": {}}]
        )
        
        import json
        data = json.loads(response.text)
        
        return data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Metadata search error: {str(e)}"
        )
