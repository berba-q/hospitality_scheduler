from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # ✅ Required fields - no Field() needed for simple cases
    API_V1_STR: str = "/v1"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # one week
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "scheduler"
    POSTGRES_USER: str = "scheduler"
    POSTGRES_PASSWORD: str
    DATABASE_URL: str
    
    # ✅ Fields with defaults
    REDIS_URL: str = "redis://redis:6379/0"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # ==================== ENCRYPTION CONFIGURATION ====================
    # ✅ Optional fields with defaults
    ENCRYPTION_KEY: Optional[str] = None
    ENCRYPTION_ENABLED: bool = True
    ENCRYPTION_ALGORITHM: str = "Fernet"
    ENCRYPTION_ITERATIONS: int = 100000
    ENCRYPTION_SALT: str = "hospitality_scheduler_salt_v1"
    
    # Firebase Configuration
    FIREBASE_SERVICE_ACCOUNT_PATH: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None
    
    # Twilio WhatsApp Configuration  
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_NUMBER: Optional[str] = None
    DEFAULT_COUNTRY_CODE: Optional[str]="+39"
    
    # Optional: Email settings
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # New scheduling-related settings
    SMART_SCHEDULING_ENABLED: bool = True
    MAX_OPTIMIZATION_ITERATIONS: int = 100
    ANALYTICS_CACHE_TTL: int = 3600  # 1 hour in seconds
    CONFLICT_CHECK_ENABLED: bool = True
    
    # ==================== SECURITY SETTINGS ====================
    SESSION_TIMEOUT_HOURS: int = 24
    AUDIT_LOG_ENABLED: bool = True
    AUDIT_LOG_RETENTION_DAYS: int = 365
    ENCRYPTION_RATE_LIMIT: int = 100  # per hour

    # ✅ Pydantic v2 model configuration
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,  # Allow case-insensitive env vars
        "extra": "ignore"  # Ignore extra environment variables
    }
    
    def get_encryption_key(self) -> Optional[str]:
        """Get the encryption key, preferring ENCRYPTION_KEY over SECRET_KEY"""
        return self.ENCRYPTION_KEY or self.SECRET_KEY
    
    def is_encryption_configured(self) -> bool:
        """Check if encryption is properly configured"""
        return self.ENCRYPTION_ENABLED and bool(self.get_encryption_key())


@lru_cache()
def get_settings() -> Settings:
    """Get application settings. Required env vars: SECRET_KEY, POSTGRES_PASSWORD, DATABASE_URL"""
    try:
        return Settings() # type: ignore
    except Exception as e:
        raise RuntimeError(
            f"Failed to load settings. Make sure environment variables are set: {e}"
        ) from e