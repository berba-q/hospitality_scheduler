from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Dict, Any, Optional
from uuid import UUID

from ...deps import get_db, get_current_user
from ...models import ScheduleConfig, Facility
from ...schemas import ScheduleConfigCreate, ScheduleConfigRead, ScheduleConfigUpdate

router = APIRouter(prefix="/config", tags=["schedule-config"])

@router.post("/", response_model=ScheduleConfigRead, status_code=201)
def create_schedule_config(
    config_in: ScheduleConfigCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create scheduling configuration for a facility"""
    # Verify facility belongs to current user's tenant
    facility = db.get(Facility, config_in.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid facility")
    
    # Check if config already exists for this facility
    existing = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == config_in.facility_id)
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                          detail="Configuration already exists for this facility")
    
    config = ScheduleConfig(**config_in.dict())
    db.add(config)
    db.commit()
    db.refresh(config)
    return config

@router.get("/{facility_id}", response_model=ScheduleConfigRead)
def get_schedule_config(
    facility_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get scheduling configuration for a facility"""
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid facility")
    
    config = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == facility_id)
    ).first()
    
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                          detail="No configuration found for this facility")
    
    return config

@router.put("/{facility_id}", response_model=ScheduleConfigRead)
def update_schedule_config(
    facility_id: UUID,
    config_update: ScheduleConfigUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update scheduling configuration for a facility"""
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid facility")
    
    config = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == facility_id)
    ).first()
    
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                          detail="No configuration found for this facility")
    
    # Update fields
    update_data = config_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.add(config)
    db.commit()
    db.refresh(config)
    return config

@router.delete("/{facility_id}", status_code=204)
def delete_schedule_config(
    facility_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Delete scheduling configuration for a facility"""
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid facility")
    
    config = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == facility_id)
    ).first()
    
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                          detail="No configuration found for this facility")
    
    db.delete(config)
    db.commit()

@router.get("/{facility_id}/defaults")
def get_default_config(facility_id: UUID):
    """Get default configuration values for a facility"""
    return {
        "min_rest_hours": 8,
        "max_consecutive_days": 5,
        "max_weekly_hours": 40,
        "min_staff_per_shift": 1,
        "max_staff_per_shift": 10,
        "require_manager_per_shift": False,
        "shift_role_requirements": {
            "0": {"required_roles": [], "min_skill_level": 1},  # Morning
            "1": {"required_roles": [], "min_skill_level": 1},  # Afternoon  
            "2": {"required_roles": ["Manager"], "min_skill_level": 2}  # Evening
        },
        "allow_overtime": False,
        "weekend_restrictions": False
    }