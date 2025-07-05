from datetime import datetime, timedelta
from typing import Any, Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from .config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def create_access_token(subject: str, expires_delta: Optional[int] = None) -> str:
    if expires_delta is None:
        expires_delta = get_settings().ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    to_encode: dict[str, Any] = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, get_settings().SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)