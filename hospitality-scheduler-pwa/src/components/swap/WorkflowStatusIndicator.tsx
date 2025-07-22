// components/swap/WorkflowStatusIndicator.tsx
'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Settings, 
  Zap,
  PlayCircle,
  PauseCircle,
  XCircle,
  Target,
  Shield,
  ArrowRight
} from 'lucide-react'

import { SwapStatus, SwapUrgency } from '@/types/swaps'

interface WorkflowStatusIndicatorProps {
  swap: any
  workflowStatus?: {
    current_status: SwapStatus
    next_action_required: string
    next_action_by: 'manager' | 'staff' | 'system'
    can_execute: boolean
    blocking_reasons: string[]
    estimated_completion?: string
  }
  availableActions?: string[]
  onActionClick?: (action: string, swapId: string) => void
  compact?: boolean
}

// Map any legacy status strings from old workflow to current enum values.
// This lets us display older records without blowing up the UI.
const LEGACY_STATUS_MAP: Record<string, SwapStatus> = {
  manager_approved: SwapStatus.ManagerFinalApproval,
  potential_assignment: SwapStatus.AwaitingTarget,
  assigned: SwapStatus.AwaitingTarget,
}

const STATUS_CONFIG: Record<SwapStatus, {
  label: string
  color: string
  icon: React.ComponentType<{ className?: string }>
  progress: number
}> = {
  [SwapStatus.Pending]: {
    label: 'Requested',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    progress: 10,
  },
  [SwapStatus.AwaitingTarget]: {
    label: 'Awaiting Staff Response',
    color: 'bg-purple-100 text-purple-800',
    icon: Target,
    progress: 35,
  },
  [SwapStatus.StaffAccepted]: {
    label: 'Staff Accepted',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    progress: 60,
  },
  [SwapStatus.ManagerFinalApproval]: {
    label: 'Final Approval',
    color: 'bg-indigo-100 text-indigo-800',
    icon: Shield,
    progress: 85,
  },
  [SwapStatus.Executed]: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    progress: 100,
  },
  [SwapStatus.StaffDeclined]: {
    label: 'Staff Declined',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    progress: 0,
  },
  [SwapStatus.AssignmentDeclined]: {
    label: 'Assignment Declined',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    progress: 0,
  },
  [SwapStatus.AssignmentFailed]: {
    label: 'Assignment Failed',
    color: 'bg-red-100 text-red-800',
    icon: AlertTriangle,
    progress: 0,
  },
  [SwapStatus.Declined]: {
    label: 'Declined',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    progress: 0,
  },
  [SwapStatus.Cancelled]: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800',
    icon: XCircle,
    progress: 0,
  },
}

const ACTION_CONFIG = {
  'approve': { label: 'Approve', variant: 'default', icon: CheckCircle },
  'decline': { label: 'Decline', variant: 'destructive', icon: XCircle },
  'accept': { label: 'Accept', variant: 'default', icon: CheckCircle },
  'accept_assignment': { label: 'Accept Assignment', variant: 'default', icon: Target },
  'decline_assignment': { label: 'Decline Assignment', variant: 'outline', icon: XCircle },
  'final_approve': { label: 'Final Approve', variant: 'default', icon: Shield },
  'final_decline': { label: 'Final Decline', variant: 'destructive', icon: Shield },
  'retry_assignment': { label: 'Retry Assignment', variant: 'outline', icon: Zap },
  'manual_assign': { label: 'Manual Assign', variant: 'outline', icon: User },
  'emergency_override': { label: 'Emergency Override', variant: 'destructive', icon: AlertTriangle },
  'view_details': { label: 'View Details', variant: 'ghost', icon: Settings },
  'update': { label: 'Update', variant: 'outline', icon: Settings },
  'cancel': { label: 'Cancel', variant: 'destructive', icon: XCircle }
}

export function WorkflowStatusIndicator({
  swap,
  workflowStatus,
  availableActions = [],
  onActionClick,
  compact = false
}: WorkflowStatusIndicatorProps) {
  const rawStatus: string = swap.status
  const normalizedStatus: SwapStatus =
    (LEGACY_STATUS_MAP[rawStatus] as SwapStatus) ||
    (rawStatus as SwapStatus) ||
    SwapStatus.Pending

  const statusConfig = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG[SwapStatus.Pending]
  const StatusIcon = statusConfig.icon

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={statusConfig.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
        {swap.urgency === SwapUrgency.Emergency && (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Emergency
          </Badge>
        )}
        {swap.role_match_override && (
          <Badge className="bg-orange-100 text-orange-800">
            Role Override
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            Workflow Status
          </div>
          <Badge className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{statusConfig.progress}%</span>
          </div>
          <Progress value={statusConfig.progress} className="h-2" />
        </div>

        {/* Workflow Information */}
        {workflowStatus && (
          <div className="space-y-3 mb-4">
            <div className="text-sm">
              <div className="font-medium text-gray-700">Next Action:</div>
              <div className="text-gray-600">{workflowStatus.next_action_required}</div>
            </div>
            
            <div className="text-sm">
              <div className="font-medium text-gray-700">Required By:</div>
              <div className="flex items-center gap-1">
                {workflowStatus.next_action_by === 'manager' && <User className="h-3 w-3" />}
                {workflowStatus.next_action_by === 'staff' && <User className="h-3 w-3" />}
                {workflowStatus.next_action_by === 'system' && <Settings className="h-3 w-3" />}
                <span className="capitalize">{workflowStatus.next_action_by}</span>
              </div>
            </div>

            {workflowStatus.blocking_reasons.length > 0 && (
              <div className="text-sm">
                <div className="font-medium text-red-700">Blocking Issues:</div>
                <ul className="text-red-600 text-xs space-y-1">
                  {workflowStatus.blocking_reasons.map((reason, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {workflowStatus.estimated_completion && (
              <div className="text-sm">
                <div className="font-medium text-gray-700">Estimated Completion:</div>
                <div className="text-gray-600">{workflowStatus.estimated_completion}</div>
              </div>
            )}
          </div>
        )}

        {/* Available Actions */}
        {availableActions.length > 0 && onActionClick && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Available Actions:</div>
            <div className="flex flex-wrap gap-2">
              {availableActions.map((action) => {
                const actionConfig = ACTION_CONFIG[action] || { 
                  label: action, 
                  variant: 'outline', 
                  icon: ArrowRight 
                }
                const ActionIcon = actionConfig.icon

                return (
                  <Button
                    key={action}
                    size="sm"
                    variant={actionConfig.variant as any}
                    onClick={() => onActionClick(action, swap.id)}
                    className="flex items-center gap-1"
                  >
                    <ActionIcon className="h-3 w-3" />
                    {actionConfig.label}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Swap Type & Urgency Info */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Badge variant="outline">
            {swap.swap_type === 'auto' ? 'Auto Assignment' : 'Specific Swap'}
          </Badge>
          
          <Badge
            className={
              swap.urgency === SwapUrgency.Emergency ? 'bg-red-100 text-red-800' :
              swap.urgency === SwapUrgency.High      ? 'bg-orange-100 text-orange-800' :
              swap.urgency === SwapUrgency.Normal    ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }
          >
            {swap.urgency.charAt(0).toUpperCase() + swap.urgency.slice(1)} Priority
          </Badge>

          {swap.role_match_override && (
            <Badge className="bg-orange-100 text-orange-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Role Override
            </Badge>
          )}
        </div>

        {/* Role Information */}
        {(swap.original_shift_role_name || swap.assigned_staff_role_name || swap.target_staff_role_name) && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-gray-500 mb-2">Role Information:</div>
            <div className="space-y-1 text-xs">
              {swap.original_shift_role_name && (
                <div>Required: <span className="font-medium">{swap.original_shift_role_name}</span></div>
              )}
              {swap.assigned_staff_role_name && (
                <div>Assigned: <span className="font-medium">{swap.assigned_staff_role_name}</span></div>
              )}
              {swap.target_staff_role_name && (
                <div>Target: <span className="font-medium">{swap.target_staff_role_name}</span></div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== WORKFLOW STEPPER COMPONENT ====================

interface WorkflowStepperProps {
  currentStatus: SwapStatus
  swapType: 'auto' | 'specific'
}

const WORKFLOW_STEPS: Record<'auto' | 'specific', { id: SwapStatus; label: string; icon: any }[]> = {
  auto: [
    { id: SwapStatus.Pending,               label: 'Requested',       icon: Clock },
    { id: SwapStatus.AwaitingTarget,       label: 'Awaiting Staff',  icon: Target },
    { id: SwapStatus.StaffAccepted,        label: 'Staff Accepted',  icon: User },
    { id: SwapStatus.ManagerFinalApproval,label: 'Final Approval',  icon: Shield },
    { id: SwapStatus.Executed,              label: 'Completed',       icon: CheckCircle },
  ],
  specific: [
    { id: SwapStatus.Pending,               label: 'Requested',       icon: Clock },
    { id: SwapStatus.StaffAccepted,        label: 'Staff Accepted',  icon: User },
    { id: SwapStatus.ManagerFinalApproval,label: 'Final Approval',  icon: Shield },
    { id: SwapStatus.Executed,              label: 'Completed',       icon: CheckCircle },
  ],
}

export function WorkflowStepper({ currentStatus, swapType }: WorkflowStepperProps) {
  const steps = WORKFLOW_STEPS[swapType] || WORKFLOW_STEPS.auto
  const currentIndex = steps.findIndex(step => step.id === currentStatus)

  return (
    <div className="flex items-center space-x-4 py-4">
      {steps.map((step, index) => {
        const StepIcon = step.icon
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isUpcoming = index > currentIndex

        return (
          <div key={step.id} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full border-2 
              ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                isCurrent ? 'bg-blue-500 border-blue-500 text-white' :
                'bg-gray-100 border-gray-300 text-gray-400'}
            `}>
              <StepIcon className="h-4 w-4" />
            </div>
            
            <div className="ml-2 text-xs">
              <div className={`font-medium ${
                isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {step.label}
              </div>
            </div>

            {index < steps.length - 1 && (
              <div className={`
                w-12 h-0.5 mx-4 
                ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
              `} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ==================== POTENTIAL ASSIGNMENT CARD ====================

interface PotentialAssignmentCardProps {
  swap: any
  onRespond: (swapId: string, accepted: boolean, notes?: string) => void
  loading?: boolean
}

export function PotentialAssignmentCard({ 
  swap, 
  onRespond, 
  loading = false 
}: PotentialAssignmentCardProps) {
  // Only render meaningful content if this swap is awaiting the target staff's response.
  // (Legacy 'potential_assignment' / 'assigned' still treated as awaiting_target.)
  const rawStatus: string = swap.status
  const isActive =
    rawStatus === SwapStatus.AwaitingTarget ||
    rawStatus === 'potential_assignment' ||
    rawStatus === 'assigned'

  // If it isn't active, we still render but visually mute the card.
  const [notes, setNotes] = React.useState('')
  const [showNotes, setShowNotes] = React.useState(false)

  const handleAccept = () => {
    onRespond(swap.id, true, notes || undefined)
  }

  const handleDecline = () => {
    onRespond(swap.id, false, notes || undefined)
  }

  return (
    <Card className={`border-purple-200 bg-purple-50 ${!isActive ? 'opacity-60 pointer-events-none' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm">Coverage Assignment</CardTitle>
          </div>
          <Badge className="bg-purple-100 text-purple-800">
            Needs Response
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <div className="font-medium text-gray-700">
            You&apos;ve been assigned to cover for {swap.requesting_staff?.full_name}
          </div>
          <div className="text-gray-600 mt-1">
            {_get_day_name(swap.original_day)} - {_get_shift_name(swap.original_shift)}
          </div>
          {swap.original_zone_id && (
            <div className="text-gray-600">Zone: {swap.original_zone_id}</div>
          )}
        </div>

        {swap.reason && (
          <div className="text-sm">
            <div className="font-medium text-gray-700">Reason:</div>
            <div className="text-gray-600">{swap.reason}</div>
          </div>
        )}

        {swap.role_match_override && (
          <div className="bg-orange-50 border border-orange-200 rounded p-2">
            <div className="flex items-center gap-1 text-orange-800 text-xs">
              <AlertTriangle className="h-3 w-3" />
              Role Override Applied
            </div>
            {swap.role_match_reason && (
              <div className="text-orange-700 text-xs mt-1">
                {swap.role_match_reason}
              </div>
            )}
          </div>
        )}

        {showNotes && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Notes (optional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your availability or concerns..."
              className="w-full p-2 text-sm border rounded resize-none"
              rows={2}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1"
            size="sm"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Accept Assignment
          </Button>
          
          <Button
            onClick={handleDecline}
            disabled={loading}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Decline
          </Button>
          
          <Button
            onClick={() => setShowNotes(!showNotes)}
            variant="ghost"
            size="sm"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== HELPER FUNCTIONS ====================

function _get_day_name(day: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return days[day] || `Day ${day}`
}

function _get_shift_name(shift: number): string {
  const shifts = ['Morning', 'Afternoon', 'Evening']
  return shifts[shift] || `Shift ${shift}`
}