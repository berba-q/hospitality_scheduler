// hospitality-scheduler-pwa/src/components/availability/TimeOffRequestModal.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Calendar as CalendarIcon,
  Clock, 
  AlertTriangle, 
  Info,
  Sun,
  Sunset,
  Moon,
  Clock12,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface TimeOffRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (requestData: any) => Promise<void>
  userStaffId: string
}

const QUICK_PATTERNS = [
  {
    id: 'morning',
    name: 'Morning Shift',
    description: '6:00 AM - 2:00 PM',
    icon: Sun,
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 'afternoon', 
    name: 'Afternoon Shift',
    description: '2:00 PM - 10:00 PM',
    icon: Sunset,
    color: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'evening',
    name: 'Evening Shift', 
    description: '10:00 PM - 6:00 AM',
    icon: Moon,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'fullday',
    name: 'Full Day',
    description: 'Entire 24-hour period',
    icon: Clock12,
    color: 'bg-gray-100 text-gray-800'
  },
  {
    id: 'custom',
    name: 'Custom Hours',
    description: 'Set specific time range',
    icon: Clock,
    color: 'bg-purple-100 text-purple-800'
  }
]

export function TimeOffRequestModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  userStaffId 
}: TimeOffRequestModalProps) {
  const [requestType, setRequestType] = useState<'single' | 'range'>('single')
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [selectedPattern, setSelectedPattern] = useState('fullday')
  const [reason, setReason] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [customStartHour, setCustomStartHour] = useState<number>(9)
  const [customEndHour, setCustomEndHour] = useState<number>(17)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (requestType === 'single' && !selectedDate) {
      toast.error('Please select a date')
      return
    }
    
    if (requestType === 'range' && (!startDate || !endDate)) {
      toast.error('Please select start and end dates')
      return
    }

    if (selectedPattern === 'custom' && customStartHour >= customEndHour) {
      toast.error('End time must be after start time')
      return
    }

    setIsSubmitting(true)
    
    try {
      if (requestType === 'single') {
        // Single date request
        const requestData = {
          pattern: selectedPattern,
          date: selectedDate,
          reason: reason || undefined,
          is_recurring: isRecurring,
          custom_start_hour: selectedPattern === 'custom' ? customStartHour : undefined,
          custom_end_hour: selectedPattern === 'custom' ? customEndHour : undefined
        }
        
        await onSubmit(requestData)
      } else {
        // Date range request - create multiple single-day requests
        const requests = []
        const current = new Date(startDate!)
        
        while (current <= endDate!) {
          requests.push({
            pattern: selectedPattern,
            date: new Date(current),
            reason: reason || undefined,
            is_recurring: false, // Range requests are not recurring
            custom_start_hour: selectedPattern === 'custom' ? customStartHour : undefined,
            custom_end_hour: selectedPattern === 'custom' ? customEndHour : undefined
          })
          current.setDate(current.getDate() + 1)
        }
        
        // Submit all requests
        for (const request of requests) {
          await onSubmit(request)
        }
      }
      
      toast.success('Time off request submitted successfully!')
      handleClose()
    } catch (error) {
      console.error('Failed to submit request:', error)
      toast.error('Failed to submit time off request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setRequestType('single')
    setSelectedDate(undefined)
    setStartDate(undefined)
    setEndDate(undefined)
    setSelectedPattern('fullday')
    setReason('')
    setIsRecurring(false)
    setCustomStartHour(9)
    setCustomEndHour(17)
    onClose()
  }

  const selectedPatternInfo = QUICK_PATTERNS.find(p => p.id === selectedPattern)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Request Time Off
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Type */}
          <div className="space-y-3">
            <Label>Request Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={requestType === 'single' ? 'default' : 'outline'}
                onClick={() => setRequestType('single')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <CalendarIcon className="w-5 h-5" />
                <div className="text-center">
                  <p className="font-medium">Single Date</p>
                  <p className="text-xs opacity-70">One specific day</p>
                </div>
              </Button>
              
              <Button
                variant={requestType === 'range' ? 'default' : 'outline'}
                onClick={() => setRequestType('range')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Clock className="w-5 h-5" />
                <div className="text-center">
                  <p className="font-medium">Date Range</p>
                  <p className="text-xs opacity-70">Multiple consecutive days</p>
                </div>
              </Button>
            </div>
          </div>

          {/* Date Selection */}
          {requestType === 'single' ? (
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => date < new Date() || (startDate && date < startDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Time Pattern Selection */}
          <div className="space-y-3">
            <Label>Time Period</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_PATTERNS.map((pattern) => {
                const Icon = pattern.icon
                return (
                  <Button
                    key={pattern.id}
                    variant={selectedPattern === pattern.id ? 'default' : 'outline'}
                    onClick={() => setSelectedPattern(pattern.id)}
                    className="h-auto p-3 flex flex-col items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    <div className="text-center">
                      <p className="font-medium text-xs">{pattern.name}</p>
                      <p className="text-xs opacity-70">{pattern.description}</p>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Custom Hours */}
          {selectedPattern === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Hour</Label>
                <Select value={customStartHour.toString()} onValueChange={(value) => setCustomStartHour(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>End Hour</Label>
                <Select value={customEndHour.toString()} onValueChange={(value) => setCustomEndHour(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Recurring Option (only for single dates) */}
          {requestType === 'single' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="recurring" className="text-sm">
                Make this a recurring unavailability (same time every week)
              </Label>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional: Let your manager know why you need this time off..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Important Notes</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  <li>• Time off requests affect future scheduling</li>
                  <li>• Your manager will be notified of this request</li>
                  <li>• This does not automatically cancel existing shifts</li>
                  <li>• For existing shifts, use the swap system instead</li>
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