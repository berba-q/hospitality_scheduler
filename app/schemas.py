from datetime import datetime, date
from typing import Any, Dict, Literal, Optional, List
import uuid

from pydantic import BaseModel, EmailStr, ConfigDict, Field, validator


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
    
class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    skill_level: Optional[int] = None
    phone: Optional[str] = None
    facility_id: Optional[str] = None
    weekly_hours_max: Optional[int] = None
    is_active: Optional[bool] = None

class StaffDuplicateCheck(BaseModel):
    full_name: str
    facility_id: str
        
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
    
class StaffUnavailabilityCreate(BaseModel):
    start: datetime
    end: datetime
    reason: Optional[str] = None
    is_recurring: bool = False
    
    @validator('end')
    def end_after_start(cls, v, values):
        if 'start' in values and v <= values['start']:
            raise ValueError('End time must be after start time')
        return v
    
    @validator('start')
    def start_not_in_past(cls, v):
        if v < datetime.utcnow():
            raise ValueError('Cannot set availability for past dates')
        return v

class StaffUnavailabilityUpdate(BaseModel):
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    reason: Optional[str] = None
    is_recurring: Optional[bool] = None
    
    @validator('end')
    def end_after_start(cls, v, values):
        if v and 'start' in values and values['start'] and v <= values['start']:
            raise ValueError('End time must be after start time')
        return v

class StaffUnavailabilityRead(BaseModel):
    id: uuid.UUID
    staff_id: uuid.UUID
    start: datetime
    end: datetime
    reason: Optional[str] = None
    is_recurring: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class StaffUnavailabilityWithStaff(StaffUnavailabilityRead):
    staff: "StaffRead"
    
    model_config = ConfigDict(from_attributes=True)

# Quick availability creation for common patterns
class QuickUnavailabilityCreate(BaseModel):
    pattern: str = Field(..., description="morning, afternoon, evening, fullday, custom")
    date: datetime = Field(..., description="Date for the unavailability") 
    reason: Optional[str] = None
    is_recurring: bool = False
    
    # For custom pattern
    custom_start_hour: Optional[int] = Field(None, ge=0, le=23)
    custom_end_hour: Optional[int] = Field(None, ge=1, le=24)
    
    @validator('custom_end_hour')
    def custom_end_after_start(cls, v, values):
        if values.get('pattern') == 'custom':
            if not values.get('custom_start_hour') or not v:
                raise ValueError('Custom pattern requires both start and end hours')
            if v <= values['custom_start_hour']:
                raise ValueError('End hour must be after start hour')
        return v

# Base swap request schemas
class SwapRequestCreate(BaseModel):
    schedule_id: uuid.UUID
    original_day: int = Field(ge=0, le=6, description="Day of week (0=Monday)")
    original_shift: int = Field(ge=0, le=2, description="Shift number (0=morning, 1=afternoon, 2=evening)")
    reason: str = Field(min_length=1, max_length=500)
    urgency: Literal["low", "normal", "high", "emergency"] = "normal"
    expires_at: Optional[datetime] = None

class SpecificSwapRequestCreate(SwapRequestCreate):
    """Request to swap with a specific staff member"""
    target_staff_id: uuid.UUID
    target_day: int = Field(ge=0, le=6)
    target_shift: int = Field(ge=0, le=2)
    swap_type: Literal["specific"] = "specific"

class AutoSwapRequestCreate(SwapRequestCreate):
    """Request for system to auto-assign coverage"""
    swap_type: Literal["auto"] = "auto"
    
    # For managers to specify which staff member is requesting
    requesting_staff_id: Optional[uuid.UUID] = None
    
    # Optional preferences for auto-assignment
    preferred_skills: Optional[list[str]] = None
    avoid_staff_ids: Optional[list[uuid.UUID]] = None

class SwapRequestUpdate(BaseModel):
    reason: Optional[str] = None
    urgency: Optional[Literal["low", "normal", "high", "emergency"]] = None
    expires_at: Optional[datetime] = None

class SwapRequestRead(BaseModel):
    id: uuid.UUID
    schedule_id: uuid.UUID
    requesting_staff_id: uuid.UUID
    original_day: int
    original_shift: int
    swap_type: str
    
    # Optional fields based on swap type
    target_staff_id: Optional[uuid.UUID] = None
    target_day: Optional[int] = None
    target_shift: Optional[int] = None
    assigned_staff_id: Optional[uuid.UUID] = None
    
    reason: str
    urgency: str
    status: str
    
    target_staff_accepted: Optional[bool] = None
    manager_approved: Optional[bool] = None
    manager_notes: Optional[str] = None
    
    created_at: datetime
    expires_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class SwapRequestWithDetails(SwapRequestRead):
    """Swap request with related staff info"""
    requesting_staff: "StaffRead"
    target_staff: Optional["StaffRead"] = None
    assigned_staff: Optional["StaffRead"] = None
    
    model_config = ConfigDict(from_attributes=True)

# Manager action schemas
class ManagerSwapDecision(BaseModel):
    approved: bool
    notes: Optional[str] = None

class StaffSwapResponse(BaseModel):
    """Staff response to a specific swap request"""
    accepted: bool
    notes: Optional[str] = None

# Auto-assignment result
class AutoAssignmentResult(BaseModel):
    success: bool
    assigned_staff_id: Optional[uuid.UUID] = None
    assigned_staff_name: Optional[str] = None
    reason: Optional[str] = None  # Why assignment failed
    alternatives: Optional[list[dict]] = None  # Alternative staff suggestions

# Swap summary for dashboards
class SwapSummary(BaseModel):
    facility_id: uuid.UUID
    pending_swaps: int
    urgent_swaps: int
    auto_swaps_needing_assignment: int
    specific_swaps_awaiting_response: int
    recent_completions: int

class SwapHistoryRead(BaseModel):
    id: uuid.UUID
    swap_request_id: uuid.UUID
    action: str
    actor_staff_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)