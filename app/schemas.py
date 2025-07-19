from datetime import datetime, date
from typing import Any, Dict, Literal, Optional, List
from enum import Enum
import uuid

from .models import NotificationType, NotificationChannel, NotificationPriority
from pydantic import BaseModel, EmailStr, ConfigDict, Field, validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[Dict[str, Any]] = None


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

#=================FACILITY CRUD===================================================
class FacilityCreate(BaseModel):
    name: str
    location: Optional[str] = None
    facility_type: str = "hotel"  # hotel, restaurant, resort, cafe, bar
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None

class FacilityUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    facility_type: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None

class FacilityRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    location: Optional[str] = None
    facility_type: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== FACILITY SHIFT SCHEMAS ====================

class FacilityShiftBase(BaseModel):
    shift_name: str
    start_time: str  # "07:00" format
    end_time: str    # "15:00" format
    requires_manager: bool = False
    min_staff: int = Field(default=1, ge=1, le=50)
    max_staff: int = Field(default=10, ge=1, le=50)
    shift_order: int = Field(default=0)
    is_active: bool = True
    color: Optional[str] = "blue"

class FacilityShiftCreate(FacilityShiftBase):
    facility_id: uuid.UUID

class FacilityShiftUpdate(BaseModel):
    shift_name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    requires_manager: Optional[bool] = None
    min_staff: Optional[int] = None
    max_staff: Optional[int] = None
    shift_order: Optional[int] = None
    is_active: Optional[bool] = None
    color: Optional[str] = None

class FacilityShiftRead(FacilityShiftBase):
    id: uuid.UUID
    facility_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== FACILITY ROLE SCHEMAS ====================

class FacilityRoleBase(BaseModel):
    role_name: str
    min_skill_level: int = Field(default=1, ge=1, le=5)
    max_skill_level: int = Field(default=5, ge=1, le=5)
    is_management: bool = False
    hourly_rate_min: Optional[float] = None
    hourly_rate_max: Optional[float] = None
    is_active: bool = True

class FacilityRoleCreate(FacilityRoleBase):
    facility_id: uuid.UUID

class FacilityRoleUpdate(BaseModel):
    role_name: Optional[str] = None
    min_skill_level: Optional[int] = None
    max_skill_level: Optional[int] = None
    is_management: Optional[bool] = None
    hourly_rate_min: Optional[float] = None
    hourly_rate_max: Optional[float] = None
    is_active: Optional[bool] = None

class FacilityRoleRead(FacilityRoleBase):
    id: uuid.UUID
    facility_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== FACILITY ZONE SCHEMAS ====================

class FacilityZoneBase(BaseModel):
    zone_id: str
    zone_name: str
    description: Optional[str] = None
    required_roles: Optional[List[str]] = Field(default_factory=list)
    preferred_roles: Optional[List[str]] = Field(default_factory=list)
    min_staff_per_shift: int = Field(default=1, ge=1, le=20)
    max_staff_per_shift: int = Field(default=5, ge=1, le=50)
    is_active: bool = True
    display_order: int = 0

class FacilityZoneCreate(FacilityZoneBase):
    facility_id: uuid.UUID

class FacilityZoneUpdate(BaseModel):
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    description: Optional[str] = None
    required_roles: Optional[List[str]] = None
    preferred_roles: Optional[List[str]] = None
    min_staff_per_shift: Optional[int] = None
    max_staff_per_shift: Optional[int] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class FacilityZoneRead(FacilityZoneBase):
    id: uuid.UUID
    facility_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== ENHANCED FACILITY WITH DETAILS ====================

class FacilityWithDetails(FacilityRead):
    """Facility with shifts, roles, and zones included"""
    shifts: List[FacilityShiftRead] = []
    roles: List[FacilityRoleRead] = []
    zones: List[FacilityZoneRead] = []
    staff_count: int = 0
    active_schedules: int = 0

# ==================== BULK OPERATIONS SCHEMAS ====================

class BulkFacilityShiftCreate(BaseModel):
    facility_id: uuid.UUID
    shifts: List[FacilityShiftBase]

class BulkFacilityRoleCreate(BaseModel):
    facility_id: uuid.UUID
    roles: List[FacilityRoleBase]

class BulkFacilityZoneCreate(BaseModel):
    facility_id: uuid.UUID
    zones: List[FacilityZoneBase]

# ==================== SHIFT-ROLE REQUIREMENTS ====================

class ShiftRoleRequirementCreate(BaseModel):
    facility_shift_id: uuid.UUID
    facility_role_id: uuid.UUID
    min_required: int = 1
    max_allowed: Optional[int] = None
    is_required: bool = True

class ShiftRoleRequirementRead(BaseModel):
    id: uuid.UUID
    facility_shift_id: uuid.UUID
    facility_role_id: uuid.UUID
    min_required: int
    max_allowed: Optional[int]
    is_required: bool
    created_at: datetime
    
    # Include related data
    role_name: Optional[str] = None
    shift_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== TEMPLATE SCHEMAS ====================

class FacilityTemplate(BaseModel):
    """Template for quickly setting up facilities of different types"""
    facility_type: str
    shifts: List[FacilityShiftBase]
    roles: List[FacilityRoleBase]
    zones: List[FacilityZoneBase]

class FacilityImportData(BaseModel):
    """Schema for importing facilities from Excel/CSV"""
    name: str
    facility_type: str = "hotel"
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None


class StaffCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    role: str
    skill_level: int = 1
    phone: Optional[str] = None
    facility_id: uuid.UUID
    weekly_hours_max: int = 40
    is_active: bool = True
    
    @validator('email')
    def validate_email(cls, v):
            if v and '@' not in v:
                raise ValueError('Invalid email format')
            return v

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

class SwapStatus(str, Enum):
    PENDING = "pending"
    MANAGER_APPROVED = "manager_approved"
    STAFF_ACCEPTED = "staff_accepted"
    STAFF_DECLINED = "staff_declined"
    ASSIGNED = "assigned"
    ASSIGNMENT_FAILED = "assignment_failed"
    EXECUTED = "executed"
    DECLINED = "declined"
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
    status: SwapStatus
    
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
    
# Smart Scheduling Schemas
class ZoneConfiguration(BaseModel):
    zone_id: str
    required_staff: Dict[str, int]  # {"min": 1, "max": 3}
    assigned_roles: List[str]
    priority: int = Field(ge=1, le=10)
    coverage_hours: Dict[str, bool]  # {"morning": True, "afternoon": True, "evening": False}

class SmartScheduleConfiguration(BaseModel):
    facility_id: uuid.UUID
    period_start: datetime
    period_type: Literal['daily', 'weekly', 'monthly']
    zones: List[str]
    zone_assignments: Dict[str, ZoneConfiguration]
    role_mapping: Dict[str, List[str]]  # role -> zones
    use_constraints: bool = True
    auto_assign_by_zone: bool = True
    balance_workload: bool = True
    prioritize_skill_match: bool = True
    coverage_priority: Literal['minimal', 'balanced', 'maximum'] = 'balanced'
    shift_preferences: Optional[Dict[str, float]] = None
    total_days: Optional[int] = None
    shifts_per_day: int = Field(default=3, ge=1, le=5)

class ScheduleGenerationResult(BaseModel):
    schedule_id: uuid.UUID
    period_type: str
    period_start: str
    assignments: List[Dict[str, Any]]
    zone_coverage: Dict[str, Any]
    optimization_metrics: Dict[str, float]
    success: bool
    warnings: List[str] = []

# Zone Management Schemas
class ZoneAssignmentCreate(BaseModel):
    schedule_id: uuid.UUID
    zone_id: str
    staff_id: uuid.UUID
    day: int = Field(ge=0, le=6)
    shift: int = Field(ge=0, le=4)
    auto_balance: bool = False
    priority: int = Field(default=1, ge=1, le=10)

class ZoneAssignmentRead(BaseModel):
    id: uuid.UUID
    schedule_id: uuid.UUID
    staff_id: uuid.UUID
    zone_id: str
    day: int
    shift: int
    priority: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ZoneScheduleRead(BaseModel):
    facility_id: uuid.UUID
    zone_id: str
    period_start: str
    period_type: str
    assignments: List[Dict[str, Any]]
    summary: Dict[str, int]

# Multi-period Schemas
class DailyScheduleRead(BaseModel):
    schedule_id: Optional[uuid.UUID] = None
    facility_id: uuid.UUID
    date: str
    day_of_week: int
    shifts: Dict[str, List[Dict[str, Any]]]  # shift_number -> staff assignments

class MonthlyScheduleOverview(BaseModel):
    facility_id: uuid.UUID
    month: int
    year: int
    days: Dict[str, Dict[str, List[Dict[str, Any]]]]  # date -> shift -> staff
    summary: Dict[str, Any]

# Role Requirements Schemas
class ShiftRequirement(BaseModel):
    min_staff: int = Field(ge=1, le=20)
    max_staff: Optional[int] = Field(None, ge=1, le=50)
    required_roles: List[str] = []
    min_skill_level: int = Field(default=1, ge=1, le=5)
    preferred_roles: List[str] = []

class ZoneRoleMapping(BaseModel):
    zone_id: str
    required_roles: List[str]
    optional_roles: List[str] = []
    min_skill_level: int = Field(default=1, ge=1, le=5)

class RoleRequirementsRead(BaseModel):
    facility_id: uuid.UUID
    zone_role_mapping: Dict[str, List[str]]
    shift_requirements: Dict[str, ShiftRequirement]
    skill_requirements: Dict[str, int]
    config_id: Optional[uuid.UUID] = None

class RoleRequirementsUpdate(BaseModel):
    zone_role_mapping: Dict[str, List[str]]
    shift_requirements: Dict[str, ShiftRequirement]
    skill_requirements: Dict[str, int]

# Analytics Schemas
class StaffUtilizationMetrics(BaseModel):
    name: str
    role: str
    total_shifts: int
    shifts_by_type: Dict[str, int]  # shift_number -> count
    utilization_percentage: float
    workload_score: float

class WorkloadBalanceMetrics(BaseModel):
    balance_score: float
    average_shifts_per_staff: float
    standard_deviation: float
    most_utilized_staff: str
    least_utilized_staff: str

class CoverageMetrics(BaseModel):
    coverage_percentage: float
    total_days: int
    days_with_assignments: int
    shifts_per_day_average: float
    peak_coverage_day: str
    low_coverage_days: List[str]

class ScheduleAnalytics(BaseModel):
    facility_id: uuid.UUID
    period: Dict[str, str]  # start and end dates
    total_schedules: int
    total_assignments: int
    staff_utilization: Dict[str, StaffUtilizationMetrics]
    shift_distribution: Dict[str, int]
    role_distribution: Dict[str, int]
    workload_balance: WorkloadBalanceMetrics
    coverage_metrics: CoverageMetrics
    efficiency_score: float
    recommendations: List[str] = []

# Schedule Template Schemas
class ScheduleTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    tags: List[str] = []
    is_public: bool = False

class ScheduleTemplateRead(BaseModel):
    id: uuid.UUID
    facility_id: uuid.UUID
    name: str
    description: Optional[str]
    tags: List[str]
    is_public: bool
    created_by: uuid.UUID
    created_at: datetime
    used_count: int
    
    class Config:
        from_attributes = True

class ScheduleCopyRequest(BaseModel):
    target_facility_id: Optional[uuid.UUID] = None
    target_start_date: date
    period_type: Literal['daily', 'weekly', 'monthly']
    adapt_staff: bool = True
    include_unavailability: bool = True

# Optimization Schemas
class OptimizationGoal(BaseModel):
    goal_type: Literal['minimize_overtime', 'balance_workload', 'maximize_coverage', 'respect_preferences']
    weight: float = Field(ge=0.0, le=1.0)
    parameters: Dict[str, Any] = {}

class ScheduleOptimizationRequest(BaseModel):
    optimization_goals: List[OptimizationGoal]
    constraints: Dict[str, Any] = {}
    preserve_assignments: List[uuid.UUID] = []  # Assignment IDs to keep unchanged
    max_iterations: int = Field(default=100, ge=1, le=1000)

class OptimizationResult(BaseModel):
    success: bool
    iterations_used: int
    improvement_score: float
    changes_made: int
    preserved_assignments: int
    new_schedule_id: Optional[uuid.UUID] = None
    metrics_before: Dict[str, float]
    metrics_after: Dict[str, float]
    recommendations: List[str] = []

# Export Schemas
class ScheduleExportOptions(BaseModel):
    include_staff_details: bool = True
    include_contact_info: bool = False
    group_by: Literal['day', 'staff', 'zone'] = 'day'
    date_format: str = 'YYYY-MM-DD'
    include_zone_assignments: bool = True
    include_skill_levels: bool = True

class ScheduleExportRequest(BaseModel):
    format: Literal['pdf', 'excel', 'csv']
    options: ScheduleExportOptions

# Validation Schemas
class ConstraintViolation(BaseModel):
    violation_type: str
    severity: Literal['error', 'warning', 'info']
    staff_id: Optional[uuid.UUID] = None
    staff_name: Optional[str] = None
    day: Optional[int] = None
    shift: Optional[int] = None
    message: str
    suggested_fix: Optional[str] = None

class ScheduleValidationResult(BaseModel):
    is_valid: bool
    overall_score: float  # 0-100
    violations: List[ConstraintViolation]
    summary: Dict[str, int]  # violation_type -> count
    recommendations: List[str]
    
# Conflict Detection Schemas
class SchedulingConflict(BaseModel):
    conflict_type: str  # 'double_booking', 'unavailable', 'overtime', 'skill_mismatch'
    severity: Literal['critical', 'major', 'minor']
    staff_id: uuid.UUID
    staff_name: str
    day: int
    shift: int
    message: str
    auto_resolvable: bool = False
    resolution_suggestions: List[str] = []

class ConflictCheckResult(BaseModel):
    facility_id: uuid.UUID
    week_start: str
    has_conflicts: bool
    conflicts: List[SchedulingConflict]
    existing_schedule_id: Optional[uuid.UUID] = None
    total_assignments: int
    conflicted_assignments: int
    
# ==================== COMPREHENSIVE DELETE SCHEMAS ====================

# Base delete response schema
class BaseDeleteResponse(BaseModel):
    """Base response for all delete operations"""
    success: bool
    message: str
    deleted_id: uuid.UUID
    entity_type: str  # "facility", "staff", "schedule", etc.

class BaseDeleteValidation(BaseModel):
    """Base validation for delete operations"""
    can_delete: bool
    errors: List[str] = []
    warnings: List[str] = []
    blocking_entities: List[Dict[str, Any]] = []

# ==================== FACILITY DELETE SCHEMAS ====================

class FacilityDeleteResponse(BaseDeleteResponse):
    """Response for facility deletion"""
    affected_staff_count: int
    affected_schedules_count: int

class FacilityDeleteValidation(BaseDeleteValidation):
    """Validation for facility deletion"""
    active_staff_count: int
    active_schedules_count: int
    pending_swaps_count: int

# ==================== STAFF DELETE SCHEMAS ====================

class StaffDeleteResponse(BaseDeleteResponse):
    """Response for staff deletion"""
    reassigned_schedules_count: int
    cancelled_swaps_count: int

class StaffDeleteValidation(BaseDeleteValidation):
    """Validation for staff deletion"""
    future_assignments_count: int
    pending_swap_requests_count: int
    is_manager: bool
    has_unique_skills: bool

# ==================== SCHEDULE DELETE SCHEMAS ====================

class ScheduleDeleteResponse(BaseDeleteResponse):
    """Response for schedule deletion"""
    assignments_deleted: int
    affected_swaps_count: int

class ScheduleDeleteValidation(BaseDeleteValidation):
    """Validation for schedule deletion"""
    assignments_count: int
    pending_swaps_count: int
    is_current_week: bool
    is_published: bool

# ==================== FACILITY MANAGEMENT DELETE SCHEMAS ====================

class FacilityShiftDeleteResponse(BaseDeleteResponse):
    """Response for shift deletion"""
    remaining_shifts_count: int
    affected_assignments_count: int

class FacilityShiftDeleteValidation(BaseDeleteValidation):
    """Validation for shift deletion"""
    is_last_shift: bool
    future_assignments_count: int
    shift_requirements_count: int

class FacilityRoleDeleteResponse(BaseDeleteResponse):
    """Response for role deletion"""
    affected_staff_count: int
    affected_zones_count: int

class FacilityRoleDeleteValidation(BaseDeleteValidation):
    """Validation for role deletion"""
    staff_with_role_count: int
    shift_requirements_count: int
    zone_requirements_count: int

class FacilityZoneDeleteResponse(BaseDeleteResponse):
    """Response for zone deletion"""
    affected_assignments_count: int

class FacilityZoneDeleteValidation(BaseDeleteValidation):
    """Validation for zone deletion"""
    active_assignments_count: int
    future_schedules_affected: int

# ==================== SWAP REQUEST DELETE SCHEMAS ====================

class SwapRequestDeleteResponse(BaseDeleteResponse):
    """Response for swap request deletion/cancellation"""
    refund_penalties: bool
    notify_affected_staff: bool

class SwapRequestDeleteValidation(BaseDeleteValidation):
    """Validation for swap request deletion"""
    current_status: str
    can_cancel: bool
    requires_manager_approval: bool

# ==================== AVAILABILITY DELETE SCHEMAS ====================

class StaffUnavailabilityDeleteResponse(BaseDeleteResponse):
    """Response for unavailability deletion"""
    affected_schedules_count: int

class StaffUnavailabilityDeleteValidation(BaseDeleteValidation):
    """Validation for unavailability deletion"""
    affects_published_schedules: bool
    is_recurring: bool
    future_occurrences_count: int

# ==================== SCHEDULE CONFIG DELETE SCHEMAS ====================

class ScheduleConfigDeleteResponse(BaseDeleteResponse):
    """Response for schedule config deletion"""
    fallback_to_defaults: bool

class ScheduleConfigDeleteValidation(BaseDeleteValidation):
    """Validation for schedule config deletion"""
    dependent_schedules_count: int
    has_custom_constraints: bool

# ==================== TEMPLATE DELETE SCHEMAS ====================

class ScheduleTemplateDeleteResponse(BaseDeleteResponse):
    """Response for template deletion"""
    usage_count: int

class ScheduleTemplateDeleteValidation(BaseDeleteValidation):
    """Validation for template deletion"""
    is_public: bool
    used_by_others: bool
    usage_count: int

# ==================== BULK DELETE SCHEMAS ====================

class BulkDeleteRequest(BaseModel):
    """For bulk delete operations across any entity type"""
    entity_type: str  # "staff", "schedules", "shifts", etc.
    ids: List[uuid.UUID] = Field(min_items=1, max_items=100)
    force_delete: bool = False  # Override some validations
    reason: Optional[str] = None
    confirm: bool = Field(description="Must be true to confirm bulk deletion")
    
    @validator('confirm')
    def must_confirm_bulk_delete(cls, v):
        if not v:
            raise ValueError('Must confirm bulk deletion by setting confirm=true')
        return v

class BulkDeleteResponse(BaseModel):
    """Response for bulk delete operations"""
    success: bool
    total_requested: int
    successfully_deleted: int
    failed_deletions: int
    errors: List[Dict[str, Any]] = []  # {id, error_message}
    deleted_ids: List[uuid.UUID] = []
    failed_ids: List[uuid.UUID] = []

# ==================== SOFT DELETE SCHEMAS ====================

class SoftDeleteRequest(BaseModel):
    """For soft deletion (deactivation) instead of hard delete"""
    reason: Optional[str] = None
    deactivate_related: bool = False
    notify_affected_users: bool = True

class SoftDeleteResponse(BaseModel):
    """Response for soft deletion operations"""
    success: bool
    message: str
    deactivated_id: uuid.UUID
    related_deactivations: List[Dict[str, Any]] = []
    notifications_sent: int

# ==================== RESTORE SCHEMAS ====================

class RestoreRequest(BaseModel):
    """For restoring soft-deleted entities"""
    restore_related: bool = False
    reason: Optional[str] = None

class RestoreResponse(BaseModel):
    """Response for restore operations"""
    success: bool
    message: str
    restored_id: uuid.UUID
    related_restorations: List[Dict[str, Any]] = []

# ==================== DELETE DEPENDENCY TRACKING ====================

class DeleteDependency(BaseModel):
    """Information about entities that depend on the one being deleted"""
    entity_type: str
    entity_id: uuid.UUID
    entity_name: Optional[str] = None
    dependency_type: str  # "required", "optional", "reference"
    impact: str  # "blocking", "warning", "info"
    resolution: Optional[str] = None  # How to resolve the dependency

class DeleteImpactAnalysis(BaseModel):
    """Comprehensive analysis of deletion impact"""
    entity_id: uuid.UUID
    entity_type: str
    can_delete: bool
    dependencies: List[DeleteDependency] = []
    cascading_deletes: List[Dict[str, Any]] = []  # What will be auto-deleted
    recommendations: List[str] = []
    estimated_impact_score: int = Field(ge=0, le=10)  # 0=safe, 10=catastrophic

# ==================== AUDIT DELETE SCHEMAS ====================

class DeleteAuditLog(BaseModel):
    """Audit log entry for delete operations"""
    deleted_entity_type: str
    deleted_entity_id: uuid.UUID
    deleted_by_user_id: uuid.UUID
    deletion_reason: Optional[str] = None
    deletion_type: str  # "soft", "hard", "cascade"
    affected_entities: List[Dict[str, Any]] = []
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

# ==================== VALIDATION HELPERS ====================
class DeleteValidationError(BaseModel):
    """Detailed error information for deletion failures"""
    error_code: str
    error_message: str
    entity_id: uuid.UUID
    entity_type: str
    suggested_actions: List[str] = []
    blocking_entities: List[Dict[str, Any]] = []

# ==================== CASCADE DELETE CONFIGURATION ====================
class CascadeDeleteConfig(BaseModel):
    """Configuration for cascade deletion behavior"""
    delete_related_schedules: bool = False
    delete_related_assignments: bool = False
    cancel_pending_swaps: bool = True
    notify_affected_users: bool = True
    create_audit_log: bool = True
    backup_before_delete: bool = False

#======================= NOTIFICATION MANAGMENT ==============================
class NotificationRead(BaseModel):
    id: uuid.UUID
    notification_type: NotificationType
    title: str
    message: str
    priority: NotificationPriority
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    notification_type: NotificationType
    recipient_user_id: uuid.UUID
    title: str
    message: str
    priority: NotificationPriority = NotificationPriority.MEDIUM
    channels: List[str] = ["IN_APP"]
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    data: Dict[str, Any] = {}

class NotificationPreferenceRead(BaseModel):
    id: uuid.UUID
    notification_type: NotificationType
    in_app_enabled: bool
    push_enabled: bool
    whatsapp_enabled: bool
    email_enabled: bool
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    timezone: str
    
    class Config:
        from_attributes = True

class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    timezone: Optional[str] = None

class PushTokenUpdate(BaseModel):
    push_token: str

class WhatsAppNumberUpdate(BaseModel):
    whatsapp_number: str

# ==================== TEMPLATE SCHEMAS ====================

class NotificationTemplateRead(BaseModel):
    id: uuid.UUID
    template_name: str
    notification_type: NotificationType
    title_template: str
    message_template: str
    whatsapp_template: Optional[str] = None
    default_channels: List[str]
    priority: NotificationPriority
    enabled: bool
    
    class Config:
        from_attributes = True

class NotificationTemplateCreate(BaseModel):
    template_name: str
    notification_type: NotificationType
    title_template: str
    message_template: str
    whatsapp_template: Optional[str] = None
    default_channels: List[str]
    priority: NotificationPriority = NotificationPriority.MEDIUM