"""
Clinical Extractor Backend API
FastAPI application with authentication, database, and Gemini API proxy
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.config import get_settings
from app.database import init_db
from app.middleware import rate_limit_middleware
from app.routers import auth, gemini, documents, extractions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events"""
    logger.info("Starting Clinical Extractor Backend API...")
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")
    
    yield
    
    logger.info("Shutting down Clinical Extractor Backend API...")


app = FastAPI(
    title="Clinical Extractor API",
    description="Backend API for Clinical Extractor with authentication, database, and Gemini AI proxy",
    version="1.0.0",
    lifespan=lifespan
)

cors_origins = settings.CORS_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(rate_limit_middleware)

app.include_router(auth.router)
app.include_router(gemini.router)
app.include_router(documents.router)
app.include_router(extractions.router)


@app.get("/healthz")
async def healthz():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "clinical-extractor-backend",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Clinical Extractor Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/healthz",
        "endpoints": {
            "authentication": "/api/auth",
            "gemini_proxy": "/api/gemini",
            "documents": "/api/documents",
            "extractions": "/api/extractions"
        }
    }


@app.get("/api/info")
async def api_info():
    """Get API configuration information"""
    return {
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "rate_limit_per_minute": settings.RATE_LIMIT_PER_MINUTE,
        "max_pdf_size_mb": settings.MAX_PDF_SIZE_MB,
        "features": {
            "authentication": True,
            "database": True,
            "gemini_proxy": True,
            "rate_limiting": True,
            "cloud_storage": bool(settings.SUPABASE_URL)
        }
    }
