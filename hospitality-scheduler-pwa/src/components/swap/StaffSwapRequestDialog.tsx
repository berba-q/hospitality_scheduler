// src/components/swap/StaffSwapRequestDialog.tsx 
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
  // Add schedule context
  scheduleId?: string  // Current schedule ID
  currentWeek?: string // Current week for context
  assignmentDetails: {
    day: number
    shift: number
    date: string
    shiftName: string
    shiftTime: string
  } | null
  onSubmitSwap: (swapData: {
    schedule_id: string    // 🔥 FIX: Add schedule_id to the interface
    swap_type: 'auto' | 'specific'
    reason: string
    urgency: 'low' | 'normal' | 'high' | 'emergency'
    original_day: number   // 🔥 FIX: Add required fields
    original_shift: number
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHIFTS = [
  { value: 0, label: 'Morning (6AM-2PM)' },
  { value: 1, label: 'Afternoon (2PM-10PM)' },
  { value: 2, label: 'Evening (10PM-6AM)' }
]

export function StaffSwapRequestDialog({
  isOpen,
  onClose,
  scheduleId,         // Accept schedule context
  currentWeek,
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

    // 🔥 FIX: Validate schedule_id exists
    if (!scheduleId) {
      toast.error('No schedule selected. Please try again from the schedule page.')
      return
    }

    if (swapType === 'specific' && !targetStaffId) {
      toast.error('Please select a staff member to swap with')
      return
    }

    try {
      setIsSubmitting(true)
      
      // 🔥 FIX: Include all required fields in the payload
      const swapData = {
        schedule_id: scheduleId,              // ← This was missing!
        swap_type: swapType,
        reason: reason.trim(),
        urgency,
        original_day: assignmentDetails?.day ?? selectedDay,      // ← Required
        original_shift: assignmentDetails?.shift ?? selectedShift, // ← Required
        ...(swapType === 'specific' && targetStaffId && {
          target_staff_id: targetStaffId
        })
      }

      console.log('🚀 Submitting swap request:', swapData)
      await onSubmitSwap(swapData)
      
      // Reset form
      setReason('')
      setUrgency('normal')
      setTargetStaffId('')
      setSwapType('auto')
      onClose()
      
    } catch (error) {
      console.error('❌ Swap request failed:', error)
      toast.error(error.message || 'Failed to create swap request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Request Shift Swap
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 🔥 FIX: Show schedule context for clarity */}
          {scheduleId && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Calendar className="w-4 h-4" />
                  <span>Week: {currentWeek || 'Current Schedule'}</span>
                  <span className="text-blue-500">•</span>
                  <span>Schedule ID: {scheduleId.slice(0, 8)}...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shift Context */}
          {assignmentDetails ? (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Your Current Assignment
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Day:</span>
                    <div className="font-medium">{DAYS[assignmentDetails.day]}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Shift:</span>
                    <div className="font-medium">{assignmentDetails.shiftName}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <div className="font-medium">{assignmentDetails.date}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <div className="font-medium">{assignmentDetails.shiftTime}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Manual shift selection when no assignment context
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Select Shift to Swap</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="day">Day</Label>
                    <Select value={selectedDay.toString()} onValueChange={(value) => setSelectedDay(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shift">Shift</Label>
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
              </CardContent>
            </Card>
          )}

          {/* Swap Type Selection */}
          <div className="space-y-3">
            <Label>Swap Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all ${swapType === 'auto' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                onClick={() => setSwapType('auto')}
              >
                <CardContent className="p-4 text-center">
                  <CheckCircle className={`w-6 h-6 mx-auto mb-2 ${swapType === 'auto' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="font-medium">Auto Coverage</div>
                  <div className="text-xs text-gray-600 mt-1">System finds coverage</div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all ${swapType === 'specific' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                onClick={() => setSwapType('specific')}
              >
                <CardContent className="p-4 text-center">
                  <Users className={`w-6 h-6 mx-auto mb-2 ${swapType === 'specific' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="font-medium">Specific Staff</div>
                  <div className="text-xs text-gray-600 mt-1">Choose who to swap with</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Target Staff Selection (for specific swaps) */}
          {swapType === 'specific' && (
            <div className="space-y-2">
              <Label htmlFor="target-staff">Select Staff Member</Label>
              <Select value={targetStaffId} onValueChange={setTargetStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member to swap with..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name} - {staff.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Urgency Level */}
          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency Level</Label>
            <Select value={urgency} onValueChange={(value: 'low' | 'normal' | 'high' | 'emergency') => setUrgency(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500">- {option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Swap Request</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you need this shift covered..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {urgency === 'emergency' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-700">
                  <strong>Emergency Request:</strong> This will be marked as high priority and managers will be notified immediately.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating Request...' : 'Create Swap Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}