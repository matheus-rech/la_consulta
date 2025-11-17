"""
Configuration settings for the backend application
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    GEMINI_API_KEY: str
    
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_DAYS: int = 30  # 30 days token expiration
    
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Database settings
    DATABASE_URL: str = "sqlite:///./la_consulta.db"  # Default to SQLite, can be overridden with PostgreSQL
    
    RATE_LIMIT_PER_MINUTE: int = 60  # 60 requests per minute as specified
    AI_RATE_LIMIT_PER_MINUTE: int = 10
    
    APP_NAME: str = "La Consulta Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False  # False by default for security
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
