# facility management endpoints

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func, and_, or_
from typing import List, Optional
from datetime import datetime
import uuid

from ...deps import get_db, get_current_user
from ...models import (
    Facility, FacilityShift, FacilityRole, FacilityZone, 
    ShiftRoleRequirement, Staff, User, Schedule, SwapRequest
)
from ...schemas import (
    # Enhanced Facility schemas
    FacilityCreate, FacilityRead, FacilityUpdate, FacilityWithDetails,
    FacilityDeleteResponse, FacilityDeleteValidation,
    
    # Shift schemas
    FacilityShiftCreate, FacilityShiftRead, FacilityShiftUpdate,
    FacilityShiftDeleteResponse, FacilityShiftDeleteValidation,
    BulkFacilityShiftCreate,
    
    # Role schemas
    FacilityRoleCreate, FacilityRoleRead, FacilityRoleUpdate,
    FacilityRoleDeleteResponse, FacilityRoleDeleteValidation,
    BulkFacilityRoleCreate,
    
    # Zone schemas
    FacilityZoneCreate, FacilityZoneRead, FacilityZoneUpdate,
    FacilityZoneDeleteResponse, FacilityZoneDeleteValidation,
    BulkFacilityZoneCreate,
    
    # Utility schemas
    FacilityTemplate, FacilityImportData, BulkDeleteRequest, BulkDeleteResponse,
    SoftDeleteRequest, SoftDeleteResponse
)

router = APIRouter(prefix="/facilities", tags=["facility"])

# ==================== FACILITY CRUD ====================

@router.post("/", response_model=FacilityRead, status_code=201)
def create_facility(
    facility_in: FacilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new facility with default shifts, roles, and zones"""
    
    # Check for duplicate facility name within tenant
    existing_facility = db.exec(
        select(Facility)
        .where(Facility.tenant_id == current_user.tenant_id)
        .where(Facility.name == facility_in.name)
    ).first()
    
    if existing_facility:
        raise HTTPException(
            status_code=400, 
            detail=f"Facility with name '{facility_in.name}' already exists"
        )
    
    # Create the facility
    facility_data = facility_in.dict()
    facility = Facility(tenant_id=current_user.tenant_id, **facility_data)
    db.add(facility)
    db.commit()
    db.refresh(facility)
    
    # Set up default configuration based on facility type
    _setup_default_facility_config(db, facility)
    
    return facility


@router.get("/", response_model=List[FacilityWithDetails])
def list_facilities(
    include_details: bool = Query(True, description="Include shifts, roles, and zones"),
    facility_type: Optional[str] = Query(None, description="Filter by facility type"),
    include_inactive: bool = Query(False, description="Include inactive facilities"),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """List all facilities for the current tenant with optional details"""
    
    query = select(Facility).where(Facility.tenant_id == current_user.tenant_id)
    
    if facility_type:
        query = query.where(Facility.facility_type == facility_type)
    
    facilities = db.exec(query).all()
    
    if not include_details:
        return [FacilityRead.from_orm(f) for f in facilities]
    
    # Include detailed information
    result = []
    for facility in facilities:
        # Get shifts, roles, zones, and counts
        shifts = db.exec(
            select(FacilityShift)
            .where(FacilityShift.facility_id == facility.id)
            .where(FacilityShift.is_active == True if not include_inactive else True)
            .order_by(FacilityShift.shift_order)
        ).all()
        
        roles = db.exec(
            select(FacilityRole)
            .where(FacilityRole.facility_id == facility.id)
            .where(FacilityRole.is_active == True if not include_inactive else True)
        ).all()
        
        zones = db.exec(
            select(FacilityZone)
            .where(FacilityZone.facility_id == facility.id)
            .where(FacilityZone.is_active == True if not include_inactive else True)
            .order_by(FacilityZone.display_order)
        ).all()
        
        # Get staff count
        staff_count = db.exec(
            select(func.count(Staff.id))
            .where(Staff.facility_id == facility.id)
            .where(Staff.is_active == True)
        ).first() or 0
        
        # Get active schedules count
        active_schedules = db.exec(
            select(func.count(Schedule.id))
            .where(Schedule.facility_id == facility.id)
        ).first() or 0
        
        facility_detail = FacilityWithDetails(
            **facility.dict(),
            shifts=[FacilityShiftRead.from_orm(s) for s in shifts],
            roles=[FacilityRoleRead.from_orm(r) for r in roles],
            zones=[FacilityZoneRead.from_orm(z) for z in zones],
            staff_count=staff_count,
            active_schedules=active_schedules
        )
        result.append(facility_detail)
    
    return result


@router.get("/{facility_id}", response_model=FacilityWithDetails)
def get_facility(
    facility_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific facility with all details"""
    facility = _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    # Get related data
    shifts = db.exec(
        select(FacilityShift)
        .where(FacilityShift.facility_id == facility_id)
        .where(FacilityShift.is_active == True)
        .order_by(FacilityShift.shift_order)
    ).all()
    
    roles = db.exec(
        select(FacilityRole)
        .where(FacilityRole.facility_id == facility_id)
        .where(FacilityRole.is_active == True)
    ).all()
    
    zones = db.exec(
        select(FacilityZone)
        .where(FacilityZone.facility_id == facility_id)
        .where(FacilityZone.is_active == True)
        .order_by(FacilityZone.display_order)
    ).all()
    
    staff_count = db.exec(
        select(func.count(Staff.id))
        .where(Staff.facility_id == facility_id)
        .where(Staff.is_active == True)
    ).first() or 0
    
    active_schedules = db.exec(
        select(func.count(Schedule.id))
        .where(Schedule.facility_id == facility_id)
    ).first() or 0
    
    return FacilityWithDetails(
        **facility.dict(),
        shifts=[FacilityShiftRead.from_orm(s) for s in shifts],
        roles=[FacilityRoleRead.from_orm(r) for r in roles],
        zones=[FacilityZoneRead.from_orm(z) for z in zones],
        staff_count=staff_count,
        active_schedules=active_schedules
    )


@router.put("/{facility_id}", response_model=FacilityRead)
def update_facility(
    facility_id: uuid.UUID,
    facility_update: FacilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update facility information"""
    facility = _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    # Check for duplicate name if updating name
    if facility_update.name and facility_update.name != facility.name:
        existing = db.exec(
            select(Facility)
            .where(Facility.tenant_id == current_user.tenant_id)
            .where(Facility.name == facility_update.name)
            .where(Facility.id != facility_id)
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Facility with name '{facility_update.name}' already exists"
            )
    
    # Update fields
    for field, value in facility_update.dict(exclude_unset=True).items():
        setattr(facility, field, value)
    
    facility.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(facility)
    
    return facility


@router.delete("/{facility_id}/validate", response_model=FacilityDeleteValidation)
def validate_facility_deletion(
    facility_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate if facility can be deleted and show impact"""
    facility = _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    # Check dependencies
    active_staff_count = db.exec(
        select(func.count(Staff.id))
        .where(Staff.facility_id == facility_id)
        .where(Staff.is_active == True)
    ).first() or 0
    
    active_schedules_count = db.exec(
        select(func.count(Schedule.id))
        .where(Schedule.facility_id == facility_id)
    ).first() or 0
    
    pending_swaps_count = db.exec(
        select(func.count(SwapRequest.id))
        .where(SwapRequest.schedule_id.in_(
            select(Schedule.id).where(Schedule.facility_id == facility_id)
        ))
        .where(SwapRequest.status.in_(["pending", "manager_approved"]))
    ).first() or 0
    
    errors = []
    warnings = []
    
    if active_staff_count > 0:
        errors.append(f"Facility has {active_staff_count} active staff members")
    
    if active_schedules_count > 0:
        errors.append(f"Facility has {active_schedules_count} schedules")
    
    if pending_swaps_count > 0:
        warnings.append(f"Facility has {pending_swaps_count} pending swap requests")
    
    can_delete = len(errors) == 0
    
    return FacilityDeleteValidation(
        can_delete=can_delete,
        active_staff_count=active_staff_count,
        active_schedules_count=active_schedules_count,
        pending_swaps_count=pending_swaps_count,
        errors=errors,
        warnings=warnings
    )


@router.delete("/{facility_id}", response_model=FacilityDeleteResponse)
def delete_facility(
    facility_id: uuid.UUID,
    force: bool = Query(False, description="Force delete even with dependencies"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a facility and optionally its dependencies"""
    facility = _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    # Validate deletion unless forced
    if not force:
        validation = validate_facility_deletion(facility_id, db, current_user)
        if not validation.can_delete:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete facility: {'; '.join(validation.errors)}"
            )
    
    # Count what will be affected
    affected_staff = db.exec(
        select(func.count(Staff.id))
        .where(Staff.facility_id == facility_id)
    ).first() or 0
    
    affected_schedules = db.exec(
        select(func.count(Schedule.id))
        .where(Schedule.facility_id == facility_id)
    ).first() or 0
    
    # Delete the facility (cascading deletes will handle related entities)
    db.delete(facility)
    db.commit()
    
    return FacilityDeleteResponse(
        success=True,
        message=f"Facility '{facility.name}' deleted successfully",
        deleted_id=facility_id,
        entity_type="facility",
        affected_staff_count=affected_staff,
        affected_schedules_count=affected_schedules
    )


# ==================== SHIFT MANAGEMENT ====================

@router.get("/{facility_id}/shifts", response_model=List[FacilityShiftRead])
def get_facility_shifts(
    facility_id: uuid.UUID,
    include_inactive: bool = Query(False, description="Include inactive shifts"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all shifts for a facility"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    query = select(FacilityShift).where(FacilityShift.facility_id == facility_id)
    
    if not include_inactive:
        query = query.where(FacilityShift.is_active == True)
    
    query = query.order_by(FacilityShift.shift_order)
    shifts = db.exec(query).all()
    
    return [FacilityShiftRead.from_orm(shift) for shift in shifts]


@router.post("/{facility_id}/shifts", response_model=FacilityShiftRead, status_code=201)
def create_facility_shift(
    facility_id: uuid.UUID,
    shift_data: FacilityShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new shift for a facility"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    # Ensure facility_id matches
    shift_data.facility_id = facility_id
    
    # Check for duplicate shift name
    existing_shift = db.exec(
        select(FacilityShift)
        .where(FacilityShift.facility_id == facility_id)
        .where(FacilityShift.shift_name == shift_data.shift_name)
        .where(FacilityShift.is_active == True)
    ).first()
    
    if existing_shift:
        raise HTTPException(
            status_code=400,
            detail=f"Shift '{shift_data.shift_name}' already exists for this facility"
        )
    
    shift = FacilityShift(**shift_data.dict())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    
    return FacilityShiftRead.from_orm(shift)


@router.put("/{facility_id}/shifts/bulk", response_model=List[FacilityShiftRead])
def update_facility_shifts_bulk(
    facility_id: uuid.UUID,
    shifts_data: BulkFacilityShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk update/replace all shifts for a facility"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    # Deactivate existing shifts
    existing_shifts = db.exec(
        select(FacilityShift).where(FacilityShift.facility_id == facility_id)
    ).all()
    
    for shift in existing_shifts:
        shift.is_active = False
        shift.updated_at = datetime.utcnow()
    
    # Create new shifts
    new_shifts = []
    for i, shift_data in enumerate(shifts_data.shifts):
        shift = FacilityShift(
            facility_id=facility_id,
            shift_order=i,
            **shift_data.dict()
        )
        db.add(shift)
        new_shifts.append(shift)
    
    db.commit()
    
    # Refresh and return
    for shift in new_shifts:
        db.refresh(shift)
    
    return [FacilityShiftRead.from_orm(shift) for shift in new_shifts]


@router.put("/{facility_id}/shifts/{shift_id}", response_model=FacilityShiftRead)
def update_facility_shift(
    facility_id: uuid.UUID,
    shift_id: uuid.UUID,
    shift_update: FacilityShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific shift"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    shift = db.get(FacilityShift, shift_id)
    if not shift or shift.facility_id != facility_id:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Check for duplicate name if updating name
    if shift_update.shift_name and shift_update.shift_name != shift.shift_name:
        existing = db.exec(
            select(FacilityShift)
            .where(FacilityShift.facility_id == facility_id)
            .where(FacilityShift.shift_name == shift_update.shift_name)
            .where(FacilityShift.is_active == True)
            .where(FacilityShift.id != shift_id)
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Shift '{shift_update.shift_name}' already exists"
            )
    
    # Update fields
    for field, value in shift_update.dict(exclude_unset=True).items():
        setattr(shift, field, value)
    
    shift.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shift)
    
    return FacilityShiftRead.from_orm(shift)


@router.delete("/{facility_id}/shifts/{shift_id}/validate", response_model=FacilityShiftDeleteValidation)
def validate_shift_deletion(
    facility_id: uuid.UUID,
    shift_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate if shift can be deleted"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    shift = db.get(FacilityShift, shift_id)
    if not shift or shift.facility_id != facility_id:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Check if it's the last active shift
    active_shifts_count = db.exec(
        select(func.count(FacilityShift.id))
        .where(FacilityShift.facility_id == facility_id)
        .where(FacilityShift.is_active == True)
    ).first() or 0
    
    is_last_shift = active_shifts_count <= 1
    
    # Check future assignments (simplified - you'd check actual schedule assignments)
    future_assignments_count = 0  # TODO: Implement based on your schedule structure
    
    errors = []
    if is_last_shift:
        errors.append("Cannot delete the last active shift. At least one shift is required.")
    
    return FacilityShiftDeleteValidation(
        can_delete=len(errors) == 0,
        is_last_shift=is_last_shift,
        future_assignments_count=future_assignments_count,
        shift_requirements_count=0,  # TODO: Count shift role requirements
        errors=errors
    )


@router.delete("/{facility_id}/shifts/{shift_id}", response_model=FacilityShiftDeleteResponse)
def delete_facility_shift(
    facility_id: uuid.UUID,
    shift_id: uuid.UUID,
    soft_delete: bool = Query(True, description="Soft delete (deactivate) instead of hard delete"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a shift (soft delete by default)"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    shift = db.get(FacilityShift, shift_id)
    if not shift or shift.facility_id != facility_id:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Validate deletion
    validation = validate_shift_deletion(facility_id, shift_id, db, current_user)
    if not validation.can_delete:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete shift: {'; '.join(validation.errors)}"
        )
    
    remaining_shifts_count = validation.future_assignments_count
    
    if soft_delete:
        # Soft delete - mark as inactive
        shift.is_active = False
        shift.updated_at = datetime.utcnow()
        db.commit()
        message = f"Shift '{shift.shift_name}' deactivated successfully"
    else:
        # Hard delete
        db.delete(shift)
        db.commit()
        message = f"Shift '{shift.shift_name}' deleted successfully"
    
    return FacilityShiftDeleteResponse(
        success=True,
        message=message,
        deleted_id=shift_id,
        entity_type="facility_shift",
        remaining_shifts_count=remaining_shifts_count,
        affected_assignments_count=validation.future_assignments_count
    )


# ==================== ROLE MANAGEMENT ====================
# Similar structure for roles - I'll continue with the key endpoints

@router.get("/{facility_id}/roles", response_model=List[FacilityRoleRead])
def get_facility_roles(
    facility_id: uuid.UUID,
    include_inactive: bool = Query(False, description="Include inactive roles"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all roles for a facility"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    query = select(FacilityRole).where(FacilityRole.facility_id == facility_id)
    
    if not include_inactive:
        query = query.where(FacilityRole.is_active == True)
    
    roles = db.exec(query).all()
    return [FacilityRoleRead.from_orm(role) for role in roles]


@router.post("/{facility_id}/roles", response_model=FacilityRoleRead, status_code=201)
def create_facility_role(
    facility_id: uuid.UUID,
    role_data: FacilityRoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new role for a facility"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    # Check for duplicate role name
    existing_role = db.exec(
        select(FacilityRole)
        .where(FacilityRole.facility_id == facility_id)
        .where(FacilityRole.role_name == role_data.role_name)
        .where(FacilityRole.is_active == True)
    ).first()
    
    if existing_role:
        raise HTTPException(
            status_code=400, 
            detail=f"Role '{role_data.role_name}' already exists for this facility"
        )
    
    role_data.facility_id = facility_id
    role = FacilityRole(**role_data.dict())
    db.add(role)
    db.commit()
    db.refresh(role)
    
    return FacilityRoleRead.from_orm(role)


# ==================== ZONE MANAGEMENT ====================

@router.get("/{facility_id}/zones", response_model=List[FacilityZoneRead])
def get_facility_zones(
    facility_id: uuid.UUID,
    include_inactive: bool = Query(False, description="Include inactive zones"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all zones for a facility"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    query = select(FacilityZone).where(FacilityZone.facility_id == facility_id)
    
    if not include_inactive:
        query = query.where(FacilityZone.is_active == True)
    
    query = query.order_by(FacilityZone.display_order)
    zones = db.exec(query).all()
    
    return [FacilityZoneRead.from_orm(zone) for zone in zones]


# ==================== TEMPLATES & IMPORT ====================

@router.get("/templates/{facility_type}", response_model=FacilityTemplate)
def get_facility_template(facility_type: str):
    """Get default template for a facility type"""
    return _get_facility_template(facility_type)


@router.post("/import", response_model=List[FacilityRead])
def import_facilities(
    facilities_data: List[FacilityImportData],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import multiple facilities from Excel/CSV data"""
    created_facilities = []
    
    for facility_data in facilities_data:
        # Check for duplicate facility name
        existing = db.exec(
            select(Facility)
            .where(Facility.tenant_id == current_user.tenant_id)
            .where(Facility.name == facility_data.name)
        ).first()
        
        if existing:
            continue  # Skip duplicates
        
        # Create facility
        facility = Facility(
            tenant_id=current_user.tenant_id,
            **facility_data.dict()
        )
        db.add(facility)
        db.commit()
        db.refresh(facility)
        
        # Setup default configuration
        _setup_default_facility_config(db, facility)
        
        created_facilities.append(facility)
    
    return created_facilities


# ==================== HELPER FUNCTIONS ====================

def _verify_facility_access(db: Session, facility_id: uuid.UUID, tenant_id: uuid.UUID) -> Facility:
    """Verify user has access to facility"""
    facility = db.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    
    if facility.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return facility


def _setup_default_facility_config(db: Session, facility: Facility):
    """Set up default shifts, roles, and zones for a new facility"""
    template = _get_facility_template(facility.facility_type)
    
    # Create default shifts
    for i, shift_data in enumerate(template.shifts):
        shift = FacilityShift(
            facility_id=facility.id,
            shift_order=i,
            **shift_data.dict()
        )
        db.add(shift)
    
    # Create default roles
    for role_data in template.roles:
        role = FacilityRole(
            facility_id=facility.id,
            **role_data.dict()
        )
        db.add(role)
    
    # Create default zones
    for i, zone_data in enumerate(template.zones):
        zone = FacilityZone(
            facility_id=facility.id,
            display_order=i,
            **zone_data.dict()
        )
        db.add(zone)
    
    db.commit()


def _get_facility_template(facility_type: str) -> FacilityTemplate:
    """Get default configuration template for facility type"""
    from ...schemas import FacilityShiftBase, FacilityRoleBase, FacilityZoneBase
    
    # Template definitions (same as before, but I'll include a shorter version)
    templates = {
        'hotel': FacilityTemplate(
            facility_type='hotel',
            shifts=[
                FacilityShiftBase(shift_name='Day Shift', start_time='06:00', end_time='14:00', requires_manager=False, min_staff=3, max_staff=8, color='blue'),
                FacilityShiftBase(shift_name='Evening Shift', start_time='14:00', end_time='22:00', requires_manager=True, min_staff=4, max_staff=10, color='orange'),
                FacilityShiftBase(shift_name='Night Shift', start_time='22:00', end_time='06:00', requires_manager=True, min_staff=2, max_staff=5, color='purple')
            ],
            roles=[
                FacilityRoleBase(role_name='Manager', min_skill_level=4, max_skill_level=5, is_management=True),
                FacilityRoleBase(role_name='Front Desk Agent', min_skill_level=2, max_skill_level=4),
                FacilityRoleBase(role_name='Housekeeper', min_skill_level=1, max_skill_level=3),
            ],
            zones=[
                FacilityZoneBase(zone_id='front-desk', zone_name='Front Desk', required_roles=['Front Desk Agent'], min_staff_per_shift=1, max_staff_per_shift=3),
                FacilityZoneBase(zone_id='housekeeping', zone_name='Housekeeping', required_roles=['Housekeeper'], min_staff_per_shift=2, max_staff_per_shift=6),
            ]
        ),
        'restaurant': FacilityTemplate(
            facility_type='restaurant',
            shifts=[
                FacilityShiftBase(shift_name='Breakfast', start_time='07:00', end_time='11:00', requires_manager=False, min_staff=2, max_staff=5, color='yellow'),
                FacilityShiftBase(shift_name='Lunch', start_time='11:00', end_time='16:00', requires_manager=True, min_staff=4, max_staff=8, color='green'),
                FacilityShiftBase(shift_name='Dinner', start_time='16:00', end_time='23:00', requires_manager=True, min_staff=5, max_staff=12, color='red')
            ],
            roles=[
                FacilityRoleBase(role_name='Manager', min_skill_level=4, max_skill_level=5, is_management=True),
                FacilityRoleBase(role_name='Chef', min_skill_level=4, max_skill_level=5),
                FacilityRoleBase(role_name='Waiter', min_skill_level=2, max_skill_level=4),
                FacilityRoleBase(role_name='Bartender', min_skill_level=3, max_skill_level=4),
            ],
            zones=[
                FacilityZoneBase(zone_id='kitchen', zone_name='Kitchen', required_roles=['Chef'], min_staff_per_shift=2, max_staff_per_shift=6),
                FacilityZoneBase(zone_id='dining', zone_name='Dining Room', required_roles=['Waiter'], min_staff_per_shift=3, max_staff_per_shift=8),
                FacilityZoneBase(zone_id='bar', zone_name='Bar', required_roles=['Bartender'], min_staff_per_shift=1, max_staff_per_shift=3),
            ]
        ),
        'cafe': FacilityTemplate(
            facility_type='cafe',
            shifts=[
                FacilityShiftBase(shift_name='Opening', start_time='06:00', end_time='12:00', requires_manager=False, min_staff=2, max_staff=4, color='green'),
                FacilityShiftBase(shift_name='Midday', start_time='12:00', end_time='18:00', requires_manager=True, min_staff=3, max_staff=6, color='orange'),
                FacilityShiftBase(shift_name='Closing', start_time='18:00', end_time='21:00', requires_manager=False, min_staff=2, max_staff=4, color='purple')
            ],
            roles=[
                FacilityRoleBase(role_name='Manager', min_skill_level=3, max_skill_level=5, is_management=True),
                FacilityRoleBase(role_name='Barista', min_skill_level=2, max_skill_level=4),
                FacilityRoleBase(role_name='Cashier', min_skill_level=1, max_skill_level=3),
            ],
            zones=[
                FacilityZoneBase(zone_id='counter', zone_name='Counter', required_roles=['Barista', 'Cashier'], min_staff_per_shift=1, max_staff_per_shift=3),
                FacilityZoneBase(zone_id='seating', zone_name='Seating Area', required_roles=[], min_staff_per_shift=1, max_staff_per_shift=2),
            ]
        )
    }
    
    return templates.get(facility_type, templates['hotel'])


# ==================== BULK OPERATIONS ====================

@router.post("/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_facilities(
    delete_request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk delete multiple facilities"""
    if delete_request.entity_type != "facility":
        raise HTTPException(status_code=400, detail="This endpoint only handles facility deletions")
    
    deleted_ids = []
    failed_ids = []
    errors = []
    
    for facility_id in delete_request.ids:
        try:
            # Verify access
            facility = _verify_facility_access(db, facility_id, current_user.tenant_id)
            
            # Validate deletion unless forced
            if not delete_request.force_delete:
                validation = validate_facility_deletion(facility_id, db, current_user)
                if not validation.can_delete:
                    failed_ids.append(facility_id)
                    errors.append({
                        "id": str(facility_id),
                        "error": f"Cannot delete {facility.name}: {'; '.join(validation.errors)}"
                    })
                    continue
            
            # Delete facility
            db.delete(facility)
            deleted_ids.append(facility_id)
            
        except Exception as e:
            failed_ids.append(facility_id)
            errors.append({
                "id": str(facility_id),
                "error": str(e)
            })
    
    # Commit all successful deletions
    if deleted_ids:
        db.commit()
    
    return BulkDeleteResponse(
        success=len(failed_ids) == 0,
        total_requested=len(delete_request.ids),
        successfully_deleted=len(deleted_ids),
        failed_deletions=len(failed_ids),
        errors=errors,
        deleted_ids=deleted_ids,
        failed_ids=failed_ids
    )


@router.post("/{facility_id}/soft-delete", response_model=SoftDeleteResponse)
def soft_delete_facility(
    facility_id: uuid.UUID,
    soft_delete_request: SoftDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete (deactivate) a facility and optionally related entities"""
    facility = _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    related_deactivations = []
    
    # Deactivate facility (assuming you add is_active field to Facility model)
    # facility.is_active = False
    # facility.updated_at = datetime.utcnow()
    
    if soft_delete_request.deactivate_related:
        # Deactivate all shifts
        shifts = db.exec(
            select(FacilityShift).where(FacilityShift.facility_id == facility_id)
        ).all()
        for shift in shifts:
            shift.is_active = False
            shift.updated_at = datetime.utcnow()
        related_deactivations.append({"type": "shifts", "count": len(shifts)})
        
        # Deactivate all roles
        roles = db.exec(
            select(FacilityRole).where(FacilityRole.facility_id == facility_id)
        ).all()
        for role in roles:
            role.is_active = False
            role.updated_at = datetime.utcnow()
        related_deactivations.append({"type": "roles", "count": len(roles)})
        
        # Deactivate all zones
        zones = db.exec(
            select(FacilityZone).where(FacilityZone.facility_id == facility_id)
        ).all()
        for zone in zones:
            zone.is_active = False
            zone.updated_at = datetime.utcnow()
        related_deactivations.append({"type": "zones", "count": len(zones)})
    
    db.commit()
    
    return SoftDeleteResponse(
        success=True,
        message=f"Facility '{facility.name}' and related entities deactivated",
        deactivated_id=facility_id,
        related_deactivations=related_deactivations
    )


# ==================== SCHEDULING INTEGRATION ENDPOINTS ====================

@router.get("/{facility_id}/shifts/for-scheduling", response_model=List[dict])
def get_shifts_for_scheduling(
    facility_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get shifts formatted for scheduling system (replaces hardcoded 0,1,2)"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    shifts = db.exec(
        select(FacilityShift)
        .where(FacilityShift.facility_id == facility_id)
        .where(FacilityShift.is_active == True)
        .order_by(FacilityShift.shift_order)
    ).all()
    
    def calculate_duration(start_time: str, end_time: str) -> str:
        start_hour, start_min = map(int, start_time.split(':'))
        end_hour, end_min = map(int, end_time.split(':'))
        
        start_minutes = start_hour * 60 + start_min
        end_minutes = end_hour * 60 + end_min
        
        if end_minutes <= start_minutes:
            end_minutes += 24 * 60
        
        diff_minutes = end_minutes - start_minutes
        hours = diff_minutes // 60
        minutes = diff_minutes % 60
        
        return f"{hours}h{f' {minutes}m' if minutes > 0 else ''}"
    
    def is_overnight(start_time: str, end_time: str) -> bool:
        start_hour = int(start_time.split(':')[0])
        end_hour = int(end_time.split(':')[0])
        return end_hour <= start_hour
    
    # Transform to scheduling format
    scheduling_shifts = []
    for index, shift in enumerate(shifts):
        scheduling_shifts.append({
            # New dynamic format
            "id": str(shift.id),
            "name": shift.shift_name,
            "start_time": shift.start_time,
            "end_time": shift.end_time,
            "requires_manager": shift.requires_manager,
            "min_staff": shift.min_staff,
            "max_staff": shift.max_staff,
            "color": shift.color,
            
            # Legacy format for existing scheduling code
            "shift_index": index,
            "shift_number": str(index),
            
            # Helper properties
            "duration": calculate_duration(shift.start_time, shift.end_time),
            "is_overnight": is_overnight(shift.start_time, shift.end_time),
            "facility_id": str(facility_id)
        })
    
    return scheduling_shifts


@router.get("/{facility_id}/roles/for-scheduling", response_model=List[dict])
def get_roles_for_scheduling(
    facility_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get roles formatted for scheduling system"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    roles = db.exec(
        select(FacilityRole)
        .where(FacilityRole.facility_id == facility_id)
        .where(FacilityRole.is_active == True)
    ).all()
    
    scheduling_roles = []
    for role in roles:
        scheduling_roles.append({
            "id": str(role.id),
            "name": role.role_name,
            "min_skill_level": role.min_skill_level,
            "max_skill_level": role.max_skill_level,
            "is_management": role.is_management,
            "priority": 10 if role.is_management else role.min_skill_level,
            "facility_id": str(facility_id)
        })
    
    return scheduling_roles


@router.get("/{facility_id}/zones/for-scheduling", response_model=List[dict])
def get_zones_for_scheduling(
    facility_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get zones formatted for scheduling system"""
    _verify_facility_access(db, facility_id, current_user.tenant_id)
    
    zones = db.exec(
        select(FacilityZone)
        .where(FacilityZone.facility_id == facility_id)
        .where(FacilityZone.is_active == True)
        .order_by(FacilityZone.display_order)
    ).all()
    
    scheduling_zones = []
    for zone in zones:
        scheduling_zones.append({
            "id": zone.zone_id,
            "name": zone.zone_name,
            "roles": zone.required_roles or [],
            "preferred_roles": zone.preferred_roles or [],
            "min_staff": zone.min_staff_per_shift,
            "max_staff": zone.max_staff_per_shift,
            "priority": zone.display_order,
            "coverage_hours": {
                "morning": True,
                "afternoon": True,
                "evening": True
            },
            "facility_id": str(facility_id)
        })
    
    return scheduling_zones


# ==================== GET STAFF BY FACILITY ====================

@router.get("/{facility_id}/staff")
def get_facility_staff(
    facility_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all staff for a specific facility (legacy endpoint)"""
    # Convert string to UUID for consistency
    facility_uuid = uuid.UUID(facility_id)
    facility = _verify_facility_access(db, facility_uuid, current_user.tenant_id)
    
    # Get staff for this facility
    staff = db.exec(
        select(Staff)
        .where(Staff.facility_id == facility_uuid)
        .where(Staff.is_active == True)
    ).all()
    
    return staff