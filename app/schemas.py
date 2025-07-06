from datetime import datetime, date
from typing import Any, Dict, Optional, List
import uuid

from pydantic import BaseModel, EmailStr, ConfigDict, Field


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

class ScheduleConfigBase(BaseModel):
    """Base schedule configuration schema"""
    min_rest_hours: Optional[int] = Field(default=8, ge=4, le=24, description="Minimum hours between shifts")
    max_consecutive_days: Optional[int] = Field(default=5, ge=1, le=7, description="Maximum consecutive working days")
    max_weekly_hours: Optional[int] = Field(default=40, ge=1, le=80, description="Default maximum weekly hours")
    min_staff_per_shift: Optional[int] = Field(default=1, ge=1, le=20, description="Minimum staff required per shift")
    max_staff_per_shift: Optional[int] = Field(default=10, ge=1, le=50, description="Maximum staff allowed per shift")
    require_manager_per_shift: Optional[bool] = Field(default=False, description="Require at least one manager per shift")
    shift_role_requirements: Optional[Dict[str, Any]] = Field(
        default_factory=dict, 
        description="Role requirements per shift number"
    )
    allow_overtime: Optional[bool] = Field(default=False, description="Allow staff to work overtime")
    weekend_restrictions: Optional[bool] = Field(default=False, description="Apply special weekend rules")

class ScheduleConfigCreate(ScheduleConfigBase):
    """Schema for creating schedule configuration"""
    facility_id: uuid.UUID
    
class ScheduleConfigUpdate(ScheduleConfigBase):
    """Schema for updating schedule configuration - all fields optional"""
    min_rest_hours: Optional[int] = Field(default=None, ge=4, le=24)
    max_consecutive_days: Optional[int] = Field(default=None, ge=1, le=7)
    max_weekly_hours: Optional[int] = Field(default=None, ge=1, le=80)
    min_staff_per_shift: Optional[int] = Field(default=None, ge=1, le=20)
    max_staff_per_shift: Optional[int] = Field(default=None, ge=1, le=50)
    require_manager_per_shift: Optional[bool] = Field(default=None)
    shift_role_requirements: Optional[Dict[str, Any]] = Field(default=None)
    allow_overtime: Optional[bool] = Field(default=None)
    weekend_restrictions: Optional[bool] = Field(default=None)
    
class ScheduleConfigRead(ScheduleConfigBase):
    """Schema for reading schedule configuration"""
    id: uuid.UUID
    facility_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Enhanced preview request with configuration
class PreviewRequestWithConfig(BaseModel):
    """Enhanced preview request that can include custom constraints"""
    staff_ids: List[str]
    days: int = 7
    shifts_per_day: int = 3
    hours_per_shift: int = 8
    
    # Optional constraint overrides
    min_rest_hours: Optional[int] = None
    max_consecutive_days: Optional[int] = None
    require_manager_per_shift: Optional[bool] = None
    shift_role_requirements: Optional[Dict[str, Any]] = None

class ScheduleValidationResult(BaseModel):
    """Result of schedule validation"""
    is_valid: bool
    issues: List[str] = []
    warnings: List[str] = []
    staff_hours: Dict[str, int] = {}  # staff_id -> total_hours
    constraint_violations: List[str] = []