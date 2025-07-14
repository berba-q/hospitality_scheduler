from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ...deps import get_db, get_current_user
from ...models import Facility, Staff, User
from ...schemas import FacilityCreate, FacilityRead

router = APIRouter(prefix="/facilities", tags=["facility"])


@router.post("/", response_model=FacilityRead, status_code=201)
def create_facility(
    facility_in: FacilityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    facility = Facility(tenant_id=current_user.tenant_id, **facility_in.dict())
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility


@router.get("/", response_model=list[FacilityRead])
def list_facilities(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    statement = select(Facility).where(Facility.tenant_id == current_user.tenant_id)
    return db.exec(statement).all()

@router.get("/{facility_id}")
def get_facility(
    facility_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific facility by ID"""
    facility = db.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    
    # Check tenant access
    if facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return facility

@router.get("/{facility_id}/staff")
def get_facility_staff(
    facility_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all staff for a specific facility"""
    # Verify facility exists and user has access
    facility = db.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    
    if facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get staff for this facility
    staff = db.exec(
        select(Staff)
        .where(Staff.facility_id == facility_id)
        .where(Staff.is_active == True)
    ).all()
    
    return staff
