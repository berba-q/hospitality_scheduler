export interface Staff {
  id: string;
  full_name: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  skill_level?: number; // Skill level rating (1-5)
  isActive: boolean;
  is_active?: boolean; // Alias for compatibility
  created_at?: string;
  updated_at?: string;
}

// Assignment for schedules
export interface ScheduleAssignment {
  id: string;
  schedule_id: string;
  staff_id: string;
  day: number; // 0-6 for days of week
  shift: number; // shift index
  shift_index?: number;
  shift_id?: number | string;
  zone_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Full schedule with assignments
export interface Schedule {
  id: string;
  facility_id: string;
  week_start: string; // ISO date string
  week_end: string;
  status: 'draft' | 'published' | 'archived';
  assignments?: ScheduleAssignment[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  name?: string;
}

// Schedule configuration for facilities
export interface ScheduleConfig {
  min_rest_hours: number;
  max_consecutive_days: number;
  max_weekly_hours: number;
  min_staff_per_shift: number;
  max_staff_per_shift: number;
  require_manager_per_shift: boolean;
  shift_role_requirements: Record<string, ShiftRoleRequirement>;
  allow_overtime: boolean;
  weekend_restrictions: boolean;
}

export interface ShiftRoleRequirement {
  required_roles: string[];
  min_skill_level: number;
}

// Generation config for schedule generation
export interface ScheduleGenerationConfig {
  use_constraints: boolean;
  auto_assign_by_zone: boolean;
  balance_workload: boolean;
  prioritize_skill_match: boolean;
  min_staff_per_shift: number;
  max_staff_per_shift: number;
  require_manager_per_shift: boolean;
  allow_overtime: boolean;
  coverage_priority: 'minimal' | 'balanced' | 'maximum';
  shift_preferences?: {
    morning_multiplier: number;
    afternoon_multiplier: number;
    evening_multiplier: number;
  };
  zone_assignments?: Record<string, ZoneAssignment>;
  role_mapping?: Record<string, string[]>;
}

export interface ZoneAssignment {
  required_staff: number | { min: number; max: number }; // Can be either a number or range
  assigned_roles: string[];
  priority: 'low' | 'medium' | 'high';
  coverage_hours: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
}

// Staff unavailability
export interface StaffUnavailability {
  id: string;
  staff_id: string;
  start: string; // ISO datetime string
  end: string; // ISO datetime string
  reason?: string;
  is_recurring: boolean;
  staff?: {
    id: string;
    full_name: string;
    role: string;
    email: string;
  };
  created_at?: string;
  updated_at?: string;
}

// Schedule list item for display
export interface ScheduleListItem {
  id: string;
  name: string;
  week_start: string;
  week_end: string;
  status: 'draft' | 'published' | 'archived';
  facility_id: string;
  assignments_count?: number;
  created_at: string;
  updated_at?: string;
}