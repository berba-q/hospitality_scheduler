# app/services/swap_service.py

from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from sqlmodel import Session, select

from ..models import (
    Staff, StaffUnavailability, Schedule, ShiftAssignment, 
    SwapRequest, ScheduleConfig, Facility
)
from ..services.schedule_solver import ScheduleConstraints, constraints_from_config
from ..schemas import AutoAssignmentResult

class SwapAutoAssigner:
    """Handles automatic assignment of coverage for swap requests"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def find_coverage(
        self,
        swap_request: SwapRequest,
        preferred_skills: Optional[List[str]] = None,
        avoid_staff_ids: Optional[List[UUID]] = None
    ) -> AutoAssignmentResult:
        """Find the best staff member to cover a swap request"""
        
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
        
        # Get all available staff for this facility
        available_staff = self._get_available_staff(
            schedule.facility_id,
            swap_request.original_day,
            swap_request.original_shift,
            schedule,
            avoid_staff_ids or []
        )
        
        if not available_staff:
            return AutoAssignmentResult(
                success=False,
                reason="No available staff found for this shift"
            )
        
        # Score and rank candidates
        candidates = self._score_candidates(
            available_staff,
            swap_request,
            schedule,
            constraints,
            preferred_skills
        )
        
        if not candidates:
            return AutoAssignmentResult(
                success=False,
                reason="No suitable candidates found after constraint checking",
                alternatives=self._get_alternative_suggestions(available_staff)
            )
        
        # Select the best candidate
        best_candidate = candidates[0]
        
        return AutoAssignmentResult(
            success=True,
            assigned_staff_id=best_candidate["staff"].id,
            assigned_staff_name=best_candidate["staff"].full_name,
            reason=f"Best match with score {best_candidate['score']}"
        )
    
    def _get_available_staff(
        self,
        facility_id: UUID,
        day: int,
        shift: int,
        schedule: Schedule,
        avoid_staff_ids: List[UUID]
    ) -> List[Staff]:
        """Get staff who are available for the requested shift"""
        
        # Get all active staff for this facility
        all_staff = self.db.exec(
            select(Staff).where(
                Staff.facility_id == facility_id,
                Staff.is_active.is_(True),
                ~Staff.id.in_(avoid_staff_ids)
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
    
    def _score_candidates(
        self,
        staff_list: List[Staff],
        swap_request: SwapRequest,
        schedule: Schedule,
        constraints: ScheduleConstraints,
        preferred_skills: Optional[List[str]]
    ) -> List[dict]:
        """Score and rank candidates by suitability"""
        
        candidates = []
        
        for staff in staff_list:
            score = 0
            
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
            
            candidates.append({
                "staff": staff,
                "score": score,
                "current_hours": current_hours,
                "consecutive_days": consecutive_days
            })
        
        # Sort by score (highest first)
        candidates.sort(key=lambda x: x["score"], reverse=True)
        
        return candidates
    
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
            ).order_by(ShiftAssignment.day)
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

def assign_swap_coverage(
    db: Session,
    swap_request: SwapRequest,
    preferred_skills: Optional[List[str]] = None,
    avoid_staff_ids: Optional[List[UUID]] = None
) -> AutoAssignmentResult:
    """Main function to assign coverage for a swap request"""
    
    assigner = SwapAutoAssigner(db)
    result = assigner.find_coverage(swap_request, preferred_skills, avoid_staff_ids)
    
    return result