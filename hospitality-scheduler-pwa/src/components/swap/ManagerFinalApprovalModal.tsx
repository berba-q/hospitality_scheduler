// components/swap/ManagerFinalApprovalModal.tsx
'use client'

import React, { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  Clock,
  ArrowLeftRight,
  Settings,
  Info
} from 'lucide-react'

interface ManagerFinalApprovalModalProps {
  swap: any
  open: boolean
  onClose: () => void
  onApprove: (
    approved: boolean, 
    notes?: string, 
    overrideRole?: boolean, 
    overrideReason?: string
  ) => void
  loading?: boolean
}

export function ManagerFinalApprovalModal({
  swap,
  open,
  onClose,
  onApprove,
  loading = false
}: ManagerFinalApprovalModalProps) {
  const [notes, setNotes] = useState('')
  const [overrideRole, setOverrideRole] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  const handleApprove = () => {
    onApprove(true, notes || undefined, overrideRole, overrideReason || undefined)
  }

  const handleDeny = () => {
    onApprove(false, notes || undefined)
  }

  const hasRoleIssues = swap?.role_match_override || 
    (swap?.assigned_staff_role_name && swap?.original_shift_role_name && 
     swap.assigned_staff_role_name !== swap.original_shift_role_name)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Final Approval Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Swap Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                Swap Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700">Requesting Staff:</div>
                  <div>{swap?.requesting_staff?.full_name}</div>
                  <div className="text-gray-500">{swap?.requesting_staff?.role}</div>
                </div>
                
                <div>
                  <div className="font-medium text-gray-700">
                    {swap?.swap_type === 'auto' ? 'Assigned Staff:' : 'Target Staff:'}
                  </div>
                  <div>
                    {swap?.swap_type === 'auto' 
                      ? swap?.assigned_staff?.full_name 
                      : swap?.target_staff?.full_name}
                  </div>
                  <div className="text-gray-500">
                    {swap?.swap_type === 'auto' 
                      ? swap?.assigned_staff?.role 
                      : swap?.target_staff?.role}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700">Original Shift:</div>
                    <div>{_get_day_name(swap?.original_day)} - {_get_shift_name(swap?.original_shift)}</div>
                    {swap?.original_zone_id && (
                      <div className="text-gray-500">Zone: {swap.original_zone_id}</div>
                    )}
                  </div>
                  
                  {swap?.swap_type === 'specific' && (
                    <div>
                      <div className="font-medium text-gray-700">Target Shift:</div>
                      <div>{_get_day_name(swap?.target_day)} - {_get_shift_name(swap?.target_shift)}</div>
                      {swap?.target_zone_id && (
                        <div className="text-gray-500">Zone: {swap.target_zone_id}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {swap?.reason && (
                <div className="border-t pt-3">
                  <div className="font-medium text-gray-700 text-sm">Reason:</div>
                  <div className="text-sm text-gray-600">{swap.reason}</div>
                </div>
              )}

              <div className="flex gap-2">
                <Badge variant="outline">
                  {swap?.swap_type === 'auto' ? 'Auto Assignment' : 'Specific Swap'}
                </Badge>
                <Badge 
                  className={
                    swap?.urgency === 'emergency' ? 'bg-red-100 text-red-800' :
                    swap?.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }
                >
                  {swap?.urgency?.charAt(0).toUpperCase() + swap?.urgency?.slice(1)} Priority
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Role Compatibility Check */}
          {hasRoleIssues && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="font-medium mb-2">Role Compatibility Issue Detected</div>
                <div className="space-y-1 text-sm">
                  <div>
                    Required Role: <span className="font-medium">{swap?.original_shift_role_name || 'Not specified'}</span>
                  </div>
                  <div>
                    {swap?.swap_type === 'auto' ? 'Assigned' : 'Target'} Staff Role: 
                    <span className="font-medium ml-1">
                      {swap?.swap_type === 'auto' 
                        ? swap?.assigned_staff_role_name 
                        : swap?.target_staff_role_name}
                    </span>
                  </div>
                  {swap?.role_match_reason && (
                    <div className="mt-2 text-xs bg-orange-100 p-2 rounded">
                      {swap.role_match_reason}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Manager Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Manager Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any final notes or instructions..."
              rows={3}
            />
          </div>

          {/* Role Override Section */}
          {hasRoleIssues && (
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
                  <Settings className="h-4 w-4" />
                  Role Override Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="override"
                    checked={overrideRole}
                    onCheckedChange={(checked) => setOverrideRole(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="override"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Override role verification and approve anyway
                    </label>
                    <p className="text-xs text-muted-foreground">
                      This will allow the swap to proceed despite role mismatches. Use only in emergency situations.
                    </p>
                  </div>
                </div>

                {overrideRole && (
                  <div className="space-y-2">
                    <Label htmlFor="override-reason">Override Justification (Required)</Label>
                    <Textarea
                      id="override-reason"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Explain why this role override is necessary..."
                      rows={2}
                      required
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Approval Impact */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">What happens after approval:</div>
              <ul className="text-sm space-y-1">
                <li>• The schedule will be immediately updated</li>
                <li>• All affected staff will be notified</li>
                <li>• The swap will be marked as completed</li>
                {overrideRole && (
                  <li className="text-orange-700">• Role override will be logged for audit purposes</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleDeny}
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Deny Final Approval
          </Button>
          
          <Button
            onClick={handleApprove}
            disabled={loading || (overrideRole && !overrideReason.trim())}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {overrideRole ? 'Approve with Override' : 'Final Approve & Execute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== BULK SWAP MANAGER COMPONENT ====================

interface BulkSwapManagerProps {
  swaps: any[]
  selectedSwaps: string[]
  onSelectionChange: (swapIds: string[]) => void
  onBulkAction: (action: 'approve' | 'decline', notes?: string, options?: any) => void
  loading?: boolean
}

export function BulkSwapManager({
  swaps,
  selectedSwaps,
  onSelectionChange,
  onBulkAction,
  loading = false
}: BulkSwapManagerProps) {
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approve' | 'decline'>('approve')
  const [bulkNotes, setBulkNotes] = useState('')
  const [ignoreRoleIssues, setIgnoreRoleIssues] = useState(false)
  const [roleOverrideReason, setRoleOverrideReason] = useState('')

  const eligibleSwaps = swaps.filter(swap => swap.status === 'pending')
  const selectedEligibleSwaps = eligibleSwaps.filter(swap => selectedSwaps.includes(swap.id))
  const hasRoleIssues = selectedEligibleSwaps.some(swap => 
    swap.role_match_override || 
    (swap.assigned_staff_role_name && swap.original_shift_role_name && 
     swap.assigned_staff_role_name !== swap.original_shift_role_name)
  )

  const handleSelectAll = () => {
    onSelectionChange(eligibleSwaps.map(swap => swap.id))
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  const handleBulkSubmit = () => {
    onBulkAction(bulkAction, bulkNotes || undefined, {
      ignore_role_mismatches: ignoreRoleIssues,
      role_override_reason: roleOverrideReason || undefined
    })
    setShowBulkModal(false)
    setBulkNotes('')
    setIgnoreRoleIssues(false)
    setRoleOverrideReason('')
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Bulk Actions
            </div>
            <Badge variant="outline">
              {selectedSwaps.length} selected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              disabled={eligibleSwaps.length === 0}
            >
              Select All ({eligibleSwaps.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearAll}
              disabled={selectedSwaps.length === 0}
            >
              Clear Selection
            </Button>
          </div>

          {selectedSwaps.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setBulkAction('approve')
                  setShowBulkModal(true)
                }}
                disabled={loading}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Bulk Approve ({selectedSwaps.length})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setBulkAction('decline')
                  setShowBulkModal(true)
                }}
                disabled={loading}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Bulk Decline ({selectedSwaps.length})
              </Button>
            </div>
          )}

          {hasRoleIssues && selectedSwaps.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-xs">
                Some selected swaps have role compatibility issues that may require override.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'approve' ? 'Bulk Approve' : 'Bulk Decline'} Swaps
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-2">
                You are about to {bulkAction} {selectedSwaps.length} swap request(s).
              </div>
              {hasRoleIssues && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 text-sm">
                    Some swaps have role compatibility issues.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-notes">Notes (Optional)</Label>
              <Textarea
                id="bulk-notes"
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder={`Add notes for this bulk ${bulkAction} action...`}
                rows={2}
              />
            </div>

            {hasRoleIssues && bulkAction === 'approve' && (
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="ignore-roles"
                    checked={ignoreRoleIssues}
                    onCheckedChange={(checked) => setIgnoreRoleIssues(checked as boolean)}
                  />
                  <div>
                    <label htmlFor="ignore-roles" className="text-sm font-medium">
                      Override role verification for affected swaps
                    </label>
                    <p className="text-xs text-gray-500">
                      This will approve swaps even with role mismatches
                    </p>
                  </div>
                </div>

                {ignoreRoleIssues && (
                  <div className="space-y-2">
                    <Label htmlFor="override-reason">Override Justification</Label>
                    <Textarea
                      id="override-reason"
                      value={roleOverrideReason}
                      onChange={(e) => setRoleOverrideReason(e.target.value)}
                      placeholder="Explain why role overrides are necessary..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={ignoreRoleIssues && !roleOverrideReason.trim()}
              variant={bulkAction === 'approve' ? 'default' : 'destructive'}
            >
              {bulkAction === 'approve' ? 'Approve All' : 'Decline All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper functions
function _get_day_name(day: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return days[day] || `Day ${day}`
}

function _get_shift_name(shift: number): string {
  const shifts = ['Morning', 'Afternoon', 'Evening']
  return shifts[shift] || `Shift ${shift}`
}