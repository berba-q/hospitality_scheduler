// src/components/swap/StaffSwapRequestDialog.tsx - Updated to handle missing assignment details
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    original_day?: number
    original_shift?: number
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHIFTS = [
  { value: 0, label: 'Morning (6AM-2PM)' },
  { value: 1, label: 'Afternoon (2PM-10PM)' },
  { value: 2, label: 'Evening (10PM-6AM)' }
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
  
  // For when assignment details are not provided
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedShift, setSelectedShift] = useState(0)

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
        target_staff_id: swapType === 'specific' ? targetStaffId : undefined,
        // Use assignment details if provided, otherwise use selected values
        original_day: assignmentDetails?.day ?? selectedDay,
        original_shift: assignmentDetails?.shift ?? selectedShift
      })
      
      toast.success('Swap request submitted successfully!')
      handleClose()
    } catch (error) {
      console.error('Failed to submit swap request:', error)
      toast.error(error.message || 'Failed to submit swap request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setReason('')
    setUrgency('normal')
    setSwapType('auto')
    setTargetStaffId('')
    setSelectedDay(0)
    setSelectedShift(0)
    onClose()
  }

  // Always render the dialog - don't require assignmentDetails
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
          {/* Shift Details - Show provided details or selectors */}
          {assignmentDetails ? (
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
          ) : (
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Shift to Swap</Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Day</Label>
                      <Select value={selectedDay.toString()} onValueChange={(value) => setSelectedDay(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-gray-600">Shift</Label>
                      <Select value={selectedShift.toString()} onValueChange={(value) => setSelectedShift(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHIFTS.map((shift) => (
                            <SelectItem key={shift.value} value={shift.value.toString()}>
                              {shift.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                <SelectTrigger>
                  <SelectValue placeholder="Choose a colleague..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.length > 0 ? (
                    availableStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name} ({staff.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No colleagues available
                    </SelectItem>
                  )}
                </SelectContent>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </SelectItem>
                ))}
              </SelectContent>
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