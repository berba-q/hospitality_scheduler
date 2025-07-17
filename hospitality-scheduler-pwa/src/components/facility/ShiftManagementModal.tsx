'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  Plus, 
  Trash2, 
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Users,
  Shield,
  Eye,
  EyeOff,
  GripVertical,
  Coffee,
  Sun,
  Moon,
  Sunset,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { useFacilityShifts } from '@/hooks/useFacility'

interface ShiftConfig {
  id: string
  name: string
  start_time: string
  end_time: string
  requires_manager: boolean
  min_staff: number
  max_staff: number
  is_active: boolean
  shift_order: number
  color?: string
}

interface ShiftManagementModalProps {
  open: boolean
  onClose: () => void
  facility: any
  onShiftsUpdated?: () => void
}

// Predefined shift templates for different facility types
const SHIFT_TEMPLATES = {
  hotel: [
    { name: 'Day Shift', start_time: '06:00', end_time: '14:00', requires_manager: false, min_staff: 3, max_staff: 8, color: 'blue' },
    { name: 'Evening Shift', start_time: '14:00', end_time: '22:00', requires_manager: true, min_staff: 4, max_staff: 10, color: 'orange' },
    { name: 'Night Shift', start_time: '22:00', end_time: '06:00', requires_manager: true, min_staff: 2, max_staff: 5, color: 'purple' }
  ],
  restaurant: [
    { name: 'Breakfast', start_time: '07:00', end_time: '11:00', requires_manager: false, min_staff: 2, max_staff: 5, color: 'yellow' },
    { name: 'Lunch', start_time: '11:00', end_time: '16:00', requires_manager: true, min_staff: 4, max_staff: 8, color: 'green' },
    { name: 'Dinner', start_time: '16:00', end_time: '23:00', requires_manager: true, min_staff: 5, max_staff: 12, color: 'red' }
  ],
  resort: [
    { name: 'Morning', start_time: '06:00', end_time: '14:00', requires_manager: false, min_staff: 5, max_staff: 15, color: 'blue' },
    { name: 'Afternoon', start_time: '14:00', end_time: '22:00', requires_manager: true, min_staff: 6, max_staff: 18, color: 'orange' },
    { name: 'Evening', start_time: '22:00', end_time: '06:00', requires_manager: true, min_staff: 3, max_staff: 8, color: 'purple' }
  ],
  cafe: [
    { name: 'Opening', start_time: '06:00', end_time: '12:00', requires_manager: false, min_staff: 2, max_staff: 4, color: 'green' },
    { name: 'Midday', start_time: '12:00', end_time: '18:00', requires_manager: true, min_staff: 3, max_staff: 6, color: 'orange' },
    { name: 'Closing', start_time: '18:00', end_time: '21:00', requires_manager: false, min_staff: 2, max_staff: 4, color: 'purple' }
  ],
  bar: [
    { name: 'Happy Hour', start_time: '16:00', end_time: '20:00', requires_manager: false, min_staff: 2, max_staff: 4, color: 'yellow' },
    { name: 'Evening', start_time: '20:00', end_time: '01:00', requires_manager: true, min_staff: 3, max_staff: 8, color: 'red' },
    { name: 'Late Night', start_time: '01:00', end_time: '03:00', requires_manager: true, min_staff: 2, max_staff: 4, color: 'purple' }
  ]
}

const SHIFT_COLORS = [
  { id: 'blue', name: 'Blue', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  { id: 'green', name: 'Green', bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  { id: 'orange', name: 'Orange', bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  { id: 'red', name: 'Red', bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  { id: 'yellow', name: 'Yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
  { id: 'gray', name: 'Gray', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' }
]

const getShiftIcon = (shiftName: string) => {
  const name = shiftName.toLowerCase()
  if (name.includes('morning') || name.includes('breakfast') || name.includes('opening')) return Sun
  if (name.includes('afternoon') || name.includes('lunch') || name.includes('midday')) return Sunset
  if (name.includes('evening') || name.includes('night') || name.includes('dinner') || name.includes('late')) return Moon
  if (name.includes('happy') || name.includes('coffee')) return Coffee
  return Clock
}

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

const calculateShiftDuration = (startTime: string, endTime: string) => {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  let startMinutes = startHour * 60 + startMin
  let endMinutes = endHour * 60 + endMin
  
  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }
  
  const diffMinutes = endMinutes - startMinutes
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  
  return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
}

export function ShiftManagementModal({
  open,
  onClose,
  facility,
  onShiftsUpdated
}: ShiftManagementModalProps) {
  const { shifts, loading, updateShiftsBulk } = useFacilityShifts(facility?.id)
  const [saving, setSaving] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const [localShifts, setLocalShifts] = useState<ShiftConfig[]>([])
  const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
    if (shifts.length > 0) {
      setLocalShifts([...shifts])
      setHasChanges(false)
    }
  }, [shifts])

  const validateShifts = (shiftsToValidate: ShiftConfig[]): string[] => {
    const errors: string[] = []
    
    shiftsToValidate.forEach((shift, index) => {
      if (!shift.name.trim()) {
        errors.push(`Shift ${index + 1}: Name is required`)
      }
      
      if (!shift.start_time || !shift.end_time) {
        errors.push(`Shift ${index + 1}: Start and end times are required`)
      }
      
      if (shift.min_staff > shift.max_staff) {
        errors.push(`Shift ${index + 1}: Minimum staff cannot exceed maximum staff`)
      }
      
      if (shift.min_staff < 1) {
        errors.push(`Shift ${index + 1}: At least 1 staff member is required`)
      }
    })

    // Check for overlapping shifts (warning, not error)
    for (let i = 0; i < shiftsToValidate.length; i++) {
      for (let j = i + 1; j < shiftsToValidate.length; j++) {
        const shift1 = shiftsToValidate[i]
        const shift2 = shiftsToValidate[j]
        
        // Simple overlap check (could be enhanced)
        if (shift1.start_time === shift2.start_time) {
          errors.push(`Warning: Shifts "${shift1.name}" and "${shift2.name}" have the same start time`)
        }
      }
    }
    
    return errors
  }

  const addShift = () => {
    const newShift: ShiftConfig = {
      id: `shift-${Date.now()}`,
      name: 'New Shift',
      start_time: '09:00',
      end_time: '17:00',
      requires_manager: false,
      min_staff: 1,
      max_staff: 5,
      is_active: true,
      shift_order: shifts.length,
      color: SHIFT_COLORS[shifts.length % SHIFT_COLORS.length].id
    }
    setLocalShifts([...localShifts, newShift]) // ✅ Use local state for editing
    setHasChanges(true)
  }

  const updateShift = (index: number, field: keyof ShiftConfig, value: any) => {
    const updated = localShifts.map((shift, i) => 
      i === index ? { ...shift, [field]: value } : shift
    )
    setLocalShifts(updated) // ✅ Use local state for editing
    setHasChanges(true)
    setValidationErrors([])
  }

  const removeShift = (index: number) => {
    if (localShifts.length <= 1) {
      toast.error('At least one shift is required')
      return
    }
    setLocalShifts(localShifts.filter((_, i) => i !== index)) // ✅ Use local state
    setHasChanges(true)
  }

  const moveShift = (index: number, direction: 'up' | 'down') => {
    const newShifts = [...localShifts] // ✅ Use local state
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= localShifts.length) return
    
    [newShifts[index], newShifts[targetIndex]] = [newShifts[targetIndex], newShifts[index]]
    
    newShifts.forEach((shift, i) => {
      shift.shift_order = i
    })
    
    setLocalShifts(newShifts)
    setHasChanges(true)
  }

  const loadTemplate = (facilityType: string) => {
    const template = SHIFT_TEMPLATES[facilityType]
    if (template) {
      setLocalShifts(template.map((shift, index) => ({
        ...shift,
        id: `shift-${Date.now()}-${index}`,
        shift_order: index,
        is_active: true
      })))
      setHasChanges(true)
      setShowTemplates(false)
      toast.success(`Applied ${facilityType} template`)
    }
  }

  const resetToOriginal = () => {
    setLocalShifts([...shifts]) // ✅ Reset to hook's original data
    setHasChanges(false)
    setValidationErrors([])
  }

  const saveShifts = async () => {
    const errors = validateShifts(localShifts) // ✅ Validate local edits
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setSaving(true)
    try {
      await updateShiftsBulk(localShifts) // ✅ Save local edits via hook
      setHasChanges(false)
      setValidationErrors([])
      
      if (onShiftsUpdated) {
        onShiftsUpdated()
      }
      onClose()
    } catch (error) {
      // Hook handles error display
    } finally {
      setSaving(false)
    }
  }

  const ShiftCard = ({ shift, index }: { shift: ShiftConfig; index: number }) => {
    const colorConfig = SHIFT_COLORS.find(c => c.id === shift.color) || SHIFT_COLORS[0]
    const ShiftIcon = getShiftIcon(shift.name)
    const duration = calculateShiftDuration(shift.start_time, shift.end_time)

    return (
      <Card className={`border-2 ${colorConfig.border} ${colorConfig.bg} transition-all duration-200`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveShift(index, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-white/50 rounded disabled:opacity-30"
                >
                  <GripVertical className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveShift(index, 'down')}
                  disabled={index === shifts.length - 1}
                  className="p-1 hover:bg-white/50 rounded disabled:opacity-30"
                >
                  <GripVertical className="w-3 h-3" />
                </button>
              </div>
              
              <div className={`w-10 h-10 ${colorConfig.bg} border-2 ${colorConfig.border} rounded-lg flex items-center justify-center`}>
                <ShiftIcon className={`w-5 h-5 ${colorConfig.text}`} />
              </div>
              
              <div className="flex-1">
                <Input 
                  value={shift.name}
                  onChange={(e) => updateShift(index, 'name', e.target.value)}
                  className="text-lg font-semibold bg-transparent border-0 p-0 h-auto focus:bg-white/50 rounded"
                />
                <div className={`text-sm ${colorConfig.text} mt-1`}>
                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)} ({duration})
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => updateShift(index, 'is_active', !shift.is_active)}
                className="hover:bg-white/50"
              >
                {shift.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => removeShift(index)}
                className="text-red-600 hover:bg-red-100"
                disabled={shifts.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-4">
          {/* Time Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium">Start Time</Label>
              <Input 
                type="time"
                value={shift.start_time}
                onChange={(e) => updateShift(index, 'start_time', e.target.value)}
                className="bg-white/50 border-0 focus:bg-white"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">End Time</Label>
              <Input 
                type="time"
                value={shift.end_time}
                onChange={(e) => updateShift(index, 'end_time', e.target.value)}
                className="bg-white/50 border-0 focus:bg-white"
              />
            </div>
          </div>

          {/* Staffing Requirements */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium">Min Staff</Label>
              <Input 
                type="number"
                min="1"
                max="50"
                value={shift.min_staff}
                onChange={(e) => updateShift(index, 'min_staff', parseInt(e.target.value) || 1)}
                className="bg-white/50 border-0 focus:bg-white"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Max Staff</Label>
              <Input 
                type="number"
                min="1"
                max="50"
                value={shift.max_staff}
                onChange={(e) => updateShift(index, 'max_staff', parseInt(e.target.value) || 1)}
                className="bg-white/50 border-0 focus:bg-white"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id={`manager-${index}`}
                checked={shift.requires_manager}
                onChange={(e) => updateShift(index, 'requires_manager', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`manager-${index}`} className="text-sm font-medium">
                Requires Manager
              </label>
              {shift.requires_manager && <Shield className="w-4 h-4 text-amber-600" />}
            </div>

            {/* Color Picker */}
            <div className="flex gap-1">
              {SHIFT_COLORS.slice(0, 5).map(color => (
                <button
                  key={color.id}
                  onClick={() => updateShift(index, 'color', color.id)}
                  className={`w-6 h-6 rounded-full ${color.bg} border-2 ${
                    shift.color === color.id ? color.border : 'border-transparent'
                  } transition-all duration-200`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            Shift Management - {facility?.name}
            {hasChanges && <Badge variant="outline" className="text-orange-600">Unsaved Changes</Badge>}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Impact Alert */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Important:</strong> Changes to shift configuration will affect all future scheduling. 
              Existing schedules will use the shift names but new schedules will use these time settings.
            </AlertDescription>
          </Alert>

          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button 
                onClick={addShift} 
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Shift
              </Button>
              <Button 
                onClick={() => setShowTemplates(!showTemplates)} 
                variant="outline"
                className="gap-2"
              >
                <Calendar className="w-4 h-4" />
                Load Template
              </Button>
            </div>
            
            {hasChanges && (
              <Button 
                onClick={resetToOriginal} 
                variant="outline"
                className="gap-2 text-gray-600"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Changes
              </Button>
            )}
          </div>

          {/* Template Selector */}
          {showTemplates && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-blue-800 mb-3">Choose a template:</div>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(SHIFT_TEMPLATES).map(([type, template]) => (
                    <Button
                      key={type}
                      onClick={() => loadTemplate(type)}
                      variant="outline"
                      size="sm"
                      className="text-xs capitalize"
                    >
                      {type} ({template.length})
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="text-red-800">
                  <div className="font-medium mb-2">Please fix the following issues:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Shifts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading shift configuration...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {shifts.map((shift, index) => (
                <ShiftCard key={shift.id} shift={shift} index={index} />
              ))}
            </div>
          )}

          {/* Summary */}
          {shifts.length > 0 && (
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Configuration Summary</div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-600">{shifts.filter(s => s.is_active).length}</div>
                    <div className="text-gray-600">Active Shifts</div>
                  </div>
                  <div>
                    <div className="font-medium text-green-600">
                      {shifts.reduce((sum, s) => sum + s.min_staff, 0)} - {shifts.reduce((sum, s) => sum + s.max_staff, 0)}
                    </div>
                    <div className="text-gray-600">Staff Range</div>
                  </div>
                  <div>
                    <div className="font-medium text-purple-600">
                      {shifts.filter(s => s.requires_manager).length}
                    </div>
                    <div className="text-gray-600">Manager Required</div>
                  </div>
                  <div>
                    <div className="font-medium text-orange-600">
                      {shifts.reduce((total, shift) => {
                        const duration = calculateShiftDuration(shift.start_time, shift.end_time)
                        return total + parseInt(duration.split('h')[0])
                      }, 0)}h
                    </div>
                    <div className="text-gray-600">Total Coverage</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {shifts.length} shift{shifts.length !== 1 ? 's' : ''} configured
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={saveShifts} 
              disabled={!hasChanges || saving || validationErrors.length > 0}
              className="gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}