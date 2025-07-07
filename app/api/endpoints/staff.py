from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from ...deps import get_db, get_current_user
from ...models import Staff, Facility
from ...schemas import StaffCreate, StaffRead, StaffUpdate, StaffDuplicateCheck

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("/", response_model=StaffRead, status_code=201)
def create_staff(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    facility = db.get(Facility, staff_in.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid facility")
    staff = Staff(**staff_in.dict())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.get("/", response_model=list[StaffRead])
def list_staff(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    statement = (
        select(Staff)
        .join(Facility)
        .where(Facility.tenant_id == current_user.tenant_id)
    )
    return db.exec(statement).all()

@router.put("/{staff_id}", response_model=StaffRead)
def update_staff(
    staff_id: str,
    staff_update: StaffUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update a staff member"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Verify staff belongs to user's tenant
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update staff fields
    update_data = staff_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)
    
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff

# This endpoint allows deletion of a staff member by ID
@router.delete("/{staff_id}", status_code=204)
def delete_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Delete a staff member"""
    if not current_user.is_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")
    
    # Convert string ID to UUID
    try:
        import uuid
        staff_uuid = uuid.UUID(staff_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid staff ID format")
    
    staff = db.get(Staff, staff_uuid)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Verify staff belongs to user's tenant
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        db.delete(staff)
        db.commit()
        return  # Return nothing for 204 status
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete staff member: {str(e)}")

@router.post("/check-duplicate")
def check_staff_duplicate(
    check_data: StaffDuplicateCheck,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Check if staff member already exists"""
    existing = db.exec(
        select(Staff).where(
            Staff.full_name.ilike(f"%{check_data.full_name}%"),
            Staff.facility_id == check_data.facility_id,
            Staff.is_active == True
        )
    ).first()
    
    return {"exists": existing is not None}