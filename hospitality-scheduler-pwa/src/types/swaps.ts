export enum SwapStatus {
  Pending = 'pending',
  AwaitingTarget = 'awaiting_target',
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