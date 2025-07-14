// src/components/swap/StaffSwapRequestDialog.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Calendar, 
  Clock, 
  ArrowLeftRight, 
  AlertTriangle,
  Users,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface StaffSwapRequestDialogProps {
  isOpen: boolean
  onClose: () => void
  assignmentDetails: {
    day: number
    shift: number
    date: string
    shiftName: string
    shiftTime: string
  } | null
  onSubmitSwap: (swapData: {
    swap_type: 'auto' | 'specific'
    reason: string
    urgency: 'low' | 'normal' | 'high' | 'emergency'
    target_staff_id?: string
  }) => Promise<void>
  availableStaff?: Array<{
    id: string
    name: string
    role: string
  }>
}

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low Priority', description: 'Can wait a few days' },
  { value: 'normal', label: 'Normal', description: 'Standard request' },
  { value: 'high', label: 'High Priority', description: 'Need coverage soon' },
  { value: 'emergency', label: 'Emergency', description: 'Urgent coverage needed' }
]

export function StaffSwapRequestDialog({
  isOpen,
  onClose,
  assignmentDetails,
  onSubmitSwap,
  availableStaff = []
}: StaffSwapRequestDialogProps) {
  const [swapType, setSwapType] = useState<'auto' | 'specific'>('auto')
  const [reason, setReason] = useState('')
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high' | 'emergency'>('normal')
  const [targetStaffId, setTargetStaffId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the swap request')
      return
    }

    if (swapType === 'specific' && !targetStaffId) {
      toast.error('Please select a staff member to swap with')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmitSwap({
        swap_type: swapType,
        reason: reason.trim(),
        urgency,
        target_staff_id: swapType === 'specific' ? targetStaffId : undefined
      })
      
      toast.success('Swap request submitted successfully!')
      handleClose()
    } catch (error) {
      console.error('Failed to submit swap request:', error)
      toast.error('Failed to submit swap request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setReason('')
    setUrgency('normal')
    setSwapType('auto')
    setTargetStaffId('')
    onClose()
  }

  if (!assignmentDetails) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Request Shift Swap
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Shift Details */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">Shift to Swap</p>
                  <p className="text-blue-700 text-sm">
                    {assignmentDetails.date} • {assignmentDetails.shiftName}
                  </p>
                  <p className="text-blue-600 text-xs">
                    {assignmentDetails.shiftTime}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Swap Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">How would you like to find coverage?</Label>
            
            <div className="space-y-2">
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  swapType === 'auto' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSwapType('auto')}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={swapType === 'auto'}
                    onChange={() => setSwapType('auto')}
                    className="text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Find Anyone Available</p>
                    <p className="text-sm text-gray-600">Let the system find someone for you</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Recommended
                  </Badge>
                </div>
              </div>

              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  swapType === 'specific' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSwapType('specific')}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={swapType === 'specific'}
                    onChange={() => setSwapType('specific')}
                    className="text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Swap with Specific Person</p>
                    <p className="text-sm text-gray-600">Choose a specific colleague</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specific Staff Selection */}
          {swapType === 'specific' && (
            <div className="space-y-2">
              <Label>Select Staff Member</Label>
              <Select value={targetStaffId} onValueChange={setTargetStaffId}>
                <option value="">Choose a colleague...</option>
                {availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role})
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Swap Request</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you need to swap this shift..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label>Priority Level</Label>
            <Select value={urgency} onValueChange={(value: any) => setUrgency(value)}>
              {URGENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </Select>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">What happens next?</p>
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  <li>• Manager will review your request</li>
                  <li>• You will get notified when approved/declined</li>
                  <li>• If approved, we will find coverage or notify the specific person</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}