// API client to communicate with the backend server
// Api client implemtation for backend communication
import { SwapStatus, SwapUrgency } from '@/types/swaps'

export interface ApiConfig {
  baseUrl: string
  headers?: Record<string, string>
}

export interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf'
  dateRange: {
    from?: Date
    to?: Date
  }
  facilities: string[]
  includeFields: {
    staffDetails: boolean
    timestamps: boolean
    notes: boolean
    history: boolean
  }
  filters: {
    status?: SwapStatus[]
    urgency?: SwapUrgency[]
    swapType?: string[]
  }
}

export interface WorkflowStatus {
  current_status: SwapStatus
  next_action_required: string
  next_action_by: 'manager' | 'staff' | 'system'
  can_execute: boolean
  blocking_reasons: string[]
  estimated_completion?: string
}

export interface SwapValidationResult {
  is_valid: boolean
  errors: Array<{
    error_code: string
    error_message: string
    field?: string
    suggested_fix?: string
  }>
  warnings: string[]
  role_verification_passed: boolean
  zone_requirements_met: boolean
  skill_requirements_met: boolean
  staff_available: boolean
  no_conflicts: boolean
  within_work_limits: boolean
}

export interface SwapSummary {
  facility_id: string
  pending_swaps: number
  manager_approval_needed: number
  potential_assignments: number
  staff_responses_needed: number
  manager_final_approval_needed: number
  urgent_swaps: number
  auto_swaps_needing_assignment: number
  specific_swaps_awaiting_response: number
  recent_completions: number
  role_compatible_assignments: number
  role_override_assignments: number
  failed_role_verifications: number
  average_approval_time_hours?: number
  average_staff_response_time_hours?: number
  pending_over_24h: number
}

export class ApiClient {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers,
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    
    const url = `${this.config.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error ${response.status}: ${error}`)
    }

    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
      return {} as T
    }

    try {
      return response.json()
    } catch {
      return {} as T
    }
  }

  private async requestWithParams<T>(
    endpoint: string,
    options: RequestInit & { params?: Record<string, string> } = {}
  ): Promise<T> {
    const { params, ...requestOptions } = options
    
    let url = `${this.config.baseUrl}${endpoint}`
    
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value)
        }
      })
      
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }
    
    const response = await fetch(url, {
      ...requestOptions,
      headers: {
        ...this.getHeaders(),
        ...requestOptions.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error ${response.status}: ${error}`)
    }

    if (response.status === 204) {
      return {} as T
    }

    try {
      return response.json()
    } catch {
      return {} as T
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)

    const response = await fetch(`${this.config.baseUrl}/v1/auth/login`, {
      method: 'POST',
      body: formData,
      headers: {
        ...this.config.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error ${response.status}: ${error}`)
    }

    return response.json() as Promise<{ access_token: string; token_type: string }>
  }

  async signup(email: string, password: string, tenantName: string) {
    return this.request<any>('/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenant_name: tenantName }),
    })
  }

  //============= Facilities =============================================
  async getFacilities(includeDetails: boolean = true, facilityType?: string, includeInactive: boolean = false) {
    const params = new URLSearchParams()
    if (includeDetails !== undefined) params.append('include_details', includeDetails.toString())
    if (facilityType) params.append('facility_type', facilityType)
    if (includeInactive) params.append('include_inactive', includeInactive.toString())
    
    const queryString = params.toString()
    return this.request<any[]>(`/v1/facilities/${queryString ? `?${queryString}` : ''}`)
  }

  async getFacility(facilityId: string) {
    return this.request<any>(`/v1/facilities/${facilityId}`)
  }

  async getFacilityStaff(facilityId: string) {
    return this.request<any[]>(`/v1/facilities/${facilityId}/staff`)
  }

  async createFacility(facilityData: {
    name: string
    location?: string
    facility_type?: string
    address?: string
    phone?: string
    email?: string
    description?: string
  }) {
    return this.request<any>('/v1/facilities/', {
      method: 'POST',
      body: JSON.stringify(facilityData),
    })
  }

  async updateFacility(facilityId: string, facilityData: {
    name?: string
    location?: string
    facility_type?: string
    address?: string
    phone?: string
    email?: string
    description?: string
  }) {
    return this.request<any>(`/v1/facilities/${facilityId}`, {
      method: 'PUT',
      body: JSON.stringify(facilityData),
    })
  }

  async validateFacilityDeletion(facilityId: string) {
    return this.request<{
      can_delete: boolean
      active_staff_count: number
      active_schedules_count: number
      pending_swaps_count: number
      errors: string[]
      warnings: string[]
    }>(`/v1/facilities/${facilityId}/validate`, {
      method: 'DELETE',
    })
  }

  async deleteFacility(facilityId: string, force: boolean = false) {
    const params = force ? '?force=true' : ''
    return this.request<{
      success: boolean
      message: string
      deleted_id: string
      entity_type: string
      affected_staff_count: number
      affected_schedules_count: number
    }>(`/v1/facilities/${facilityId}${params}`, {
      method: 'DELETE',
    })
  }

  async softDeleteFacility(facilityId: string, options: {
    reason?: string
    deactivate_related?: boolean
    notify_affected_users?: boolean
  }) {
    return this.request<{
      success: boolean
      message: string
      deactivated_id: string
      related_deactivations: Array<{type: string, count: number}>
    }>(`/v1/facilities/${facilityId}/soft-delete`, {
      method: 'POST',
      body: JSON.stringify(options),
    })
  }

  // ==================== SHIFT MANAGEMENT ====================

  async getFacilityShifts(facilityId: string, includeInactive: boolean = false) {
    return this.request<any[]>(`/v1/facilities/${facilityId}/shifts/for-scheduling`)
  }

  async createFacilityShift(facilityId: string, shiftData: {
    shift_name: string
    start_time: string
    end_time: string
    requires_manager?: boolean
    min_staff?: number
    max_staff?: number
    shift_order?: number
    color?: string
  }) {
    return this.request<any>(`/v1/facilities/${facilityId}/shifts`, {
      method: 'POST',
      body: JSON.stringify({
        facility_id: facilityId,
        ...shiftData
      }),
    })
  }

  async updateFacilityShift(facilityId: string, shiftId: string, shiftData: {
    shift_name?: string
    start_time?: string
    end_time?: string
    requires_manager?: boolean
    min_staff?: number
    max_staff?: number
    shift_order?: number
    is_active?: boolean
    color?: string
  }) {
    return this.request<any>(`/v1/facilities/${facilityId}/shifts/${shiftId}`, {
      method: 'PUT',
      body: JSON.stringify(shiftData),
    })
  }

  async updateFacilityShiftsBulk(facilityId: string, shifts: Array<{
    shift_name: string
    start_time: string
    end_time: string
    requires_manager?: boolean
    min_staff?: number
    max_staff?: number
    shift_order?: number
    color?: string
  }>) {
    return this.request<any[]>(`/v1/facilities/${facilityId}/shifts/bulk`, {
      method: 'PUT',
      body: JSON.stringify({
        facility_id: facilityId,
        shifts
      }),
    })
  }

  async validateShiftDeletion(facilityId: string, shiftId: string) {
    return this.request<{
      can_delete: boolean
      is_last_shift: boolean
      future_assignments_count: number
      shift_requirements_count: number
      errors: string[]
    }>(`/v1/facilities/${facilityId}/shifts/${shiftId}/validate`, {
      method: 'DELETE',
    })
  }

  async deleteFacilityShift(facilityId: string, shiftId: string, softDelete: boolean = true) {
    const params = `?soft_delete=${softDelete}`
    return this.request<{
      success: boolean
      message: string
      deleted_id: string
      entity_type: string
      remaining_shifts_count: number
      affected_assignments_count: number
    }>(`/v1/facilities/${facilityId}/shifts/${shiftId}${params}`, {
      method: 'DELETE',
    })
  }

  // ==================== ROLE MANAGEMENT ====================

  async getFacilityRoles(facilityId: string, includeInactive: boolean = false) {
    const params = includeInactive ? '?include_inactive=true' : ''
    return this.request<any[]>(`/v1/facilities/${facilityId}/roles${params}`)
  }

  async createFacilityRole(facilityId: string, roleData: {
    role_name: string
    min_skill_level?: number
    max_skill_level?: number
    is_management?: boolean
    hourly_rate_min?: number
    hourly_rate_max?: number
  }) {
    return this.request<any>(`/v1/facilities/${facilityId}/roles`, {
      method: 'POST',
      body: JSON.stringify({
        facility_id: facilityId,
        ...roleData
      }),
    })
  }

  async updateFacilityRole(facilityId: string, roleId: string, roleData: {
    role_name?: string
    min_skill_level?: number
    max_skill_level?: number
    is_management?: boolean
    hourly_rate_min?: number
    hourly_rate_max?: number
    is_active?: boolean
  }) {
    return this.request<any>(`/v1/facilities/${facilityId}/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    })
  }

  async updateFacilityRolesBulk(facilityId: string, roles: Array<{
    role_name: string
    min_skill_level?: number
    max_skill_level?: number
    is_management?: boolean
    hourly_rate_min?: number
    hourly_rate_max?: number
  }>) {
    return this.request<any[]>(`/v1/facilities/${facilityId}/roles/bulk`, {
      method: 'PUT',
      body: JSON.stringify({
        facility_id: facilityId,
        roles
      }),
    })
  }

  async deleteFacilityRole(facilityId: string, roleId: string) {
    return this.request<any>(`/v1/facilities/${facilityId}/roles/${roleId}`, {
      method: 'DELETE',
    })
  }

  // ==================== ZONE MANAGEMENT ====================

  async getFacilityZones(facilityId: string, includeInactive: boolean = false) {
    const params = includeInactive ? '?include_inactive=true' : ''
    return this.request<any[]>(`/v1/facilities/${facilityId}/zones${params}`)
  }

  async createFacilityZone(facilityId: string, zoneData: {
    zone_id: string
    zone_name: string
    description?: string
    required_roles?: string[]
    preferred_roles?: string[]
    min_staff_per_shift?: number
    max_staff_per_shift?: number
    display_order?: number
  }) {
    return this.request<any>(`/v1/facilities/${facilityId}/zones`, {
      method: 'POST',
      body: JSON.stringify({
        facility_id: facilityId,
        ...zoneData
      }),
    })
  }

  async updateFacilityZone(facilityId: string, zoneId: string, zoneData: {
    zone_id?: string
    zone_name?: string
    description?: string
    required_roles?: string[]
    preferred_roles?: string[]
    min_staff_per_shift?: number
    max_staff_per_shift?: number
    is_active?: boolean
    display_order?: number
  }) {
    return this.request<any>(`/v1/facilities/${facilityId}/zones/${zoneId}`, {
      method: 'PUT',
      body: JSON.stringify(zoneData),
    })
  }

  async updateFacilityZonesBulk(facilityId: string, zones: Array<{
    zone_id: string
    zone_name: string
    description?: string
    required_roles?: string[]
    preferred_roles?: string[]
    min_staff_per_shift?: number
    max_staff_per_shift?: number
    display_order?: number
  }>) {
    return this.request<any[]>(`/v1/facilities/${facilityId}/zones/bulk`, {
      method: 'PUT',
      body: JSON.stringify({
        facility_id: facilityId,
        zones
      }),
    })
  }

  async deleteFacilityZone(facilityId: string, zoneId: string) {
    return this.request<any>(`/v1/facilities/${facilityId}/zones/${zoneId}`, {
      method: 'DELETE',
    })
  }

  // ==================== SCHEDULING INTEGRATION ====================

/**
 * Get shifts for scheduling (replaces hardcoded 0,1,2 system)
 * Returns shifts in the format expected by existing scheduling logic
 */
  async getShiftsForScheduling(facilityId: string) {
    return this.request<Array<{
      // New dynamic format
      id: string
      name: string
      start_time: string
      end_time: string
      requires_manager: boolean
      min_staff: number
      max_staff: number
      color: string
      
      // Legacy format for existing code
      shift_index: number
      shift_number: string
      
      // Helper properties
      duration: string
      is_overnight: boolean
      facility_id: string
    }>>(`/v1/facilities/${facilityId}/shifts/for-scheduling`)
  }

  /**
   * Get roles for scheduling with skill level mapping
   */
  async getRolesForScheduling(facilityId: string) {
    return this.request<Array<{
      id: string
      name: string
      min_skill_level: number
      max_skill_level: number
      is_management: boolean
      priority: number
      facility_id: string
    }>>(`/v1/facilities/${facilityId}/roles/for-scheduling`)
  }

  /**
   * Get zones with role requirements for scheduling
   */
  async getZonesForScheduling(facilityId: string) {
    return this.request<Array<{
      id: string
      name: string
      roles: string[]
      preferred_roles: string[]
      min_staff: number
      max_staff: number
      priority: number
      coverage_hours: {
        morning: boolean
        afternoon: boolean
        evening: boolean
      }
      facility_id: string
    }>>(`/v1/facilities/${facilityId}/zones/for-scheduling`)
  }

  // Staff Management
  async getStaff() {
    return this.request<any[]>('/v1/staff/')
  }

  async createStaff(staffData: {
    full_name: string
    email?: string
    role: string
    skill_level?: number
    phone?: string
    facility_id: string
    weekly_hours_max?: number
  }) {
    return this.request<any>('/v1/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    })
  }

  async updateStaff(staffId: string, staffData: {
    full_name?: string
    email?: string
    role?: string
    skill_level?: number
    phone?: string
    facility_id?: string
    weekly_hours_max?: number
    is_active?: boolean
  }) {
    return this.request<any>(`/v1/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    })
  }

  async deleteStaff(staffId: string) {
    return this.request<any>(`/v1/staff/${staffId}`, {
      method: 'DELETE',
    })
  }

  async checkStaffExists(name: string, facilityId: string) {
    return this.request<{ exists: boolean }>('/v1/staff/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ full_name: name, facility_id: facilityId }),
    })
  }

// ==================== STAFF ENDPOINTS ====================

// Staff Profile & Dashboard 
  async getMyStaffProfile() {
    return this.request<any>('/v1/staff/me')
  }

  async getMySchedule(startDate: string, endDate: string) {
    return this.request<any>(`/v1/staff/me/schedule?start_date=${startDate}&end_date=${endDate}`)
  }

  async getMyDashboardStats() {
    try {
      const response = await this.request<any>('/v1/staff/me/dashboard-stats')
      return response
    } catch (error: any) {
      console.error('getMyDashboardStats failed:', error)
      
      if (error.message?.includes('500') || error.message?.includes('404')) {
        console.warn('Dashboard stats endpoint failing, providing fallback data')
        
        // Return minimal fallback data structure
        return {
          current_week: { hours_scheduled: 0 },
          upcoming_shifts: [],
          swap_requests: { my_pending: 0 },
          thisWeekHours: 0,
          nextWeekHours: 0,
          upcomingShifts: [],
          pendingSwaps: 0
        }
      }
      
      throw error
    }
  }


  async getMySwapRequests(status?: SwapStatus, limit = 20) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    params.append('limit', limit.toString())
    
    const queryString = params.toString()
    const endpoint = `/v1/staff/me/swap-requests${queryString ? `?${queryString}` : ''}`
    
    try {
      return await this.request<any[]>(endpoint)
    } catch (error: any) {
      console.error('getMySwapRequests failed:', error)
      
      // If the endpoint fails completely, return empty array instead of crashing
      if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        console.warn('Staff swap requests endpoint is failing, returning empty array')
        return []
      }
      
      // Re-throw other errors
      throw error
    }
  }

  // Schedule Management
  async getFacilitySchedules(facilityId: string) {
    return this.request<any[]>(`/v1/schedule/facility/${facilityId}`)
  }

  async getSchedule(scheduleId: string) {
    return this.request<any>(`/v1/schedule/${scheduleId}`)
  }

  async generateSchedule(data: {
    facility_id: string
    week_start: string
    use_constraints?: boolean
    days?: number
    shifts_per_day?: number
    hours_per_shift?: number
  }) {
    return this.request<any>('/v1/schedule/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async generateSmartSchedule(data: {
    facility_id: string
    period_start: string
    period_type: 'daily' | 'weekly' | 'monthly'
    zones: string[]
    zone_assignments: Record<string, any>
    role_mapping: Record<string, string[]>
    use_constraints?: boolean
    auto_assign_by_zone?: boolean
    balance_workload?: boolean
    prioritize_skill_match?: boolean
    coverage_priority?: 'minimal' | 'balanced' | 'maximum'
    shift_preferences?: {
      morning_multiplier: number
      afternoon_multiplier: number
      evening_multiplier: number
    }
    total_days?: number
    shifts_per_day?: number
  }) {
    return this.request<any>('/v1/schedule/smart-generate', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async createSchedule(data: {
    facility_id: string
    week_start: string
    assignments: any[]
  }) {
    return this.request<any>('/v1/schedule/create', {  
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSchedule(scheduleId: string, data: {
    assignments?: any[]
    week_start?: string
    facility_id?: string
  }) {
    return this.request<any>(`/v1/schedule/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getDailySchedule(facilityId: string, date: string) {
    try {
      return await this.request<any>(`/v1/schedule/daily/${facilityId}?date=${date}`)
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  async getMonthlyScheduleOverview(facilityId: string, month: string, year: string) {
    return this.request<any>(`/v1/schedule/monthly/${facilityId}?month=${month}&year=${year}`)
  }

  async generateDailySchedule(data: {
    facility_id: string
    date: string
    zones: string[]
    use_constraints?: boolean
    copy_from_template?: boolean
    template_day?: string
  }) {
    return this.request<any>('/v1/schedule/generate-daily', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async generateMonthlySchedule(data: {
    facility_id: string
    month: number
    year: number
    zones: string[]
    use_constraints?: boolean
    pattern?: 'weekly_repeat' | 'rotating' | 'balanced'
    base_template?: string
  }) {
    return this.request<any>('/v1/schedule/generate-monthly', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async previewSchedule(data: {
    staff_ids: string[]
    days?: number
    shifts_per_day?: number
    hours_per_shift?: number
  }) {
    return this.request<any>('/v1/schedule/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async validateSchedule(scheduleId: string) {
    return this.request<any>(`/v1/schedule/${scheduleId}/validate`, {
      method: 'POST',
    })
  }

  async publishSchedule(scheduleId: string, notificationOptions: {
    send_whatsapp?: boolean
    send_push?: boolean
    send_email?: boolean
    generate_pdf?: boolean
    custom_message?: string
  }) {
    return this.request<any>(`/v1/schedule/${scheduleId}/publish`, {
      method: 'POST',
      body: JSON.stringify(notificationOptions)
    })
  }

  async deleteSchedule(scheduleId: string) {
    return this.request<any>(`/v1/schedule/${scheduleId}`, {
      method: 'DELETE',
    })
  }

  // acessc facility schedules
  async getFacilityScheduleSummary(facilityId: string) {
    return this.request<any>(`/v1/schedule/facility/${facilityId}/summary`)
  }

  async checkSchedulingConflicts(facilityId: string, weekStart: string) {
    return this.request<any>(`/v1/schedule/facility/${facilityId}/conflicts?week_start=${weekStart}`)
  }

  // Zone-based Scheduling
  async getZoneSchedule(facilityId: string, zoneId: string, periodStart: string, periodType: string) {
    return this.request<any>(`/v1/schedule/zone/${facilityId}/${zoneId}?period_start=${periodStart}&period_type=${periodType}`)
  }

  async assignStaffToZone(data: {
    schedule_id: string
    zone_id: string
    staff_id: string
    day: number
    shift: number
    auto_balance?: boolean
  }) {
    return this.request<any>('/v1/schedule/assign-zone', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Schedule Configuration
  async getScheduleConfig(facilityId: string) {
    try {
      return await this.request<any>(`/v1/schedule-config/config/${facilityId}`)
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  async createScheduleConfig(data: {
    facility_id: string
    min_rest_hours?: number
    max_consecutive_days?: number
    max_weekly_hours?: number
    min_staff_per_shift?: number
    max_staff_per_shift?: number
    require_manager_per_shift?: boolean
    shift_role_requirements?: Record<string, any>
    allow_overtime?: boolean
    weekend_restrictions?: boolean
  }) {
    return this.request<any>('/v1/schedule-config/config/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateScheduleConfig(facilityId: string, data: {
    min_rest_hours?: number
    max_consecutive_days?: number
    max_weekly_hours?: number
    min_staff_per_shift?: number
    max_staff_per_shift?: number
    require_manager_per_shift?: boolean
    shift_role_requirements?: Record<string, any>
    allow_overtime?: boolean
    weekend_restrictions?: boolean
  }) {
    return this.request<any>(`/v1/schedule-config/config/${facilityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getDefaultScheduleConfig(facilityId: string) {
    return this.request<any>(`/v1/schedule-config/config/${facilityId}/defaults`)
  }

  // Role Requirements
  async getRoleRequirements(facilityId: string) {
    return this.request<any>(`/v1/schedule/role-requirements/${facilityId}`)
  }

  async updateRoleRequirements(facilityId: string, data: {
    zone_role_mapping: Record<string, string[]>
    shift_requirements: Record<string, any>
    skill_requirements: Record<string, number>
  }) {
    return this.request<any>(`/v1/schedule/role-requirements/${facilityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Time off ========================
  async createTimeOffRequest(staffId: string, requestData: any) {
    const response = await this.request(`/v1/availability/staff/${staffId}/quick`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    })
    return response
  }

  async getStaffUnavailability(staffId: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await this.request(
      `/v1/availability/staff/${staffId}?${params.toString()}`
    )
    return response
  }

  async updateTimeOffRequest(unavailabilityId: string, updateData: any) {
    const response = await this.request(`/v1/availability/${unavailabilityId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
    return response
  }

  async deleteTimeOffRequest(unavailabilityId: string) {
    const response = await this.request(`/v1/availability/${unavailabilityId}`, {
      method: 'DELETE'
    })
    return response
  }

  // Swap Requests
  async getSwapRequests(facilityId?: string, status?: SwapStatus, urgency?: SwapUrgency) {
    return this.getSwapRequestsWithFilters({
      facility_id: facilityId,
      status,
      urgency
    })
  }

  async getSwapRequest(swapId: string) {
    return this.request<any>(`/v1/swaps/${swapId}`)
  }

  async getSwapRequestsWithFilters(filters: {
    facility_id?: string
    status?: SwapStatus
    urgency?: SwapUrgency
    swap_type?: string
    limit?: number
  } = {}) {
    const params = new URLSearchParams()
    
    if (filters.facility_id) params.append('facility_id', filters.facility_id)
    if (filters.status) params.append('status', filters.status)
    if (filters.urgency) params.append('urgency', filters.urgency)
    if (filters.swap_type) params.append('swap_type', filters.swap_type)
    if (filters.limit) params.append('limit', filters.limit.toString())

    const queryString = params.toString()
    const endpoint = `/v1/swaps/${queryString ? `?${queryString}` : ''}`
    
    return this.request<any[]>(endpoint)
  }

  async getAllSwapRequests(limit = 100) {
    return this.request<any[]>(`/v1/swaps/all/?limit=${limit}`)
  }

  async respondToPotentialAssignment(swapId: string, data: {
    accepted: boolean
    notes?: string
    availability_confirmed?: boolean
  }) {
    // Use the existing staff-response endpoint instead of potential-assignment-response
    return this.request<any>(`/v1/swaps/${swapId}/staff-response`, {
      method: 'PUT',
      body: JSON.stringify({
        accepted: data.accepted,
        notes: data.notes,
        confirm_availability: data.availability_confirmed || true
      }),
    })
  }
  async getSwapWorkflowStatus(swapId: string) {
    return this.request<{
      current_status: SwapStatus
      next_action_required: string
      next_action_by: 'manager' | 'staff' | 'system'
      can_execute: boolean
      blocking_reasons: string[]
      estimated_completion?: string
    }>(`/v1/swaps/${swapId}/workflow-status`)
  }

  async ManagerSwapDecision(swapId: string, data: {
    approved: boolean
    notes?: string
    notification_options?: {
      send_whatsapp?: boolean
      send_push?: boolean
      send_email?: boolean
    }
  }) {
    return this.request<any>(`/v1/swaps/${swapId}/manager-decision`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async managerFinalApproval(swapId: string, data: {
    approved: boolean
    notes?: string
    override_role_verification?: boolean
    role_override_reason?: string
  }) {
    return this.request<any>(`/v1/swaps/${swapId}/final-approval`, {
      method: 'PUT', 
      body: JSON.stringify(data),
    })
  }

  async approveSwap(swapId: string, approved: boolean, notes?: string) {
    return this.request<any>(`/v1/swaps/${swapId}/manager-decision`, {
      method: 'PUT',
      body: JSON.stringify({ approved, notes })
    })
  }

  async exportSwapReport(config: {
    format: 'csv' | 'excel' | 'pdf'
    dateRange: {
      from?: Date
      to?: Date
    }
    facilities: string[]
    includeFields: {
      staffDetails: boolean
      timestamps: boolean
      notes: boolean
      history: boolean
      roleInformation: boolean // NEW
      workflowStatus: boolean // NEW
      timingMetrics: boolean // NEW
    }
    filters: {
      status?: SwapStatus[]
      urgency?: SwapUrgency[]
      swapType?: string[]
      roleCompatibility?: 'all' | 'compatible_only' | 'overrides_only' // NEW
    }
  }) {
    const response = await fetch(`${this.config.baseUrl}/v1/swaps/export`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        format: config.format,
        filters: {
          facility_ids: config.facilities.length > 0 ? config.facilities : undefined,
          date_from: config.dateRange.from?.toISOString().split('T')[0],
          date_to: config.dateRange.to?.toISOString().split('T')[0],
          status: config.filters.status,
          urgency: config.filters.urgency,
          swap_type: config.filters.swapType,
          role_compatibility: config.filters.roleCompatibility
        },
        include_fields: config.includeFields
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to export swap report: ${response.statusText}`)
    }
    
    return response.blob()
  }


  async getSwapTrends(facilityId?: string, days = 30) {
    const params = facilityId ? `?facility_id=${facilityId}&days=${days}` : `?days=${days}`
    return this.request<any>(`/v1/swaps/trends${params}`)
  }

  async retryAutoAssignment(swapId: string, avoidStaffIds: string[] = []) {
    const params = avoidStaffIds.length > 0 
      ? '?' + avoidStaffIds.map(id => `avoid_staff_ids=${id}`).join('&')
      : ''
    
    return this.request<any>(`/v1/swaps/${swapId}/retry-auto-assignment${params}`, {
      method: 'POST'
    })
  }

  async RespondToSwap(swapId: string, data: {
    accepted: boolean
    notes?: string
    confirm_availability?: boolean
  }) {
    return this.request<any>(`/v1/swaps/${swapId}/staff-response`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async bulkApproveSwaps(data: {
    swap_ids: string[]
    approved: boolean
    notes?: string
    apply_to_similar?: boolean
    ignore_role_mismatches?: boolean
    role_override_reason?: string
  }) {
    return this.request<{
      total_processed: number
      successful: number
      failed: number
      role_verification_failures: number
      results: Array<{
        swap_id: string
        success: boolean
        error?: string
        role_issue?: string
      }>
      errors: string[]
    }>('/v1/swaps/bulk-approve', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async bulkRetryAutoAssignments(data: {
    swap_ids: string[]
    avoid_staff_ids?: string[]
    require_exact_role_match?: boolean
    allow_manager_override?: boolean
  }) {
    return this.request<{
      total_processed: number
      successful_assignments: number
      failed_assignments: number
      role_compatibility_issues: number
      results: Array<{
        swap_id: string
        success: boolean
        assigned_staff_id?: string
        assigned_staff_name?: string
        role_match_level?: string
        error?: string
      }>
    }>('/v1/swaps/bulk-retry-assignments', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

   async validateSwapRequest(data: {
    schedule_id: string
    requesting_staff_id: string
    original_day: number
    original_shift: number
    original_zone_id?: string
    swap_type: 'specific' | 'auto'
    target_staff_id?: string
    target_day?: number
    target_shift?: number
    role_verification_required?: boolean
  }) {
    return this.request<{
      is_valid: boolean
      errors: Array<{
        error_code: string
        error_message: string
        field?: string
        suggested_fix?: string
      }>
      warnings: string[]
      
      // Role validation
      role_verification_passed: boolean
      zone_requirements_met: boolean
      skill_requirements_met: boolean
      
      // Availability validation
      staff_available: boolean
      no_conflicts: boolean
      within_work_limits: boolean
    }>('/v1/swaps/validate', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getSwapConflicts(scheduleId: string, day: number, shift: number) {
    return this.request<{
      has_conflicts: boolean
      conflicts: Array<{
        conflict_type: 'double_booking' | 'unavailable' | 'overtime' | 'skill_mismatch' | 'role_incompatible'
        severity: 'critical' | 'major' | 'minor'
        staff_id: string
        staff_name: string
        message: string
        auto_resolvable: boolean
        resolution_suggestions: string[]
      }>
      alternative_suggestions: Array<{
        staff_id: string
        staff_name: string
        role: string
        compatibility_score: number
        availability: boolean
        suggestion_reason: string
      }>
    }>(`/v1/swaps/conflicts/${scheduleId}/${day}/${shift}`)
  }

  async emergencyOverride(swapId: string, reason: string, assignedStaffId?: string) {
    const params = new URLSearchParams()
    params.append('override_reason', reason)
    if (assignedStaffId) {
      params.append('assigned_staff_id', assignedStaffId)
    }
    
    return this.request<{
      message: string
      swap_id: string
      new_status: string
      override_reason: string
      executed_at: string
    }>(`/v1/swaps/${swapId}/emergency-override?${params.toString()}`, {
      method: 'POST'
    })
  }


  async getSwapHistory(swapId: string) {
    return this.request<any[]>(`/v1/swaps/${swapId}/history`)
  }

  async cleanupExpiredSwaps(dryRun: boolean = true, daysOld: number = 30) {
    return this.request<{
      dry_run: boolean
      cutoff_date: string
      old_swaps_found: number
      naturally_expired_found: number
      total_to_cleanup: number
      cleaned_up: number
      message: string
    }>('/v1/swaps/cleanup/expired', {
      method: 'POST',
      body: JSON.stringify({ dry_run: dryRun, days_old: daysOld })
    })
  }

  async exportSwapData(facilityId: string, options: {
  format: 'excel' | 'csv' | 'pdf'
  period_start?: string
  period_end?: string
  include_history?: boolean
  include_analytics?: boolean
}) {
  const params = new URLSearchParams()
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  })
  
  return this.request<{
    export_summary: any
    download_url: string
    expires_at: string
  }>(`/v1/swaps/export/${facilityId}?${params.toString()}`)
}

// 5. Health check
async getSwapHealthCheck() {
  return this.request<{
    status: 'healthy' | 'unhealthy'
    timestamp: string
    database_connected: boolean
    total_swaps_in_system: number
    pending_swaps: number
    service_version: string
    features: string[]
    error?: string
  }>('/v1/swaps/health')
}

//  Testing notifications (dev only)
async testSwapNotifications(swapId: string, notificationType: string) {
  return this.request<{
    message: string
    error?: string
  }>(`/v1/swaps/${swapId}/test-notifications`, {
    method: 'POST',
    body: JSON.stringify({ notification_type: notificationType })
  })
}

  // Global swaps
  async getGlobalSwapSummary() {
    return this.request<any>('/v1/swaps/global-summary')
  }

  // 6. Global statistics
async getGlobalSwapStatistics() {
  return this.request<{
    tenant_id: string
    generated_at: string
    total_swaps: number
    status_distribution: Record<string, { count: number; percentage: number }>
    type_distribution: {
      auto: { count: number; percentage: number }
      specific: { count: number; percentage: number }
    }
    urgency_distribution: Record<string, { count: number; percentage: number }>
    success_metrics: {
      successful_swaps: number
      failed_swaps: number
      success_rate: number
      failure_rate: number
    }
    role_statistics: {
      total_overrides: number
      override_rate: number
    }
    time_based_metrics: {
      swaps_today: number
      swaps_this_week: number
      swaps_this_month: number
    }
    data_quality: {
      complete_records: number
      records_with_notes: number
      records_with_timestamps: number
    }
  }>('/v1/swaps/statistics/global')
}

  async getFacilitiesSwapSummary() {
    return this.request<any[]>('/v1/swaps/facilities-summary')
  }

  async getFacilitySwaps(facilityId: string, options: {
    status?: SwapStatus
    urgency?: SwapUrgency
    limit?: number
  } = {}) {
    const params = new URLSearchParams()
    params.append('facility_id', facilityId)
    
    if (options.status) params.append('status', options.status)
    if (options.urgency) params.append('urgency', options.urgency)
    if (options.limit) params.append('limit', options.limit.toString())

    return this.request<any[]>(`/v1/swaps?${params.toString()}`)
  }

  async getSwapSummary(facilityId: string) {
    return this.request<{
      facility_id: string
      // Basic counts
      pending_swaps: number
      urgent_swaps: number
      recent_completions: number
      
      // Enhanced workflow counts  
      manager_approval_needed: number
      potential_assignments: number
      staff_responses_needed: number
      manager_final_approval_needed: number
      auto_swaps_needing_assignment: number
      specific_swaps_awaiting_response: number
      
      // Role verification stats
      role_compatible_assignments: number
      role_override_assignments: number
      failed_role_verifications: number
      
      // Timing metrics
      average_approval_time_hours?: number
      average_staff_response_time_hours?: number
      pending_over_24h: number
    }>(`/v1/swaps/facility/${facilityId}/summary`)
  }

  async getFacilitySwapSummary(facilityId: string) {
    return this.request<any>(`/v1/swaps/facility/${facilityId}/summary/`)
  }

  async createSwapRequest(swapData: any, notificationOptions?: {
    send_whatsapp?: boolean
    send_push?: boolean
    send_email?: boolean
    custom_message?: string
    urgency_override?: string
  }) {
    console.log('🔍 DEBUG: Creating swap request with data:', swapData)
    
    // Prepare the request payload
    const payload = {
      ...swapData,
      notification_options: notificationOptions || {
        send_whatsapp: true,
        send_push: true,
        send_email: false
      }
    }
    
    // Determine the endpoint based on swap type
    if (swapData.swap_type === 'specific') {
      console.log('🔍 DEBUG: Calling /v1/swaps/specific')
      return this.request<any>('/v1/swaps/specific', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    } else {
      console.log('🔍 DEBUG: Calling /v1/swaps/auto')
      return this.request<any>('/v1/swaps/auto', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    }
  }

  async updateSwapRequest(swapId: string, updateData: {
    reason?: string
    urgency?: 'low' | 'normal' | 'high' | 'emergency'
    expires_at?: string
    original_zone_id?: string
    requires_manager_final_approval?: boolean
    role_verification_required?: boolean
  }) {
    return this.request<any>(`/v1/swaps/${swapId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
  }

  async cancelSwapRequest(swapId: string, reason?: string) {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : ''
    return this.request<{
      message: string
    }>(`/v1/swaps/${swapId}${params}`, {
      method: 'DELETE'
    })
  }

  // ==================== ROLE VERIFICATION ENDPOINTS ====================

  // NEW: Get role compatibility check for assignment
  async checkRoleCompatibility(data: {
    facility_id: string
    zone_id: string
    staff_id: string
    original_shift_day: number
    original_shift_number: number
  }) {
    return this.request<{
      compatible: boolean
      match_level: 'exact_match' | 'compatible' | 'emergency_override' | 'incompatible'
      match_reason: string
      skill_level_compatible: boolean
      minimum_skill_required?: number
      staff_skill_level: number
      override_possible: boolean
    }>('/v1/swaps/check-role-compatibility', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // NEW: Get role audit information for a swap
  async getSwapRoleAudit(swapId: string) {
    return this.request<{
      original_shift_role?: string
      assigned_staff_role?: string  
      target_staff_role?: string
      roles_compatible: boolean
      match_level: string
      override_applied: boolean
      override_reason?: string
      skill_levels_compatible: boolean
      minimum_skill_required?: number
    }>(`/v1/swaps/${swapId}/role-audit`)
  }

  // Send notifications for swaps
  async sendSwapNotification(swapId: string, data: {
    recipient_type: 'requesting_staff' | 'target_staff' | 'assigned_staff' | 'managers'
    message: string
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    channels?: ('IN_APP' | 'PUSH' | 'WHATSAPP' | 'EMAIL')[]
    action_url?: string
    action_text?: string
  }) {
    return this.request<any>(`/v1/swaps/${swapId}/send-notification`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Helper functions for swaps
  async getAvailableSwapActions(swapId: string) {
    return this.request<{
      swap_id: string
      current_status: SwapStatus
      user_role: 'staff' | 'manager' | 'system'
      available_actions: Array<{
        action: string
        label: string
        description: string
        requires_confirmation: boolean
        endpoint: string
        method: string
      }>
      next_required_action?: {
        action: string
        required_by: 'manager' | 'staff' | 'system'
        deadline?: string
      }
    }>(`/v1/swaps/${swapId}/available-actions`)
  }

  async getSwapRecommendations(facilityId: string, data: {
    requesting_staff_id: string
    original_day: number
    original_shift: number
    zone_id?: string
    urgency?: SwapUrgency
  }) {
    return this.request<{
      facility_id: string
      recommendations: Array<{
        type: 'specific_staff' | 'role_alternative' | 'schedule_adjustment'
        priority: number
        title: string
        description: string
        staff_suggestions?: Array<{
          staff_id: string
          staff_name: string
          role: string
          compatibility_score: number
          availability_confidence: number
          reasoning: string
        }>
        action_suggestions?: Array<{
          action: string
          description: string
          estimated_success_rate: number
        }>
      }>
      success_probability: number
      estimated_resolution_time: string
    }>('/v1/swaps/recommendations', {
      method: 'POST',
      body: JSON.stringify({ facility_id: facilityId, ...data })
    })
  }
// ANALYTICS ----------------------------  

  async getSwapAnalytics(facilityId: string, options: {
    start_date?: string
    end_date?: string
    group_by?: 'day' | 'week' | 'month'
    include_role_analysis?: boolean
  } = {}) {
    const params = new URLSearchParams()
    if (options.start_date) params.append('start_date', options.start_date)
    if (options.end_date) params.append('end_date', options.end_date)
    if (options.group_by) params.append('group_by', options.group_by)
    if (options.include_role_analysis) params.append('include_role_analysis', 'true')

    const queryString = params.toString()
    return this.request<{
      facility_id: string
      period_start: string
      period_end: string
      
      // Volume metrics
      total_requests: number
      auto_requests: number
      specific_requests: number
      completed_swaps: number
      failed_swaps: number
      
      // Role analysis
      role_compatibility_rate: number
      most_requested_roles: Array<{role: string, count: number}>
      role_coverage_gaps: Array<{role: string, gap_percentage: number}>
      
      // Staff behavior
      most_helpful_staff: Array<{staff_id: string, name: string, help_count: number}>
      staff_acceptance_rates: Record<string, number>
      emergency_coverage_providers: Array<{staff_id: string, name: string, emergency_count: number}>
      
      // Timing analysis
      average_resolution_time: number
      manager_approval_time: number
      staff_response_time: number
      
      // Recommendations
      recommendations: string[]
    }>(`/v1/swaps/analytics/${facilityId}${queryString ? `?${queryString}` : ''}`)
  }

  // NEW: Get workflow timing analytics
  async getWorkflowTimingAnalytics(facilityId: string, days: number = 30) {
    return this.request<{
      facility_id: string
      analysis_period_days: number
      
      // Timing breakdowns
      average_times: {
        pending_to_manager_approval: number
        manager_approval_to_staff_response: number
        staff_response_to_execution: number
        total_resolution_time: number
      }
      
      // Bottleneck analysis
      bottlenecks: Array<{
        stage: string
        average_delay_hours: number
        frequency: number
        impact_score: number
      }>
      
      // Efficiency metrics
      same_day_completions: number
      over_24h_pending: number
      abandoned_requests: number
      
      recommendations: string[]
    }>(`/v1/swaps/analytics/${facilityId}/timing?days=${days}`)
  }

  async getSwapAnalyticsDetailed(staffId: string, period: string = '30d') {
    try {
      const response = await this.request(`/v1/analytics/staff/${staffId}/swap-analytics?period=${period}`)
      return response
    } catch (error) {
      console.warn('Swap analytics not available:', error.message)
      return {
        summary: {
          total_requested: 0,
          total_received: 0,
          total_helped: 0,
          success_rate: 0
        },
        weekly_activity: {},
        recent_requests: []
      }
    }
  }

  async searchSwapsAdvanced(query: string, filters: {
    facility_id?: string
    status?: SwapStatus
    urgency?: SwapUrgency
    swap_type?: string
    date_from?: string
    date_to?: string
    requesting_staff?: string
    target_staff?: string
  } = {}) {
    const params = new URLSearchParams()
    params.append('q', query)
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })

    return this.request<any[]>(`/v1/swaps/search?${params.toString()}`)
  }

  async getStaffSwapRequests(status?: SwapStatus, limit = 50) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    params.append('limit', limit.toString())
    
    const queryString = params.toString()
    const endpoint = `/v1/staff/me/swap-requests${queryString ? `?${queryString}` : ''}`
    
    try {
      console.log('🔍 Calling staff swap endpoint:', endpoint)
      const result = await this.request<any[]>(endpoint)
      console.log('✅ Staff swap response:', result)
      return result
    } catch (error: any) {
      console.error(' getStaffSwapRequests failed:', error)
      
      // If the staff-specific endpoint fails, try the general endpoint
      if (error.message?.includes('404') || error.message?.includes('403')) {
        console.warn('Staff endpoint not available, trying general swap endpoint...')
        try {
          return await this.getMySwapRequests(status, limit)
        } catch (fallbackError) {
          console.error('Both endpoints failed:', fallbackError)
          return []
        }
      }
      
      // For server errors, return empty array instead of crashing
      if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        console.warn('Staff swap requests endpoint is failing, returning empty array')
        return []
      }
      
      throw error
    }
  }

  async getStaffSwapStats(staffId: string, options: {
    start_date?: string
    end_date?: string
  } = {}) {
    const params = new URLSearchParams()
    if (options.start_date) params.append('start_date', options.start_date)
    if (options.end_date) params.append('end_date', options.end_date)

    const queryString = params.toString()
    return this.request<any>(`/v1/swaps/staff/${staffId}/stats${queryString ? `?${queryString}` : ''}`)
  }

  async searchSwaps(query: string, filters: {
    facility_id?: string
    status?: SwapStatus
    urgency?: SwapUrgency
    date_from?: string
    date_to?: string
  } = {}) {
    const params = new URLSearchParams()
    params.append('q', query)
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })

    return this.request<any[]>(`/v1/swaps/search?${params.toString()}`)
  }

  // Staff swap analytics
  async getTopRequestingStaff(facilityId: string, options: {
    days?: number
    limit?: number
  } = {}) {
    const params = new URLSearchParams()
    if (options.days) params.append('days', options.days.toString())
    if (options.limit) params.append('limit', options.limit.toString())

    const queryString = params.toString()
    return this.request<any>(`/v1/swaps/analytics/top-requesters/${facilityId}${queryString ? `?${queryString}` : ''}`)
  }

  async getSwapReasonsAnalysis(facilityId: string, days: number = 30) {
    return this.request<any>(`/v1/swaps/analytics/reasons/${facilityId}?days=${days}`)
  }

  async getStaffPerformanceMetrics(facilityId: string, days: number = 30) {
    return this.request<any>(`/v1/swaps/analytics/staff-performance/${facilityId}?days=${days}`)
  }

  async getProblemPatterns(facilityId: string, days: number = 30) {
    return this.request<any>(`/v1/swaps/analytics/problem-patterns/${facilityId}?days=${days}`)
  }

  async getComprehensiveSwapAnalytics(facilityId: string, days: number = 30) {
    const [topRequesters, reasons, performance, problems] = await Promise.all([
      this.getTopRequestingStaff(facilityId, { days }),
      this.getSwapReasonsAnalysis(facilityId, days),
      this.getStaffPerformanceMetrics(facilityId, days),
      this.getProblemPatterns(facilityId, days)
    ])

    return {
      topRequesters,
      reasons,
      performance,
      problems,
      period_days: days,
      facility_id: facilityId
    }
  }

  async getTeamReliabilityStats(staffId: string) {
    try {
      const response = await this.request(`/v1/analytics/staff/${staffId}/reliability-stats`)
      return response
    } catch (error) {
      console.warn('Team reliability stats not available:', error.message)
      return {
        acceptance_rate: 0,
        helpfulness_score: 0,
        current_streak: 0,
        total_helped: 0,
        avg_response_time: 'N/A',
        team_rating: 0
      }
    }
  }

  async getTeamInsights(facilityId: string) {
    try {
      const response = await this.request(`/v1/analytics/facilities/${facilityId}/team-insights`)
      return response
    } catch (error) {
      console.warn('Team insights not available:', error.message)
      return {
        busyDays: [],
        needyShifts: [],
        teamCoverage: 0,
        yourContribution: 0,
        recentTrends: 'Analytics not available'
      }
    }
  }

  // Enhanced Staff Dashboard Stats
  async getStaffDashboardStats() {
    // Use the existing getMyDashboardStats method
    return await this.getMyDashboardStats()
  }

  

  // Analytics & Reporting
  async getScheduleAnalytics(facilityId: string, startDate: string, endDate: string) {
    return this.request<any>(`/v1/schedule/analytics/${facilityId}?start_date=${startDate}&end_date=${endDate}`)
  }

  async optimizeExistingSchedule(scheduleId: string, data: {
    optimization_goals: string[]
    constraints: Record<string, any>
    preserve_assignments?: string[]
  }) {
    return this.request<any>(`/v1/schedule/${scheduleId}/optimize`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Staff Availability
  async getStaffAvailabilityForPeriod(facilityId: string, startDate: string, endDate: string) {
    return this.request<any>(`/v1/availability/facility/${facilityId}/period?start_date=${startDate}&end_date=${endDate}`)
  }

  // Schedule Templates & Bulk Operations
  async getScheduleTemplates(facilityId: string) {
    return this.request<any>(`/v1/schedule/templates/${facilityId}`)
  }

  async saveScheduleAsTemplate(scheduleId: string, data: {
    name: string
    description?: string
    tags: string[]
    is_public?: boolean
  }) {
    return this.request<any>(`/v1/schedule/${scheduleId}/save-template`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async copySchedule(sourceScheduleId: string, data: {
    target_facility_id?: string
    target_start_date: string
    period_type: 'daily' | 'weekly' | 'monthly'
    adapt_staff?: boolean
    include_unavailability?: boolean
  }) {
    return this.request<any>(`/v1/schedule/${sourceScheduleId}/copy`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  // ==================== NOTIFICATIONS ====================

  /**
   * Fetch current‑user notifications.
   *
   * The backend now recognises several aliases, so we always send *all*
   * three booleans using the camelCase naming the React hooks expect.
   */
  async getMyNotifications(options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean            // camelCase for frontend convenience
    inAppOnly?: boolean
    deliveredOnly?: boolean
  } = {}) {
    const params = new URLSearchParams()

    if (options.limit !== undefined)       params.append('limit', options.limit.toString())
    if (options.offset !== undefined)      params.append('offset', options.offset.toString())
    if (options.unreadOnly)                params.append('unreadOnly', 'true')
    if (options.inAppOnly)                 params.append('inAppOnly', 'true')
    if (options.deliveredOnly)             params.append('deliveredOnly', 'true')

    const query = params.toString()
    const endpoint = `/v1/notifications${query ? `?${query}` : ''}`  // ⚠ no trailing slash

    return this.request<any[]>(endpoint)
  }

  async markNotificationRead(notificationId: string) {
    return this.request<any>(`/v1/notifications/${notificationId}/read`, {
      method: 'POST'
    })
  }

  async markAllNotificationsRead() {
    return this.request<any>('/v1/notifications/mark-all-read', {
      method: 'POST'
    })
  }

  async getNotificationPreferences() {
    return this.request<any>('/v1/notifications/preferences')
  }

  async updateNotificationPreferences(preferences: {
    notification_type: string
    in_app_enabled?: boolean
    push_enabled?: boolean
    whatsapp_enabled?: boolean
    email_enabled?: boolean
  }) {
    return this.request<any>('/v1/notifications/preferences', {
      method: 'POST',
      body: JSON.stringify(preferences)
    })
  }

  async updatePushToken(pushToken: string) {
    return this.request<any>('/v1/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ push_token: pushToken })
    })
  }

  async updateWhatsAppNumber(whatsappNumber: string) {
    return this.request<any>('/v1/notifications/whatsapp-number', {
      method: 'POST',
      body: JSON.stringify({ whatsapp_number: whatsappNumber })
    })
  }

  // Export functionality
  async exportSchedule(scheduleId: string, format: 'pdf' | 'excel' | 'csv', options: {
    include_staff_details?: boolean
    include_contact_info?: boolean
    group_by?: 'day' | 'staff' | 'zone'
    date_format?: string
  }) {
    const response = await fetch(`${this.config.baseUrl}/v1/schedule/${scheduleId}/export/${format}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(options),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to export schedule: ${response.statusText}`)
    }
    
    return response.blob()
  }
}

// Create API client instance
export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
})

// Helper to create authenticated API client
export function createAuthenticatedApiClient(accessToken: string) {
  return new ApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

//================= HELPER FUNCTION ==============================================
export function calculateShiftDuration(startTime: string, endTime: string): string {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMin
  let endMinutes = endHour * 60 + endMin
  
  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }
  
  const diffMinutes = endMinutes - startMinutes
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  
  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
}

export function isOvernightShift(startTime: string, endTime: string): boolean {
  const [startHour] = startTime.split(':').map(Number)
  const [endHour] = endTime.split(':').map(Number)
  
  return endHour <= startHour
}