from typing import Optional
import uuid
from sqlalchemy import func
from sqlmodel import Session, select
from ..models import User, Staff

class UserStaffMappingService:
    """Centralized service for reliable User-Staff ID mapping"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_from_staff_id(self, staff_id: uuid.UUID) -> Optional[User]:
        """Get User record from Staff ID via email lookup"""
        staff = self.db.get(Staff, staff_id)
        if not staff:
            return None
        
        # Normalize email for lookup (strip whitespace, lowercase)
        staff_email = staff.email.strip().lower() if staff.email else None
        
        user = self.db.exec(
            select(User).where(func.lower(User.email) == staff_email)
        ).first()
        
        return user
    
    def get_staff_from_user_id(self, user_id: uuid.UUID) -> Optional[Staff]:
        """Get Staff record from User ID via email lookup"""
        user = self.db.get(User, user_id)
        if not user:
            return None
        
        # Normalize email for lookup
        user_email = user.email.strip().lower()
        
        staff = self.db.exec(
            select(Staff).where(func.lower(Staff.email) == user_email)
        ).first()
        
        return staff
    
    def validate_user_staff_mapping(self, user_id: uuid.UUID, staff_id: uuid.UUID) -> bool:
        """Validate that a user_id and staff_id correspond to the same person"""
        user = self.db.get(User, user_id)
        staff = self.db.get(Staff, staff_id)
        
        if not user or not staff:
            return False
        
        # Compare normalized emails
        return (
            user.email is not None and 
            staff.email is not None and 
            user.email.strip().lower() == staff.email.strip().lower()
        )