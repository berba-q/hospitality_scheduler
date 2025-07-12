// Quick Actions Component for Swap Requests
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Edit3, 
  X, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  MoreHorizontal,
  MessageSquare,
  Calendar
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface QuickActionsProps {
  swap: any
  onUpdateSwap: (swapId: string, updates: any) => Promise<void>
  onCancelSwap: (swapId: string, reason?: string) => Promise<void>
  onApproveSwap: (swapId: string, approved: boolean, notes?: string) => Promise<void>
}

export function QuickActions({ swap, onUpdateSwap, onCancelSwap, onApproveSwap }: QuickActionsProps) {
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
      await onUpdateSwap(swap.id, { urgency: newUrgency })
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Quick Urgency Update */}
        <Select
          value={swap.urgency}
          onValueChange={handleUpdateUrgency}
          disabled={loading || swap.status === 'completed'}
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="emergency">Emergency</option>
        </Select>

        {/* Quick Approve/Decline if pending */}
        {swap.status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApproveSwap(swap.id, true)}
              className="text-green-700 border-green-200 hover:bg-green-50"
              disabled={loading}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApproveSwap(swap.id, false)}
              className="text-red-700 border-red-200 hover:bg-red-50"
              disabled={loading}
            >
              <X className="h-3 w-3 mr-1" />
              Decline
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
              Edit Details
            </DropdownMenuItem>
            {swap.status === 'pending' && (
              <DropdownMenuItem 
                onClick={() => setShowCancelDialog(true)}
                className="text-red-600"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Request
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Swap Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Urgency</label>
              <Select
                value={editForm.urgency}
                onValueChange={(value) => setEditForm({ ...editForm, urgency: value })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <Textarea
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Expires At</label>
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
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={loading}>
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Swap Request</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Cancellation Reason</label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional reason for cancellation..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Request
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={loading}
            >
              {loading ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}