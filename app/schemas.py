from datetime import datetime, date
from typing import Optional, List
import uuid

from pydantic import BaseModel, EmailStr, ConfigDict


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

    model_config = ConfigDict(from_attributes=True)


class FacilityCreate(BaseModel):
    name: str
    location: Optional[str] = None


class FacilityRead(FacilityCreate):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class StaffCreate(BaseModel):
    full_name: str
    role: str
    skill_level: int = 1
    phone: Optional[str] = None
    facility_id: uuid.UUID


class StaffRead(StaffCreate):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)
        
class ShiftAssignmentRead(BaseModel):
    id: uuid.UUID
    day: int
    shift: int
    staff_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class ScheduleRead(BaseModel):
    id: uuid.UUID
    facility_id: uuid.UUID
    week_start: date

    model_config = ConfigDict(from_attributes=True)


class ScheduleDetail(ScheduleRead):
    assignments: List[ShiftAssignmentRead]

    model_config = ConfigDict(from_attributes=True)