from datetime import date, datetime, time
from typing import Optional, List
import uuid
from sqlmodel import SQLModel, Field, Relationship


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

    tenant: Tenant = Relationship(back_populates="facilities")
    staff: List["Staff"] = Relationship(back_populates="facility")


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
    role: str
    skill_level: int | None = Field(default=1)
    weekly_hours_max: int | None = Field(default=40)
    phone: Optional[str] = None
    is_active: bool = True

    facility: Facility = Relationship(back_populates="staff")

class StaffUnavailability(SQLModel, table=True):
    id: uuid.UUID | None = Field(default_factory=uuid.uuid4, primary_key=True)
    staff_id: uuid.UUID = Field(foreign_key="staff.id")
    start: datetime
    end: datetime
    
class Schedule(SQLModel, table=True):
    id: uuid.UUID | None = Field(default_factory=uuid.uuid4, primary_key=True)
    facility_id: uuid.UUID = Field(foreign_key="facility.id")
    week_start: date
    created_at: datetime = Field(default_factory=datetime.utcnow)

    assignments: list["ShiftAssignment"] = Relationship(back_populates="schedule")

class ShiftAssignment(SQLModel, table=True):
    id: uuid.UUID | None = Field(default_factory=uuid.uuid4, primary_key=True)
    schedule_id: uuid.UUID = Field(foreign_key="schedule.id")
    day: int
    shift: int
    staff_id: uuid.UUID = Field(foreign_key="staff.id")

    schedule: Schedule = Relationship(back_populates="assignments")
    
