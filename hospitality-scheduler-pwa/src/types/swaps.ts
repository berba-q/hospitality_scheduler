export enum SwapStatus {
  Pending = 'pending',
  ManagerApproved = 'manager_approved',           
  PotentialAssignment = 'potential_assignment',    
  StaffAccepted = 'staff_accepted',
  ManagerFinalApproval = 'manager_final_approval',
  Executed = 'executed',
  StaffDeclined = 'staff_declined',
  AssignmentDeclined = 'assignment_declined',
  AssignmentFailed = 'assignment_failed',
  Declined = 'declined',
  Cancelled = 'cancelled'
}

export interface SwapRequest {
  id: string
  schedule_id: string
  requesting_staff_id: string
  target_staff_id?: string
  assigned_staff_id?: string
  swap_type: 'specific' | 'auto'
  original_day: number
  original_shift: number
  target_day?: number
  target_shift?: number
  original_zone_id?: string
  target_zone_id?: string
  reason: string
  urgency: SwapUrgency
  status: SwapStatus
  expires_at?: string
  requires_manager_final_approval: boolean
  role_verification_required: boolean
  target_staff_accepted?: boolean
  manager_approved?: boolean
  manager_notes?: string
  staff_notes?: string
  notification_sent: boolean
  role_override_applied: boolean
  role_override_reason?: string
  created_at: string
  updated_at?: string
  completed_at?: string
  
  // Related data (populated by backend)
  requesting_staff?: {
    id: string
    full_name: string
    role: string
    email: string
  }
  target_staff?: {
    id: string
    full_name: string
    role: string
    email: string
  }
  assigned_staff?: {
    id: string
    full_name: string
    role: string
    email: string
  }
  facility?: {
    id: string
    name: string
  }
  
  // Additional computed fields
  original_shift_role_name?: string
  target_staff_role_name?: string
  assigned_staff_role_name?: string
  facility_id?: string
  facility_name?: string
}

export enum SwapUrgency {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Emergency = 'emergency'
}

// Add helper functions for status categorization
export const SwapStatusCategories = {
  NEEDS_MANAGER_ACTION: [
    SwapStatus.Pending, 
    SwapStatus.ManagerFinalApproval
  ] as SwapStatus[],
  
  NEEDS_STAFF_ACTION: [
    SwapStatus.ManagerApproved, 
    SwapStatus.PotentialAssignment
  ] as SwapStatus[],
  
  COMPLETED: [
    SwapStatus.Executed, 
    SwapStatus.Declined, 
    SwapStatus.StaffDeclined, 
    SwapStatus.Cancelled, 
    SwapStatus.AssignmentFailed
  ] as SwapStatus[],
  
  IN_PROGRESS: [
    SwapStatus.StaffAccepted, 
    SwapStatus.ManagerFinalApproval
  ] as SwapStatus[]
}

export const isActionableStatus = (status: SwapStatus): boolean => {
  return [
    ...SwapStatusCategories.NEEDS_MANAGER_ACTION,
    ...SwapStatusCategories.NEEDS_STAFF_ACTION
  ].includes(status)
}

export const needsManagerAction = (status: SwapStatus): boolean => {
  return SwapStatusCategories.NEEDS_MANAGER_ACTION.includes(status)
}

export const needsStaffAction = (status: SwapStatus): boolean => {
  return SwapStatusCategories.NEEDS_STAFF_ACTION.includes(status)
}