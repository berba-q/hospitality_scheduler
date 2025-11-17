// Quick Actions Component for Swap Requests
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Edit3,
  X,
  CheckCircle,
  MoreHorizontal
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTranslations } from '@/hooks/useTranslations'
import * as SwapTypes from '@/types/swaps'

interface SwapUpdateData {
  urgency?: SwapTypes.SwapUrgency
  reason?: string
  expires_at?: string
}

interface QuickActionsProps {
  swap: SwapTypes.SwapRequest
  onUpdateSwap: (swapId: string, updates: SwapUpdateData) => Promise<void>
  onCancelSwap: (swapId: string, reason?: string) => Promise<void>
  onApproveSwap: (swapId: string, approved: boolean, notes?: string) => Promise<void>
}

export function QuickActions({ swap, onUpdateSwap, onCancelSwap, onApproveSwap }: QuickActionsProps) {
  const { t } = useTranslations()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [editForm, setEditForm] = useState({
    urgency: swap.urgency,
    reason: swap.reason,
    expires_at: swap.expires_at
  })
  const [cancelReason, setCancelReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdateUrgency = async (newUrgency: string) => {
    setLoading(true)
    try {
      await onUpdateSwap(swap.id, { urgency: newUrgency as SwapTypes.SwapUrgency })
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async () => {
    setLoading(true)
    try {
      await onUpdateSwap(swap.id, editForm)
      setShowEditDialog(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    try {
      await onCancelSwap(swap.id, cancelReason)
      setShowCancelDialog(false)
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyColor = (urgency: SwapTypes.SwapUrgency): string => {
    switch (urgency) {
      case SwapTypes.SwapUrgency.Emergency: return 'bg-red-100 text-red-800 border-red-200'
      case SwapTypes.SwapUrgency.High: return 'bg-orange-100 text-orange-800 border-orange-200'
      case SwapTypes.SwapUrgency.Normal: return 'bg-blue-100 text-blue-800 border-blue-200'
      case SwapTypes.SwapUrgency.Low: return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Visual Urgency Badge */}
        <div className={`px-2 py-1 rounded-md text-xs font-medium border ${getUrgencyColor(swap.urgency)}`}>
          {swap.urgency.charAt(0).toUpperCase() + swap.urgency.slice(1)}
        </div>

        {/* Quick Urgency Update */}
        <Select
          value={swap.urgency}
          onValueChange={handleUpdateUrgency}
          disabled={loading || swap.status === SwapTypes.SwapStatus.Executed}
        >
          <option value="low">{t('swaps.lowPriority')}</option>
          <option value="normal">{t('swaps.normalPriority')}</option>
          <option value="high">{t('swaps.highPriority')}</option>
          <option value="emergency">{t('swaps.emergencyPriority')}</option>
        </Select>

        {/* Quick Approve/Decline if pending */}
        {swap.status === SwapTypes.SwapStatus.Pending && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApproveSwap(swap.id, true)}
              className="text-green-700 border-green-200 hover:bg-green-50"
              disabled={loading}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {t('workflow.approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApproveSwap(swap.id, false)}
              className="text-red-700 border-red-200 hover:bg-red-50"
              disabled={loading}
            >
              <X className="h-3 w-3 mr-1" />
              {t('workflow.decline')}
            </Button>
          </>
        )}

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              {t('swaps.editDetails')}
            </DropdownMenuItem>
            {swap.status === SwapTypes.SwapStatus.Pending && (
              <DropdownMenuItem
                onClick={() => setShowCancelDialog(true)}
                className="text-red-600"
              >
                <X className="h-4 w-4 mr-2" />
                {t('swaps.cancelRequest')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('swaps.editSwapRequest')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('swaps.urgencyLevel')}</label>
              <Select
                value={editForm.urgency}
                onValueChange={(value) => setEditForm({ ...editForm, urgency: value as SwapTypes.SwapUrgency })}
              >
                <option value="low">{t('swaps.lowPriority')}</option>
                <option value="normal">{t('swaps.normalPriority')}</option>
                <option value="high">{t('swaps.highPriority')}</option>
                <option value="emergency">{t('swaps.emergencyPriority')}</option>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('swaps.reason')}</label>
              <Textarea
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('swaps.expiresAt')}</label>
              <input
                type="datetime-local"
                value={editForm.expires_at?.split('.')[0]}
                onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value + 'Z' })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditSubmit} disabled={loading}>
              {loading ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('swaps.cancelSwapRequest')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('swaps.cancellationReason')} ({t('common.optional')})
              </label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('swaps.explainWhyCancelling')}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              {t('common.keepRequest')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={loading}
            >
              {loading ? t('common.cancelling') : t('swaps.confirmCancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}