// types/api.ts - Additional type definitions for API client

import { SwapStatus, SwapUrgency } from './swaps'
import { Staff} from './schedule'

// ==================== SCHEDULE TYPES ====================
export interface ScheduleAssignment {
  id: string
  schedule_id: string
  staff_id: string
  day: number
  shift: number
  zone_id?: string
  role?: string
  hours?: number
  notes?: string
  status: 'scheduled' | 'confirmed' | 'cancelled'
  created_at: string
  updated_at?: string
}

export interface ScheduleWithAssignments {
  id: string
  facility_id: string
  week_start: string
  status: 'draft' | 'published' | 'archived'
  assignments: ScheduleAssignment[]
  created_at: string
  updated_at?: string
  published_at?: string
  published_by?: string
}

export interface SchedulePreview {
  staff_coverage: Record<string, number>
  shift_coverage: Record<string, number>
  total_hours: number
  cost_estimate: number
  conflicts: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    message: string
    staff_id?: string
  }>
}

export interface ScheduleSummary {
  total_schedules: number
  published_schedules: number
  draft_schedules: number
  current_week_coverage: number
  next_week_coverage: number
  staff_utilization: number
  upcoming_gaps: Array<{
    day: number
    shift: number
    needed_staff: number
    available_staff: number
  }>
}

export interface ScheduleValidation {
  is_valid: boolean
  errors: Array<{
    type: string
    severity: 'error' | 'warning'
    message: string
    day?: number
    shift?: number
    staff_id?: string
  }>
  warnings: string[]
  suggestions: string[]
}

export interface StaffScheduleResponse {
  staff_id: string
  staff_name: string  
  facility_id: string
  assignments: Array<{
    date: string
    day_of_week: number
    shift: number
    schedule_id: string
    assignment_id: string
  }>
}

export interface SwapHistoryRead {
  id: string
  swap_request_id: string
  action: string
  actor_name: string
  timestamp: string
  notes?: string
  previous_status?: SwapStatus
  new_status?: SwapStatus
  role_information?: Record<string, unknown>
  system_action: boolean
  notification_sent: boolean
}

export interface ScheduleTemplateResponse {
  id: string
  name: string
  description?: string
  facility_id: string
  tags: string[]
  is_public: boolean
  template_data: {
    assignments: ScheduleAssignment[]
    metadata: Record<string, unknown>
  }
  usage_count: number
  created_by: string
  created_at: string
}

export interface ScheduleCopyResponse {
  success: boolean
  message: string
  new_schedule_id: string
  copied_assignments: number
  adapted_staff_count: number
  conflicts_resolved: number
}

export interface SwapRetryResponse {
  success: boolean
  message: string
  assigned_staff_id?: string
  assigned_staff_name?: string
  role_match_level: string
  retry_attempt: number
}

export interface WhatsAppUpdateResponse {
  success: boolean
  message: string
  whatsapp_number: string
  verification_required: boolean
}

export interface SwapExportResponse {
  success: boolean
  file_url: string
  records_exported: number
  file_size_bytes: number
  export_timestamp: string
  expires_at: string
}

export interface ScheduleAnalytics {
  facility_id: string
  period_start: string
  period_end: string
  total_shifts: number
  total_hours: number
  staff_utilization: Record<string, number>
  coverage_gaps: number
  overtime_hours: number
  cost_summary: {
    total_cost: number
    regular_hours_cost: number
    overtime_cost: number
  }
  efficiency_metrics: {
    schedule_completion_rate: number
    last_minute_changes: number
    no_show_rate: number
  }
}

export interface SwapDecisionResponse {
  message: string
  swap_id: string
  new_status: SwapStatus
  notification_sent: boolean
  updated_at: string
}

export interface SwapStaffResponse {
  message: string
  swap_id: string
  staff_response: boolean
  response_at: string
}

// ==================== NOTIFICATION TYPES ====================
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  channels: ('IN_APP' | 'PUSH' | 'WHATSAPP' | 'EMAIL')[]
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  related_entity_type?: string
  related_entity_id?: string
  action_url?: string
  action_text?: string
  metadata: Record<string, unknown>
  created_at: string
  sent_at?: string
  delivered_at?: string
  read_at?: string
}

export interface NotificationPreferences {
  notification_type: string
  in_app_enabled: boolean
  push_enabled: boolean
  whatsapp_enabled: boolean
  email_enabled: boolean
}

export interface DeviceRegistration {
  id: string
  user_id: string
  device_name: string
  device_type: string
  push_token?: string
  user_agent: string
  platform: string
  is_active: boolean
  last_seen: string
  created_at: string
}

export interface DeviceListResponse {
  devices: Array<{
    id: string
    device_name: string
    device_type: string
    platform: string
    is_active: boolean
    last_seen: string
    push_token?: string
  }>
  total_count: number
}

export interface PushStatsResponse {
  total_devices: number
  active_devices: number
  notifications_sent_today: number
  delivery_rate: number
  devices_needing_reauth: number
}

// ==================== ANALYTICS TYPES ====================
export interface StaffDashboardStats {
  current_week: {
    hours_scheduled: number
    shifts_count: number
    completion_rate: number
  }
  next_week: {
    hours_scheduled: number
    shifts_count: number
  }
  upcoming_shifts: Array<{
    id: string
    date: string
    shift_name: string
    start_time: string
    end_time: string
    facility_name: string
    zone?: string
  }>
  swap_requests: {
    my_pending: number
    my_completed: number
    helped_others: number
  }
  performance_metrics: {
    attendance_rate: number
    helpfulness_score: number
    reliability_rating: number
  }
  // Legacy aliases for backward compatibility
  thisWeekHours: number
  nextWeekHours: number
  pendingSwaps: number
  upcomingShifts: Array<{
    id: string
    date: string
    shift_name: string
    start_time: string
    end_time: string
    facility_name: string
  }>
}

export interface SwapAnalytics {
  facility_id: string
  period_start: string
  period_end: string
  total_requests: number
  auto_requests: number
  specific_requests: number
  completed_swaps: number
  failed_swaps: number
  role_compatibility_rate: number
  most_requested_roles: Array<{
    role: string
    count: number
  }>
  role_coverage_gaps: Array<{
    role: string
    gap_percentage: number
  }>
  most_helpful_staff: Array<{
    staff_id: string
    name: string
    help_count: number
  }>
  staff_acceptance_rates: Record<string, number>
  emergency_coverage_providers: Array<{
    staff_id: string
    name: string
    emergency_count: number
  }>
  average_resolution_time: number
  manager_approval_time: number
  staff_response_time: number
  recommendations: string[]
}

export interface SwapHistoryEntry {
  id: string
  action: string
  actor_name: string
  timestamp: string
  notes?: string
  previous_status?: SwapStatus
  new_status?: SwapStatus
}

export interface TopRequestersData {
  staff_id: string
  name: string
  total_requests: number
  success_rate: number
  most_common_reason: string
}

export interface TopRequestersResponse {
  facility_id: string
  period_days: number
  top_requesters: Array<{
    staff_id: string
    name: string
    total_requests: number
    success_rate: number
    most_common_reason: string
  }>
}

export interface SwapReasonsAnalysis {
  reasons: Array<{
    reason: string
    count: number
    percentage: number
  }>
  top_reason: string
  patterns: string[]
}

export interface StaffReliabilityStats {
  staff_id: string
  period_days: number
  acceptance_rate: number
  helpfulness_score: number
  current_streak: number
  total_helped: number
  total_requests: number
  avg_response_time: string
  team_rating: number
}

export interface TeamInsights {
  facility_id: string
  analysis_period_days: number
  busyDays: string[]
  needyShifts: Array<{
    name: string
    frequency: number
  }>
  teamCoverage: number
  yourContribution: number
  recentTrends: string
  day_distribution: Record<string, number>
  shift_distribution: Record<string, number>
}

export interface StaffPerformanceMetrics {
  staff_id: string
  name: string
  requests_made: number
  requests_fulfilled: number
  help_provided: number
  reliability_score: number
}

// ==================== SETTINGS TYPES ====================
export interface SystemSettings {
  id: string
  tenant_id: string
  company_name: string
  timezone: string
  date_format: string
  currency: string
  language: string
  smart_scheduling_enabled: boolean
  max_optimization_iterations: number
  conflict_check_enabled: boolean
  auto_assign_by_zone: boolean
  balance_workload: boolean
  require_manager_per_shift: boolean
  allow_overtime: boolean
  email_notifications_enabled: boolean
  whatsapp_notifications_enabled: boolean
  push_notifications_enabled: boolean
  schedule_published_notify: boolean
  swap_request_notify: boolean
  urgent_swap_notify: boolean
  daily_reminder_notify: boolean
  session_timeout_hours: number
  require_two_factor: boolean
  enforce_strong_passwords: boolean
  allow_google_auth: boolean
  allow_apple_auth: boolean
  analytics_cache_ttl: number
  enable_usage_tracking: boolean
  enable_performance_monitoring: boolean
  created_at: string
  updated_at: string
}

export interface NotificationSettings {
  id: string
  tenant_id: string
  smtp_enabled: boolean
  smtp_server?: string
  smtp_port?: number
  smtp_username?: string
  smtp_password?: string
  smtp_use_tls: boolean
  smtp_use_ssl: boolean
  whatsapp_enabled: boolean
  twilio_account_sid?: string
  twilio_auth_token?: string
  twilio_whatsapp_number?: string
  push_enabled: boolean
  firebase_config?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  full_name?: string
  avatar_url?: string
  avatar_type: string
  avatar_color: string
  phone?: string
  whatsapp_number?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  preferred_name?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  timezone?: string
  language?: string
  theme?: string
  notifications_enabled: boolean
  email_notifications: boolean
  push_notifications: boolean
  whatsapp_notifications: boolean
  notification_sound: boolean
  notification_vibration: boolean
  privacy_level: string
  two_factor_enabled: boolean
  login_alerts: boolean
  data_sharing_consent: boolean
  marketing_emails: boolean
  created_at: string
  updated_at: string
  last_active?: string
}

export interface ServiceStatus {
  smtp: ServiceInfo
  whatsapp: ServiceInfo
  push: ServiceInfo
}

export interface ServiceInfo {
  enabled: boolean
  configured: boolean
  status: 'active' | 'setup_required'
}

export interface ServiceTestResult {
  service: string
  success: boolean
  message: string
  details: Record<string, unknown>
  tested_at: string
}

// ==================== INVITATION TYPES ====================
export interface Invitation {
  id: string
  staff_id: string
  email: string
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'cancelled'
  sent_at?: string
  expires_at: string
  custom_message?: string
  staff_name: string
  facility_name: string
  invited_by_name: string
  accepted_at?: string
  created_at: string
}

export interface InvitationStats {
  total_sent: number
  pending: number
  accepted: number
  expired: number
  cancelled: number
  acceptance_rate: number
}

export interface BulkInvitationResult {
  successful: Array<{
    staff_id: string
    invitation_id: string
    email: string
  }>
  failed: Array<{
    staff_id: string
    error: string
  }>
  already_exists: string[]
  no_email: string[]
}

// ==================== DELETION/VALIDATION TYPES ====================
export interface DeletionValidation {
  can_delete: boolean
  errors: string[]
  warnings: string[]
  affected_entities: Array<{
    type: string
    count: number
    impact: 'low' | 'medium' | 'high'
  }>
}

export interface StaffDeletionValidation extends DeletionValidation {
  future_assignments_count: number
  pending_swap_requests_count: number
  is_manager: boolean
  has_unique_skills: boolean
  blocking_entities: Array<{
    type: string
    id: string
    name: string
    facility_id: string
  }>
}

export interface FacilityDeletionValidation extends DeletionValidation {
  active_staff_count: number
  active_schedules_count: number
  pending_swaps_count: number
}

export interface DeletionResult {
  success: boolean
  message: string
  deleted_id: string
  entity_type: string
  affected_count?: number
  reassigned_count?: number
}

// ==================== IMPORT/EXPORT TYPES ====================
export interface ImportResult<T = unknown> {
  total_processed: number
  successful_imports: number
  skipped_duplicates: number
  validation_errors: number
  created_entities: T[]
  skipped_entities: T[]
  error_entities: Array<{
    data: T
    error: string
  }>
  duplicate_warnings: Array<{
    data: T
    warning: string
  }>
  processing_details: Record<string, unknown>
}

export interface ValidationResult {
  can_create: boolean
  validation_errors: string[]
  duplicates: {
    exact_email_match?: Staff
    name_similarity_matches: Staff[]
    phone_matches: Staff[]
    has_any_duplicates: boolean
    severity: 'none' | 'warning' | 'error'
  }
  recommendations: string[]
}

export interface SettingsSummary {
  system_settings_configured: boolean
  notification_settings_configured: boolean
  smtp_configured: boolean
  whatsapp_configured: boolean
  push_configured: boolean
  total_users: number
  users_with_profiles: number
  recent_changes_count: number
  last_updated?: string
}

// ==================== RESPONSE WRAPPER TYPES ====================
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export interface BulkOperationResult<T = unknown> {
  total_processed: number
  successful: number
  failed: number
  results: Array<{
    id: string
    success: boolean
    data?: T
    error?: string
  }>
  errors: string[]
  warnings: string[]
}

// ==================== SEARCH TYPES ====================
export interface SearchFilters {
  facility_id?: string
  status?: SwapStatus | string
  urgency?: SwapUrgency | string
  date_from?: string
  date_to?: string
  requesting_staff?: string
  target_staff?: string
  swap_type?: string
}

export interface SearchResult<T> {
  results: T[]
  total_count: number
  search_query: string
  filters_applied: SearchFilters
  suggestions: string[]
}

// ==================== HEALTH CHECK TYPES ====================
export interface HealthCheck {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  database_connected: boolean
  total_swaps_in_system: number
  pending_swaps: number
  service_version: string
  features: string[]
  error?: string
}

// ==================== CONFLICT/VALIDATION TYPES ====================
export interface ScheduleConflict {
  conflict_type: 'double_booking' | 'unavailable' | 'overtime' | 'skill_mismatch' | 'role_incompatible'
  severity: 'critical' | 'major' | 'minor'
  staff_id: string
  staff_name: string
  message: string
  auto_resolvable: boolean
  resolution_suggestions: string[]
}

export interface ConflictAnalysis {
  has_conflicts: boolean
  conflicts: ScheduleConflict[]
  alternative_suggestions: Array<{
    staff_id: string
    staff_name: string
    role: string
    compatibility_score: number
    availability: boolean
    suggestion_reason: string
  }>
}

// ==================== AVATAR/UPLOAD TYPES ====================
export interface AvatarUploadResult {
  success: boolean
  avatar_url: string
  avatar_type: string
  avatar_color: string
  thumbnails: Record<string, string>
  message: string
}

// ==================== EXPORT CONFIGURATION ====================
export interface ExportOptions {
  include_staff_details?: boolean
  include_contact_info?: boolean
  include_timestamps?: boolean
  include_notes?: boolean
  include_history?: boolean
  include_analytics?: boolean
  group_by?: 'day' | 'staff' | 'zone'
  date_format?: string
  period_start?: string
  period_end?: string
}

export interface ExportResult {
  export_summary: Record<string, unknown>
  download_url: string
  expires_at: string
}