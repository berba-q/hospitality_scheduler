from datetime import datetime
from typing import Optional, List
import uuid
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    tenant_name: str


class UserRead(UserBase):
    id: uuid.UUID
    is_manager: bool

    class Config:
        from_attributes = True


class FacilityCreate(BaseModel):
    name: str
    location: Optional[str] = None


class FacilityRead(FacilityCreate):
    id: uuid.UUID

    class Config:
        orm_mode = True


class StaffCreate(BaseModel):
    full_name: str
    role: str
    skill_level: int = 1
    phone: Optional[str] = None
    facility_id: uuid.UUID


class StaffRead(StaffCreate):
    id: uuid.UUID

    class Config:
        orm_mode = True