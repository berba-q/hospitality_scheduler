from datetime import date, datetime, time, timedelta, timezone
from enum import Enum
from typing import Optional, List, Dict, Any, cast
import uuid
from hashlib import sha256
from sqlmodel import SQLModel, Field, Relationship, Index, JSON, select, Session, update
from sqlalchemy import Column as SAColumn, DateTime, Enum as SQLEnum, update as sa_update
from sqlalchemy.sql import Executable
from sqlalchemy.sql.elements import ColumnElement
import secrets


class Tenant(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str

    managers: List["User"] = Relationship(back_populates="tenant")
    facilities: List["Facility"] = Relationship(back_populates="tenant")


class Facility(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    name: str
    location: Optional[str] = None
    facility_type: Optional[str] = Field(default="hotel")  # hotel, restaurant, resort, cafe, bar
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = Field(default=None, sa_column=SAColumn(JSON))
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None
    
    shifts: List["FacilityShift"] = Relationship(back_populates="facility", cascade_delete=True)
    roles: List["FacilityRole"] = Relationship(back_populates="facility", cascade_delete=True) 
    zones: List["FacilityZone"] = Relationship(back_populates="facility", cascade_delete=True)
    tenant: Tenant = Relationship(back_populates="facilities")
    staff: List["Staff"] = Relationship(back_populates="facility")

class FacilityShift(SQLModel, table=True):
    """Custom shift definitions per facility""" 
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    
    shift_name: str  # "Breakfast", "Lunch", "Dinner" vs "Morning", "Afternoon", "Evening"
    start_time: str  # "07:00" format
    end_time: str    # "15:00" format
    
    requires_manager: bool = Field(default=False)
    min_staff: int = Field(default=1, ge=1, le=50)
    max_staff: int = Field(default=10, ge=1, le=50)
    shift_order: int = Field(default=0)  # For display ordering (0=first shift, 1=second, etc.)
    
    is_active: bool = Field(default=True)
    color: Optional[str] = Field(default="blue")  # For UI color coding
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None
    
    # Relationships
    facility: Facility = Relationship(back_populates="shifts")
    rolerequirements: List["ShiftRoleRequirement"] = Relationship(back_populates="shift", cascade_delete=True)
    
class FacilityRole(SQLModel, table=True):
    """Custom roles per facility with skill requirements"""  
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    
    role_name: str
    min_skill_level: int = Field(default=1, ge=1, le=5)
    max_skill_level: int = Field(default=5, ge=1, le=5)
    is_management: bool = Field(default=False)
    
    # Optional rate information
    hourly_rate_min: Optional[float] = None
    hourly_rate_max: Optional[float] = None
    
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None
    
    # Relationships
    facility: Facility = Relationship(back_populates="roles")
    shiftrequirements: List["ShiftRoleRequirement"] = Relationship(back_populates="role", cascade_delete=True)

class FacilityZone(SQLModel, table=True):
    """Zones/areas within a facility"""  
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    
    zone_id: str  # 'front-desk', 'kitchen', 'bar' (used in scheduling logic)
    zone_name: str  # 'Front Desk', 'Kitchen', 'Bar' (display name)
    description: Optional[str] = None
    
    # Role requirements for this zone
    required_roles: Optional[List[str]] = Field(default_factory=list, sa_column=SAColumn(JSON))
    preferred_roles: Optional[List[str]] = Field(default_factory=list, sa_column=SAColumn(JSON))
    
    # Staffing requirements
    min_staff_per_shift: int = Field(default=1, ge=1, le=20)
    max_staff_per_shift: int = Field(default=5, ge=1, le=50)
    
    is_active: bool = Field(default=True)
    display_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None
    
    # Relationships
    facility: Facility = Relationship(back_populates="zones")
    
class ShiftRoleRequirement(SQLModel, table=True):
    """Many-to-many relationship between shifts and roles with specific requirements"""  
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_shift_id: uuid.UUID = Field(foreign_key="facilityshift.id")
    facility_role_id: uuid.UUID = Field(foreign_key="facilityrole.id")
    
    min_required: int = Field(default=1, ge=0, le=20)  # Minimum number of this role required
    max_allowed: Optional[int] = Field(default=None, ge=1, le=50)  # Maximum allowed (None = unlimited)
    is_required: bool = Field(default=True)  # Is this role absolutely required for the shift?
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    
    # Relationships
    shift: FacilityShift = Relationship(back_populates="rolerequirements")
    role: FacilityRole = Relationship(back_populates="shiftrequirements")

class NotificationType(str, Enum):
    SCHEDULE_PUBLISHED = "SCHEDULE_PUBLISHED"
    SWAP_REQUEST = "SWAP_REQUEST"
    SWAP_APPROVED = "SWAP_APPROVED"
    SWAP_DENIED = "SWAP_DENIED"
    SCHEDULE_CHANGE = "SCHEDULE_CHANGE"
    SHIFT_REMINDER = "SHIFT_REMINDER"
    EMERGENCY_COVERAGE = "EMERGENCY_COVERAGE"
    SWAP_ASSIGNMENT = "SWAP_ASSIGNMENT"
    PASSWORD_RESET = "PASSWORD_RESET"
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION"
    STAFF_INVITATION = "STAFF_INVITATION"
    ACCOUNT_LINKED = "ACCOUNT_LINKED"

class NotificationChannel(str, Enum):
    IN_APP = "IN_APP"
    PUSH = "PUSH"
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"

class NotificationPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    email: str
    hashed_password: str
    is_manager: bool = False
    is_active: bool = True
    tenant: Tenant = Relationship(back_populates="managers")
    # Notification settings
    push_token: Optional[str] = None
    whatsapp_number: Optional[str] = None
    
    # Relationships
    profile: Optional["UserProfile"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="recipient")

class Staff(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    full_name: str
    email: Optional[str] = None
    role: str
    skill_level: int | None = Field(default=1)
    weekly_hours_max: int | None = Field(default=40)
    phone: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None
    unavailability: List["StaffUnavailability"] = Relationship(back_populates="staff")
    facility: Facility = Relationship(back_populates="staff")


class StaffUnavailability(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    staff_id: uuid.UUID = Field(foreign_key="staff.id")
    start: datetime
    end: datetime
    reason: Optional[str] = None
    is_recurring: bool = Field(default=False)  # For weekly recurring unavailability
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    
    # Add relationship back to staff
    staff: Optional["Staff"] = Relationship(back_populates="unavailability")
    

class Schedule(SQLModel, table=True):
    id: uuid.UUID | None = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    week_start: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None
    is_published: bool = Field(default=False, nullable=False)
    published_at: Optional[datetime] = Field(
        default=None,
        sa_column=SAColumn(DateTime(timezone=True), nullable=True)
    )
    published_by_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")

    assignments: list["ShiftAssignment"] = Relationship(back_populates="schedule")


class ShiftAssignment(SQLModel, table=True):
    id: uuid.UUID | None = Field(default_factory=uuid.uuid4, primary_key=True)
    schedule_id: uuid.UUID = Field(foreign_key="schedule.id")
    day: int
    shift: int
    staff_id: uuid.UUID = Field(foreign_key="staff.id")

    schedule: Schedule = Relationship(back_populates="assignments")

# New constraint models
class ScheduleConfig(SQLModel, table=True):
    """Manager-configurable scheduling constraints"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    
    # Hour constraints
    min_rest_hours: int = Field(default=8)
    max_consecutive_days: int = Field(default=5)
    max_weekly_hours: int = Field(default=40)
    
    # Shift requirements
    min_staff_per_shift: int = Field(default=1)
    max_staff_per_shift: int = Field(default=10)
    require_manager_per_shift: bool = Field(default=False)
    
    # Role and skill constraints stored as JSON
    shift_role_requirements: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON)
    )
    
    # Business rules
    allow_overtime: bool = Field(default=False)
    weekend_restrictions: bool = Field(default=False)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    
# ==================== SWAP STATUS ENUM ====================

class SwapStatus(str, Enum):
    """
    Enum for swap request status values to prevent typos and ensure consistency
    """
    PENDING = "pending"
    MANAGER_APPROVED = "manager_approved"
    POTENTIAL_ASSIGNMENT = "potential_assignment"  # System found potential staff for auto swap
    STAFF_ACCEPTED = "staff_accepted"
    MANAGER_FINAL_APPROVAL = "manager_final_approval"  # Waiting for manager's final confirmation
    EXECUTED = "executed"
    STAFF_DECLINED = "staff_declined"
    ASSIGNMENT_DECLINED = "assignment_declined"
    ASSIGNMENT_FAILED = "assignment_failed"
    DECLINED = "declined"
    CANCELLED = "cancelled"

class SwapRequest(SQLModel, table=True):
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    schedule_id: uuid.UUID = Field(foreign_key="schedule.id")
    requesting_staff_id: uuid.UUID = Field(foreign_key="staff.id")
    
    # Original shift details
    original_day: int
    original_shift: int
    original_zone_id: Optional[str] = None
    
   # Swap type and target details
    swap_type: str = Field(description="specific or auto")
    target_staff_id: Optional[uuid.UUID] = Field(default=None, foreign_key="staff.id")
    target_day: Optional[int] = Field(default=None, ge=0, le=6)
    target_shift: Optional[int] = Field(default=None, ge=0, le=2)
    target_zone_id: Optional[str] = None  # Track target zone for specific swaps

    # Auto-assignment details
    assigned_staff_id: Optional[uuid.UUID] = Field(default=None, foreign_key="staff.id")
    
    # Request details
    reason: str
    urgency: str = Field(default="normal", description="low, normal, high, emergency")
    
    # Status tracking
    status: str = Field(
        default="pending",  # Use string default instead of enum
        sa_column=SAColumn(
            SQLEnum(
                "pending", "manager_approved", "potential_assignment", 
                "staff_accepted", "manager_final_approval", "executed",
                "staff_declined", "assignment_declined", "assignment_failed",
                "declined", "cancelled",
                name="swapstatus",
                create_constraint=True,
                validate_strings=True
            )
        )
    )
    
    # Approval workflow
    target_staff_accepted: Optional[bool] = None  # For specific swaps
    assigned_staff_accepted: Optional[bool] = None 
    manager_approved: Optional[bool] = None
    manager_final_approved: Optional[bool] = None
    manager_notes: Optional[str] = None
    
    # ==================== WORKFLOW CONFIGURATION ====================
    requires_manager_final_approval: bool = Field(default=True)  # Configure approval flow
    role_verification_required: bool = Field(default=True)  # Enforce role checking
    
    # ==================== ROLE AUDIT TRACKING ====================
    # Cache the role ID that was matched for auto-assignments (for audit purposes)
    original_shift_role_id: Optional[uuid.UUID] = Field(default=None, foreign_key="facilityrole.id", description="Role required for original shift")
    assigned_staff_role_id: Optional[uuid.UUID] = Field(default=None, foreign_key="facilityrole.id", description="Role of assigned staff member")
    target_staff_role_id: Optional[uuid.UUID] = Field(default=None, foreign_key="facilityrole.id", description="Role of target staff member (specific swaps)")
    role_match_override: bool = Field(default=False, description="Manager overrode role verification")
    role_match_reason: Optional[str] = Field(default=None, description="Reason for role override or match details")
    
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    manager_approved_at: Optional[datetime] = None  # Track approval timing
    staff_responded_at: Optional[datetime] = None   # Track response timing
    manager_final_approved_at: Optional[datetime] = None # NEW: Track final approval
    expires_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # ==================== DATABASE CONSTRAINTS ====================
    __table_args__ = (
        # Prevent multiple active requests for the same shift slot
        Index(
            'idx_unique_active_swap_request',
            'schedule_id', 'requesting_staff_id', 'original_day', 'original_shift',
            unique=True,
            postgresql_where="status NOT IN ('executed', 'declined', 'cancelled', 'staff_declined', 'assignment_failed')"
        ),
        
        # Prevent duplicate specific swap requests between same staff/shifts
        Index(
            'idx_unique_specific_swap',
            'schedule_id', 'requesting_staff_id', 'target_staff_id', 
            'original_day', 'original_shift', 'target_day', 'target_shift',
            unique=True,
            postgresql_where="swap_type = 'specific' AND status NOT IN ('executed', 'declined', 'cancelled', 'staff_declined')"
        ),
        
        # Prevent staff from being auto-assigned to multiple swaps simultaneously
        Index(
            'idx_unique_auto_assignment',
            'schedule_id', 'assigned_staff_id', 'original_day', 'original_shift',
            unique=True,
            postgresql_where="swap_type = 'auto' AND assigned_staff_id IS NOT NULL AND status IN ('potential_assignment', 'staff_accepted', 'manager_final_approval')"
        ),
    )

class SwapHistory(SQLModel, table=True):
    """Track all swap actions for audit trail"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    swap_request_id: uuid.UUID = Field(foreign_key="swaprequest.id")
    action: str = Field(description="requested, accepted, declined, approved, auto_assigned, completed")
    actor_staff_id: Optional[uuid.UUID] = Field(default=None, foreign_key="staff.id")
    actor_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    
# Schedule managment models
class ZoneAssignment(SQLModel, table=True):
    """Track which staff are assigned to which zones"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    schedule_id: uuid.UUID = Field(foreign_key="schedule.id")
    staff_id: uuid.UUID = Field(foreign_key="staff.id")
    zone_id: str  # Zone identifier (e.g., 'front-desk', 'kitchen', etc.)
    day: int  # Day of the week (0-6)
    shift: int  # Shift number (0-2)
    priority: int = Field(default=1)  # Assignment priority
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    
    # Relationships
    schedule: "Schedule" = Relationship()
    staff: "Staff" = Relationship()

class ScheduleTemplate(SQLModel, table=True):
    """Store reusable schedule templates"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    name: str
    description: Optional[str] = None
    template_data: Dict[str, Any] = Field(default_factory=dict, sa_column=SAColumn(JSON))
    tags: List[str] = Field(default_factory=list, sa_column=SAColumn(JSON))
    is_public: bool = Field(default=False)
    created_by: uuid.UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    used_count: int = Field(default=0)
    
    # Relationships
    facility: "Facility" = Relationship()

class ScheduleOptimization(SQLModel, table=True):
    """Track schedule optimization requests and results"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    schedule_id: uuid.UUID = Field(foreign_key="schedule.id")
    optimization_type: str  # 'smart', 'balanced', 'minimal', 'maximum'
    parameters: Dict[str, Any] = Field(default_factory=dict, sa_column=SAColumn(JSON))
    results: Dict[str, Any] = Field(default_factory=dict, sa_column=SAColumn(JSON))
    status: str = Field(default="pending")  # pending, completed, failed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    completed_at: Optional[datetime] = None
    
    # Relationships
    schedule: "Schedule" = Relationship()

#===================== NOTIFICATION MODEL =============================================

class Notification(SQLModel, table=True):
    """Central notification model"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Target and routing
    recipient_user_id: uuid.UUID = Field(foreign_key="user.id")
    recipient_staff_id: Optional[uuid.UUID] = Field(foreign_key="staff.id", default=None)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    facility_id: Optional[uuid.UUID] = Field(foreign_key="facility.id", default=None)
    
    # Notification content
    notification_type: NotificationType
    title: str
    message: str
    priority: NotificationPriority = NotificationPriority.MEDIUM
    
    # Rich content and actions
    data: Dict[str, Any] = Field(default_factory=dict, sa_column=SAColumn(JSON))
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    
    # Delivery tracking
    channels: List[str] = Field(default_factory=list, sa_column=SAColumn(JSON))
    delivery_status: Dict[str, Any] = Field(default_factory=dict, sa_column=SAColumn(JSON))
    
    # State management
    is_read: bool = False
    read_at: Optional[datetime] = None
    is_delivered: bool = False
    delivered_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None
    
    # Relationships
    recipient: "User" = Relationship(back_populates="notifications")

class NotificationTemplate(SQLModel, table=True):
    """Reusable notification templates"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    template_name: str = Field(unique=True)
    notification_type: NotificationType
    
    # Template content (supports variable substitution)
    title_template: str
    message_template: str
    whatsapp_template: Optional[str] = None
    
    # Channel configuration
    default_channels: List[str] = Field(default_factory=list, sa_column=SAColumn(JSON))
    priority: NotificationPriority = NotificationPriority.MEDIUM
    
    # Business rules
    enabled: bool = True
    tenant_id: Optional[uuid.UUID] = Field(foreign_key="tenant.id", default=None)  # null = global template
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))

class NotificationPreference(SQLModel, table=True):
    """User notification preferences"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    user_id: uuid.UUID = Field(foreign_key="user.id")
    notification_type: NotificationType
    
    # Channel preferences
    in_app_enabled: bool = True
    push_enabled: bool = True
    whatsapp_enabled: bool = False
    email_enabled: bool = False
    
    # Timing preferences
    quiet_hours_start: Optional[str] = None  # "22:00"
    quiet_hours_end: Optional[str] = None    # "08:00"
    timezone: str = "UTC"
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None

#==================== SETTINGS MODEL =============================================
class SystemSettings(SQLModel, table=True):
    """System-wide settings for tenant""" 
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", unique=True)  # One settings per tenant
    
    # General Settings
    company_name: str = Field(default="Hotel Management Co.")
    timezone: str = Field(default="UTC")
    date_format: str = Field(default="MM/DD/YYYY")
    currency: str = Field(default="USD")
    language: str = Field(default="en")
    
    # Scheduling Settings (Global Defaults)
    smart_scheduling_enabled: bool = Field(default=True)
    max_optimization_iterations: int = Field(default=100)
    conflict_check_enabled: bool = Field(default=True)
    auto_assign_by_zone: bool = Field(default=True)
    balance_workload: bool = Field(default=True)
    require_manager_per_shift: bool = Field(default=True)
    allow_overtime: bool = Field(default=False)
    
    # Notification Settings (Global Defaults) 
    email_notifications_enabled: bool = Field(default=True)
    whatsapp_notifications_enabled: bool = Field(default=True)
    push_notifications_enabled: bool = Field(default=True)
    schedule_published_notify: bool = Field(default=True)
    swap_request_notify: bool = Field(default=True)
    urgent_swap_notify: bool = Field(default=True)
    daily_reminder_notify: bool = Field(default=False)
    
    # Security Settings
    session_timeout_hours: int = Field(default=24)
    require_two_factor: bool = Field(default=False)
    enforce_strong_passwords: bool = Field(default=True)
    allow_google_auth: bool = Field(default=True)
    allow_apple_auth: bool = Field(default=False)
    
    # Integration Settings - Stored as JSON for flexibility
    integrations: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON),
        description="External integration settings (Twilio, SMTP, etc.)"
    )
    
    # Analytics Settings
    analytics_cache_ttl: int = Field(default=3600)  # 1 hour
    enable_usage_tracking: bool = Field(default=True)
    enable_performance_monitoring: bool = Field(default=True)
    
    # Advanced Settings - JSON field for extensibility
    advanced_settings: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON),
        description="Advanced and custom settings"
    )
    
    # Audit fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None
    updated_by: Optional[uuid.UUID] = Field(foreign_key="user.id", default=None)


class NotificationGlobalSettings(SQLModel, table=True):
    """Global notification settings and templates""" 
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    
    # Email Settings
    smtp_enabled: bool = Field(default=False)
    smtp_host: Optional[str] = None
    smtp_port: int = Field(default=587)
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None  # Should be encrypted
    smtp_use_tls: bool = Field(default=True)
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    
    # WhatsApp/Twilio Settings
    twilio_enabled: bool = Field(default=False)
    twilio_account_sid: Optional[str] = None  # Should be encrypted
    twilio_auth_token: Optional[str] = None   # Should be encrypted
    twilio_whatsapp_number: Optional[str] = None
    
    # Push Notification Settings
    push_enabled: bool = Field(default=False)
    firebase_server_key: Optional[str] = None  # Should be encrypted
    
    # Global notification templates - JSON field
    email_templates: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON)
    )
    whatsapp_templates: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON)
    )
    
    # Rate limiting and delivery settings
    email_rate_limit: int = Field(default=100)  # per hour
    whatsapp_rate_limit: int = Field(default=50)  # per hour
    retry_failed_notifications: bool = Field(default=True)
    max_retry_attempts: int = Field(default=3)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None


class AuditLog(SQLModel, table=True):
    """Audit log for system settings changes"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    
    action: str  # 'UPDATE_SETTINGS', 'CREATE_SETTINGS', 'DELETE_SETTINGS'
    resource_type: str  # 'SystemSettings', 'NotificationSettings', etc.
    resource_id: Optional[uuid.UUID] = None
    
    # Changes stored as JSON
    changes: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON),
        description="What changed: {'field': {'old': value, 'new': value}}"
    )
    
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    
#==================== USER PROFILE MODEL =============================================
class UserProfile(SQLModel, table=True):
    """Individual user profile and preferences"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True)  # One profile per user
    
    # Personal Information
    display_name: Optional[str] = None  # Custom display name (vs. email)
    bio: Optional[str] = None
    title: Optional[str] = None  # Job title
    department: Optional[str] = None
    phone_number: Optional[str] = None
    
    # Avatar & Profile Picture
    avatar_url: Optional[str] = None  # URL to profile picture
    avatar_type: str = Field(default="initials")  # 'initials', 'uploaded', 'gravatar'
    avatar_color: str = Field(default="#3B82F6")  # Hex color for initials avatar
    
    # UI/UX Preferences
    theme: str = Field(default="system")  # 'light', 'dark', 'system'
    language: str = Field(default="en")  # ISO language code
    timezone: str = Field(default="UTC")  # IANA timezone
    date_format: str = Field(default="MM/dd/yyyy")  # User's preferred date format
    time_format: str = Field(default="12h")  # '12h' or '24h'
    currency: str = Field(default="USD")  # ISO currency code
    
    # Dashboard & Layout Preferences
    dashboard_layout: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON),
        description="Dashboard widget layout and preferences"
    )
    sidebar_collapsed: bool = Field(default=False)
    cards_per_row: int = Field(default=3, ge=1, le=6)
    show_welcome_tour: bool = Field(default=True)
    
    # Notification Preferences (Individual Overrides)
    notification_preferences: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON),
        description="Individual notification preferences overriding global settings"
    )
    quiet_hours_enabled: bool = Field(default=False)
    quiet_hours_start: Optional[str] = None  # "22:00"
    quiet_hours_end: Optional[str] = None    # "08:00"
    weekend_notifications: bool = Field(default=True)
    
    # Privacy & Security Preferences
    profile_visibility: str = Field(default="team")  # 'public', 'team', 'private'
    show_email: bool = Field(default=False)
    show_phone: bool = Field(default=False)
    show_online_status: bool = Field(default=True)
    
    # Schedule & Work Preferences
    preferred_shifts: List[str] = Field(
        default_factory=list,
        sa_column=SAColumn(JSON),
        description="User's preferred shift types"
    )
    max_consecutive_days: Optional[int] = None  # Personal override
    preferred_days_off: List[int] = Field(
        default_factory=list,
        sa_column=SAColumn(JSON),
        description="Preferred days off (0=Sunday, 6=Saturday)"
    )
    
    # Advanced Settings
    enable_desktop_notifications: bool = Field(default=True)
    enable_sound_notifications: bool = Field(default=True)
    auto_accept_swaps: bool = Field(default=False)
    show_analytics: bool = Field(default=True)
    
    # Onboarding & Help
    onboarding_completed: bool = Field(default=False)
    onboarding_step: int = Field(default=0)
    last_help_viewed: Optional[datetime] = None
    feature_hints_enabled: bool = Field(default=True)
    
    # Audit fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), 
                                 sa_column=SAColumn(DateTime(timezone=True)))
    updated_at: Optional[datetime] = None
    last_active: Optional[datetime] = None
    
    # Relationships
    user: "User" = Relationship(back_populates="profile")

class ProfilePictureUpload(SQLModel, table=True):
    """Track profile picture uploads for cleanup"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    original_filename: str
    stored_filename: str
    file_size: int
    mime_type: str
    storage_path: str  # Local path or cloud storage URL
    is_active: bool = Field(default=True)
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), 
                                  sa_column=SAColumn(DateTime(timezone=True)))
    
    # Metadata
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    thumbnails: Dict[str, str] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON),
        description="Generated thumbnail URLs"
    )

# ===================== FORGOT PASSWORD MODELS ========================
class PasswordResetToken(SQLModel, table=True):
    """Password reset tokens for secure password recovery"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(unique=True, index=True)
    expires_at: datetime = Field(sa_column=SAColumn(DateTime(timezone=True)))
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), 
                                 sa_column=SAColumn(DateTime(timezone=True)))
    
    # Relationships
    user: User = Relationship()
    __table_args__ = (
        Index(
            'uq_active_reset_token_per_user',
            'user_id',
            unique=True,
            postgresql_where="used = false"
        ),
    )

    @classmethod
    def generate_token(cls, user_id: uuid.UUID, db: Session) -> str:
        """Generate a secure reset token (hashed at rest)"""
        raw = secrets.token_urlsafe(32)
        token_hash = sha256(raw.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        # Atomic transaction: invalidate existing + insert new
        with db.begin():
            cond: ColumnElement[bool] = cast(
                ColumnElement[bool],
                (cls.user_id == user_id) & (cls.used.is_(False)) & (cls.expires_at > datetime.now(timezone.utc)) # type: ignore
            )
            stmt = sa_update(cls).where(cond).values(used=True)
            db.exec(cast(Executable, stmt)) # type: ignore

            new_reset_token = cls(
                user_id=user_id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
            db.add(new_reset_token)

        return raw

    @classmethod
    def verify_token(cls, token: str, db: Session) -> Optional['PasswordResetToken']:
        """Verify token by hash, mark as used if valid, and return the record."""
        token_hash = sha256(token.encode()).hexdigest()
        now = datetime.now(timezone.utc)
        cond_verify: ColumnElement[bool] = cast(
            ColumnElement[bool],
            (cls.token_hash == token_hash) & (cls.used.is_(False)) & (cls.expires_at > now) # type: ignore
        )
        rec = db.exec(select(cls).where(cond_verify)).first()
        if rec:
            rec.used = True
            db.commit()
        return rec