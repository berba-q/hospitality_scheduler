from typing import Generator
from sqlmodel import Session, create_engine
from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer

from .core.config import get_settings
from .models import User
from .core.security import verify_password

settings = get_settings()

DATABASE_URL = (
    f"postgresql+psycopg2://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)
engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")


def get_db() -> Generator:
    with Session(engine) as session:
        yield session


from .core.security import ALGORITHM
from .schemas import TokenPayload


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)
    except JWTError:
        raise credentials_exception
    if token_data.sub is None:
        raise credentials_exception
    user = db.get(User, uuid.UUID(token_data.sub))
    if user is None or not user.is_active:
        raise credentials_exception
    return user
