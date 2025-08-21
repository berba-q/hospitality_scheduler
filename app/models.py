from datetime import date, datetime, time, timedelta, timezone
from enum import Enum
import enum
import hashlib
from typing import ClassVar, Optional, List, Dict, Any, cast
import uuid
from hashlib import sha256
from sqlmodel import Column, SQLModel, Field, Relationship, Index, JSON, select, Session, update
from sqlalchemy import Column as SAColumn, DateTime, Enum as SQLEnum, String, update as sa_update
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
    WELCOME_EMAIL = "WELCOME_EMAIL"

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
    is_super_admin: bool = Field(default=False)
    is_active: bool = True
    tenant: Tenant = Relationship(back_populates="managers")
    # Notification settings
    push_token: Optional[str] = None
    whatsapp_number: Optional[str] = None
    
    providers: List["UserProvider"] = Relationship(back_populates="user", cascade_delete=True)
    
    @property
    def linked_providers(self) -> List[str]:
        """Get list of linked provider names"""
        return [p.provider for p in self.providers if p.is_active]
    
    @property 
    def primary_provider(self) -> Optional["UserProvider"]:
        """Get primary authentication provider"""
        return next((p for p in self.providers if p.is_primary), None)
    
    # Relationships
    profile: Optional["UserProfile"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="recipient")
    sessions: List["UserSession"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"foreign_keys": "UserSession.user_id"}
    )
    revoked_sessions: List["UserSession"] = Relationship(
        back_populates="revoker",
        sa_relationship_kwargs={"foreign_keys": "UserSession.revoked_by"}
    )

# ====== LINK ACCOUNTS ===============
class UserProvider(SQLModel, table=True):
    """Track authentication providers linked to user accounts"""
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    provider: str = Field(index=True)  # "google", "fastapi", "apple", etc.
    provider_id: str = Field(index=True)  # Provider's unique ID for user
    provider_email: str = Field(index=True)  # Email from provider
    
    # Provider-specific data
    provider_data: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Status tracking
    linked_at: datetime =  Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=SAColumn(DateTime(timezone=True)))
    is_primary: bool = Field(default=False)  # Primary login method
    is_active: bool = Field(default=True)
    
    # Relationships
    user: User = Relationship(back_populates="providers")

class AccountVerificationToken(SQLModel, table=True):
    """Account linking email verification tokens"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True)  # Email to be verified for linking
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)  # User requesting the link
    provider: str = Field()  # Provider to be linked (e.g., "google")
    provider_id: str = Field()  # Provider's user ID
    provider_email: str = Field()  # Provider's email address
    provider_data: Dict[str, Any] = Field(default_factory=dict, sa_column=SAColumn(JSON))  # Additional provider data
    code_hash: str = Field(index=True)  # Hashed verification code
    expires_at: datetime = Field()
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Class configuration
    TOKEN_EXPIRY_HOURS: ClassVar[int] = 24
    CODE_LENGTH: ClassVar[int] = 6
    
    @classmethod
    def generate_code(
        cls, 
        user_id: uuid.UUID, 
        email: str,
        provider: str,
        provider_id: str,
        provider_email: str,
        provider_data: Dict[str, Any],
        db: Session
    ) -> str:
        """Generate a new verification code for account linking"""
        
        # Invalidate any existing unused tokens for this user/email/provider combination
        existing_tokens = db.exec(
            select(cls).where(
                cls.user_id == user_id,
                cls.email == email,
                cls.provider == provider,
                cls.used == False
            )
        ).all()
        
        for token in existing_tokens:
            token.used = True
        
        # Generate 6-digit verification code
        code = ''.join([str(secrets.randbelow(10)) for _ in range(cls.CODE_LENGTH)])
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        
        # Create new token
        token = cls(
            user_id=user_id,
            email=email,
            provider=provider,
            provider_id=provider_id,
            provider_email=provider_email,
            provider_data=provider_data,
            code_hash=code_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=cls.TOKEN_EXPIRY_HOURS)
        )
        
        db.add(token)
        db.commit()
        db.refresh(token)
        
        return code
    
    @classmethod
    def verify_code(cls, email: str, code: str, db: Session) -> Optional["AccountVerificationToken"]:
        """Verify a verification code"""
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        
        token = db.exec(
            select(cls).where(
                cls.email == email,
                cls.code_hash == code_hash,
                cls.used == False,
                cls.expires_at > datetime.now(timezone.utc)
            )
        ).first()
        
        return token

# ======================= ACCOUNT LOCKOUT MODELS =======================
class LoginAttempt(SQLModel, table=True):
    """Track failed login attempts for account lockout"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True)
    ip_address: str = Field(index=True)
    user_agent: Optional[str] = None
    success: bool = Field(default=False)
    failure_reason: Optional[str] = None
    attempted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), index=True)
    )
    
    # Add composite index for performance
    __table_args__ = (
        Index('idx_email_attempted_at', 'email', 'attempted_at'),
        Index('idx_ip_attempted_at', 'ip_address', 'attempted_at'),
    )

class AccountLockout(SQLModel, table=True):
    """Track account lockout status"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    locked_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    locked_until: datetime = Field(sa_column=Column(DateTime(timezone=True)))
    failed_attempts: int = Field(default=0)
    lockout_reason: str = Field(default="too_many_failed_attempts")
    is_active: bool = Field(default=True)
    
    @property
    def is_locked(self) -> bool:
        """Check if account is currently locked"""
        if not self.is_active:
            return False
        return datetime.now(timezone.utc) < self.locked_until

# ======================= AUDIT LOGGING MODELS =======================
class AuditEvent(str, enum.Enum):
    """Audit event types"""
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGIN_FAILED_LOCKED = "login_failed_locked"
    LOGOUT = "logout"
    
    # Registration events
    SIGNUP_SUCCESS = "signup_success"
    SIGNUP_FAILED = "signup_failed"
    
    # Password events
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_SUCCESS = "password_reset_success"
    PASSWORD_RESET_FAILED = "password_reset_failed"
    
    # Account management events
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    ACCOUNT_DEACTIVATED = "account_deactivated"
    ACCOUNT_REACTIVATED = "account_reactivated"
    
    # Session events
    SESSION_CREATED = "session_created"
    SESSION_REVOKED = "session_revoked"
    ALL_SESSIONS_REVOKED = "all_sessions_revoked"
    SESSION_EXPIRED = "session_expired"
    
    # Permission events
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    ROLE_CHANGED = "role_changed"
    
    # Data access events
    SENSITIVE_DATA_ACCESSED = "sensitive_data_accessed"
    BULK_DATA_EXPORT = "bulk_data_export"
    
    # Security events
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    
    # System events (add these)
    SYSTEM_STARTUP = "system_startup"
    SYSTEM_SHUTDOWN = "system_shutdown"
    SYSTEM_ERROR = "system_error"
    SYSTEM_MAINTENANCE = "system_maintenance"
    
    #  Additional security events
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    SECURITY_POLICY_VIOLATION = "security_policy_violation"
    BRUTE_FORCE_DETECTED = "brute_force_detected"
    IP_BLOCKED = "ip_blocked"
    
    # Admin actions
    ADMIN_LOGIN = "admin_login"
    ADMIN_ACTION = "admin_action"
    USER_IMPERSONATION = "user_impersonation"
    BULK_USER_ACTION = "bulk_user_action"
    
    # API and integration events
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    API_RATE_LIMITED = "api_rate_limited"
    WEBHOOK_FAILED = "webhook_failed"
    
    # Data events
    DATA_EXPORTED = "data_exported"
    DATA_IMPORTED = "data_imported"
    DATA_DELETED = "data_deleted"
    BACKUP_CREATED = "backup_created"
    
    #  Compliance events
    GDPR_REQUEST = "gdpr_request"
    DATA_RETENTION_APPLIED = "data_retention_applied"
    AUDIT_LOG_EXPORTED = "audit_log_exported"
    COMPLIANCE_REPORT_GENERATED = "compliance_report_generated"

# ======================= SESSION MANAGEMENT MODELS =======================
class UserSession(SQLModel, table=True):
    """Track active user sessions for revocation"""
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    session_token_hash: str = Field(unique=True, index=True)  # Hashed JWT token
    
    # Session metadata
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    last_used: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), index=True)
    )
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), index=True))
    
    # Device/client information
    ip_address: str
    user_agent: Optional[str] = None
    device_fingerprint: Optional[str] = None
    
    # Session status
    is_active: bool = Field(default=True, index=True)
    revoked_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    revoked_by: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")  # Admin who revoked
    revocation_reason: Optional[str] = None
    
    # Relationships
    user: "User" = Relationship(
        back_populates="sessions",
        sa_relationship_kwargs={"foreign_keys": "UserSession.user_id"}
    )
    revoker: Optional["User"] = Relationship(
        back_populates="revoked_sessions",
        sa_relationship_kwargs={"foreign_keys": "UserSession.revoked_by"}
    )

    @property
    def is_expired(self) -> bool:
        """Check if session is expired"""
        return datetime.now(timezone.utc) > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Check if session is valid (active and not expired)"""
        return self.is_active and not self.is_expired

# ======================= SECURITY SETTINGS MODELS =======================
class SecuritySettings(SQLModel, table=True):
    """Tenant-specific security configuration"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", unique=True, index=True)
    
    # Account lockout settings
    max_failed_attempts: int = Field(default=5)
    lockout_duration_minutes: int = Field(default=30)
    failed_attempts_window_minutes: int = Field(default=15)
    
    # Password policy
    min_password_length: int = Field(default=8)
    require_uppercase: bool = Field(default=True)
    require_lowercase: bool = Field(default=True)
    require_numbers: bool = Field(default=True)
    require_special_chars: bool = Field(default=True)
    password_history_count: int = Field(default=5)  # Remember last N passwords
    password_expiry_days: Optional[int] = Field(default=None)  # None = no expiry
    
    # Session settings
    session_timeout_minutes: int = Field(default=480)  # 8 hours
    max_concurrent_sessions: int = Field(default=5)
    require_2fa: bool = Field(default=False)
    
    # Rate limiting (per IP)
    login_rate_limit_per_hour: int = Field(default=20)
    signup_rate_limit_per_hour: int = Field(default=5)
    password_reset_rate_limit_per_hour: int = Field(default=3)
    
    # Audit settings
    audit_login_attempts: bool = Field(default=True)
    audit_data_access: bool = Field(default=True)
    audit_retention_days: int = Field(default=90)
    
    # Additional security features
    ip_whitelist: Optional[list] = Field(default=None, sa_column=Column(JSON))
    force_https: bool = Field(default=True)
    
    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    updated_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    updated_by: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    
    # Relationships
    tenant: "Tenant" = Relationship()

# ======================= PASSWORD HISTORY MODEL =======================
class PasswordHistory(SQLModel, table=True):
    """Track password history to prevent reuse"""
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    password_hash: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), index=True)
    )
    
    # Relationships
    user: User = Relationship()
    
    __table_args__ = (
        Index('idx_passwordhistory_user_created_at', 'user_id', 'created_at'),
    )

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
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), 
        sa_column=SAColumn(DateTime(timezone=True))
    )
    manager_approved_at: Optional[datetime] = Field(
        default=None, 
        sa_column=SAColumn(DateTime(timezone=True))
    )
    staff_responded_at: Optional[datetime] = Field(
        default=None, 
        sa_column=SAColumn(DateTime(timezone=True))
    )
    manager_final_approved_at: Optional[datetime] = Field(
        default=None, 
        sa_column=SAColumn(DateTime(timezone=True))
    )
    expires_at: Optional[datetime] = Field(
        default=None, 
        sa_column=SAColumn(DateTime(timezone=True))
    )
    completed_at: Optional[datetime] = Field(
        default=None, 
        sa_column=SAColumn(DateTime(timezone=True))
    )
    
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
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    
    action: str  # 'UPDATE_SETTINGS', 'CREATE_SETTINGS', 'DELETE_SETTINGS'
    resource_type: str  # 'SystemSettings', 'NotificationSettings', etc.
    resource_id: Optional[uuid.UUID] = None
    
    # Changes stored as JSON
    changes: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=SAColumn(JSON),
        description="What changed: {'field': {'old': value, 'new': value}}"
    )
    
    ip_address: Optional[str] = Field(index=True)
    user_agent: Optional[str] = None
    
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), 
        sa_column=SAColumn(DateTime(timezone=True), index=True)
    )
    
    event_type: AuditEvent = Field(
    sa_column=SAColumn(
        SQLEnum(
            AuditEvent,
            name="auditevent",
            create_constraint=True,
            native_enum=True,
            validate_strings=True,
        ),
        index=True,
        nullable=False,
        )
    )
    event_description: Optional[str] = None
    severity: str = Field(default="info")  # info, warning, error, critical
    request_id: Optional[str] = Field(default=None, index=True)  # For request tracing
    
    details: Optional[Dict[str, Any]] = Field(
        default_factory=dict, 
        sa_column=SAColumn(JSON),
        description="Additional context beyond field changes"
    )
    
    # Performance indexes
    __table_args__ = (
        Index('idx_auditlog_user_created_at', 'user_id', 'created_at'),
        Index('idx_action_created_at', 'action', 'created_at'),
        Index('idx_event_created_at', 'event_type', 'created_at'),
        Index('idx_tenant_created_at', 'tenant_id', 'created_at'),
        Index('idx_severity_created_at', 'severity', 'created_at'),
    )
    
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

# ====================== Invite users ================================
class StaffInvitation(SQLModel, table=True):
    """Staff invitation tokens for new user onboarding"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    staff_id: uuid.UUID = Field(foreign_key="staff.id", index=True)
    email: str = Field(index=True)
    token: str = Field(unique=True, index=True)
    
    # Invitation details
    invited_by: uuid.UUID = Field(foreign_key="user.id")
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    
    # Status tracking
    expires_at: datetime = Field(sa_column=SAColumn(DateTime(timezone=True)))
    sent_at: Optional[datetime] = Field(default=None, sa_column=SAColumn(DateTime(timezone=True)))
    accepted_at: Optional[datetime] = Field(default=None, sa_column=SAColumn(DateTime(timezone=True)))
    cancelled_at: Optional[datetime] = Field(default=None, sa_column=SAColumn(DateTime(timezone=True)))
    
    # Custom invitation message
    custom_message: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), 
                                  sa_column=SAColumn(DateTime(timezone=True)))
    
    # Relationships
    staff: Staff = Relationship()
    invited_by_user: User = Relationship(sa_relationship_kwargs={"foreign_keys": "StaffInvitation.invited_by"})
    tenant: Tenant = Relationship()
    facility: Facility = Relationship()
    
    @property
    def status(self) -> str:
        """Get current invitation status"""
        if self.cancelled_at:
            return "cancelled"
        elif self.accepted_at:
            return "accepted"
        elif self.expires_at < datetime.now(timezone.utc):
            return "expired"
        elif self.sent_at:
            return "sent"
        else:
            return "pending"
    
    @classmethod
    def generate_token(cls) -> str:
        """Generate a secure invitation token"""
        return secrets.token_urlsafe(32)
    
    def is_valid(self) -> bool:
        """Check if invitation is still valid"""
        return (
            not self.accepted_at and 
            not self.cancelled_at and 
            self.expires_at > datetime.now(timezone.utc)
        )