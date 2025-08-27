# app/api/endpoints/availability.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from ...deps import get_db, get_current_user
from ...models import StaffUnavailability, Staff, Facility
from ...schemas import (
    StaffUnavailabilityCreate, 
    StaffUnavailabilityRead,
    StaffUnavailabilityUpdate,
    StaffUnavailabilityWithStaff,
    QuickUnavailabilityCreate
)

router = APIRouter(prefix="/availability", tags=["availability"])

@router.post("/staff/{staff_id}", response_model=StaffUnavailabilityRead, status_code=201)
def create_staff_unavailability(
    staff_id: UUID,
    unavailability_in: StaffUnavailabilityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create unavailability period for staff member"""
    # Verify staff belongs to user's tenant
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check for overlapping unavailability
    overlapping = db.exec(
        select(StaffUnavailability).where(
            StaffUnavailability.staff_id == staff_id,
            StaffUnavailability.start < unavailability_in.end,
            StaffUnavailability.end > unavailability_in.start
        )
    ).first()
    
    if overlapping:
        raise HTTPException(
            status_code=400, 
            detail=f"Overlaps with existing unavailability from {overlapping.start} to {overlapping.end}"
        )
    
    unavailability = StaffUnavailability(
        staff_id=staff_id,
        **unavailability_in.dict()
    )
    
    db.add(unavailability)
    db.commit()
    db.refresh(unavailability)
    return unavailability

@router.post("/staff/{staff_id}/quick", response_model=StaffUnavailabilityRead, status_code=201)
def create_quick_unavailability(
    staff_id: UUID,
    quick_in: QuickUnavailabilityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create unavailability using quick patterns (morning, afternoon, evening, fullday)"""
    # Verify access
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    from datetime import timezone
    
    # Make sure the date is timezone-aware
    if quick_in.date.tzinfo is None:
        base_date = quick_in.date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    else:
        base_date = quick_in.date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if quick_in.pattern == "morning":
        start = base_date.replace(hour=6)
        end = base_date.replace(hour=14)
    elif quick_in.pattern == "afternoon":
        start = base_date.replace(hour=14)
        end = base_date.replace(hour=22)
    elif quick_in.pattern == "evening":
        start = base_date.replace(hour=22)
        end = base_date.replace(hour=6) + timedelta(days=1)
    elif quick_in.pattern == "fullday":
        start = base_date
        end = base_date + timedelta(days=1)
    elif quick_in.pattern == "custom":
        start = base_date.replace(hour=quick_in.custom_start_hour)
        end = base_date.replace(hour=quick_in.custom_end_hour)
    else:
        raise HTTPException(status_code=400, detail="Invalid pattern")
    
    # Create the unavailability
    unavailability_data = StaffUnavailabilityCreate(
        start=start,
        end=end,
        reason=quick_in.reason,
        is_recurring=quick_in.is_recurring
    )
    
    return create_staff_unavailability(staff_id, unavailability_data, db, current_user)

# Create unavailability for current user (staff member)

@router.post("/me", response_model=StaffUnavailabilityRead, status_code=201)
def create_my_unavailability(
    unavailability_in: StaffUnavailabilityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create unavailability period for current user (staff member)"""
    # Get the staff record for the current user
    staff = db.exec(
        select(Staff).where(Staff.email == current_user.email)
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found. Please contact your manager.")
    
    # Use the existing create logic but with the correct staff_id
    return create_staff_unavailability(staff.id, unavailability_in, db, current_user)

@router.post("/me/quick", response_model=StaffUnavailabilityRead, status_code=201)
def create_my_quick_unavailability(
    quick_in: QuickUnavailabilityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create quick unavailability period for current user (staff member)"""
    from datetime import timezone
    
    # Get the staff record for the current user
    staff = db.exec(
        select(Staff).where(Staff.email == current_user.email)
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found. Please contact your manager.")
    
    # Use the existing quick create logic but with the correct staff_id
    return create_quick_unavailability(staff.id, quick_in, db, current_user)

@router.get("/staff/{staff_id}", response_model=List[StaffUnavailabilityRead])
def get_staff_unavailability(
    staff_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    start_date: Optional[datetime] = Query(None, description="Filter from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter until this date"),
):
    """Get unavailability periods for a staff member"""
    # Verify access
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build query
    query = select(StaffUnavailability).where(StaffUnavailability.staff_id == staff_id)
    
    if start_date:
        query = query.where(StaffUnavailability.end >= start_date)
    if end_date:
        query = query.where(StaffUnavailability.start <= end_date)
    
    query = query.order_by(StaffUnavailability.start)
    
    unavailability = db.exec(query).all()
    return unavailability

@router.get("/facility/{facility_id}", response_model=List[StaffUnavailabilityWithStaff])
def get_facility_unavailability(
    facility_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """Get all unavailability for a facility (manager view)"""
    # Verify access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get staff IDs for this facility
    staff_ids = db.exec(
        select(Staff.id).where(Staff.facility_id == facility_id, Staff.is_active.is_(True))
    ).all()
    
    if not staff_ids:
        return []
    
    # Build query
    query = (
        select(StaffUnavailability)
        .where(StaffUnavailability.staff_id.in_(staff_ids))
    )
    
    if start_date:
        query = query.where(StaffUnavailability.end >= start_date)
    if end_date:
        query = query.where(StaffUnavailability.start <= end_date)
    
    query = query.order_by(StaffUnavailability.start)
    
    unavailability = db.exec(query).all()
    
    # Load staff data for each
    result = []
    for ua in unavailability:
        staff = db.get(Staff, ua.staff_id)
        result.append(StaffUnavailabilityWithStaff(**ua.dict(), staff=staff))
    
    return result

@router.put("/{unavailability_id}", response_model=StaffUnavailabilityRead)
def update_unavailability(
    unavailability_id: UUID,
    update_data: StaffUnavailabilityUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update an unavailability period"""
    unavailability = db.get(StaffUnavailability, unavailability_id)
    if not unavailability:
        raise HTTPException(status_code=404, detail="Unavailability not found")
    
    # Verify access through staff -> facility -> tenant
    staff = db.get(Staff, unavailability.staff_id)
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(unavailability, field, value)
    
    # Check for overlaps if dates changed
    if 'start' in update_dict or 'end' in update_dict:
        overlapping = db.exec(
            select(StaffUnavailability).where(
                StaffUnavailability.staff_id == unavailability.staff_id,
                StaffUnavailability.id != unavailability_id,
                StaffUnavailability.start < unavailability.end,
                StaffUnavailability.end > unavailability.start
            )
        ).first()
        
        if overlapping:
            raise HTTPException(status_code=400, detail="Would overlap with existing unavailability")
    
    db.add(unavailability)
    db.commit()
    db.refresh(unavailability)
    return unavailability

@router.delete("/{unavailability_id}", status_code=204)
def delete_unavailability(
    unavailability_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Delete an unavailability period"""
    unavailability = db.get(StaffUnavailability, unavailability_id)
    if not unavailability:
        raise HTTPException(status_code=404, detail="Unavailability not found")
    
    # Verify access
    staff = db.get(Staff, unavailability.staff_id)
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(unavailability)
    db.commit()