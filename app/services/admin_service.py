import uuid
from sqlmodel import Session, select, func
from typing import List, Dict, Any
from datetime import datetime, timedelta

from ..models import User, Tenant, Facility, Schedule, SwapRequest, Staff
from ..schemas import AdminUserRead, AdminTenantRead, AdminStatsResponse

class AdminService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_system_stats(self) -> AdminStatsResponse:
        """Get comprehensive system statistics"""
        
        # User statistics
        total_users = self.db.exec(select(func.count(User.id))).first() or 0
        active_users = self.db.exec(
            select(func.count(User.id)).where(User.is_active == True)
        ).first() or 0
        
        # Tenant statistics
        total_tenants = self.db.exec(select(func.count(Tenant.id))).first() or 0
        
        # Facility statistics
        total_facilities = self.db.exec(select(func.count(Facility.id))).first() or 0
        
        # Schedule statistics
        total_schedules = self.db.exec(select(func.count(Schedule.id))).first() or 0
        
        # Swap request statistics
        total_swap_requests = self.db.exec(select(func.count(SwapRequest.id))).first() or 0
        
        # System health checks
        system_health = self._check_system_health()
        
        return AdminStatsResponse(
            total_users=total_users,
            active_users=active_users,
            total_tenants=total_tenants,
            total_facilities=total_facilities,
            total_schedules=total_schedules,
            total_swap_requests=total_swap_requests,
            system_health=system_health
        )
    
    def get_all_users(self) -> List[AdminUserRead]:
        """Get all users with tenant information"""
        
        statement = (
            select(User, Tenant.name.label("tenant_name"))
            .join(Tenant, User.tenant_id == Tenant.id)
            .order_by(User.created_at.desc())
        )
        
        results = self.db.exec(statement).all()
        
        users = []
        for user, tenant_name in results:
            user_dict = user.dict()
            user_dict["tenant_name"] = tenant_name
            users.append(AdminUserRead(**user_dict))
        
        return users
    
    def get_all_tenants(self) -> List[AdminTenantRead]:
        """Get all tenants with statistics"""
        
        statement = (
            select(
                Tenant,
                func.count(User.id).label("user_count"),
                func.count(Facility.id).label("facility_count")
            )
            .outerjoin(User, Tenant.id == User.tenant_id)
            .outerjoin(Facility, Tenant.id == Facility.tenant_id)
            .group_by(Tenant.id)
            .order_by(Tenant.created_at.desc())
        )
        
        results = self.db.exec(statement).all()
        
        tenants = []
        for tenant, user_count, facility_count in results:
            tenant_dict = tenant.model_dump()
            tenant_dict["user_count"] = user_count or 0
            tenant_dict["facility_count"] = facility_count or 0
            tenant_dict["is_active"] = True  # Add logic for tenant status if needed
            tenants.append(AdminTenantRead(**tenant_dict))
        
        return tenants
    
    def toggle_user_status(self, user_id: uuid.UUID) -> bool:
        """Toggle user active status"""
        
        user = self.db.get(User, user_id)
        if not user:
            raise ValueError("User not found")
        
        if user.is_super_admin:
            raise ValueError("Cannot modify super admin status")
        
        user.is_active = not user.is_active
        self.db.commit()
        
        return user.is_active
    
    def change_user_role(self, user_id: uuid.UUID, new_role: str) -> bool:
        """Change user role between manager and staff"""
        
        user = self.db.get(User, user_id)
        if not user:
            raise ValueError("User not found")
        
        if user.is_super_admin:
            raise ValueError("Cannot modify super admin role")
        
        user.is_manager = (new_role == "manager")
        self.db.commit()
        
        return True
    
    def get_user_details(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Get detailed user information"""
        
        user = self.db.get(User, user_id)
        if not user:
            raise ValueError("User not found")
        
        # Get user's tenant
        tenant = self.db.get(Tenant, user.tenant_id)
        
        # Get user's facilities (if staff)
        facilities = []
        if not user.is_manager:
            staff_records = self.db.exec(
                select(Staff).join(Facility).where(
                    Staff.email == user.email,
                    Facility.tenant_id == user.tenant_id
                )
            ).all()
            facilities = [
                {"id": str(staff.facility.id), "name": staff.facility.name}
                for staff in staff_records
            ]
        
        # Get recent activity (simplified)
        recent_schedules = self.db.exec(
            select(Schedule).where(
                Schedule.facility_id.in_([f["id"] for f in facilities]) if facilities else False # type: ignore
            ).order_by(Schedule.created_at.desc()).limit(5)
        ).all()
        
        return {
            "user": user,
            "tenant": tenant,
            "facilities": facilities,
            "recent_activity": {
                "recent_schedules": len(recent_schedules),
                "last_login": user.last_login
            }
        }
    
    def _check_system_health(self) -> Dict[str, str]:
        """Check system health status"""
        
        health = {
            "database": "healthy",
            "email_service": "healthy", 
            "storage": "healthy"
        }
        
        try:
            # Test database connection
            self.db.exec(select(func.count(User.id))).first()
        except Exception:
            health["database"] = "error"
        
        # Test email service (simplified)
        try:
            from ..core.config import get_settings
            settings = get_settings()
            if not all([settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_USER]):
                health["email_service"] = "warning"
        except Exception:
            health["email_service"] = "error"
        
        # Test storage (simplified)
        try:
            import os
            import tempfile
            
            # Test write to temp directory
            with tempfile.NamedTemporaryFile(delete=True) as tmp:
                tmp.write(b"test")
                tmp.flush()
        except Exception:
            health["storage"] = "error"
        
        return health
    
    def get_system_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent system logs (simplified implementation)"""
        
        # This would typically connect to your logging system
        # For now, return recent user activities as a placeholder
        
        recent_users = self.db.exec(
            select(User)
            .where(User.last_login.is_not(None))
            .order_by(User.last_login.desc())
            .limit(limit)
        ).all()
        
        logs = []
        for user in recent_users:
            logs.append({
                "timestamp": user.last_login,
                "level": "INFO",
                "message": f"User {user.email} logged in",
                "user_id": str(user.id)
            })
        
        return logs