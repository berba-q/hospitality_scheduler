'use client'
// Modal to confirm deletion of a staff member

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface DeleteConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  staffMember: any
  loading?: boolean
}

export function DeleteConfirmationDialog({ 
  open, 
  onClose, 
  onConfirm, 
  staffMember, 
  loading = false 
}: DeleteConfirmationDialogProps) {
  if (!staffMember) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Delete Staff Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold">
              {staffMember.full_name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <p className="font-semibold text-red-900">{staffMember.full_name}</p>
              <p className="text-sm text-red-700">{staffMember.role}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">This action cannot be undone</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Deleting this staff member will:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                  <li>Remove them from all schedules</li>
                  <li>Cancel any pending shift swaps</li>
                  <li>Delete their availability records</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-sm">
            Are you sure you want to permanently delete <strong>{staffMember.full_name}</strong>?
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Staff Member
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}