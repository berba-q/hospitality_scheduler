// src/types/facility.ts
// Centralized type definitions for facility management

// ==================== CORE ENTITY TYPES ====================

export interface FacilityShift {
  id: string
  facility_id: string
  shift_name: string
  start_time: string // "07:00" format
  end_time: string   // "15:00" format
  requires_manager: boolean
  min_staff: number
  max_staff: number
  shift_order: number
  is_active: boolean
  color?: string
  created_at: string
  updated_at?: string
}

export interface FacilityRole {
  id: string
  facility_id: string
  role_name: string
  min_skill_level: number
  max_skill_level: number
  is_management: boolean
  hourly_rate_min?: number
  hourly_rate_max?: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface FacilityZone {
  id: string
  facility_id: string
  zone_id: string
  zone_name: string
  description?: string
  required_roles: string[]
  preferred_roles: string[]
  min_staff_per_shift: number
  max_staff_per_shift: number
  is_active: boolean
  display_order: number
  created_at: string
  updated_at?: string
}

export interface Facility {
  id: string
  tenant_id: string
  name: string
  location?: string
  facility_type: string
  address?: string
  phone?: string
  email?: string
  description?: string
  shifts: FacilityShift[]
  roles: FacilityRole[]
  zones: FacilityZone[]
  staff_count: number
  active_schedules: number
  created_at: string
  updated_at?: string
}

// ==================== INPUT TYPES ====================

export interface CreateFacilityInput {
  name: string
  location?: string
  facility_type?: string
  address?: string
  phone?: string
  email?: string
  description?: string
}

export interface UpdateFacilityInput {
  name?: string
  location?: string
  facility_type?: string
  address?: string
  phone?: string
  email?: string
  description?: string
}

export interface CreateRoleInput {
  role_name: string
  min_skill_level?: number
  max_skill_level?: number
  is_management?: boolean
  hourly_rate_min?: number
  hourly_rate_max?: number
}

export interface UpdateRoleInput {
  role_name?: string
  min_skill_level?: number
  max_skill_level?: number
  is_management?: boolean
  hourly_rate_min?: number
  hourly_rate_max?: number
  is_active?: boolean
}

export interface CreateZoneInput {
  zone_id: string
  zone_name: string
  description?: string
  required_roles?: string[]
  preferred_roles?: string[]
  min_staff_per_shift?: number
  max_staff_per_shift?: number
  display_order?: number
}

export interface UpdateZoneInput {
  zone_id?: string
  zone_name?: string
  description?: string
  required_roles?: string[]
  preferred_roles?: string[]
  min_staff_per_shift?: number
  max_staff_per_shift?: number
  is_active?: boolean
  display_order?: number
}

export interface CreateShiftInput {
  shift_name: string
  start_time: string
  end_time: string
  requires_manager?: boolean
  min_staff?: number
  max_staff?: number
  shift_order?: number
  color?: string
}

export interface UpdateShiftInput {
  shift_name?: string
  start_time?: string
  end_time?: string
  requires_manager?: boolean
  min_staff?: number
  max_staff?: number
  shift_order?: number
  is_active?: boolean
  color?: string
}

export interface BulkShiftUpdateInput {
  shift_name: string
  start_time: string
  end_time: string
  requires_manager?: boolean
  min_staff?: number
  max_staff?: number
  shift_order?: number
  color?: string
}


// ==================== ERROR TYPES ====================

export interface ApiError extends Error {
  response?: {
    data?: {
      detail?: string
    }
  }
}

// ==================== UTILITY FUNCTIONS ====================

export const handleApiError = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error) {
    const apiError = error as ApiError
    return apiError.response?.data?.detail || apiError.message || fallbackMessage
  }
  return fallbackMessage
}

// ==================== IMPORT/DUPLICATE CHECKING TYPES ====================
export interface DuplicateMatch {
  id: string
  name: string
  address?: string
  phone?: string
  similarity_score?: number
}

export interface DuplicateInfo {
  has_any_duplicates: boolean
  severity: 'none' | 'warning' | 'error'
  exact_name_match?: DuplicateMatch
  similar_names?: DuplicateMatch[]
  address_matches?: DuplicateMatch[]
  phone_matches?: DuplicateMatch[]
  email_matches?: DuplicateMatch[]
}

export interface FacilityWarning {
  facility_name: string
  severity: 'none' | 'warning' | 'error'
  duplicate_info: DuplicateInfo
}

// Result structure for facility import operations
export interface FacilityImportResult {
  total_processed: number
  successful_imports: number
  skipped_duplicates: number
  validation_errors: number
  created_entities: Facility[]
  skipped_entities: Facility[]
  error_entities: Array<{
    data: Facility
    error: string
  }>
  duplicate_warnings: FacilityWarning[]  // Facility-specific warning structure
  processing_details: Record<string, unknown>
}

// Enhanced ParsedFacility for import UI
export interface ParsedFacility extends CreateFacilityInput {
  valid: boolean
  errors: string[]
  duplicateInfo?: DuplicateInfo
  hasDuplicates?: boolean
  duplicateSeverity?: 'none' | 'warning' | 'error'
  canImport?: boolean
  forceCreate?: boolean
  rowIndex?: number
}

// ==================== TYPE GUARDS ====================

export const isFacility = (obj: unknown): obj is Facility => {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj && 'facility_type' in obj
}

export const isFacilityShift = (obj: unknown): obj is FacilityShift => {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'shift_name' in obj && 'start_time' in obj
}

export const isFacilityRole = (obj: unknown): obj is FacilityRole => {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'role_name' in obj && 'min_skill_level' in obj
}

export const isFacilityZone = (obj: unknown): obj is FacilityZone => {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'zone_name' in obj && 'zone_id' in obj
}