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