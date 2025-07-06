from typing import List, Sequence, Any, Tuple, Dict, Optional
from uuid import UUID
from datetime import datetime, timedelta
import json

AwayTuple = Tuple[UUID, int, int]  # (staff_id, day, shift)

class ScheduleConstraints:
    """Configurable constraints for schedule generation"""
    
    def __init__(
        self,
        min_rest_hours: int = 8,
        max_consecutive_days: int = 5,
        max_weekly_hours: int = 40,
        min_staff_per_shift: int = 1,
        max_staff_per_shift: int = 10,
        require_manager_per_shift: bool = False,
        shift_role_requirements: Optional[Dict[str, Dict]] = None,
        allow_overtime: bool = False,
    ):
        self.min_rest_hours = min_rest_hours
        self.max_consecutive_days = max_consecutive_days
        self.max_weekly_hours = max_weekly_hours
        self.min_staff_per_shift = min_staff_per_shift
        self.max_staff_per_shift = max_staff_per_shift
        self.require_manager_per_shift = require_manager_per_shift
        self.shift_role_requirements = shift_role_requirements or {}
        self.allow_overtime = allow_overtime

class StaffAssignment:
    """Track staff assignments and hours for constraint checking"""
    
    def __init__(self):
        self.assignments: Dict[UUID, List[Tuple[int, int]]] = {}  # staff_id -> [(day, shift)]
        self.weekly_hours: Dict[UUID, int] = {}
        self.consecutive_days: Dict[UUID, int] = {}
        self.last_shift_day: Dict[UUID, int] = {}

    def can_assign(self, staff: Any, day: int, shift: int, constraints: ScheduleConstraints, hours_per_shift: int = 8) -> bool:
        """Check if staff can be assigned to this day/shift"""
        staff_id = staff.id
        
        # 1. Check if already working this day
        current_assignments = self.assignments.get(staff_id, [])
        if any(d == day for d, s in current_assignments):
            return False
            
        # 2. Check weekly hours limit
        current_hours = self.weekly_hours.get(staff_id, 0)
        max_hours = staff.weekly_hours_max or constraints.max_weekly_hours
        
        if not constraints.allow_overtime and (current_hours + hours_per_shift) > max_hours:
            return False
            
        # 3. Check consecutive days limit
        if staff_id in self.last_shift_day:
            last_day = self.last_shift_day[staff_id]
            consecutive = self.consecutive_days.get(staff_id, 0)
            
            if day == last_day + 1:  # Consecutive day
                if consecutive >= constraints.max_consecutive_days:
                    return False
            
        # 4. Check minimum rest between shifts (simplified - assumes shifts don't cross days)
        if staff_id in self.last_shift_day:
            last_day = self.last_shift_day[staff_id]
            if day == last_day + 1 and shift == 0:  # Next day morning shift
                # Check if they worked evening shift yesterday
                if any(d == last_day and s == 2 for d, s in current_assignments):
                    # Would be less than min_rest_hours - simplified check
                    if constraints.min_rest_hours > 8:  # Only enforce if > 8 hours
                        return False
        
        return True
    
    def assign(self, staff: Any, day: int, shift: int, hours_per_shift: int = 8):
        """Assign staff to a shift and update tracking"""
        staff_id = staff.id
        
        # Update assignments
        if staff_id not in self.assignments:
            self.assignments[staff_id] = []
        self.assignments[staff_id].append((day, shift))
        
        # Update hours
        self.weekly_hours[staff_id] = self.weekly_hours.get(staff_id, 0) + hours_per_shift
        
        # Update consecutive days tracking
        if staff_id in self.last_shift_day:
            last_day = self.last_shift_day[staff_id]
            if day == last_day + 1:
                self.consecutive_days[staff_id] = self.consecutive_days.get(staff_id, 0) + 1
            else:
                self.consecutive_days[staff_id] = 1
        else:
            self.consecutive_days[staff_id] = 1
            
        self.last_shift_day[staff_id] = day

def check_shift_requirements(staff: Any, day: int, shift: int, constraints: ScheduleConstraints) -> bool:
    """Check if staff meets shift-specific requirements"""
    shift_key = str(shift)
    
    if shift_key not in constraints.shift_role_requirements:
        return True
        
    requirements = constraints.shift_role_requirements[shift_key]
    
    # Check required roles
    if "required_roles" in requirements:
        required_roles = requirements["required_roles"]
        if isinstance(required_roles, list) and staff.role not in required_roles:
            return False
            
    # Check minimum skill level
    if "min_skill_level" in requirements:
        min_skill = requirements["min_skill_level"]
        if (staff.skill_level or 1) < min_skill:
            return False
            
    return True

def generate_weekly_schedule(
    staff: Sequence[Any],
    *,
    unavailability: Sequence[AwayTuple] | None = None,
    constraints: Optional[ScheduleConstraints] = None,
    days: int = 7,
    shifts_per_day: int = 3,
    hours_per_shift: int = 8,
) -> List[Dict]:
    """Generate a weekly schedule with configurable constraints"""
    
    if not staff:
        raise RuntimeError("No staff supplied")

    # Use default constraints if none provided
    if constraints is None:
        constraints = ScheduleConstraints()
    
    unavailability_set = set(unavailability or [])
    assignment_tracker = StaffAssignment()
    roster: List[Dict] = []
    
    # Sort staff by skill level (higher skilled first) for better assignments
    sorted_staff = sorted(staff, key=lambda s: (s.skill_level or 1), reverse=True)
    
    for day in range(days):
        for shift in range(shifts_per_day):
            assigned_count = 0
            manager_assigned = False
            attempts = 0
            max_attempts = len(sorted_staff) * 2
            
            while assigned_count < constraints.min_staff_per_shift and attempts < max_attempts:
                attempts += 1
                best_candidate = None
                
                for candidate in sorted_staff:
                    # Basic availability check
                    if (candidate.id, day, shift) in unavailability_set:
                        continue
                        
                    # Check if staff can be assigned based on constraints
                    if not assignment_tracker.can_assign(candidate, day, shift, constraints, hours_per_shift):
                        continue
                        
                    # Check shift-specific requirements
                    if not check_shift_requirements(candidate, day, shift, constraints):
                        continue
                        
                    # Check if we need a manager for this shift
                    if constraints.require_manager_per_shift and not manager_assigned:
                        if "manager" not in candidate.role.lower():
                            continue
                    
                    # Check if we've reached max staff for this shift
                    if assigned_count >= constraints.max_staff_per_shift:
                        break
                        
                    best_candidate = candidate
                    break
                
                if best_candidate:
                    # Assign the staff member
                    assignment_tracker.assign(best_candidate, day, shift, hours_per_shift)
                    roster.append({
                        "day": day,
                        "shift": shift,
                        "staff_id": best_candidate.id
                    })
                    
                    assigned_count += 1
                    
                    # Track if manager was assigned
                    if "manager" in best_candidate.role.lower():
                        manager_assigned = True
                        
                else:
                    # No suitable candidate found
                    break
            
            # Check if minimum staffing requirements are met
            if assigned_count < constraints.min_staff_per_shift:
                raise RuntimeError(f"Could not meet minimum staffing for day {day}, shift {shift}. "
                                 f"Required: {constraints.min_staff_per_shift}, "
                                 f"Assigned: {assigned_count}")

    return roster

# Helper function to create constraints from config
def constraints_from_config(config: Optional[Any]) -> ScheduleConstraints:
    """Create ScheduleConstraints from a ScheduleConfig model"""
    if config is None:
        return ScheduleConstraints()
    
    shift_requirements = {}
    if hasattr(config, 'shift_role_requirements') and config.shift_role_requirements:
        shift_requirements = config.shift_role_requirements
    
    return ScheduleConstraints(
        min_rest_hours=getattr(config, 'min_rest_hours', 8),
        max_consecutive_days=getattr(config, 'max_consecutive_days', 5),
        max_weekly_hours=getattr(config, 'max_weekly_hours', 40),
        min_staff_per_shift=getattr(config, 'min_staff_per_shift', 1),
        max_staff_per_shift=getattr(config, 'max_staff_per_shift', 10),
        require_manager_per_shift=getattr(config, 'require_manager_per_shift', False),
        shift_role_requirements=shift_requirements,
        allow_overtime=getattr(config, 'allow_overtime', False),
    )