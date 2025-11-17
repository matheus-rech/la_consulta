"""
AI proxy endpoints - Securely proxy Gemini API calls
This is the critical security fix: API key is now server-side only
"""
from fastapi import APIRouter, HTTPException, status, Depends
import google.generativeai as genai
from ..models import (
    User,
    PICORequest, PICOResponse,
    SummaryRequest, SummaryResponse,
    ValidationRequest, ValidationResponse,
    MetadataRequest, MetadataResponse,
    TableExtractionRequest, TableExtractionResponse, TableData,
    ImageAnalysisRequest, ImageAnalysisResponse,
    DeepAnalysisRequest, DeepAnalysisResponse
)
from ..auth import get_current_user
from ..config import settings
from ..rate_limiter import rate_limiter

router = APIRouter(prefix="/api/ai", tags=["ai"])

genai.configure(api_key=settings.GEMINI_API_KEY)


@router.post("/generate-pico", response_model=PICOResponse)
async def generate_pico(request: PICORequest, current_user: User = Depends(get_current_user)):
    """Generate PICO-T extraction using Gemini AI"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""You are a clinical research data extraction expert. Extract PICO-T elements from this research paper.

DOCUMENT TEXT:
{request.pdf_text[:15000]}

Extract the following in JSON format:
{{
    "population": "Description of study population",
    "intervention": "Primary intervention or exposure",
    "comparator": "Control or comparison group",
    "outcomes": "Primary and secondary outcomes",
    "timing": "Study duration and follow-up periods",
    "study_type": "Study design (RCT, cohort, case-control, etc.)"
}}

Return ONLY valid JSON, no additional text."""

        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        )
        
        import json
        result = json.loads(response.text)
        
        return PICOResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}"
        )


@router.post("/generate-summary", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest, current_user: User = Depends(get_current_user)):
    """Generate document summary using Gemini AI"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""Summarize the key findings of this clinical research paper in 2-3 paragraphs.

DOCUMENT TEXT:
{request.pdf_text[:15000]}

Provide a clear, concise summary focusing on:
1. Study objective and design
2. Main findings and results
3. Clinical implications"""

        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.3}
        )
        
        return SummaryResponse(summary=response.text)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}"
        )


@router.post("/validate-field", response_model=ValidationResponse)
async def validate_field(request: ValidationRequest, current_user: User = Depends(get_current_user)):
    """Validate extracted field with AI"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""Validate if the following extracted value is supported by the document.

FIELD: {request.field_id}
EXTRACTED VALUE: {request.field_value}

DOCUMENT TEXT:
{request.pdf_text[:15000]}

Return JSON:
{{
    "is_supported": true/false,
    "quote": "Exact quote from document that supports or contradicts this",
    "confidence": 0.0-1.0
}}"""

        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        )
        
        import json
        result = json.loads(response.text)
        
        return ValidationResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI validation failed: {str(e)}"
        )


@router.post("/find-metadata", response_model=MetadataResponse)
async def find_metadata(request: MetadataRequest, current_user: User = Depends(get_current_user)):
    """Find document metadata (DOI, PMID, etc.) using Gemini AI"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""Extract bibliographic metadata from this research paper.

DOCUMENT TEXT:
{request.pdf_text[:5000]}

Return JSON:
{{
    "doi": "DOI if found (format: 10.xxxx/xxxxx)",
    "pmid": "PubMed ID if found (numeric only)",
    "journal": "Journal name",
    "year": publication year (integer)
}}

Return null for fields not found."""

        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.1,
                "response_mime_type": "application/json"
            }
        )
        
        import json
        result = json.loads(response.text)
        
        return MetadataResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI metadata extraction failed: {str(e)}"
        )


@router.post("/extract-tables", response_model=TableExtractionResponse)
async def extract_tables(request: TableExtractionRequest, current_user: User = Depends(get_current_user)):
    """Extract tables from document using Gemini AI"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""Extract all tables from this research paper.

DOCUMENT TEXT:
{request.pdf_text[:15000]}

Return JSON array:
{{
    "tables": [
        {{
            "title": "Table title or caption",
            "description": "Brief description of table contents",
            "data": [["header1", "header2"], ["row1col1", "row1col2"]]
        }}
    ]
}}"""

        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        )
        
        import json
        result = json.loads(response.text)
        
        return TableExtractionResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI table extraction failed: {str(e)}"
        )


@router.post("/analyze-image", response_model=ImageAnalysisResponse)
async def analyze_image(request: ImageAnalysisRequest, current_user: User = Depends(get_current_user)):
    """Analyze image with AI"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        import base64
        image_data = base64.b64decode(request.image_base64.split(',')[1] if ',' in request.image_base64 else request.image_base64)
        
        response = model.generate_content([
            request.prompt,
            {"mime_type": "image/png", "data": image_data}
        ])
        
        return ImageAnalysisResponse(analysis=response.text)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI image analysis failed: {str(e)}"
        )


@router.post("/deep-analysis", response_model=DeepAnalysisResponse)
async def deep_analysis(request: DeepAnalysisRequest, current_user: User = Depends(get_current_user)):
    """Perform deep analysis with extended thinking"""
    rate_limiter.check_rate_limit(f"ai:{current_user.id}", settings.AI_RATE_LIMIT_PER_MINUTE)
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-thinking-exp-1219')
        
        prompt = f"""{request.prompt}

DOCUMENT TEXT:
{request.pdf_text[:15000]}"""

        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 2048
            }
        )
        
        return DeepAnalysisResponse(analysis=response.text)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI deep analysis failed: {str(e)}"
        )
