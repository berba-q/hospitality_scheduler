# app/services/smart_scheduler.py
# Smart scheduling engine with zone-based optimization, workload balancing, and constraint satisfaction
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, timedelta
from sqlmodel import Session, select
from uuid import UUID
import random
import math

from ..models import Staff, ScheduleConfig, StaffUnavailability, ZoneAssignment
from ..schemas import (
    SmartScheduleConfiguration, ZoneConfiguration, 
    OptimizationGoal, SchedulingConflict
)

class SmartScheduler:
    """
    Advanced scheduling engine with zone-based optimization,
    workload balancing, and constraint satisfaction
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.zones_config = {}
        self.staff_pool = []
        self.constraints = {}
        
    def generate_smart_schedule(
        self, 
        config: SmartScheduleConfiguration,
        staff: List[Staff],
        schedule_config: Optional[ScheduleConfig] = None
    ) -> Dict[str, Any]:
        """Generate an optimized schedule using smart algorithms"""
        
        self.staff_pool = [s for s in staff if s.is_active]
        self.zones_config = config.zone_assignments
        
        if not self.staff_pool:
            raise ValueError("No active staff available for scheduling")
        
        # Initialize scheduling parameters
        total_days = self._calculate_total_days(config.period_type, config.total_days)
        assignments = []
        zone_coverage = {}
        optimization_metrics = {}
        
        try:
            # Phase 1: Generate initial assignments
            initial_assignments = self._generate_initial_assignments(
                config, total_days
            )
            
            # Phase 2: Apply constraints and optimization
            if config.use_constraints and schedule_config:
                optimized_assignments = self._apply_constraints(
                    initial_assignments, schedule_config, config
                )
            else:
                optimized_assignments = initial_assignments
            
            # Phase 3: Balance workload if requested
            if config.balance_workload:
                balanced_assignments = self._balance_workload(
                    optimized_assignments, config
                )
            else:
                balanced_assignments = optimized_assignments
            
            # Phase 4: Zone-based optimization
            if config.auto_assign_by_zone:
                final_assignments = self._optimize_zone_assignments(
                    balanced_assignments, config
                )
            else:
                final_assignments = balanced_assignments
            
            # Calculate metrics
            zone_coverage = self._calculate_zone_coverage(final_assignments)
            optimization_metrics = self._calculate_optimization_metrics(
                final_assignments, config
            )
            
            return {
                "assignments": final_assignments,
                "zone_coverage": zone_coverage,
                "metrics": optimization_metrics,
                "success": True,
                "warnings": []
            }
            
        except Exception as e:
            return {
                "assignments": [],
                "zone_coverage": {},
                "metrics": {},
                "success": False,
                "error": str(e)
            }
    
    def _calculate_total_days(self, period_type: str, total_days: Optional[int]) -> int:
        """Calculate total days based on period type"""
        print(f" Calculating total days: period_type={period_type}, total_days={total_days}")
        
        if total_days:
            print(f" Using provided total_days: {total_days}")
            return total_days
        
        if period_type == 'daily':
            result = 1
        elif period_type == 'weekly':
            result = 7
        elif period_type == 'monthly':
            result = 30
        else:
            result = 7  # Default to weekly
        
        print(f" Calculated total_days: {result} for period_type: {period_type}")
        return result
    
    def _generate_initial_assignments(
        self, 
        config: SmartScheduleConfiguration, 
        total_days: int
    ) -> List[Dict[str, Any]]:
        """Generate initial assignments without optimization - DEBUG VERSION"""
        print(f"🏗️ === STARTING ASSIGNMENT GENERATION ===")
        print(f"📊 Config: total_days={total_days}, shifts_per_day={config.shifts_per_day}")
        print(f"🏢 Zones: {config.zones}")
        print(f"👥 Available staff: {len(self.staff_pool)}")
        for staff in self.staff_pool:
            print(f"  - {staff.full_name} ({staff.role})")
        
        assignments = []
        
        for day in range(total_days):
            print(f"\n📅 === DAY {day + 1}/{total_days} ===")
            day_assignments = []
            
            for shift in range(config.shifts_per_day):
                print(f"\n  ⏰ SHIFT {shift + 1}/{config.shifts_per_day} (Day {day + 1})")
                
                # Assign staff to zones for this shift
                shift_assignments = self._assign_shift(
                    day, shift, config.zones, config
                )
                
                print(f"    📝 Shift assignments generated: {len(shift_assignments)}")
                for assignment in shift_assignments:
                    print(f"      - {assignment['staff_name']} ({assignment['staff_role']}) -> {assignment['zone_id']}")
                
                day_assignments.extend(shift_assignments)
                assignments.extend(shift_assignments)
            
            print(f"  📊 Day {day + 1} total assignments: {len(day_assignments)}")
            
            # Check if we're getting no assignments for this day
            if len(day_assignments) == 0:
                print(f"  ⚠️ WARNING: No assignments generated for day {day + 1}!")
                print(f"     This might indicate an issue with staff availability or zone config")
                
                # Debug zone configurations
                for zone_id in config.zones:
                    zone_config = config.zone_assignments.get(zone_id)
                    if zone_config:
                        print(f"     Zone {zone_id}: required_staff={zone_config.required_staff}, roles={zone_config.assigned_roles}")
                    else:
                        print(f"     Zone {zone_id}: NO CONFIG FOUND!")
        
        print(f"\n🎯 === FINAL RESULTS ===")
        print(f"Total assignments generated: {len(assignments)}")
        
        # Group by day for summary
        assignments_by_day = {}
        for assignment in assignments:
            day = assignment['day']
            if day not in assignments_by_day:
                assignments_by_day[day] = []
            assignments_by_day[day].append(assignment)
        
        for day in range(total_days):
            day_count = len(assignments_by_day.get(day, []))
            print(f"  Day {day + 1}: {day_count} assignments")
        
        return assignments
    
    def _assign_shift(
        self, 
        day: int, 
        shift: int, 
        zones: List[str], 
        config: SmartScheduleConfiguration
    ) -> List[Dict[str, Any]]:
        """Assign staff to a specific shift across zones with proper rotation"""
        
        shift_assignments = []
        
        # Sort zones by priority
        sorted_zones = self._sort_zones_by_priority(zones, config)
        
        # Track staff assignments for this specific shift to avoid double-booking
        shift_staff_assignments = {}
        
        for zone_id in sorted_zones:
            # Get ZoneConfiguration object
            zone_config = config.zone_assignments.get(zone_id)
            
            if not zone_config:
                continue
                
            # Access Pydantic model attributes directly
            required_staff = zone_config.required_staff
            assigned_roles = zone_config.assigned_roles
            
            # Filter staff by role for this zone
            zone_staff = self._filter_staff_by_role(
                self.staff_pool, assigned_roles, config.role_mapping.get(zone_id, [])
            )
            
            if not zone_staff:
                continue
            
            # IMPROVED: Rotate staff selection based on day and shift
            # This ensures different staff get assigned across days
            staff_rotation_offset = (day * config.shifts_per_day + shift) % len(zone_staff)
            
            # Rotate the staff list so we start from a different person each time
            rotated_zone_staff = zone_staff[staff_rotation_offset:] + zone_staff[:staff_rotation_offset]
            
            # Select staff not already assigned this shift
            available_for_zone = [
                s for s in rotated_zone_staff 
                if str(s.id) not in shift_staff_assignments
            ]
            
            if not available_for_zone:
                # If all zone staff are busy, start over with rotation
                available_for_zone = rotated_zone_staff
            
            selected_staff = self._select_optimal_staff_for_zone(
                available_for_zone, required_staff, shift, day, config
            )
            
            # Create assignments
            for staff_member in selected_staff:
                assignment = {
                    "day": day,
                    "shift": shift,
                    "staff_id": str(staff_member.id),
                    "zone_id": zone_id,
                    "staff_name": staff_member.full_name,
                    "staff_role": staff_member.role,
                    "skill_level": staff_member.skill_level
                }
                shift_assignments.append(assignment)
                shift_staff_assignments[str(staff_member.id)] = zone_id
        
        return shift_assignments
    
    def _sort_zones_by_priority(
        self, 
        zones: List[str], 
        config: SmartScheduleConfiguration
    ) -> List[str]:
        """Sort zones by priority for assignment"""
        zone_priorities = {}
        
        for zone_id in zones:
            zone_config = config.zone_assignments.get(zone_id)
            # Access priority attribute directly from Pydantic model
            priority = zone_config.priority if zone_config else 5
            zone_priorities[zone_id] = priority
        
        # Sort by priority (higher first)
        return sorted(zones, key=lambda z: zone_priorities.get(z, 5), reverse=True)
    
    def _filter_staff_by_role(
        self, 
        staff: List[Staff], 
        assigned_roles: List[str],
        zone_roles: List[str]
    ) -> List[Staff]:
        """Filter staff by role requirements - DEBUG VERSION"""
        print(f"Filtering staff: assigned_roles={assigned_roles}, zone_roles={zone_roles}")
        
        if not assigned_roles and not zone_roles:
            print(f"No role restrictions, returning all {len(staff)} staff")
            return staff
        
        # Combine role requirements
        required_roles = set(assigned_roles + zone_roles)
        
        if not required_roles:
            print(f"        ✅ No combined role restrictions, returning all {len(staff)} staff")
            return staff
        
        filtered_staff = [s for s in staff if s.role in required_roles]
        print(f"        🎯 Filtered to {len(filtered_staff)} staff with roles: {required_roles}")
        
        return filtered_staff
    
    def _select_optimal_staff_for_zone(
        self, 
        zone_staff: List[Staff], 
        required_staff: Dict[str, int],
        shift: int,
        day: int,
        config: SmartScheduleConfiguration
    ) -> List[Staff]:
        """Select optimal staff for a zone with better distribution"""
        
        if not zone_staff:
            return []
        
        min_staff = required_staff.get('min', 1)
        max_staff = required_staff.get('max', 2)
        
        # Ensure we don't exceed available staff
        max_staff = min(max_staff, len(zone_staff))
        min_staff = min(min_staff, len(zone_staff))
        
        # IMPROVED: Better staff selection that considers workload distribution
        # For now, use a simple rotation approach
        # In the future, this could track actual workload across the week
        
        # Select different combinations based on day to distribute workload
        if config.coverage_priority == 'maximum':
            selected_count = max_staff
        elif config.coverage_priority == 'minimal':
            selected_count = min_staff
        else:  # balanced
            # Vary the count based on day to create some variation
            base_count = (min_staff + max_staff) // 2
            day_variation = day % 2  # Simple variation
            selected_count = min(max_staff, base_count + day_variation)
        
        selected_count = max(min_staff, min(selected_count, len(zone_staff)))
        
        # The staff list is already rotated in _assign_shift, so just take the first N
        return zone_staff[:selected_count]
    
    def _calculate_staff_score(
        self, 
        staff: Staff, 
        shift: int, 
        day: int,
        config: SmartScheduleConfiguration
    ) -> float:
        """Calculate a score for staff assignment preference"""
        score = 0.0
        
        # Base score from skill level
        score += staff.skill_level * 10
        
        # Shift preference multipliers
        if config.shift_preferences:
            shift_names = ['morning_multiplier', 'afternoon_multiplier', 'evening_multiplier']
            if shift < len(shift_names):
                multiplier = config.shift_preferences.get(shift_names[shift], 1.0)
                score *= multiplier
        
        # Skill match bonus
        if config.prioritize_skill_match:
            # Higher skilled staff get preference for evening shifts
            if shift == 2 and staff.skill_level >= 3:  # Evening shift
                score += 15
            elif shift == 0 and staff.skill_level >= 2:  # Morning shift
                score += 10
        
        # Workload balancing (would need to track current assignments)
        # This is simplified - in reality, you'd track current workload
        
        # Add some randomization to avoid always selecting the same staff
        score += random.uniform(0, 5)
        
        return score
    
    def _apply_constraints(
        self, 
        assignments: List[Dict[str, Any]], 
        schedule_config: ScheduleConfig,
        config: SmartScheduleConfiguration
    ) -> List[Dict[str, Any]]:
        """Apply scheduling constraints with smarter consecutive days logic"""
        
        print(f"_apply_constraints called with {len(assignments)} assignments")
        
        if not assignments or not schedule_config:
            print("No schedule config found, returning all assignments")
            return assignments
        
        # Group by day to see what we're working with
        day_groups = {}
        for assignment in assignments:
            day = assignment['day']
            if day not in day_groups:
                day_groups[day] = []
            day_groups[day].append(assignment)
        
        print(f"Day groups before constraints: {[(day, len(assigns)) for day, assigns in day_groups.items()]}")
        
        valid_assignments = []
        staff_workload = {}
        staff_consecutive_days = {}
        
        # Sort assignments by day and shift for constraint checking
        sorted_assignments = sorted(assignments, key=lambda x: (x['day'], x['shift']))
        
        # Track assignments per day to ensure we don't eliminate entire days
        day_assignment_counts = {day: 0 for day in range(7)}
        
        for assignment in sorted_assignments:
            staff_id = assignment['staff_id']
            day = assignment['day']
            shift = assignment['shift']
            zone_id = assignment['zone_id']
            
            # Initialize tracking
            if staff_id not in staff_workload:
                staff_workload[staff_id] = []
                staff_consecutive_days[staff_id] = set()
            
            constraint_violated = False
            
            # REASONABLE constraint: Maximum shifts per week
            current_shifts = len(staff_workload[staff_id])
            reasonable_max_shifts = 15
            
            if hasattr(schedule_config, 'max_weekly_hours') and schedule_config.max_weekly_hours:
                configured_max_shifts = (schedule_config.max_weekly_hours // 8) + 5
                reasonable_max_shifts = max(reasonable_max_shifts, configured_max_shifts)
            
            if current_shifts >= reasonable_max_shifts:
                print(f"Rejecting assignment for {staff_id} - too many hours ({current_shifts} shifts, limit: {reasonable_max_shifts})")
                constraint_violated = True
            
            # SMARTER consecutive days constraint
            reasonable_max_consecutive = 5  # Reduce to 5 consecutive days
            
            if hasattr(schedule_config, 'max_consecutive_days') and schedule_config.max_consecutive_days:
                reasonable_max_consecutive = min(5, schedule_config.max_consecutive_days)  # Cap at 5
            
            consecutive_days = staff_consecutive_days[staff_id]
            
            # Only apply consecutive days constraint if:
            # 1. Staff has worked many consecutive days AND
            # 2. We have enough assignments for this day from other staff
            if len(consecutive_days) >= reasonable_max_consecutive:
                # Check if this extends a consecutive streak
                extends_streak = any(consecutive_day in consecutive_days for consecutive_day in [day-1, day+1])
                
                # Count how many assignments this day already has
                current_day_assignments = day_assignment_counts[day]
                
                # Get minimum assignments needed per day (rough estimate)
                zones_count = len(set(a['zone_id'] for a in assignments if a['day'] == day))
                min_assignments_per_day = zones_count  # At least one per zone
                
                # Only reject if this day already has enough coverage AND this extends a streak
                if extends_streak and current_day_assignments >= min_assignments_per_day:
                    print(f"Rejecting assignment for {staff_id} on day {day} - too many consecutive days (day has {current_day_assignments} assignments)")
                    constraint_violated = True
                else:
                    # Allow this assignment even if it extends streak, if day needs coverage
                    print(f"Allowing assignment for {staff_id} on day {day} despite consecutive days - day needs coverage")
            
            if not constraint_violated:
                valid_assignments.append(assignment)
                staff_workload[staff_id].append((day, shift))
                staff_consecutive_days[staff_id].add(day)
                day_assignment_counts[day] += 1
            else:
                print(f"Assignment rejected: staff {staff_id}, day {day}, shift {shift}")
        
        # SAFETY CHECK: Ensure every day has at least some assignments
        final_day_groups = {}
        for assignment in valid_assignments:
            day = assignment['day']
            if day not in final_day_groups:
                final_day_groups[day] = []
            final_day_groups[day].append(assignment)
        
        # If any day has zero assignments, add back some assignments from rejected ones
        missing_days = []
        for day in range(7):  # 0-6 for 7 days
            if day not in final_day_groups or len(final_day_groups[day]) == 0:
                missing_days.append(day)
        
        if missing_days:
            print(f"WARNING: Days {missing_days} have no assignments. Adding back some assignments.")
            
            # Add back assignments for missing days (relax constraints)
            for assignment in sorted_assignments:
                if assignment['day'] in missing_days:
                    # Only add if this day still needs assignments
                    if assignment['day'] not in final_day_groups or len(final_day_groups[assignment['day']]) < 2:
                        valid_assignments.append(assignment)
                        print(f"Added back assignment for missing day {assignment['day']}: {assignment['staff_name']}")
        
        # Recalculate final day groups
        final_day_groups = {}
        for assignment in valid_assignments:
            day = assignment['day']
            if day not in final_day_groups:
                final_day_groups[day] = []
            final_day_groups[day].append(assignment)
        
        print(f"Day groups after constraints: {[(day, len(assigns)) for day, assigns in final_day_groups.items()]}")
        print(f"Constraint filtering: {len(assignments)} -> {len(valid_assignments)} assignments")
        
        return valid_assignments
    
    def _check_assignment_constraints(
        self, 
        assignment: Dict[str, Any], 
        staff_workload: Dict[str, List],
        staff_consecutive_days: Dict[str, set],
        config: ScheduleConfig
    ) -> bool:
        """Check if an assignment violates constraints"""
        staff_id = assignment['staff_id']
        day = assignment['day']
        
        # Check maximum consecutive days
        if staff_id in staff_consecutive_days:
            consecutive_days = staff_consecutive_days[staff_id]
            if len(consecutive_days) >= config.max_consecutive_days:
                # Check if adding this day would exceed limit
                if day - 1 in consecutive_days or day + 1 in consecutive_days:
                    return False
        
        # Check maximum weekly hours (simplified)
        if staff_id in staff_workload:
            current_shifts = len(staff_workload[staff_id])
            if current_shifts >= config.max_weekly_hours // 8:  # Assuming 8-hour shifts
                return False
        
        # Check rest hours (simplified - would need actual time tracking)
        # This is a placeholder for more complex rest hour checking
        
        return True
    
    def _balance_workload(
        self, 
        assignments: List[Dict[str, Any]], 
        config: SmartScheduleConfiguration
    ) -> List[Dict[str, Any]]:
        """Balance workload across staff members"""
        if not assignments:
            return assignments
        
        # Calculate current workload distribution
        staff_workload = {}
        for assignment in assignments:
            staff_id = assignment['staff_id']
            staff_workload[staff_id] = staff_workload.get(staff_id, 0) + 1
        
        # Find imbalances and attempt to redistribute
        avg_workload = sum(staff_workload.values()) / len(staff_workload)
        balanced_assignments = assignments.copy()
        
        # This is a simplified balancing algorithm
        # In practice, you'd use more sophisticated optimization
        
        return balanced_assignments
    
    def _optimize_zone_assignments(
        self, 
        assignments: List[Dict[str, Any]], 
        config: SmartScheduleConfiguration
    ) -> List[Dict[str, Any]]:
        """Optimize assignments for better zone coverage"""
        # Group assignments by zone
        zone_assignments = {}
        for assignment in assignments:
            zone_id = assignment['zone_id']
            if zone_id not in zone_assignments:
                zone_assignments[zone_id] = []
            zone_assignments[zone_id].append(assignment)
        
        optimized_assignments = []
        
        # Optimize each zone individually
        for zone_id, zone_assigns in zone_assignments.items():
            zone_config = config.zone_assignments.get(zone_id)
            if not zone_config:
                continue
                
            coverage_priority = config.coverage_priority
            
            # Apply zone-specific optimizations
            optimized_zone = self._optimize_single_zone(
                zone_assigns, zone_config, coverage_priority  # Pass ZoneConfiguration object
            )
            optimized_assignments.extend(optimized_zone)
        
        return optimized_assignments
    
    def _optimize_single_zone(
        self, 
        assignments: List[Dict[str, Any]], 
        zone_config: ZoneConfiguration,  # Now expecting ZoneConfiguration object
        coverage_priority: str
    ) -> List[Dict[str, Any]]:
        """Optimize assignments for a single zone"""
        if coverage_priority == 'maximum':
            # Ensure maximum coverage - keep all assignments
            return assignments
        elif coverage_priority == 'minimal':
            # Reduce to minimum required staff
            # Access required_staff directly from Pydantic model
            required_staff = zone_config.required_staff
            min_staff = required_staff.get('min', 1)
            
            # Group by shift and keep only minimum staff per shift
            shift_assignments = {}
            for assignment in assignments:
                shift = assignment['shift']
                if shift not in shift_assignments:
                    shift_assignments[shift] = []
                shift_assignments[shift].append(assignment)
            
            optimized = []
            for shift, shift_assigns in shift_assignments.items():
                # Keep only minimum required staff for this shift
                optimized.extend(shift_assigns[:min_staff])
            
            return optimized
        else:  # balanced
            return assignments
    
    def _calculate_zone_coverage(
        self, 
        assignments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate coverage metrics for each zone"""
        zone_coverage = {}
        
        # Group assignments by zone
        for assignment in assignments:
            zone_id = assignment['zone_id']
            if zone_id not in zone_coverage:
                zone_coverage[zone_id] = {
                    'total_assignments': 0,
                    'unique_staff': set(),
                    'shifts_covered': set(),
                    'days_covered': set(),
                    'skill_distribution': {}
                }
            
            coverage = zone_coverage[zone_id]
            coverage['total_assignments'] += 1
            coverage['unique_staff'].add(assignment['staff_id'])
            coverage['shifts_covered'].add(assignment['shift'])
            coverage['days_covered'].add(assignment['day'])
            
            # Track skill distribution
            skill_level = assignment.get('skill_level', 1)
            coverage['skill_distribution'][skill_level] = (
                coverage['skill_distribution'].get(skill_level, 0) + 1
            )
        
        # Convert sets to counts for JSON serialization
        for zone_id, coverage in zone_coverage.items():
            coverage['unique_staff'] = len(coverage['unique_staff'])
            coverage['shifts_covered'] = len(coverage['shifts_covered'])
            coverage['days_covered'] = len(coverage['days_covered'])
        
        return zone_coverage
    
    def _calculate_optimization_metrics(
        self, 
        assignments: List[Dict[str, Any]], 
        config: SmartScheduleConfiguration
    ) -> Dict[str, float]:
        """Calculate optimization performance metrics"""
        if not assignments:
            return {
                'optimization_score': 0.0,
                'coverage_percentage': 0.0,
                'workload_balance': 0.0,
                'skill_utilization': 0.0
            }
        
        total_days = self._calculate_total_days(config.period_type, config.total_days)
        total_shifts = total_days * config.shifts_per_day * len(config.zones)
        
        # Coverage percentage
        coverage_percentage = (len(assignments) / total_shifts * 100) if total_shifts > 0 else 0
        
        # Workload balance (measure of how evenly work is distributed)
        staff_workload = {}
        for assignment in assignments:
            staff_id = assignment['staff_id']
            staff_workload[staff_id] = staff_workload.get(staff_id, 0) + 1
        
        if staff_workload:
            workloads = list(staff_workload.values())
            avg_workload = sum(workloads) / len(workloads)
            workload_variance = sum((w - avg_workload) ** 2 for w in workloads) / len(workloads)
            workload_balance = max(0, 100 - (workload_variance / avg_workload * 100) if avg_workload > 0 else 0)
        else:
            workload_balance = 0
        
        # Skill utilization (how well skills are matched to requirements)
        total_skill_points = sum(assignment.get('skill_level', 1) for assignment in assignments)
        max_possible_skill = len(assignments) * 5  # Assuming max skill level is 5
        skill_utilization = (total_skill_points / max_possible_skill * 100) if max_possible_skill > 0 else 0
        
        # Overall optimization score
        optimization_score = (
            coverage_percentage * 0.4 + 
            workload_balance * 0.3 + 
            skill_utilization * 0.3
        )
        
        return {
            'optimization_score': round(optimization_score, 2),
            'coverage_percentage': round(coverage_percentage, 2),
            'workload_balance': round(workload_balance, 2),
            'skill_utilization': round(skill_utilization, 2)
        }

# app/services/analytics_service.py

from typing import Dict, List, Any, Tuple
from datetime import datetime, date, timedelta
from sqlmodel import Session, select
from collections import defaultdict
import statistics

from ..models import Schedule, ShiftAssignment, Staff, ScheduleConfig
from ..schemas import ScheduleAnalytics, StaffUtilizationMetrics, WorkloadBalanceMetrics, CoverageMetrics

class ScheduleAnalyticsService:
    """Service for generating comprehensive schedule analytics"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_analytics(
        self, 
        facility_id: str, 
        start_date: date, 
        end_date: date
    ) -> ScheduleAnalytics:
        """Generate comprehensive analytics for a date range"""
        
        # Get schedules and assignments
        schedules = self._get_schedules_in_range(facility_id, start_date, end_date)
        assignments_data = self._get_assignments_data(schedules)
        
        if not assignments_data:
            return self._empty_analytics(facility_id, start_date, end_date)
        
        # Calculate metrics
        staff_utilization = self._calculate_staff_utilization(assignments_data)
        workload_balance = self._calculate_workload_balance(assignments_data)
        coverage_metrics = self._calculate_coverage_metrics(
            assignments_data, start_date, end_date
        )
        shift_distribution = self._calculate_shift_distribution(assignments_data)
        role_distribution = self._calculate_role_distribution(assignments_data)
        efficiency_score = self._calculate_efficiency_score(
            staff_utilization, workload_balance, coverage_metrics
        )
        recommendations = self._generate_recommendations(
            staff_utilization, workload_balance, coverage_metrics
        )
        
        return ScheduleAnalytics(
            facility_id=facility_id,
            period={"start": start_date.isoformat(), "end": end_date.isoformat()},
            total_schedules=len(schedules),
            total_assignments=len(assignments_data),
            staff_utilization=staff_utilization,
            shift_distribution=shift_distribution,
            role_distribution=role_distribution,
            workload_balance=workload_balance,
            coverage_metrics=coverage_metrics,
            efficiency_score=efficiency_score,
            recommendations=recommendations
        )
    
    def _get_schedules_in_range(
        self, 
        facility_id: str, 
        start_date: date, 
        end_date: date
    ) -> List[Schedule]:
        """Get all schedules in the date range"""
        return self.db.exec(
            select(Schedule).where(
                Schedule.facility_id == facility_id,
                Schedule.week_start >= start_date,
                Schedule.week_start <= end_date
            )
        ).all()
    
    def _get_assignments_data(self, schedules: List[Schedule]) -> List[Tuple]:
        """Get assignment data with staff information"""
        if not schedules:
            return []
        
        schedule_ids = [s.id for s in schedules]
        return self.db.exec(
            select(ShiftAssignment, Staff, Schedule)
            .join(Staff)
            .join(Schedule)
            .where(ShiftAssignment.schedule_id.in_(schedule_ids))
        ).all()
    
    def _calculate_staff_utilization(
        self, 
        assignments_data: List[Tuple]
    ) -> Dict[str, StaffUtilizationMetrics]:
        """Calculate detailed staff utilization metrics"""
        staff_metrics = defaultdict(lambda: {
            'name': '',
            'role': '',
            'total_shifts': 0,
            'shifts_by_type': {'0': 0, '1': 0, '2': 0}
        })
        
        for assignment, staff, schedule in assignments_data:
            staff_id = str(staff.id)
            metrics = staff_metrics[staff_id]
            
            metrics['name'] = staff.full_name
            metrics['role'] = staff.role
            metrics['total_shifts'] += 1
            metrics['shifts_by_type'][str(assignment.shift)] += 1
        
        # Convert to StaffUtilizationMetrics objects
        result = {}
        total_assignments = len(assignments_data)
        
        for staff_id, metrics in staff_metrics.items():
            utilization_percentage = (
                metrics['total_shifts'] / total_assignments * 100 
                if total_assignments > 0 else 0
            )
            
            # Simple workload score based on total shifts and distribution
            workload_score = min(100, metrics['total_shifts'] * 10)
            
            result[staff_id] = StaffUtilizationMetrics(
                name=metrics['name'],
                role=metrics['role'],
                total_shifts=metrics['total_shifts'],
                shifts_by_type=metrics['shifts_by_type'],
                utilization_percentage=round(utilization_percentage, 2),
                workload_score=round(workload_score, 2)
            )
        
        return result
    
    def _calculate_workload_balance(
        self, 
        assignments_data: List[Tuple]
    ) -> WorkloadBalanceMetrics:
        """Calculate workload balance metrics"""
        staff_shift_counts = defaultdict(int)
        staff_names = {}
        
        for assignment, staff, schedule in assignments_data:
            staff_id = str(staff.id)
            staff_shift_counts[staff_id] += 1
            staff_names[staff_id] = staff.full_name
        
        if not staff_shift_counts:
            return WorkloadBalanceMetrics(
                balance_score=0,
                average_shifts_per_staff=0,
                standard_deviation=0,
                most_utilized_staff="N/A",
                least_utilized_staff="N/A"
            )
        
        shift_counts = list(staff_shift_counts.values())
        average_shifts = statistics.mean(shift_counts)
        std_deviation = statistics.stdev(shift_counts) if len(shift_counts) > 1 else 0
        
        # Balance score (higher is better, lower std dev = higher score)
        balance_score = max(0, 100 - (std_deviation / average_shifts * 100) if average_shifts > 0 else 0)
        
        # Find most and least utilized staff
        most_utilized_id = max(staff_shift_counts, key=staff_shift_counts.get)
        least_utilized_id = min(staff_shift_counts, key=staff_shift_counts.get)
        
        return WorkloadBalanceMetrics(
            balance_score=round(balance_score, 2),
            average_shifts_per_staff=round(average_shifts, 2),
            standard_deviation=round(std_deviation, 2),
            most_utilized_staff=staff_names[most_utilized_id],
            least_utilized_staff=staff_names[least_utilized_id]
        )
    
    def _calculate_coverage_metrics(
        self, 
        assignments_data: List[Tuple], 
        start_date: date, 
        end_date: date
    ) -> CoverageMetrics:
        """Calculate coverage metrics"""
        total_days = (end_date - start_date).days + 1
        total_possible_shifts = total_days * 3  # Assuming 3 shifts per day
        
        # Count assignments by date
        assignments_by_date = defaultdict(int)
        for assignment, staff, schedule in assignments_data:
            assignment_date = schedule.week_start + timedelta(days=assignment.day)
            if start_date <= assignment_date <= end_date:
                assignments_by_date[assignment_date] += 1
        
        days_with_assignments = len(assignments_by_date)
        coverage_percentage = (
            len(assignments_data) / total_possible_shifts * 100 
            if total_possible_shifts > 0 else 0
        )
        
        shifts_per_day_avg = (
            len(assignments_data) / total_days 
            if total_days > 0 else 0
        )
        
        # Find peak and low coverage days
        if assignments_by_date:
            peak_coverage_date = max(assignments_by_date, key=assignments_by_date.get)
            peak_coverage_day = peak_coverage_date.isoformat()
            
            # Low coverage days (less than 3 assignments)
            low_coverage_days = [
                date_key.isoformat() 
                for date_key, count in assignments_by_date.items() 
                if count < 3
            ]
        else:
            peak_coverage_day = "N/A"
            low_coverage_days = []
        
        return CoverageMetrics(
            coverage_percentage=round(coverage_percentage, 2),
            total_days=total_days,
            days_with_assignments=days_with_assignments,
            shifts_per_day_average=round(shifts_per_day_avg, 2),
            peak_coverage_day=peak_coverage_day,
            low_coverage_days=low_coverage_days
        )
    
    def _calculate_shift_distribution(
        self, 
        assignments_data: List[Tuple]
    ) -> Dict[str, int]:
        """Calculate distribution of assignments across shifts"""
        shift_counts = {'0': 0, '1': 0, '2': 0}
        
        for assignment, staff, schedule in assignments_data:
            shift_key = str(assignment.shift)
            if shift_key in shift_counts:
                shift_counts[shift_key] += 1
        
        return shift_counts
    
    def _calculate_role_distribution(
        self, 
        assignments_data: List[Tuple]
    ) -> Dict[str, int]:
        """Calculate distribution of assignments across roles"""
        role_counts = defaultdict(int)
        
        for assignment, staff, schedule in assignments_data:
            role_counts[staff.role] += 1
        
        return dict(role_counts)
    
    def _calculate_efficiency_score(
        self,
        staff_utilization: Dict[str, StaffUtilizationMetrics],
        workload_balance: WorkloadBalanceMetrics,
        coverage_metrics: CoverageMetrics
    ) -> float:
        """Calculate overall efficiency score"""
        # Weighted combination of different metrics
        coverage_weight = 0.4
        balance_weight = 0.3
        utilization_weight = 0.3
        
        # Average utilization percentage
        if staff_utilization:
            avg_utilization = sum(
                metrics.utilization_percentage 
                for metrics in staff_utilization.values()
            ) / len(staff_utilization)
        else:
            avg_utilization = 0
        
        efficiency_score = (
            coverage_metrics.coverage_percentage * coverage_weight +
            workload_balance.balance_score * balance_weight +
            avg_utilization * utilization_weight
        )
        
        return round(efficiency_score, 2)
    
    def _generate_recommendations(
        self,
        staff_utilization: Dict[str, StaffUtilizationMetrics],
        workload_balance: WorkloadBalanceMetrics,
        coverage_metrics: CoverageMetrics
    ) -> List[str]:
        """Generate actionable recommendations based on analytics"""
        recommendations = []
        
        # Coverage recommendations
        if coverage_metrics.coverage_percentage < 80:
            recommendations.append(
                f"Coverage is only {coverage_metrics.coverage_percentage}%. "
                "Consider hiring additional staff or adjusting shift requirements."
            )
        
        if len(coverage_metrics.low_coverage_days) > 3:
            recommendations.append(
                f"{len(coverage_metrics.low_coverage_days)} days have low coverage. "
                "Review staffing patterns for these dates."
            )
        
        # Workload balance recommendations
        if workload_balance.balance_score < 70:
            recommendations.append(
                "Workload distribution is uneven. Consider redistributing shifts "
                f"to balance assignments (current balance score: {workload_balance.balance_score})."
            )
        
        if workload_balance.standard_deviation > 2:
            recommendations.append(
                "High variation in staff assignments detected. "
                f"{workload_balance.most_utilized_staff} is overutilized while "
                f"{workload_balance.least_utilized_staff} is underutilized."
            )
        
        # Staff utilization recommendations
        overutilized_staff = [
            metrics.name for metrics in staff_utilization.values()
            if metrics.workload_score > 80
        ]
        
        if overutilized_staff:
            recommendations.append(
                f"Staff members {', '.join(overutilized_staff)} may be overutilized. "
                "Consider redistributing their workload."
            )
        
        underutilized_staff = [
            metrics.name for metrics in staff_utilization.values()
            if metrics.workload_score < 30 and metrics.total_shifts > 0
        ]
        
        if underutilized_staff:
            recommendations.append(
                f"Staff members {', '.join(underutilized_staff)} are underutilized. "
                "Consider assigning them additional shifts."
            )
        
        # Shift distribution recommendations
        shift_counts = {}
        for metrics in staff_utilization.values():
            for shift_type, count in metrics.shifts_by_type.items():
                shift_counts[shift_type] = shift_counts.get(shift_type, 0) + count
        
        if shift_counts:
            min_shift_count = min(shift_counts.values())
            max_shift_count = max(shift_counts.values())
            
            if max_shift_count - min_shift_count > len(staff_utilization) * 2:
                recommendations.append(
                    "Shift distribution is uneven across different times of day. "
                    "Consider balancing morning, afternoon, and evening assignments."
                )
        
        return recommendations[:5]  # Limit to top 5 recommendations
    
    def _empty_analytics(
        self, 
        facility_id: str, 
        start_date: date, 
        end_date: date
    ) -> ScheduleAnalytics:
        """Return empty analytics when no data is available"""
        return ScheduleAnalytics(
            facility_id=facility_id,
            period={"start": start_date.isoformat(), "end": end_date.isoformat()},
            total_schedules=0,
            total_assignments=0,
            staff_utilization={},
            shift_distribution={'0': 0, '1': 0, '2': 0},
            role_distribution={},
            workload_balance=WorkloadBalanceMetrics(
                balance_score=0,
                average_shifts_per_staff=0,
                standard_deviation=0,
                most_utilized_staff="N/A",
                least_utilized_staff="N/A"
            ),
            coverage_metrics=CoverageMetrics(
                coverage_percentage=0,
                total_days=(end_date - start_date).days + 1,
                days_with_assignments=0,
                shifts_per_day_average=0,
                peak_coverage_day="N/A",
                low_coverage_days=[]
            ),
            efficiency_score=0,
            recommendations=["No schedule data available for the selected period."]
        )

# app/services/conflict_detector.py

from typing import List, Dict, Any, Tuple
from datetime import datetime, date, timedelta
from sqlmodel import Session, select
from uuid import UUID

from ..models import (
    Schedule, ShiftAssignment, Staff, StaffUnavailability, 
    ScheduleConfig, Facility
)
from ..schemas import SchedulingConflict, ConflictCheckResult

class ConflictDetector:
    """Service for detecting scheduling conflicts and constraint violations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_facility_conflicts(
        self, 
        facility_id: str, 
        week_start: date,
        schedule_id: Optional[str] = None
    ) -> ConflictCheckResult:
        """Check for conflicts in a facility for a given week"""
        
        # Get existing schedule for this week
        existing_schedule = self._get_schedule_for_week(facility_id, week_start)
        
        if not existing_schedule:
            return ConflictCheckResult(
                facility_id=UUID(facility_id),
                week_start=week_start.isoformat(),
                has_conflicts=False,
                conflicts=[],
                existing_schedule_id=None,
                total_assignments=0,
                conflicted_assignments=0
            )
        
        # Get assignments and staff data
        assignments_data = self._get_assignments_with_staff(existing_schedule.id)
        
        # Get facility constraints
        schedule_config = self._get_schedule_config(facility_id)
        
        # Get staff unavailability
        unavailability_data = self._get_staff_unavailability(
            facility_id, week_start, week_start + timedelta(days=6)
        )
        
        # Detect various types of conflicts
        conflicts = []
        
        # Check constraint violations
        constraint_conflicts = self._check_constraint_violations(
            assignments_data, schedule_config
        )
        conflicts.extend(constraint_conflicts)
        
        # Check availability conflicts
        availability_conflicts = self._check_availability_conflicts(
            assignments_data, unavailability_data, week_start
        )
        conflicts.extend(availability_conflicts)
        
        # Check double bookings
        double_booking_conflicts = self._check_double_bookings(assignments_data)
        conflicts.extend(double_booking_conflicts)
        
        # Check skill mismatches
        skill_conflicts = self._check_skill_mismatches(
            assignments_data, schedule_config
        )
        conflicts.extend(skill_conflicts)
        
        return ConflictCheckResult(
            facility_id=UUID(facility_id),
            week_start=week_start.isoformat(),
            has_conflicts=len(conflicts) > 0,
            conflicts=conflicts,
            existing_schedule_id=existing_schedule.id,
            total_assignments=len(assignments_data),
            conflicted_assignments=len(set(
                self._get_assignment_id(assignment) 
                for conflict in conflicts 
                for assignment in assignments_data
                if self._conflict_affects_assignment(conflict, assignment)
            ))
        )
    
    def _get_schedule_for_week(self, facility_id: str, week_start: date) -> Optional[Schedule]:
        """Get the schedule for a specific week"""
        return self.db.exec(
            select(Schedule).where(
                Schedule.facility_id == facility_id,
                Schedule.week_start == week_start
            )
        ).first()
    
    def _get_assignments_with_staff(self, schedule_id: UUID) -> List[Tuple]:
        """Get assignments with staff information"""
        return self.db.exec(
            select(ShiftAssignment, Staff).join(Staff).where(
                ShiftAssignment.schedule_id == schedule_id
            )
        ).all()
    
    def _get_schedule_config(self, facility_id: str) -> Optional[ScheduleConfig]:
        """Get schedule configuration for facility"""
        return self.db.exec(
            select(ScheduleConfig).where(
                ScheduleConfig.facility_id == facility_id
            )
        ).first()
    
    def _get_staff_unavailability(
        self, 
        facility_id: str, 
        start_date: date, 
        end_date: date
    ) -> List[Tuple]:
        """Get staff unavailability for the period"""
        return self.db.exec(
            select(StaffUnavailability, Staff).join(Staff).where(
                Staff.facility_id == facility_id,
                StaffUnavailability.start <= end_date,
                StaffUnavailability.end >= start_date
            )
        ).all()
    
    def _check_constraint_violations(
        self, 
        assignments_data: List[Tuple], 
        config: Optional[ScheduleConfig]
    ) -> List[SchedulingConflict]:
        """Check for scheduling constraint violations"""
        conflicts = []
        
        if not config:
            return conflicts
        
        # Group assignments by staff
        staff_assignments = {}
        for assignment, staff in assignments_data:
            staff_id = str(staff.id)
            if staff_id not in staff_assignments:
                staff_assignments[staff_id] = {
                    'staff': staff,
                    'assignments': []
                }
            staff_assignments[staff_id]['assignments'].append(assignment)
        
        # Check each staff member's assignments
        for staff_id, data in staff_assignments.items():
            staff = data['staff']
            assignments = data['assignments']
            
            # Check maximum consecutive days
            consecutive_violations = self._check_consecutive_days(
                assignments, config.max_consecutive_days, staff
            )
            conflicts.extend(consecutive_violations)
            
            # Check maximum weekly hours
            hours_violations = self._check_weekly_hours(
                assignments, config.max_weekly_hours, staff
            )
            conflicts.extend(hours_violations)
            
            # Check rest hours between shifts
            rest_violations = self._check_rest_hours(
                assignments, config.min_rest_hours, staff
            )
            conflicts.extend(rest_violations)
        
        return conflicts
    
    def _check_consecutive_days(
        self, 
        assignments: List[ShiftAssignment], 
        max_consecutive: int, 
        staff: Staff
    ) -> List[SchedulingConflict]:
        """Check for consecutive days violations"""
        conflicts = []
        
        # Group assignments by day
        days_worked = set(assignment.day for assignment in assignments)
        
        # Find consecutive sequences
        sorted_days = sorted(days_worked)
        consecutive_count = 1
        
        for i in range(1, len(sorted_days)):
            if sorted_days[i] == sorted_days[i-1] + 1:
                consecutive_count += 1
                if consecutive_count > max_consecutive:
                    conflicts.append(SchedulingConflict(
                        conflict_type="consecutive_days",
                        severity="major",
                        staff_id=staff.id,
                        staff_name=staff.full_name,
                        day=sorted_days[i],
                        shift=0,  # Generic
                        message=f"{staff.full_name} works {consecutive_count} consecutive days, exceeding limit of {max_consecutive}",
                        auto_resolvable=True,
                        resolution_suggestions=[
                            f"Remove assignment on day {sorted_days[i]}",
                            "Redistribute workload to other staff"
                        ]
                    ))
            else:
                consecutive_count = 1
        
        return conflicts
    
    def _check_weekly_hours(
        self, 
        assignments: List[ShiftAssignment], 
        max_hours: int, 
        staff: Staff
    ) -> List[SchedulingConflict]:
        """Check for weekly hours violations"""
        conflicts = []
        
        # Assuming 8 hours per shift (this should be configurable)
        hours_per_shift = 8
        total_hours = len(assignments) * hours_per_shift
        
        if total_hours > max_hours:
            conflicts.append(SchedulingConflict(
                conflict_type="overtime",
                severity="major" if total_hours > max_hours * 1.2 else "minor",
                staff_id=staff.id,
                staff_name=staff.full_name,
                day=0,  # Generic
                shift=0,  # Generic
                message=f"{staff.full_name} scheduled for {total_hours} hours, exceeding limit of {max_hours}",
                auto_resolvable=True,
                resolution_suggestions=[
                    f"Remove {len(assignments) - (max_hours // hours_per_shift)} shifts",
                    "Redistribute excess shifts to other staff"
                ]
            ))
        
        return conflicts
    
    def _check_rest_hours(
        self, 
        assignments: List[ShiftAssignment], 
        min_rest: int, 
        staff: Staff
    ) -> List[SchedulingConflict]:
        """Check for rest hours violations"""
        conflicts = []
        
        # Sort assignments by day and shift
        sorted_assignments = sorted(assignments, key=lambda a: (a.day, a.shift))
        
        for i in range(1, len(sorted_assignments)):
            prev_assignment = sorted_assignments[i-1]
            curr_assignment = sorted_assignments[i]
            
            # Check if assignments are on consecutive days or same day
            if curr_assignment.day == prev_assignment.day + 1:
                # Check if there's enough rest between shifts
                # This is simplified - in reality, you'd need actual shift times
                if prev_assignment.shift == 2 and curr_assignment.shift == 0:  # Evening to morning
                    # Assume this violates rest hours
                    conflicts.append(SchedulingConflict(
                        conflict_type="insufficient_rest",
                        severity="major",
                        staff_id=staff.id,
                        staff_name=staff.full_name,
                        day=curr_assignment.day,
                        shift=curr_assignment.shift,
                        message=f"{staff.full_name} has insufficient rest between evening and morning shifts",
                        auto_resolvable=True,
                        resolution_suggestions=[
                            "Remove one of the conflicting shifts",
                            "Assign to different staff member"
                        ]
                    ))
        
        return conflicts
    
    def _check_availability_conflicts(
        self, 
        assignments_data: List[Tuple], 
        unavailability_data: List[Tuple],
        week_start: date
    ) -> List[SchedulingConflict]:
        """Check for staff availability conflicts"""
        conflicts = []
        
        # Create unavailability lookup
        staff_unavailable = {}
        for unavailability, staff in unavailability_data:
            staff_id = str(staff.id)
            if staff_id not in staff_unavailable:
                staff_unavailable[staff_id] = []
            staff_unavailable[staff_id].append(unavailability)
        
        # Check each assignment against unavailability
        for assignment, staff in assignments_data:
            staff_id = str(staff.id)
            assignment_date = week_start + timedelta(days=assignment.day)
            
            if staff_id in staff_unavailable:
                for unavailability in staff_unavailable[staff_id]:
                    # Check if assignment overlaps with unavailability
                    if (unavailability.start.date() <= assignment_date <= 
                        unavailability.end.date()):
                        
                        conflicts.append(SchedulingConflict(
                            conflict_type="unavailable",
                            severity="critical",
                            staff_id=staff.id,
                            staff_name=staff.full_name,
                            day=assignment.day,
                            shift=assignment.shift,
                            message=f"{staff.full_name} is unavailable on {assignment_date} but is scheduled to work",
                            auto_resolvable=True,
                            resolution_suggestions=[
                                "Remove this assignment",
                                "Assign to available staff member"
                            ]
                        ))
        
        return conflicts
    
    def _check_double_bookings(
        self, 
        assignments_data: List[Tuple]
    ) -> List[SchedulingConflict]:
        """Check for double booking conflicts"""
        conflicts = []
        
        # Group assignments by staff, day, and shift
        assignment_groups = {}
        for assignment, staff in assignments_data:
            key = (str(staff.id), assignment.day, assignment.shift)
            if key not in assignment_groups:
                assignment_groups[key] = []
            assignment_groups[key].append((assignment, staff))
        
        # Find groups with multiple assignments
        for (staff_id, day, shift), group in assignment_groups.items():
            if len(group) > 1:
                staff = group[0][1]  # Get staff from first assignment
                conflicts.append(SchedulingConflict(
                    conflict_type="double_booking",
                    severity="critical",
                    staff_id=staff.id,
                    staff_name=staff.full_name,
                    day=day,
                    shift=shift,
                    message=f"{staff.full_name} is double-booked on day {day}, shift {shift}",
                    auto_resolvable=True,
                    resolution_suggestions=[
                        f"Remove {len(group) - 1} duplicate assignments",
                        "Reassign to different staff members"
                    ]
                ))
        
        return conflicts
    
    def _check_skill_mismatches(
        self, 
        assignments_data: List[Tuple], 
        config: Optional[ScheduleConfig]
    ) -> List[SchedulingConflict]:
        """Check for skill level mismatches"""
        conflicts = []
        
        if not config or not config.shift_role_requirements:
            return conflicts
        
        shift_requirements = config.shift_role_requirements
        
        for assignment, staff in assignments_data:
            shift_key = str(assignment.shift)
            if shift_key in shift_requirements:
                requirements = shift_requirements[shift_key]
                
                # Check required roles
                required_roles = requirements.get('required_roles', [])
                if required_roles and staff.role not in required_roles:
                    conflicts.append(SchedulingConflict(
                        conflict_type="skill_mismatch",
                        severity="minor",
                        staff_id=staff.id,
                        staff_name=staff.full_name,
                        day=assignment.day,
                        shift=assignment.shift,
                        message=f"{staff.full_name} ({staff.role}) doesn't match required roles {required_roles} for shift {assignment.shift}",
                        auto_resolvable=True,
                        resolution_suggestions=[
                            "Assign staff member with required role",
                            "Update role requirements for this shift"
                        ]
                    ))
                
                # Check minimum skill level
                min_skill = requirements.get('min_skill_level', 1)
                if staff.skill_level < min_skill:
                    conflicts.append(SchedulingConflict(
                        conflict_type="skill_mismatch",
                        severity="minor",
                        staff_id=staff.id,
                        staff_name=staff.full_name,
                        day=assignment.day,
                        shift=assignment.shift,
                        message=f"{staff.full_name} (skill level {staff.skill_level}) below required level {min_skill} for shift {assignment.shift}",
                        auto_resolvable=False,
                        resolution_suggestions=[
                            "Assign higher-skilled staff member",
                            "Provide additional training"
                        ]
                    ))
        
        return conflicts
    
    def _get_assignment_id(self, assignment: Tuple) -> str:
        """Get assignment ID from tuple"""
        return str(assignment[0].id)  # assignment is (ShiftAssignment, Staff)
    
    def _conflict_affects_assignment(
        self, 
        conflict: SchedulingConflict, 
        assignment: Tuple
    ) -> bool:
        """Check if a conflict affects a specific assignment"""
        assignment_obj, staff = assignment
        return (
            conflict.staff_id == staff.id and
            conflict.day == assignment_obj.day and
            conflict.shift == assignment_obj.shift
        )