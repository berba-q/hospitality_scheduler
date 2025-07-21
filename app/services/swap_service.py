# app/services/swap_service.py
# Swap service for handling staff swap requests with role verification

from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlmodel import Session, select
from enum import Enum

from ..models import (
    Staff, StaffUnavailability, Schedule, ShiftAssignment, 
    SwapRequest, ScheduleConfig, Facility, FacilityZone, FacilityRole, SwapStatus
)
from ..services.schedule_solver import ScheduleConstraints, constraints_from_config
from ..schemas import AutoAssignmentResult

class RoleMatchLevel(str, Enum):
    """Levels of role compatibility for assignments"""
    EXACT_MATCH = "exact_match"
    COMPATIBLE = "compatible"
    EMERGENCY_OVERRIDE = "emergency_override"
    INCOMPATIBLE = "incompatible"

class SwapAutoAssigner:
    """Handles automatic assignment of coverage for swap requests with role verification"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def find_coverage(
        self,
        swap_request: SwapRequest,
        preferred_skills: Optional[List[str]] = None,
        avoid_staff_ids: Optional[List[UUID]] = None
    ) -> AutoAssignmentResult:
        """Find the best staff member to cover a swap request with role verification"""
        
        # Get the schedule and facility
        schedule = self.db.get(Schedule, swap_request.schedule_id)
        if not schedule:
            return AutoAssignmentResult(
                success=False,
                reason="Schedule not found"
            )
        
        # Get facility constraints
        config = self.db.exec(
            select(ScheduleConfig).where(ScheduleConfig.facility_id == schedule.facility_id)
        ).first()
        
        constraints = constraints_from_config(config)
        
        # ==================== NEW: ROLE VERIFICATION LOGIC ====================
        
        # Get zone information for role requirements
        original_zone_id = swap_request.original_zone_id
        if not original_zone_id:
            # Try to infer zone from existing assignment
            original_zone_id = self._infer_zone_from_assignment(
                swap_request.schedule_id,
                swap_request.requesting_staff_id,
                swap_request.original_day,
                swap_request.original_shift
            )
        
        # Get zone configuration if available
        zone_config = None
        if original_zone_id:
            zone_config = self._get_zone_configuration(schedule.facility_id, original_zone_id)
        
        # Get available staff with role filtering
        available_staff = self._get_available_staff_with_role_check(
            schedule.facility_id,
            swap_request.original_day,
            swap_request.original_shift,
            schedule,
            avoid_staff_ids or [],
            zone_config,
            swap_request.role_verification_required
        )
        
        if not available_staff:
            return AutoAssignmentResult(
                success=False,
                reason="No available staff found with compatible roles for this shift",
                alternatives=self._get_emergency_alternatives(schedule.facility_id, avoid_staff_ids or [])
            )
        
        # Score and rank candidates with role compatibility
        candidates = self._score_candidates_with_roles(
            available_staff,
            swap_request,
            schedule,
            constraints,
            preferred_skills,
            zone_config
        )
        
        if not candidates:
            return AutoAssignmentResult(
                success=False,
                reason="No suitable candidates found after role verification and constraint checking",
                alternatives=self._get_emergency_alternatives(schedule.facility_id, avoid_staff_ids or [])
            )
        
        # Select the best candidate
        best_candidate = candidates[0]
        
        return AutoAssignmentResult(
            success=True,
            assigned_staff_id=best_candidate["staff"].id,
            assigned_staff_name=best_candidate["staff"].full_name,
            reason=f"Role match: {best_candidate.get('role_match_level', 'compatible')} - Score: {best_candidate['score']}",
            role_match_level=best_candidate.get('role_match_level'),
            role_compatibility_score=best_candidate.get('role_score', 0),
            skill_level_match=best_candidate.get('skill_compatible', True)
        )
    
    # ==================== ENHANCED AVAILABILITY CHECK WITH ROLES ====================
    
    def _get_available_staff_with_role_check(
        self,
        facility_id: UUID,
        day: int,
        shift: int,
        schedule: Schedule,
        avoid_staff_ids: List[UUID],
        zone_config: Optional[FacilityZone],
        role_verification_required: bool
    ) -> List[Dict[str, Any]]:
        """Get staff who are available AND have compatible roles"""
        
        # Start with basic availability check
        base_available_staff = self._get_available_staff(
            facility_id, day, shift, schedule, avoid_staff_ids
        )
        
        if not role_verification_required or not zone_config:
            # If no role verification needed, return all available staff with basic role info
            return [{"staff": staff, "role_match_level": RoleMatchLevel.COMPATIBLE, "role_reason": "No role verification required"} 
                   for staff in base_available_staff]
        
        # Filter by role compatibility
        role_compatible_staff = []
        
        required_roles = zone_config.required_roles or []
        preferred_roles = zone_config.preferred_roles or []
        min_skill_level = getattr(zone_config, 'min_skill_level', 1)
        
        for staff in base_available_staff:
            # Assess role compatibility
            match_level, match_reason = self._assess_role_compatibility(
                staff.role,
                required_roles,
                preferred_roles,
                min_skill_level,
                staff.skill_level # type: ignore
            )
            
            # Include all but incompatible roles (emergency override allows most roles)
            if match_level != RoleMatchLevel.INCOMPATIBLE:
                # Get role IDs for audit trail
                staff_role = self._get_role_by_name(facility_id, staff.role)
                required_role = self._get_role_by_name(facility_id, required_roles[0]) if required_roles else None
                
                role_compatible_staff.append({
                    "staff": staff,
                    "role_match_level": match_level,
                    "role_reason": match_reason,
                    "assigned_staff_role_id": staff_role.id if staff_role else None,
                    "original_shift_role_id": required_role.id if required_role else None,
                    "skill_compatible": staff.skill_level >= min_skill_level # type: ignore
                })
        
        return role_compatible_staff
    
    def _get_available_staff(
        self,
        facility_id: UUID,
        day: int,
        shift: int,
        schedule: Schedule,
        avoid_staff_ids: List[UUID]
    ) -> List[Staff]:
        """Get staff who are available for the requested shift (existing logic)"""
        
        # Get all active staff for this facility
        all_staff = self.db.exec(
            select(Staff).where(
                Staff.facility_id == facility_id,
                Staff.is_active.is_(True), # type: ignore
                ~Staff.id.in_(avoid_staff_ids) # type: ignore
            )
        ).all()
        
        available_staff = []
        
        for staff in all_staff:
            # Check if already assigned to this day
            existing_assignment = self.db.exec(
                select(ShiftAssignment).where(
                    ShiftAssignment.schedule_id == schedule.id,
                    ShiftAssignment.staff_id == staff.id,
                    ShiftAssignment.day == day
                )
            ).first()
            
            if existing_assignment:
                continue  # Already working this day
            
            # Check unavailability
            shift_start, shift_end = self._get_shift_times(schedule.week_start, day, shift)
            
            unavailable = self.db.exec(
                select(StaffUnavailability).where(
                    StaffUnavailability.staff_id == staff.id,
                    StaffUnavailability.start < shift_end,
                    StaffUnavailability.end > shift_start
                )
            ).first()
            
            if unavailable:
                continue  # Staff is unavailable
            
            available_staff.append(staff)
        
        return available_staff
    
    # ==================== ENHANCED SCORING WITH ROLE FACTORS ====================
    
    def _score_candidates_with_roles(
        self,
        staff_with_roles: List[Dict[str, Any]],
        swap_request: SwapRequest,
        schedule: Schedule,
        constraints: ScheduleConstraints,
        preferred_skills: Optional[List[str]],
        zone_config: Optional[FacilityZone]
    ) -> List[dict]:
        """Score and rank candidates with role compatibility factors"""
        
        candidates = []
        
        for staff_info in staff_with_roles:
            staff = staff_info["staff"]
            role_match_level = staff_info["role_match_level"]
            
            score = 0
            
            # ==================== ROLE COMPATIBILITY SCORING ====================
            if role_match_level == RoleMatchLevel.EXACT_MATCH:
                score += 50  # Highest priority for exact role match
            elif role_match_level == RoleMatchLevel.COMPATIBLE:
                score += 30  # Good for compatible roles
            elif role_match_level == RoleMatchLevel.EMERGENCY_OVERRIDE:
                if swap_request.urgency == "emergency":
                    score += 10  # Allow emergency overrides for urgent requests
                else:
                    continue  # Skip non-emergency overrides for normal requests
            
            # ==================== EXISTING SCORING LOGIC ====================
            
            # Base score for availability
            score += 10
            
            # Skill level bonus
            score += (staff.skill_level or 1) * 2
            
            # Preferred skills bonus
            if preferred_skills and staff.role in preferred_skills:
                score += 15
            
            # Check weekly hours constraint
            current_hours = self._get_staff_weekly_hours(staff.id, schedule)
            max_hours = staff.weekly_hours_max or constraints.max_weekly_hours
            
            if current_hours + 8 <= max_hours:  # Assuming 8-hour shifts
                score += 5
            elif constraints.allow_overtime:
                score += 2  # Still possible but less ideal
            else:
                continue  # Can't assign due to hours
            
            # Consecutive days penalty (prefer staff with breaks)
            consecutive_days = self._get_consecutive_days(staff.id, schedule, swap_request.original_day)
            if consecutive_days < constraints.max_consecutive_days:
                score += 5
            elif consecutive_days >= constraints.max_consecutive_days:
                if constraints.allow_overtime:
                    score -= 5  # Penalty but still possible
                else:
                    continue  # Can't assign
            
            # Experience bonus (higher skilled staff get slight preference for urgent swaps)
            if swap_request.urgency in ["high", "emergency"]:
                score += (staff.skill_level or 1) * 3
            
            # ==================== NEW: RECENT SWAP HISTORY BONUS ====================
            recent_swaps_helped = self._count_recent_swaps_helped(staff.id)
            score += min(recent_swaps_helped * 3, 15)  # Bonus for helpful staff
            
            candidates.append({
                "staff": staff,
                "score": score,
                "role_score": score if role_match_level == RoleMatchLevel.EXACT_MATCH else score - 20,
                "current_hours": current_hours,
                "consecutive_days": consecutive_days,
                "role_match_level": role_match_level,
                "role_reason": staff_info["role_reason"],
                "assigned_staff_role_id": staff_info.get("assigned_staff_role_id"),
                "original_shift_role_id": staff_info.get("original_shift_role_id"),
                "skill_compatible": staff_info.get("skill_compatible", True)
            })
        
        # Sort by score (highest first)
        candidates.sort(key=lambda x: x["score"], reverse=True)
        
        return candidates
    
    # ==================== NEW ROLE VERIFICATION HELPER FUNCTIONS ====================
    
    def _get_zone_configuration(self, facility_id: UUID, zone_id: str) -> Optional[FacilityZone]:
        """Get zone configuration with role requirements"""
        return self.db.exec(
            select(FacilityZone).where(
                FacilityZone.facility_id == facility_id,
                FacilityZone.zone_id == zone_id,
                FacilityZone.is_active == True
            )
        ).first()
    
    def _assess_role_compatibility(
        self,
        staff_role: str,
        required_roles: List[str],
        preferred_roles: List[str],
        min_skill_level: int,
        staff_skill_level: int
    ) -> Tuple[RoleMatchLevel, str]:
        """Assess how compatible a staff member's role is with zone requirements"""
        
        # Check skill level first
        if staff_skill_level < min_skill_level:
            return RoleMatchLevel.INCOMPATIBLE, f"Skill level {staff_skill_level} below minimum {min_skill_level}"
        
        # Exact match with required roles
        if staff_role in required_roles:
            return RoleMatchLevel.EXACT_MATCH, f"Exact role match: {staff_role}"
        
        # Match with preferred roles
        if staff_role in preferred_roles:
            return RoleMatchLevel.COMPATIBLE, f"Preferred role match: {staff_role}"
        
        # Check if it's a management role (can cover any role)
        if self._is_management_role(staff_role):
            return RoleMatchLevel.COMPATIBLE, f"Management override: {staff_role} can cover zone duties"
        
        # If no specific requirements, allow with skill level check
        if not required_roles and not preferred_roles:
            return RoleMatchLevel.COMPATIBLE, f"No specific role requirements, skill level OK"
        
        # Last resort - emergency override possible
        return RoleMatchLevel.EMERGENCY_OVERRIDE, f"Role {staff_role} not ideal but could work with manager approval"
    
    def _is_management_role(self, role_name: str) -> bool:
        """Check if role is a management role that can cover others"""
        management_roles = ['Manager', 'Assistant Manager', 'Supervisor', 'Lead']
        return any(mgmt_role.lower() in role_name.lower() for mgmt_role in management_roles)
    
    def _get_role_by_name(self, facility_id: UUID, role_name: str) -> Optional[FacilityRole]:
        """Get FacilityRole by name for audit trail"""
        return self.db.exec(
            select(FacilityRole).where(
                FacilityRole.facility_id == facility_id,
                FacilityRole.role_name == role_name
            )
        ).first()
    
    def _infer_zone_from_assignment(
        self,
        schedule_id: UUID,
        staff_id: UUID,
        day: int,
        shift: int
    ) -> Optional[str]:
        """Try to infer zone from existing assignment patterns"""
        # This would depend on how you store zone assignments
        # For now, return None and rely on explicit zone_id in requests
        return None
    
    def _count_recent_swaps_helped(self, staff_id: UUID) -> int:
        """Count how many swaps this staff member has helped with recently"""
        recent_date = datetime.utcnow() - timedelta(days=30)
        
        helped_count = self.db.exec(
            select(SwapRequest).where(
                SwapRequest.assigned_staff_id == staff_id,
                SwapRequest.created_at >= recent_date,
                SwapRequest.status.in_([SwapStatus.EXECUTED, SwapStatus.STAFF_ACCEPTED]) # type: ignore
            )
        ).all()
        
        return len(helped_count)
    
    def _get_emergency_alternatives(
        self,
        facility_id: UUID,
        avoid_staff_ids: List[UUID]
    ) -> List[Dict[str, Any]]:
        """Get alternative suggestions when no compatible staff found"""
        
        # Get managers who could potentially override
        managers = self.db.exec(
            select(Staff).where(
                Staff.facility_id == facility_id,
                Staff.is_active == True,
                Staff.role.like('%Manager%'), # type: ignore
                Staff.id.not_in(avoid_staff_ids) # type: ignore
            )
        ).all()
        
        alternatives = []
        for manager in managers[:3]:  # Top 3 managers
            alternatives.append({
                "staff_id": str(manager.id),
                "staff_name": manager.full_name,
                "role": manager.role,
                "suggestion": "Manager can override role requirements if needed"
            })
        
        return alternatives
    
    # ==================== EXISTING HELPER FUNCTIONS (UNCHANGED) ====================
    
    def _get_shift_times(self, week_start, day: int, shift: int) -> Tuple[datetime, datetime]:
        """Calculate actual datetime for a shift"""
        shift_date = week_start + timedelta(days=day)
        
        if shift == 0:  # Morning
            start = datetime.combine(shift_date, datetime.min.time().replace(hour=6))
            end = datetime.combine(shift_date, datetime.min.time().replace(hour=14))
        elif shift == 1:  # Afternoon  
            start = datetime.combine(shift_date, datetime.min.time().replace(hour=14))
            end = datetime.combine(shift_date, datetime.min.time().replace(hour=22))
        else:  # Evening
            start = datetime.combine(shift_date, datetime.min.time().replace(hour=22))
            end = datetime.combine(shift_date + timedelta(days=1), datetime.min.time().replace(hour=6))
        
        return start, end
    
    def _get_staff_weekly_hours(self, staff_id: UUID, schedule: Schedule) -> int:
        """Calculate current weekly hours for staff in this schedule"""
        assignments = self.db.exec(
            select(ShiftAssignment).where(
                ShiftAssignment.schedule_id == schedule.id,
                ShiftAssignment.staff_id == staff_id
            )
        ).all()
        
        return len(assignments) * 8  # Assuming 8-hour shifts
    
    def _get_consecutive_days(self, staff_id: UUID, schedule: Schedule, target_day: int) -> int:
        """Calculate consecutive working days if this shift is assigned"""
        assignments = self.db.exec(
            select(ShiftAssignment).where(
                ShiftAssignment.schedule_id == schedule.id,
                ShiftAssignment.staff_id == staff_id
            ).order_by(ShiftAssignment.day) # type: ignore
        ).all()
        
        working_days = {a.day for a in assignments}
        working_days.add(target_day)
        
        # Find longest consecutive sequence including target_day
        sorted_days = sorted(working_days)
        max_consecutive = 1
        current_consecutive = 1
        
        for i in range(1, len(sorted_days)):
            if sorted_days[i] == sorted_days[i-1] + 1:
                current_consecutive += 1
                max_consecutive = max(max_consecutive, current_consecutive)
            else:
                current_consecutive = 1
        
        return max_consecutive
    
    def _get_alternative_suggestions(self, staff_list: List[Staff]) -> List[dict]:
        """Provide alternative suggestions when auto-assignment fails"""
        suggestions = []
        for staff in staff_list[:3]:  # Top 3 alternatives
            suggestions.append({
                "staff_id": str(staff.id),
                "staff_name": staff.full_name,
                "role": staff.role,
                "skill_level": staff.skill_level,
                "suggestion": "Consider manual assignment or staff swap"
            })
        return suggestions

# ==================== Cover swaps ====================

def assign_swap_coverage(
    db: Session,
    swap_request: SwapRequest,
    preferred_skills: Optional[List[str]] = None,
    avoid_staff_ids: Optional[List[UUID]] = None
) -> AutoAssignmentResult:
    """Main function to assign coverage for a swap request (ENHANCED with role verification)"""
    
    assigner = SwapAutoAssigner(db)
    result = assigner.find_coverage(swap_request, preferred_skills, avoid_staff_ids)
    
    return result

# ==================== NEW HELPER FUNCTIONS FOR WORKFLOW ====================

def create_potential_assignment(
    db: Session,
    swap_request: SwapRequest,
    assignment_result: AutoAssignmentResult
) -> bool:
    """
    Create a potential assignment that requires staff approval before completion
    This implements the two-stage approval process
    """
    
    if not assignment_result.success:
        return False
    
    # Update swap request with potential assignment info
    swap_request.assigned_staff_id = assignment_result.assigned_staff_id
    swap_request.status = SwapStatus.POTENTIAL_ASSIGNMENT
    
    # Store role audit information if available
    if hasattr(assignment_result, 'role_match_level'):
        swap_request.role_match_reason = assignment_result.reason
    
    # Set timestamp
    swap_request.manager_approved_at = datetime.utcnow()
    
    db.add(swap_request)
    db.commit()
    
    return True

def get_swap_workflow_status(swap_request: SwapRequest) -> Dict[str, Any]:
    """
    Get current workflow status and next required actions
    """
    
    status_info = {
        'current_status': swap_request.status,
        'next_action_required': 'Unknown',
        'next_action_by': 'system',
        'can_execute': False,
        'blocking_reasons': []
    }
    
    if swap_request.status == SwapStatus.PENDING:
        status_info.update({
            'next_action_required': 'Manager review and approval',
            'next_action_by': 'manager'
        })
    
    elif swap_request.status == SwapStatus.MANAGER_APPROVED:
        if swap_request.swap_type == "auto":
            status_info.update({
                'next_action_required': 'System finding suitable staff',
                'next_action_by': 'system'
            })
        else:  # specific swap
            status_info.update({
                'next_action_required': 'Target staff response',
                'next_action_by': 'staff'
            })
    
    elif swap_request.status == SwapStatus.POTENTIAL_ASSIGNMENT:
        status_info.update({
            'next_action_required': 'Assigned staff approval',
            'next_action_by': 'staff'
        })
    
    elif swap_request.status == SwapStatus.STAFF_ACCEPTED:
        if swap_request.requires_manager_final_approval:
            status_info.update({
                'next_action_required': 'Manager final approval to execute',
                'next_action_by': 'manager'
            })
        else:
            status_info.update({
                'next_action_required': 'Ready for execution',
                'next_action_by': 'system',
                'can_execute': True
            })
    
    elif swap_request.status == SwapStatus.MANAGER_FINAL_APPROVAL:
        status_info.update({
            'next_action_required': 'Ready for execution',
            'next_action_by': 'system',
            'can_execute': True
        })
    
    return status_info