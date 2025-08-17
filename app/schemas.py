from datetime import datetime, date
from typing import Any, Dict, Literal, Optional, List
from enum import Enum
import uuid

from .models import NotificationType, NotificationChannel, NotificationPriority
from .models import SwapStatus
from pydantic import BaseModel, EmailStr, ConfigDict, Field, validator
from pydantic import field_validator

# ==================== DUPLICATE CHECKING SCHEMAS ====================

class DuplicateMatch(BaseModel):
    """Individual duplicate match details"""
    id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    facility_name: Optional[str] = None
    similarity_score: Optional[int] = None

class DuplicateInfo(BaseModel):
    """Comprehensive duplicate information"""
    exact_email_match: Optional[DuplicateMatch] = None
    name_similarity_matches: List[DuplicateMatch] = []
    phone_matches: List[DuplicateMatch] = []
    has_any_duplicates: bool = False
    severity: str = "none"  # none, warning, error
    
    @field_validator('severity')
    def validate_severity(cls, v):
        if v not in ['none', 'warning', 'error']:
            raise ValueError('Severity must be none, warning, or error')
        return v
    
class FacilityDuplicateCheck(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class FacilityDuplicateInfo(BaseModel):
    has_any_duplicates: bool = False
    severity: str = "none"  # none, warning, error
    exact_name_match: Optional[Dict[str, Any]] = None
    address_matches: List[Dict[str, Any]] = []
    phone_matches: List[Dict[str, Any]] = []
    email_matches: List[Dict[str, Any]] = []
    similar_names: List[Dict[str, Any]] = []

class FacilityValidationResult(BaseModel):
    can_create: bool
    validation_errors: List[str] = []
    duplicates: FacilityDuplicateInfo
    recommendations: List[str] = []

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
    """Enhanced schema for importing facilities from Excel/CSV"""
    name: str
    facility_type: str = "hotel"
    location: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    
    # Import-specific fields (similar to staff)
    row_number: Optional[int] = None
    source_data: Optional[Dict[str, Any]] = None
    force_create: bool = False
    
    # Validation helpers
    @field_validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Facility name must be at least 2 characters long')
        return v.strip()
    
    @field_validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v.strip() if v else None
    
    @field_validator('facility_type')
    def validate_facility_type(cls, v):
        allowed_types = ['hotel', 'restaurant', 'resort', 'cafe', 'bar']
        if v and v not in allowed_types:
            # Don't raise error, just default to hotel
            return 'hotel'
        return v or 'hotel'


class StaffCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    role: str
    skill_level: int = 1
    phone: Optional[str] = None
    facility_id: uuid.UUID
    weekly_hours_max: int = 40
    is_active: bool = True
    
    # Validation options
    force_create: bool = False
    skip_duplicate_check: bool = False
    
    @field_validator('skill_level')
    def validate_skill_level(cls, v):
        if not 1 <= v <= 5:
            raise ValueError('Skill level must be between 1 and 5')
        return v
    
    @field_validator('email')
    def validate_email(cls, v):
            if v and '@' not in v:
                raise ValueError('Invalid email format')
            return v

class StaffRead(BaseModel):
    """Staff read response - clean, no inheritance of validation fields"""
    id: uuid.UUID
    full_name: str
    email: Optional[str] = None
    role: str
    skill_level: int
    phone: Optional[str] = None
    facility_id: uuid.UUID
    weekly_hours_max: int
    is_active: bool
    created_at: datetime
    
    # Optional duplicate warnings for new imports
    _duplicate_warnings: Optional[DuplicateInfo] = None

    model_config = ConfigDict(from_attributes=True)
    
class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    skill_level: Optional[int] = None
    phone: Optional[str] = None
    weekly_hours_max: Optional[int] = None
    is_active: Optional[bool] = None
    
    # Update options
    check_duplicates: bool = True
    force_update: bool = False
    
    @field_validator('skill_level')
    def validate_skill_level(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError('Skill level must be between 1 and 5')
        return v
    
    @field_validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v

class StaffDuplicateCheck(BaseModel):
    """Check duplicates in uploads"""
    full_name: str
    facility_id: uuid.UUID
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Check options
    check_email: bool = True
    check_phone: bool = True
    check_name_similarity: bool = True
    similarity_threshold: float = 0.8
    
    # Scope options
    check_across_facilities: bool = False
    include_inactive_staff: bool = False

class StaffDuplicateCheckResponse(BaseModel):
    """Enhanced duplicate check response"""
    exists: bool
    duplicates: DuplicateInfo
    existing_staff: List[DuplicateMatch] = []
    recommendations: List[str] = []
    can_proceed: bool = True
    requires_confirmation: bool = False

class StaffValidationResult(BaseModel):
    """Result of staff validation before creation"""
    can_create: bool
    validation_errors: List[str] = []
    duplicates: DuplicateInfo
    recommendations: List[str] = []
    
class BulkValidationResult(BaseModel):
    """Result of bulk staff validation"""
    valid_count: int
    invalid_count: int
    duplicate_conflicts: int
    duplicate_warnings: int
    individual_results: Dict[int, StaffValidationResult]
    summary: Dict[str, Any]

# ==================== BULK IMPORT SCHEMAS ====================

class ImportStaffItem(BaseModel):
    """Individual staff member for bulk import"""
    full_name: str
    email: Optional[str] = None
    role: str
    phone: Optional[str] = None
    skill_level: int = 3
    facility_id: Optional[uuid.UUID] = None
    facility_name: Optional[str] = None
    weekly_hours_max: int = 40
    is_active: bool = True
    
    # Import-specific fields
    row_number: Optional[int] = None
    source_data: Optional[Dict[str, Any]] = None
    force_create: bool = False

class BulkImportRequest(BaseModel):
    """Bulk staff import request"""
    staff_members: List[ImportStaffItem]
    validation_options: Dict[str, bool] = {
        "check_duplicates": True,
        "strict_validation": True,
        "auto_resolve_facilities": True
    }
    import_options: Dict[str, Any] = {
        "skip_invalid": False,
        "force_create_duplicates": False,
        "notify_on_duplicates": True
    }

class ImportResult(BaseModel):
    """Individual import result"""
    row_number: int
    success: bool
    staff_id: Optional[uuid.UUID] = None
    staff_name: str
    errors: List[str] = []
    warnings: List[str] = []
    duplicate_info: Optional[DuplicateInfo] = None
    action_taken: str  # created, skipped, force_created, updated

class BulkImportResult(BaseModel):
    """Result of bulk staff import"""
    total_processed: int
    successful_imports: int
    skipped_duplicates: int
    forced_creations: int
    validation_errors: int
    individual_results: List[ImportResult]
    
    # Summary statistics
    summary: Dict[str, Any] = {
        "success_rate": 0.0,
        "duplicate_rate": 0.0,
        "error_rate": 0.0,
        "processing_time_seconds": 0.0
    }
    
    execution_details: Dict[str, Any] = {
        "started_at": None,
        "completed_at": None,
        "processed_by": None,
        "tenant_id": None
    }

# ==================== DUPLICATE RESOLUTION SCHEMAS ====================

class DuplicateResolutionAction(BaseModel):
    """Action to take for a duplicate"""
    staff_row_number: int
    action: str  # skip, force_create, update_existing, merge
    target_staff_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    
    @field_validator('action')
    def validate_action(cls, v):
        allowed_actions = ['skip', 'force_create', 'update_existing', 'merge']
        if v not in allowed_actions:
            raise ValueError(f'Action must be one of: {allowed_actions}')
        return v

class BulkDuplicateResolution(BaseModel):
    """Bulk resolution for duplicates"""
    resolutions: List[DuplicateResolutionAction]
    global_options: Dict[str, bool] = {
        "update_skill_levels": False,
        "merge_contact_info": False,
        "preserve_existing_schedules": True
    }

# ==================== IMPORT HISTORY SCHEMAS ====================

class ImportHistoryEntry(BaseModel):
    """Historical record of imports"""
    id: uuid.UUID
    filename: str
    imported_at: datetime
    imported_by: uuid.UUID
    tenant_id: uuid.UUID
    
    # Import statistics
    total_records: int
    successful_imports: int
    duplicates_found: int
    errors_encountered: int
    
    # Processing details
    processing_time_seconds: float
    duplicate_checking_enabled: bool
    force_create_used: bool
    
    # File information
    file_size_bytes: int
    file_format: str  # xlsx, csv
    column_mappings: Dict[str, str]

class ImportHistoryList(BaseModel):
    """List of import history entries"""
    imports: List[ImportHistoryEntry]
    total_count: int
    page: int
    page_size: int

# ==================== ERROR REPORTING SCHEMAS ====================

class ValidationError(BaseModel):
    """Detailed validation error information"""
    field: str
    error_code: str
    message: str
    current_value: Optional[Any] = None
    suggested_value: Optional[Any] = None
    severity: str = "error"  # error, warning, info

class ImportErrorReport(BaseModel):
    """Comprehensive error report for imports"""
    filename: str
    total_errors: int
    errors_by_type: Dict[str, int]
    errors_by_row: Dict[int, List[ValidationError]]
    duplicate_conflicts: Dict[int, DuplicateInfo]
    
    recommendations: List[str] = []
    corrective_actions: List[str] = []
    
    generated_at: datetime
    generated_by: Optional[str] = None

#========== SHIFT ASSIGNMTT =========================
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
    is_published: bool
    published_at: Optional[datetime] = None
    published_by_id: Optional[uuid.UUID] = None

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
    
    @field_validator('end')
    def end_after_start(cls, v, values):
        if 'start' in values and v <= values['start']:
            raise ValueError('End time must be after start time')
        return v

    @field_validator('start')
    def start_not_in_past(cls, v):
        if v < datetime.utcnow():
            raise ValueError('Cannot set availability for past dates')
        return v

class StaffUnavailabilityUpdate(BaseModel):
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    reason: Optional[str] = None
    is_recurring: Optional[bool] = None

    @field_validator('end')
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
    
    @field_validator('custom_end_hour')
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
    original_zone_id: Optional[str] = None  # ← NEW: Zone tracking for role verification
    reason: str = Field(min_length=1, max_length=500)
    urgency: Literal["low", "normal", "high", "emergency"] = "normal"
    expires_at: Optional[datetime] = None
    requires_manager_final_approval: bool = True 
    role_verification_required: bool = True  


class SpecificSwapRequestCreate(SwapRequestCreate):
    """Request to swap with a specific staff member"""
    target_staff_id: uuid.UUID
    target_day: int = Field(ge=0, le=6)
    target_shift: int = Field(ge=0, le=2)
    target_zone_id: Optional[str] = None
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
    original_zone_id: Optional[str] = None
    requires_manager_final_approval: Optional[bool] = None
    role_verification_required: Optional[bool] = None

class SwapRequestRead(BaseModel):
    """Enhanced swap request read schema with new workflow fields"""
    id: uuid.UUID
    schedule_id: uuid.UUID
    requesting_staff_id: uuid.UUID
    original_day: int
    original_shift: int
    original_zone_id: Optional[str] = None  
    swap_type: str
    
    # Optional fields based on swap type
    target_staff_id: Optional[uuid.UUID] = None
    target_day: Optional[int] = None
    target_shift: Optional[int] = None
    target_zone_id: Optional[str] = None  
    assigned_staff_id: Optional[uuid.UUID] = None
    
    reason: str
    urgency: str
    status: SwapStatus  
    
    # ==================== ENHANCED APPROVAL TRACKING ====================
    target_staff_accepted: Optional[bool] = None
    assigned_staff_accepted: Optional[bool] = None  
    manager_approved: Optional[bool] = None
    manager_final_approved: Optional[bool] = None  
    manager_notes: Optional[str] = None
    
    # ==================== WORKFLOW CONFIGURATION ====================
    requires_manager_final_approval: bool
    role_verification_required: bool
    
    # ==================== ROLE AUDIT FIELDS ====================
    original_shift_role_id: Optional[uuid.UUID] = None
    assigned_staff_role_id: Optional[uuid.UUID] = None
    target_staff_role_id: Optional[uuid.UUID] = None
    role_match_override: bool = False
    role_match_reason: Optional[str] = None
    
    # ==================== ENHANCED TIMESTAMPS ====================
    created_at: datetime
    manager_approved_at: Optional[datetime] = None  
    staff_responded_at: Optional[datetime] = None   
    manager_final_approved_at: Optional[datetime] = None  
    expires_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class SwapRequestWithDetails(SwapRequestRead):
    """Swap request with related staff info and role details"""
    requesting_staff: "StaffRead"
    target_staff: Optional["StaffRead"] = None
    assigned_staff: Optional["StaffRead"] = None
    
    # ==================== ROLE DETAILS FOR DISPLAY ====================
    original_shift_role_name: Optional[str] = None
    assigned_staff_role_name: Optional[str] = None
    target_staff_role_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# ==================== SWAP REQUEST RESPONSE SCHEMAS ====================
class PotentialAssignmentResponse(BaseModel):
    """Staff response to potential auto-assignment (NEW)"""
    accepted: bool
    notes: Optional[str] = None
    availability_confirmed: bool = True

class ManagerFinalApproval(BaseModel):
    """Manager's final approval for swap execution (ENHANCED)"""
    approved: bool
    notes: Optional[str] = None
    override_role_verification: bool = False  # Allow manager to override role checks
    role_override_reason: Optional[str] = None  # Required if override is True


# Manager action schemas
class ManagerSwapDecision(BaseModel):
    approved: bool
    notes: Optional[str] = None

class StaffSwapResponse(BaseModel):
    """Enhanced staff response to swap requests"""
    accepted: bool
    notes: Optional[str] = None
    confirm_availability: bool = True

# Auto-assignment result
class AutoAssignmentResult(BaseModel):
    """Enhanced auto-assignment result with role verification"""
    success: bool
    assigned_staff_id: Optional[uuid.UUID] = None
    assigned_staff_name: Optional[str] = None
    reason: Optional[str] = None  # Assignment success/failure reason
    
    # ==================== ROLE VERIFICATION INFO ====================
    role_match_level: Optional[str] = None  # "exact_match", "compatible", etc.
    role_compatibility_score: Optional[int] = None  # 0-100
    skill_level_match: Optional[bool] = None
    
    # ==================== ALTERNATIVE SUGGESTIONS ====================
    alternatives: Optional[list[dict]] = None  # Alternative staff suggestions
    emergency_options: Optional[list[dict]] = None  # Emergency override options
    
    # ==================== AUDIT INFORMATION ====================
    assignment_criteria_used: Optional[dict] = None  # What criteria were used
    staff_considered_count: Optional[int] = None
    rejection_reasons: Optional[dict] = None  # Why other staff were rejected

# ==================== SWAP WORKFLOW SCHEMAS ====================
class SwapWorkflowStatus(BaseModel):
    """Current workflow status with next actions (NEW)"""
    current_status: SwapStatus
    next_action_required: str
    next_action_by: Literal["manager", "staff", "system"]
    can_execute: bool
    blocking_reasons: list[str] = []
    estimated_completion: Optional[datetime] = None
    
class RoleMatchAudit(BaseModel):
    """Audit information for role matching in swaps (NEW)"""
    original_shift_role: Optional[str] = None  # Role name for display
    assigned_staff_role: Optional[str] = None
    target_staff_role: Optional[str] = None
    roles_compatible: bool
    match_level: str  # "exact_match", "compatible", "emergency_override"
    override_applied: bool = False
    override_reason: Optional[str] = None
    skill_levels_compatible: bool = True
    minimum_skill_required: Optional[int] = None

# Swap summary for dashboards
class SwapSummary(BaseModel):
    """Enhanced swap summary for dashboards"""
    facility_id: uuid.UUID
    
    # ==================== STATUS COUNTS ====================
    pending_swaps: int
    manager_approval_needed: int  # ← NEW
    potential_assignments: int  # ← NEW
    staff_responses_needed: int  # ← NEW
    manager_final_approval_needed: int  # ← NEW
    urgent_swaps: int
    auto_swaps_needing_assignment: int
    specific_swaps_awaiting_response: int
    recent_completions: int
    
    # ==================== ROLE VERIFICATION STATS ====================
    role_compatible_assignments: int  # ← NEW
    role_override_assignments: int  # ← NEW
    failed_role_verifications: int  # ← NEW
    
    # ==================== TIMING METRICS ====================
    average_approval_time_hours: Optional[float] = None  # ← NEW
    average_staff_response_time_hours: Optional[float] = None  # ← NEW
    pending_over_24h: int  # ← NEW


class SwapHistoryRead(BaseModel):
    """ swap history with role information"""
    id: uuid.UUID
    swap_request_id: uuid.UUID
    action: str  # "requested", "manager_approved", "staff_accepted", "role_verified", etc.
    actor_staff_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    created_at: datetime
    
    # ==================== HISTORY FIELDS ====================
    role_information: Optional[dict] = None  # Role matching info at time of action
    system_action: bool = False  # Was this a system-generated action?
    notification_sent: bool = False  # Was notification sent for this action?
    
    model_config = ConfigDict(from_attributes=True)

class SwapAnalytics(BaseModel):
    """Detailed swap analytics for management insights"""
    facility_id: uuid.UUID
    period_start: datetime
    period_end: datetime
    
    # ==================== VOLUME METRICS ====================
    total_requests: int
    auto_requests: int
    specific_requests: int
    completed_swaps: int
    failed_swaps: int
    
    # ==================== ROLE ANALYSIS ====================
    role_compatibility_rate: float  # Percentage of assignments with compatible roles
    most_requested_roles: list[dict]  # Which roles are most often needed for swaps
    role_coverage_gaps: list[dict]  # Roles that are hard to cover
    
    # ==================== STAFF BEHAVIOR ====================
    most_helpful_staff: list[dict]  # Staff who accept swaps most often
    staff_acceptance_rates: dict  # staff_id -> acceptance_rate
    emergency_coverage_providers: list[dict]  # Staff who help in emergencies
    
    # ==================== TIMING ANALYSIS ====================
    average_resolution_time: float  # Hours from request to completion
    manager_approval_time: float  # Average manager response time
    staff_response_time: float  # Average staff response time
    
    # ==================== RECOMMENDATIONS ====================
    recommendations: list[str]  # System recommendations for improvement
    
# ==================== VALIDATION SCHEMAS ====================

class SwapValidationError(BaseModel):
    """Validation errors for swap requests"""
    error_code: str
    error_message: str
    field: Optional[str] = None
    suggested_fix: Optional[str] = None

class SwapValidationResult(BaseModel):
    """Result of swap request validation"""
    is_valid: bool
    errors: list[SwapValidationError] = []
    warnings: list[str] = []
    
    # ==================== ROLE VALIDATION ====================
    role_verification_passed: bool = True
    zone_requirements_met: bool = True
    skill_requirements_met: bool = True
    
    # ==================== AVAILABILITY VALIDATION ====================
    staff_available: bool = True
    no_conflicts: bool = True
    within_work_limits: bool = True
    
    # ==================== BULK OPERATIONS ====================

class BulkSwapApproval(BaseModel):
    """Bulk approval of multiple swap requests"""
    swap_ids: list[uuid.UUID] = Field(min_length=1, max_length=50)
    approved: bool
    notes: Optional[str] = None
    apply_to_similar: bool = False  # Apply same decision to similar requests

class BulkSwapResult(BaseModel):
    """Result of bulk swap operations"""
    total_processed: int
    successful: int
    failed: int
    results: list[dict]  # Individual results per swap
    errors: list[str] = []
    
# ==================== NOTIFICATION INTEGRATION ====================

class SwapNotificationData(BaseModel):
    """Data structure for swap-related notifications"""
    swap_id: uuid.UUID
    swap_type: str
    requesting_staff_name: str
    target_staff_name: Optional[str] = None
    assigned_staff_name: Optional[str] = None
    original_shift_info: str  # "Monday Morning" format
    target_shift_info: Optional[str] = None
    urgency: str
    reason: str
    role_match_info: Optional[str] = None  # Role compatibility information
    next_action_required: str
    deadline: Optional[datetime] = None
    
# ==================== EXPORT SCHEMAS ====================

class SwapExportOptions(BaseModel):
    """Options for exporting swap data"""
    include_audit_trail: bool = True
    include_role_information: bool = True
    include_staff_details: bool = True
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    status_filter: Optional[list[SwapStatus]] = None
    format: Literal["excel", "csv", "pdf"] = "excel"

class SwapExportResult(BaseModel):
    """Result of swap export operation"""
    success: bool
    file_url: Optional[str] = None
    records_exported: int
    file_size_bytes: int
    export_timestamp: datetime


    
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
    ids: List[uuid.UUID] = Field(min_length=1, max_length=100)
    force_delete: bool = False  # Override some validations
    reason: Optional[str] = None
    confirm: bool = Field(description="Must be true to confirm bulk deletion")
    
    @field_validator('confirm')
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

#==================== USER PROFILE SCHEMAS ====================
class UserProfileBase(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)

class UserProfileCreate(UserProfileBase):
    # UI/UX Preferences
    theme: str = Field(default="system", pattern=r"^(light|dark|system)$")
    language: str = Field(default="en", max_length=5)
    timezone: str = Field(default="UTC", max_length=50)
    date_format: str = Field(default="MM/dd/yyyy", max_length=20)
    time_format: str = Field(default="12h", pattern=r"^(12h|24h)$")
    currency: str = Field(default="USD", max_length=3)
    
    # Dashboard Preferences
    sidebar_collapsed: bool = Field(default=False)
    cards_per_row: int = Field(default=3, ge=1, le=6)
    show_welcome_tour: bool = Field(default=True)
    
    # Notification Preferences
    quiet_hours_enabled: bool = Field(default=False)
    quiet_hours_start: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    weekend_notifications: bool = Field(default=True)
    
    # Privacy Settings
    profile_visibility: str = Field(default="team", pattern=r"^(public|team|private)$")
    show_email: bool = Field(default=False)
    show_phone: bool = Field(default=False)
    show_online_status: bool = Field(default=True)
    
    # Work Preferences
    preferred_shifts: List[str] = Field(default_factory=list)
    max_consecutive_days: Optional[int] = Field(None, ge=1, le=14)
    preferred_days_off: List[int] = Field(default_factory=list)
    
    # App Settings
    enable_desktop_notifications: bool = Field(default=True)
    enable_sound_notifications: bool = Field(default=True)
    auto_accept_swaps: bool = Field(default=False)
    show_analytics: bool = Field(default=True)
    feature_hints_enabled: bool = Field(default=True)
    
    @field_validator('preferred_days_off')
    @classmethod
    def validate_days_off(cls, v):
        if v and any(day < 0 or day > 6 for day in v):
            raise ValueError('Days off must be between 0 (Sunday) and 6 (Saturday)')
        return v
    
    @field_validator('quiet_hours_end')
    @classmethod
    def validate_quiet_hours(cls, v, info):
        values = info.data
        if v and values.get('quiet_hours_enabled') and not values.get('quiet_hours_start'):
            raise ValueError('quiet_hours_start is required when quiet_hours_end is provided')
        return v

class UserProfileUpdate(BaseModel):
    # Allow partial updates of any field
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    
    # Avatar settings
    avatar_type: Optional[str] = Field(None, pattern=r"^(initials|uploaded|gravatar)$")
    avatar_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    
    # UI/UX Preferences
    theme: Optional[str] = Field(None, pattern=r"^(light|dark|system)$")
    language: Optional[str] = Field(None, max_length=5)
    timezone: Optional[str] = Field(None, max_length=50)
    date_format: Optional[str] = Field(None, max_length=20)
    time_format: Optional[str] = Field(None, pattern=r"^(12h|24h)$")
    currency: Optional[str] = Field(None, max_length=3)
    
    # Dashboard & Layout
    dashboard_layout: Optional[Dict[str, Any]] = None
    sidebar_collapsed: Optional[bool] = None
    cards_per_row: Optional[int] = Field(None, ge=1, le=6)
    show_welcome_tour: Optional[bool] = None
    
    # Notifications
    notification_preferences: Optional[Dict[str, Any]] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    weekend_notifications: Optional[bool] = None
    
    # Privacy
    profile_visibility: Optional[str] = Field(None, pattern=r"^(public|team|private)$")
    show_email: Optional[bool] = None
    show_phone: Optional[bool] = None
    show_online_status: Optional[bool] = None
    
    # Work Preferences
    preferred_shifts: Optional[List[str]] = None
    max_consecutive_days: Optional[int] = Field(None, ge=1, le=14)
    preferred_days_off: Optional[List[int]] = None
    
    # App Settings
    enable_desktop_notifications: Optional[bool] = None
    enable_sound_notifications: Optional[bool] = None
    auto_accept_swaps: Optional[bool] = None
    show_analytics: Optional[bool] = None
    
    # Onboarding
    onboarding_completed: Optional[bool] = None
    onboarding_step: Optional[int] = Field(None, ge=0, le=10)
    feature_hints_enabled: Optional[bool] = None

class UserProfileRead(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    
    # Avatar
    avatar_url: Optional[str] = None
    avatar_type: str
    avatar_color: str
    
    # UI/UX Preferences
    theme: str
    language: str
    timezone: str
    date_format: str
    time_format: str
    currency: str
    
    # Dashboard & Layout
    dashboard_layout: Dict[str, Any]
    sidebar_collapsed: bool
    cards_per_row: int
    show_welcome_tour: bool
    
    # Notifications
    notification_preferences: Dict[str, Any]
    quiet_hours_enabled: bool
    quiet_hours_start: Optional[str]
    quiet_hours_end: Optional[str]
    weekend_notifications: bool
    
    # Privacy
    profile_visibility: str
    show_email: bool
    show_phone: bool
    show_online_status: bool
    
    # Work Preferences
    preferred_shifts: List[str]
    max_consecutive_days: Optional[int]
    preferred_days_off: List[int]
    
    # App Settings
    enable_desktop_notifications: bool
    enable_sound_notifications: bool
    auto_accept_swaps: bool
    show_analytics: bool
    
    # Onboarding
    onboarding_completed: bool
    onboarding_step: int
    last_help_viewed: Optional[datetime]
    feature_hints_enabled: bool
    
    # Audit
    created_at: datetime
    updated_at: Optional[datetime]
    last_active: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

# ==================== SYSTEM SETTINGS SCHEMAS ====================

class SystemSettingsBase(BaseModel):
    company_name: str = Field(max_length=200)
    timezone: str = Field(default="UTC", max_length=50)
    date_format: str = Field(default="MM/dd/yyyy", max_length=20)
    currency: str = Field(default="USD", max_length=3)
    language: str = Field(default="en", max_length=5)

class SystemSettingsCreate(SystemSettingsBase):
    # Scheduling Settings
    smart_scheduling_enabled: bool = Field(default=True)
    max_optimization_iterations: int = Field(default=100, ge=10, le=1000)
    conflict_check_enabled: bool = Field(default=True)
    auto_assign_by_zone: bool = Field(default=False)
    balance_workload: bool = Field(default=True)
    require_manager_per_shift: bool = Field(default=False)
    allow_overtime: bool = Field(default=False)
    
    # Default Notification Settings
    email_notifications_enabled: bool = Field(default=True)
    whatsapp_notifications_enabled: bool = Field(default=False)
    push_notifications_enabled: bool = Field(default=True)
    schedule_published_notify: bool = Field(default=True)
    swap_request_notify: bool = Field(default=True)
    urgent_swap_notify: bool = Field(default=True)
    daily_reminder_notify: bool = Field(default=False)
    
    # Security Settings
    session_timeout_hours: int = Field(default=24, ge=1, le=168)  # 1 hour to 1 week
    require_two_factor: bool = Field(default=False)
    enforce_strong_passwords: bool = Field(default=True)
    allow_google_auth: bool = Field(default=True)
    allow_apple_auth: bool = Field(default=True)
    
    # Analytics Settings
    analytics_cache_ttl: int = Field(default=3600, ge=300, le=86400)  # 5 min to 24 hours
    enable_usage_tracking: bool = Field(default=True)
    enable_performance_monitoring: bool = Field(default=True)
    
    # Advanced Settings
    integrations: Optional[Dict[str, Any]] = Field(default_factory=dict)
    advanced_settings: Optional[Dict[str, Any]] = Field(default_factory=dict)

class SystemSettingsUpdate(BaseModel):
    # Allow partial updates
    company_name: Optional[str] = Field(None, max_length=200)
    timezone: Optional[str] = Field(None, max_length=50)
    date_format: Optional[str] = Field(None, max_length=20)
    currency: Optional[str] = Field(None, max_length=3)
    language: Optional[str] = Field(None, max_length=5)
    
    # Scheduling
    smart_scheduling_enabled: Optional[bool] = None
    max_optimization_iterations: Optional[int] = Field(None, ge=10, le=1000)
    conflict_check_enabled: Optional[bool] = None
    auto_assign_by_zone: Optional[bool] = None
    balance_workload: Optional[bool] = None
    require_manager_per_shift: Optional[bool] = None
    allow_overtime: Optional[bool] = None
    
    # Notifications
    email_notifications_enabled: Optional[bool] = None
    whatsapp_notifications_enabled: Optional[bool] = None
    push_notifications_enabled: Optional[bool] = None
    schedule_published_notify: Optional[bool] = None
    swap_request_notify: Optional[bool] = None
    urgent_swap_notify: Optional[bool] = None
    daily_reminder_notify: Optional[bool] = None
    
    # Security
    session_timeout_hours: Optional[int] = Field(None, ge=1, le=168)
    require_two_factor: Optional[bool] = None
    enforce_strong_passwords: Optional[bool] = None
    allow_google_auth: Optional[bool] = None
    allow_apple_auth: Optional[bool] = None
    
    # Analytics
    analytics_cache_ttl: Optional[int] = Field(None, ge=300, le=86400)
    enable_usage_tracking: Optional[bool] = None
    enable_performance_monitoring: Optional[bool] = None
    
    # Advanced
    integrations: Optional[Dict[str, Any]] = None
    advanced_settings: Optional[Dict[str, Any]] = None

class SystemSettingsRead(SystemSettingsBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    
    # All settings fields
    smart_scheduling_enabled: bool
    max_optimization_iterations: int
    conflict_check_enabled: bool
    auto_assign_by_zone: bool
    balance_workload: bool
    require_manager_per_shift: bool
    allow_overtime: bool
    
    email_notifications_enabled: bool
    whatsapp_notifications_enabled: bool
    push_notifications_enabled: bool
    schedule_published_notify: bool
    swap_request_notify: bool
    urgent_swap_notify: bool
    daily_reminder_notify: bool
    
    session_timeout_hours: int
    require_two_factor: bool
    enforce_strong_passwords: bool
    allow_google_auth: bool
    allow_apple_auth: bool
    
    integrations: Dict[str, Any]
    analytics_cache_ttl: int
    enable_usage_tracking: bool
    enable_performance_monitoring: bool
    advanced_settings: Dict[str, Any]
    
    created_at: datetime
    updated_at: Optional[datetime]
    updated_by: Optional[uuid.UUID]
    
    model_config = ConfigDict(from_attributes=True)

# ==================== NOTIFICATION GLOBAL SETTINGS SCHEMAS ====================

class NotificationGlobalSettingsBase(BaseModel):
    # Email Settings
    smtp_enabled: bool = Field(default=False)
    smtp_host: Optional[str] = Field(None, max_length=255)
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: Optional[str] = Field(None, max_length=255)
    smtp_use_tls: bool = Field(default=True)
    smtp_from_email: Optional[str] = Field(None, max_length=255)
    smtp_from_name: Optional[str] = Field(None, max_length=100)

class NotificationGlobalSettingsCreate(NotificationGlobalSettingsBase):
    # Email Settings (password will be encrypted)
    smtp_password: Optional[str] = Field(None, max_length=255)
    
    # WhatsApp/Twilio Settings (will be encrypted)
    twilio_enabled: bool = Field(default=False)
    twilio_account_sid: Optional[str] = Field(None, max_length=255)
    twilio_auth_token: Optional[str] = Field(None, max_length=255)
    twilio_whatsapp_number: Optional[str] = Field(None, max_length=20)
    
    # Push Notifications (will be encrypted)
    push_enabled: bool = Field(default=False)
    firebase_server_key: Optional[str] = Field(None, max_length=500)
    
    # Templates
    email_templates: Optional[Dict[str, Any]] = Field(default_factory=dict)
    whatsapp_templates: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    # Rate Limiting
    email_rate_limit: int = Field(default=100, ge=1, le=10000)
    whatsapp_rate_limit: int = Field(default=50, ge=1, le=1000)
    retry_failed_notifications: bool = Field(default=True)
    max_retry_attempts: int = Field(default=3, ge=1, le=10)

class NotificationGlobalSettingsUpdate(BaseModel):
    # Email Settings
    smtp_enabled: Optional[bool] = None
    smtp_host: Optional[str] = Field(None, max_length=255)
    smtp_port: Optional[int] = Field(None, ge=1, le=65535)
    smtp_username: Optional[str] = Field(None, max_length=255)
    smtp_password: Optional[str] = Field(None, max_length=255)
    smtp_use_tls: Optional[bool] = None
    smtp_from_email: Optional[str] = Field(None, max_length=255)
    smtp_from_name: Optional[str] = Field(None, max_length=100)
    
    # WhatsApp/Twilio Settings
    twilio_enabled: Optional[bool] = None
    twilio_account_sid: Optional[str] = Field(None, max_length=255)
    twilio_auth_token: Optional[str] = Field(None, max_length=255)
    twilio_whatsapp_number: Optional[str] = Field(None, max_length=20)
    
    # Push Notifications
    push_enabled: Optional[bool] = None
    firebase_server_key: Optional[str] = Field(None, max_length=500)
    
    # Templates
    email_templates: Optional[Dict[str, Any]] = None
    whatsapp_templates: Optional[Dict[str, Any]] = None
    
    # Rate Limiting
    email_rate_limit: Optional[int] = Field(None, ge=1, le=10000)
    whatsapp_rate_limit: Optional[int] = Field(None, ge=1, le=1000)
    retry_failed_notifications: Optional[bool] = None
    max_retry_attempts: Optional[int] = Field(None, ge=1, le=10)

class NotificationGlobalSettingsRead(NotificationGlobalSettingsBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    
    # Note: Sensitive fields like passwords and tokens are excluded from read
    twilio_enabled: bool
    twilio_whatsapp_number: Optional[str]
    push_enabled: bool
    
    # Include masked versions for UI
    smtp_password_set: bool = Field(description="Whether SMTP password is configured")
    twilio_account_sid_set: bool = Field(description="Whether Twilio SID is configured")
    twilio_auth_token_set: bool = Field(description="Whether Twilio token is configured")
    firebase_server_key_set: bool = Field(description="Whether Firebase key is configured")
    
    email_templates: Dict[str, Any]
    whatsapp_templates: Dict[str, Any]
    email_rate_limit: int
    whatsapp_rate_limit: int
    retry_failed_notifications: bool
    max_retry_attempts: int
    
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

# ==================== PROFILE PICTURE SCHEMAS ====================

class ProfilePictureUploadCreate(BaseModel):
    original_filename: str = Field(max_length=255)
    file_size: int = Field(ge=1, le=10485760)  # Max 10MB
    mime_type: str = Field(pattern="^image/(jpeg|jpg|png|webp|gif)$")

class ProfilePictureUploadRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    original_filename: str
    stored_filename: str
    file_size: int
    mime_type: str
    storage_path: str
    is_active: bool
    uploaded_at: datetime
    image_width: Optional[int]
    image_height: Optional[int]
    thumbnails: Dict[str, str]
    
    model_config = ConfigDict(from_attributes=True)

# ==================== AUDIT LOG SCHEMAS ====================

class AuditLogRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    action: str
    resource_type: str
    resource_id: Optional[uuid.UUID]
    changes: Dict[str, Any]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class AuditLogWithUser(AuditLogRead):
    user_email: str = Field(description="Email of user who made the change")
    user_name: str = Field(description="Display name of user who made the change")

# ==================== SETTINGS SUMMARY SCHEMAS ====================

class SettingsSummary(BaseModel):
    """High-level overview of all settings for dashboard"""
    system_settings_configured: bool
    notification_settings_configured: bool
    smtp_configured: bool
    whatsapp_configured: bool
    push_configured: bool
    total_users: int
    users_with_profiles: int
    recent_changes_count: int
    last_updated: Optional[datetime]

# ==================== BULK SETTINGS OPERATIONS ====================

class BulkSettingsUpdate(BaseModel):
    """Update multiple settings categories at once"""
    system_settings: Optional[SystemSettingsUpdate] = None
    notification_settings: Optional[NotificationGlobalSettingsUpdate] = None
    apply_defaults_to_users: bool = Field(default=False, description="Apply changes to existing user profiles")

class SettingsImportExport(BaseModel):
    """For importing/exporting settings configurations"""
    system_settings: Optional[Dict[str, Any]] = None
    notification_settings: Optional[Dict[str, Any]] = None
    user_defaults: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

# ==================== AVATAR & FILE UPLOAD SCHEMAS ====================

class AvatarUploadRequest(BaseModel):
    """Request for avatar upload"""
    avatar_type: str = Field(default="uploaded", pattern="^(uploaded|initials|gravatar)$")
    
class AvatarUpdateRequest(BaseModel):
    """Update avatar settings without upload"""
    avatar_type: str = Field(pattern="^(initials|uploaded|gravatar)$")
    avatar_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")

class AvatarResponse(BaseModel):
    """Response after avatar operations"""
    success: bool
    avatar_url: Optional[str] = None
    avatar_type: str
    avatar_color: str
    thumbnails: Dict[str, str] = Field(default_factory=dict)
    message: str

# ==================== SETTINGS RESPONSE SCHEMAS ====================

class SettingsResponse(BaseModel):
    """Generic settings operation response"""
    success: bool
    message: str
    updated_fields: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

class SettingsValidationError(BaseModel):
    """Validation error for settings"""
    field: str
    error_code: str
    message: str
    suggested_value: Optional[Any] = None

class SettingsTestResult(BaseModel):
    """Test result for settings like SMTP, Twilio, etc."""
    service: str  # "smtp", "twilio", "firebase"
    success: bool
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    tested_at: datetime

# ==================== DASHBOARD WIDGETS SCHEMAS ====================

class DashboardWidget(BaseModel):
    """Individual dashboard widget configuration"""
    widget_id: str
    widget_type: str  # "chart", "metric", "list", "calendar"
    title: str
    position: Dict[str, int]  # {"x": 0, "y": 0, "w": 4, "h": 3}
    settings: Dict[str, Any] = Field(default_factory=dict)
    visible: bool = True

class DashboardLayoutUpdate(BaseModel):
    """Update dashboard layout"""
    widgets: List[DashboardWidget]
    layout_name: Optional[str] = Field(None, max_length=100)
    is_default: bool = False

# ==================== QUICK ACTIONS SCHEMAS ====================

class QuickProfileUpdate(BaseModel):
    """Quick profile updates for common actions"""
    action: str = Field(pattern="^(toggle_theme|update_timezone|toggle_notifications|set_avatar_color)$")
    value: Optional[Any] = None

class ThemeToggleResponse(BaseModel):
    """Response for theme toggle"""
    new_theme: str
    system_theme_detected: Optional[str] = None

# ==================== EXPORT/IMPORT SCHEMAS ====================

class SettingsExportRequest(BaseModel):
    """Export settings configuration"""
    include_system_settings: bool = True
    include_notification_settings: bool = True
    include_user_defaults: bool = True
    include_sensitive_data: bool = False
    export_format: str = Field(default="json", pattern="^(json|yaml)$")

class SettingsImportRequest(BaseModel):
    """Import settings configuration"""
    data: Dict[str, Any]
    overwrite_existing: bool = False
    validate_only: bool = False
    apply_to_existing_users: bool = False

class SettingsBackup(BaseModel):
    """Settings backup structure"""
    backup_id: uuid.UUID
    tenant_id: uuid.UUID
    backup_name: str
    created_at: datetime
    size_bytes: int
    includes: List[str]  # ["system", "notifications", "profiles"]
    
class SettingsRestore(BaseModel):
    """Settings restore request"""
    backup_id: uuid.UUID
    restore_system_settings: bool = True
    restore_notification_settings: bool = True
    restore_user_profiles: bool = False
    confirm_overwrite: bool = False

# ==================== ONBOARDING SCHEMAS ====================

class OnboardingProgress(BaseModel):
    """Track user onboarding progress"""
    user_id: uuid.UUID
    current_step: int
    completed_steps: List[int]
    total_steps: int
    completion_percentage: float
    estimated_time_remaining: Optional[int] = Field(None, description="Minutes remaining")

class OnboardingStepUpdate(BaseModel):
    """Update specific onboarding step"""
    step_number: int = Field(ge=0, le=10)
    completed: bool = True
    skip_welcome_tour: bool = False

class OnboardingComplete(BaseModel):
    """Mark onboarding as complete"""
    feedback: Optional[str] = Field(None, max_length=500)
    skip_tour: bool = False
    preferred_features: List[str] = Field(default_factory=list)

# ==================== SECURITY & ENCRYPTION SCHEMAS ====================

class EncryptionStatus(BaseModel):
    """Status of encrypted fields"""
    field_name: str
    is_encrypted: bool
    last_updated: Optional[datetime]
    encryption_version: int

class SecurityAuditLog(BaseModel):
    """Security-focused audit log entry"""
    action: str
    risk_level: str = Field(pattern="^(low|medium|high|critical)$")
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Dict[str, Any]
    created_at: datetime

# ==================== NOTIFICATION TEMPLATE SCHEMAS ====================

class NotificationTemplateTest(BaseModel):
    """Test notification template"""
    template_type: str
    recipient_type: str = Field(pattern="^(manager|staff|all)$")
    test_data: Dict[str, Any] = Field(default_factory=dict)

class NotificationTemplatePreview(BaseModel):
    """Preview rendered notification template"""
    title: str
    message: str
    whatsapp_message: Optional[str] = None
    variables_used: List[str]
    estimated_length: Dict[str, int]  # character counts

# ==================== ANALYTICS SCHEMAS ====================

class SettingsUsageAnalytics(BaseModel):
    """Analytics for settings usage"""
    most_changed_settings: List[Dict[str, Any]]
    user_adoption_rates: Dict[str, float]
    feature_usage: Dict[str, int]
    popular_themes: Dict[str, int]
    average_profile_completion: float
    
class UserEngagementMetrics(BaseModel):
    """User engagement with settings"""
    total_profile_updates: int
    active_customizers: int  # users who changed > 3 settings
    theme_distribution: Dict[str, int]
    notification_opt_out_rate: float
    avatar_upload_rate: float

# ================= Forgot password schema =============================
class ForgotPasswordRequest(BaseModel):
    email: str
    
    @field_validator('email')
    def validate_email(cls, v):
        if not v or '@' not in v:
            raise ValueError('Valid email address required')
        return v.lower().strip()

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str
    
    @field_validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @field_validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values.data and v != values.data['new_password']:
            raise ValueError('Passwords do not match')
        return v

class PasswordResetResponse(BaseModel):
    message: str
    success: bool

