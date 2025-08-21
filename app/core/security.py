from datetime import datetime, timedelta, timezone
import secrets
from typing import Any, Dict, Optional

from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError
from passlib.context import CryptContext

from .config import get_settings

pwd_context = CryptContext(
    schemes=["argon2"],           
    deprecated="auto",
    argon2__rounds=4               # fast dev setting; TODO: raise in prod 
)
ALGORITHM = "HS256"


def create_access_token(subject: str, expires_delta: Optional[int] = None) -> str:
    if expires_delta is None:
        expires_delta = get_settings().ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_delta)
    to_encode: dict[str, Any] = {
        "exp": expire, 
        "sub": str(subject),
        "iat": datetime.now(timezone.utc), 
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, get_settings().SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, get_settings().SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise ValueError("Invalid token type")
        return payload
    except ExpiredSignatureError:
        raise ValueError("Token has expired")
    except JWTError:
        raise ValueError("Invalid token")

def hash_password(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)

def generate_secure_token(length: int = 32) -> str:
    """Generate cryptographically secure random token"""
    return secrets.token_urlsafe(length)

def validate_password_strength(password: str, min_length: int = 8) -> Dict[str, Any]:
    """Validate password strength and return detailed feedback"""
    checks = {
        "length": len(password) >= min_length,
        "uppercase": any(c.isupper() for c in password),
        "lowercase": any(c.islower() for c in password),
        "digit": any(c.isdigit() for c in password),
        "special": any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    }
    
    score = sum(checks.values())
    strength_levels = {
        0: "very_weak",
        1: "weak", 
        2: "weak",
        3: "medium",
        4: "strong",
        5: "very_strong"
    }
    
    return {
        "strength": strength_levels[score],
        "score": score,
        "checks": checks,
        "is_valid": score >= 4  # Require at least 4/5 checks
    }

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# helper to hash session tokens
def hash_session_token(token: str) -> str:
    """Hash session token for database storage"""
    import hashlib
    return hashlib.sha256(token.encode()).hexdigest()

# Production security configuration
def get_production_pwd_context():
    """Get production-grade password context"""
    return CryptContext(
        schemes=["argon2"],
        deprecated="auto",
        argon2__rounds=12,           # Higher rounds for production
        argon2__memory_cost=102400,  # 100MB memory cost
        argon2__parallelism=2,       # Use 2 threads
    )

# ------------------------------------------------------------------
# Back‑compat: older code imports `hash_password`
hash_password = get_password_hash
# ------------------------------------------------------------------