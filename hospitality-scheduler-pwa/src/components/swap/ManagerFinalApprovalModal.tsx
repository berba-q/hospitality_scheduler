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
import { SwapStatus, SwapUrgency } from '@/types/swaps'
import { useTranslations } from '@/hooks/useTranslations'

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
  const { t } = useTranslations()
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
            {t('swaps.finalApprovalRequired')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Swap Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                {t('swaps.swapDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700">{t('swaps.requestingStaff')}:</div>
                  <div>{swap?.requesting_staff?.full_name}</div>
                  <div className="text-gray-500">{swap?.requesting_staff?.role}</div>
                </div>
                
                <div>
                  <div className="font-medium text-gray-700">
                    {swap?.swap_type === 'auto' ? t('swaps.assignedStaff') : t('swaps.targetStaff')}:
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
                    <div className="font-medium text-gray-700">{t('swaps.originalShift')}:</div>
                    <div>{_get_day_name(swap?.original_day, t)} - {_get_shift_name(swap?.original_shift, t)}</div>
                    {swap?.original_zone_id && (
                      <div className="text-gray-500">{t('common.zone')}: {swap.original_zone_id}</div>
                    )}
                  </div>
                  
                  {swap?.swap_type === 'specific' && (
                    <div>
                      <div className="font-medium text-gray-700">{t('swaps.targetShift')}:</div>
                      <div>{_get_day_name(swap?.target_day, t)} - {_get_shift_name(swap?.target_shift, t)}</div>
                      {swap?.target_zone_id && (
                        <div className="text-gray-500">{t('common.zone')}: {swap.target_zone_id}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {swap?.reason && (
                <div className="border-t pt-3">
                  <div className="font-medium text-gray-700 text-sm">{t('swaps.reason')}:</div>
                  <div className="text-sm text-gray-600">{swap.reason}</div>
                </div>
              )}

              <div className="flex gap-2">
                <Badge variant="outline">
                  {swap?.swap_type === 'auto' ? t('swaps.autoAssignment') : t('swaps.specificSwap')}
                </Badge>
                <Badge
                  className={
                    swap?.urgency === SwapUrgency.Emergency ? 'bg-red-100 text-red-800' :
                    swap?.urgency === SwapUrgency.High      ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }
                >
                  {String(swap?.urgency)?.charAt(0).toUpperCase() + String(swap?.urgency)?.slice(1)} {t('swaps.priority')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Role Compatibility Check */}
          {hasRoleIssues && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="font-medium mb-2">{t('swaps.roleCompatibilityIssueDetected')}</div>
                <div className="space-y-1 text-sm">
                  <div>
                    {t('swaps.requiredRole')}: <span className="font-medium">{swap?.original_shift_role_name || t('swaps.notSpecified')}</span>
                  </div>
                  <div>
                    {swap?.swap_type === 'auto' ? t('swaps.assignedStaffRole') : t('swaps.targetStaffRole')}: 
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
            <Label htmlFor="notes">{t('swaps.managerNotes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('swaps.addFinalNotesPlaceholder')}
              rows={3}
            />
          </div>

          {/* Role Override Section */}
          {hasRoleIssues && (
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
                  <Settings className="h-4 w-4" />
                  {t('swaps.roleOverrideOptions')}
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
                      {t('swaps.overrideRoleVerification')}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t('swaps.overrideRoleWarning')}
                    </p>
                  </div>
                </div>

                {overrideRole && (
                  <div className="space-y-2">
                    <Label htmlFor="override-reason">{t('swaps.overrideJustificationRequired')}</Label>
                    <Textarea
                      id="override-reason"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder={t('swaps.explainRoleOverridePlaceholder')}
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
              <div className="font-medium mb-2">{t('swaps.whatHappensAfterApproval')}:</div>
              <ul className="text-sm space-y-1">
                <li>• {t('swaps.scheduleWillBeUpdated')}</li>
                <li>• {t('swaps.allAffectedStaffNotified')}</li>
                <li>• {t('swaps.swapWillBeMarkedCompleted')}</li>
                {overrideRole && (
                  <li className="text-orange-700">• {t('swaps.roleOverrideWillBeLogged')}</li>
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
            {t('common.cancel')}
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleDeny}
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {t('swaps.denyFinalApproval')}
          </Button>
          
          <Button
            onClick={handleApprove}
            disabled={loading || (overrideRole && !overrideReason.trim())}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {overrideRole ? t('swaps.approveWithOverride') : t('swaps.finalApproveAndExecute')}
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
  const { t } = useTranslations()
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approve' | 'decline'>('approve')
  const [bulkNotes, setBulkNotes] = useState('')
  const [ignoreRoleIssues, setIgnoreRoleIssues] = useState(false)
  const [roleOverrideReason, setRoleOverrideReason] = useState('')

  const eligibleSwaps = swaps.filter(
    swap => swap.status === SwapStatus.ManagerFinalApproval
  )
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
              {t('swaps.bulkActions')}
            </div>
            <Badge variant="outline">
              {selectedSwaps.length} {t('swaps.selected')}
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
              {t('swaps.selectAll')} ({eligibleSwaps.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearAll}
              disabled={selectedSwaps.length === 0}
            >
              {t('swaps.clearSelection')}
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
                {t('swaps.bulkApprove')} ({selectedSwaps.length})
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
                {t('swaps.bulkDecline')} ({selectedSwaps.length})
              </Button>
            </div>
          )}

          {hasRoleIssues && selectedSwaps.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-xs">
                {t('swaps.someSelectedSwapsHaveRoleIssues')}
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
              {bulkAction === 'approve' ? t('swaps.bulkApproveSwaps') : t('swaps.bulkDeclineSwaps')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-2">
                {t('swaps.youAreAboutToBulkAction', { 
                  action: bulkAction === 'approve' ? t('common.approve') : t('common.decline'),
                  count: selectedSwaps.length 
                })}
              </div>
              {hasRoleIssues && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 text-sm">
                    {t('swaps.someSwapsHaveRoleCompatibilityIssues')}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-notes">{t('swaps.notesOptional')}</Label>
              <Textarea
                id="bulk-notes"
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder={t('swaps.addBulkActionNotesPlaceholder', { action: bulkAction })}
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
                      {t('swaps.overrideRoleVerificationBulk')}
                    </label>
                    <p className="text-xs text-gray-500">
                      {t('swaps.overrideRoleVerificationBulkDescription')}
                    </p>
                  </div>
                </div>

                {ignoreRoleIssues && (
                  <div className="space-y-2">
                    <Label htmlFor="override-reason">{t('swaps.overrideJustification')}</Label>
                    <Textarea
                      id="override-reason"
                      value={roleOverrideReason}
                      onChange={(e) => setRoleOverrideReason(e.target.value)}
                      placeholder={t('swaps.explainRoleOverridesNecessaryPlaceholder')}
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={ignoreRoleIssues && !roleOverrideReason.trim()}
              variant={bulkAction === 'approve' ? 'default' : 'destructive'}
            >
              {bulkAction === 'approve' ? t('swaps.approveAll') : t('swaps.declineAll')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper functions
function _get_day_name(day: number, t: any): string {
  const days = [
    t('schedule.monday'),
    t('schedule.tuesday'), 
    t('schedule.wednesday'),
    t('schedule.thursday'),
    t('schedule.friday'),
    t('schedule.saturday'),
    t('schedule.sunday')
  ]
  return days[day] || `${t('schedule.day')} ${day}`
}

function _get_shift_name(shift: number, t: any): string {
  const shifts = [
    t('schedule.morning'),
    t('schedule.afternoon'), 
    t('schedule.evening')
  ]
  return shifts[shift] || `${t('schedule.shift')} ${shift}`
}