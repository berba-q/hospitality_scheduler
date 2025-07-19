from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import AnyUrl, Field


class Settings(BaseSettings):
    API_V1_STR: str = "/v1"
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # one week
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "scheduler"
    POSTGRES_USER: str = "scheduler"
    POSTGRES_PASSWORD: str = Field(..., env="POSTGRES_PASSWORD")
    DATABASE_URL: str = Field(..., env="DATABASE_URL") 
    REDIS_URL: str = Field("redis://redis:6379/0", env="REDIS_URL")
    
    # Firebase Configuration
    FIREBASE_SERVICE_ACCOUNT_PATH: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None
    
    # Twilio WhatsApp Configuration  
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_NUMBER: Optional[str] = None
    
    # Optional: Email settings (for future)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # New scheduling-related settings
    SMART_SCHEDULING_ENABLED: bool = Field(default=True, env="SMART_SCHEDULING_ENABLED")
    MAX_OPTIMIZATION_ITERATIONS: int = Field(default=100, env="MAX_OPTIMIZATION_ITERATIONS")
    ANALYTICS_CACHE_TTL: int = Field(default=3600, env="ANALYTICS_CACHE_TTL")  # 1 hour in seconds
    CONFLICT_CHECK_ENABLED: bool = Field(default=True, env="CONFLICT_CHECK_ENABLED")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()