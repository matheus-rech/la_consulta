"""
La Consulta Backend API
Main application entry point with all routers configured
"""
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import auth, ai, documents, extractions, annotations
from .models import db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events"""
    # Startup
    logger.info("Starting La Consulta Backend API")
    logger.info("In-memory database initialized with disk persistence")
    
    yield
    
    # Shutdown
    logger.info("Shutting down La Consulta Backend API")
    logger.info("Persisting in-memory database to disk...")
    db.persist()
    logger.info("Database persisted successfully")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for La Consulta Clinical Extractor - Secure AI proxy and data management",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(auth.router)
app.include_router(ai.router)
app.include_router(documents.router)
app.include_router(extractions.router)
app.include_router(annotations.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "La Consulta Backend API",
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "debug": settings.DEBUG
    }


@app.get("/healthz")
async def healthz():
    """Health check endpoint for deployment"""
    return {"status": "ok"}
