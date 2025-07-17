from datetime import date, datetime, time
from typing import Optional, List, Dict, Any
import uuid
from sqlmodel import SQLModel, Field, Relationship, Column, JSON


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
    settings: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
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
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
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
    required_roles: Optional[List[str]] = Field(default_factory=list, sa_column=Column(JSON))
    preferred_roles: Optional[List[str]] = Field(default_factory=list, sa_column=Column(JSON))
    
    # Staffing requirements
    min_staff_per_shift: int = Field(default=1, ge=1, le=20)
    max_staff_per_shift: int = Field(default=5, ge=1, le=50)
    
    is_active: bool = Field(default=True)
    display_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
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
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    shift: FacilityShift = Relationship(back_populates="rolerequirements")
    role: FacilityRole = Relationship(back_populates="shiftrequirements")

class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    email: str
    hashed_password: str
    is_manager: bool = False
    is_active: bool = True

    tenant: Tenant = Relationship(back_populates="managers")

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
    unavailability: List["StaffUnavailability"] = Relationship(back_populates="staff")
    facility: Facility = Relationship(back_populates="staff")


class StaffUnavailability(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    staff_id: uuid.UUID = Field(foreign_key="staff.id")
    start: datetime
    end: datetime
    reason: Optional[str] = None
    is_recurring: bool = Field(default=False)  # For weekly recurring unavailability
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Add relationship back to staff
    staff: Optional["Staff"] = Relationship(back_populates="unavailability")
    

class Schedule(SQLModel, table=True):
    id: uuid.UUID | None = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    week_start: date
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

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
        sa_column=Column(JSON)
    )
    
    # Business rules
    allow_overtime: bool = Field(default=False)
    weekend_restrictions: bool = Field(default=False)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SwapRequest(SQLModel, table=True):
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    schedule_id: uuid.UUID = Field(foreign_key="schedule.id")
    requesting_staff_id: uuid.UUID = Field(foreign_key="staff.id")
    
    # Original shift details
    original_day: int
    original_shift: int
    
    # Swap type: "specific" or "auto"
    swap_type: str = Field(description="specific or auto")
    
    # For specific swaps
    target_staff_id: Optional[uuid.UUID] = Field(default=None, foreign_key="staff.id")
    target_day: Optional[int] = None
    target_shift: Optional[int] = None
    
    # For auto swaps - system will fill this when approved
    assigned_staff_id: Optional[uuid.UUID] = Field(default=None, foreign_key="staff.id")
    
    # Request details
    reason: str
    urgency: str = Field(default="normal", description="low, normal, high, emergency")
    
    # Status tracking
    status: str = Field(
    default="pending", 
    description="pending, manager_approved, staff_accepted, staff_declined, assigned, assignment_declined, assignment_failed, executed, declined, cancelled"
    )
    
    # Approval workflow
    target_staff_accepted: Optional[bool] = None  # For specific swaps
    manager_approved: Optional[bool] = None
    manager_notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # Auto-expire requests
    completed_at: Optional[datetime] = None

class SwapHistory(SQLModel, table=True):
    """Track all swap actions for audit trail"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    swap_request_id: uuid.UUID = Field(foreign_key="swaprequest.id")
    action: str = Field(description="requested, accepted, declined, approved, auto_assigned, completed")
    actor_staff_id: Optional[uuid.UUID] = Field(default=None, foreign_key="staff.id")
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    schedule: "Schedule" = Relationship()
    staff: "Staff" = Relationship()

class ScheduleTemplate(SQLModel, table=True):
    """Store reusable schedule templates"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    name: str
    description: Optional[str] = None
    template_data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    is_public: bool = Field(default=False)
    created_by: uuid.UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    used_count: int = Field(default=0)
    
    # Relationships
    facility: "Facility" = Relationship()

class ScheduleOptimization(SQLModel, table=True):
    """Track schedule optimization requests and results"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    schedule_id: uuid.UUID = Field(foreign_key="schedule.id")
    optimization_type: str  # 'smart', 'balanced', 'minimal', 'maximum'
    parameters: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    results: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    status: str = Field(default="pending")  # pending, completed, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # Relationships
    schedule: "Schedule" = Relationship()