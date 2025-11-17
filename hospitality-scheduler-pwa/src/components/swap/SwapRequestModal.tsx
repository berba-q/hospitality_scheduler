// Swap request component
'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from '@/hooks/useTranslations'
import {
  ArrowLeftRight,
  Users,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import * as ScheduleTypes from '@/types/schedule'
import * as ApiTypes from '@/types/api'

interface ShiftInfo {
  name: string
  time: string
  color?: string
}

interface CurrentAssignment {
  day: number
  shift: number
  staffId: string
}

interface SwapRequestModalProps {
  open: boolean
  onClose: () => void
  schedule: ApiTypes.ScheduleWithAssignments
  currentAssignment?: CurrentAssignment
  staff: ScheduleTypes.Staff[]
  shifts: ShiftInfo[]
  days: string[]
  isManager: boolean
  onSwapRequest: (swapData: SwapRequestData) => Promise<void>
}

interface SwapRequestData {
  schedule_id: string
  original_day?: number
  original_shift?: number
  reason: string
  urgency: string
  swap_type: 'specific' | 'auto'
  target_staff_id?: string
  target_day?: number
  target_shift?: number
  requesting_staff_id?: string
  preferred_skills?: string[]
  avoid_staff_ids?: string[]
}

export function SwapRequestModal({
  open,
  onClose,
  schedule,
  currentAssignment,
  staff,
  shifts,
  days,
  isManager,
  onSwapRequest
}: SwapRequestModalProps) {
  const { t } = useTranslations()
  
  const [swapType, setSwapType] = useState<'specific' | 'auto'>('specific')
  const [selectedTargetStaff, setSelectedTargetStaff] = useState('')
  const [selectedTargetDay, setSelectedTargetDay] = useState('')
  const [selectedTargetShift, setSelectedTargetShift] = useState('')
  const [reason, setReason] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [requestingStaffId, setRequestingStaffId] = useState('')
  const [preferredSkills, setPreferredSkills] = useState<string[]>([])
  const [avoidStaffIds, setAvoidStaffIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Define urgency levels with translations
  const URGENCY_LEVELS = [
    { value: 'low', label: t('swaps.low'), color: 'bg-gray-100 text-gray-800', icon: Clock },
    { value: 'normal', label: t('swaps.normal'), color: 'bg-blue-100 text-blue-800', icon: Clock },
    { value: 'high', label: t('swaps.high'), color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    { value: 'emergency', label: t('swaps.emergency'), color: 'bg-red-100 text-red-800', icon: AlertTriangle }
  ]

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setSwapType('specific')
      setSelectedTargetStaff('')
      setSelectedTargetDay('')
      setSelectedTargetShift('')
      setReason('')
      setUrgency('normal')
      setRequestingStaffId(currentAssignment?.staffId || '')
      setPreferredSkills([])
      setAvoidStaffIds([])
    }
  }, [open, currentAssignment])

  // Get current staff member
  const currentStaff = staff.find(s => s.id === currentAssignment?.staffId)
  const targetStaff = staff.find(s => s.id === selectedTargetStaff)

  // Get assignments for target validation
  const getAssignments = (day: number, shift: number): ApiTypes.ScheduleAssignment[] => {
    if (!schedule?.assignments) return []
    return schedule.assignments.filter((a) => a.day === day && a.shift === shift)
  }

  // Get available staff for specific swaps
  const getAvailableStaff = (): ScheduleTypes.Staff[] => {
    console.log('🔍 getAvailableStaff called with:', {
      selectedTargetDay,
      selectedTargetShift,
      schedule: schedule,
      staffCount: staff?.length
    })

    if (!selectedTargetDay || selectedTargetShift === '') {
      console.log('⚠️ Missing target day or shift selection')
      return []
    }

    const dayIndex = parseInt(selectedTargetDay)
    const shiftIndex = parseInt(selectedTargetShift)

    console.log('🔍 Looking for assignments on day', dayIndex, 'shift', shiftIndex)
    console.log('🔍 Schedule assignments:', schedule?.assignments)

    const assignments = getAssignments(dayIndex, shiftIndex)
    console.log('🔍 Found assignments for target day/shift:', assignments)

    // Get staff who are NOT already assigned to a shift on the target day
    const availableStaff = staff.filter(s => {
      if (!s.is_active || s.id === currentAssignment?.staffId) return false

      // Check if staff is already assigned on the target day (any shift)
      const hasConflict = schedule?.assignments?.some((a) =>
        a.staff_id === s.id && a.day === dayIndex
      )

      return !hasConflict
    })

    console.log('📊 Available staff (no conflicts):', availableStaff.length)
    console.log('✅ Returning available staff:', availableStaff.map(s => ({ id: s.id, name: s.full_name })))

    return availableStaff
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error(t('swaps.pleaseProvideReason'))
      return
    }

    if (swapType === 'specific') {
      if (!selectedTargetStaff || selectedTargetDay === '' || selectedTargetShift === '') {
        toast.error(t('swaps.pleaseSelectTargetStaffAndShift'))
        return
      }
    }

    if (isManager && !requestingStaffId) {
      toast.error(t('swaps.pleaseSelectRequestingStaff'))
      return
    }

    setLoading(true)
    try {
      const swapData = {
        schedule_id: schedule.id,
        original_day: currentAssignment?.day,
        original_shift: currentAssignment?.shift,
        reason: reason.trim(),
        urgency,
        swap_type: swapType,
        ...(swapType === 'specific' ? {
          target_staff_id: selectedTargetStaff,
          target_day: parseInt(selectedTargetDay),
          target_shift: parseInt(selectedTargetShift)
        } : {
          requesting_staff_id: isManager ? requestingStaffId : undefined,
          preferred_skills: preferredSkills,
          avoid_staff_ids: avoidStaffIds
        })
      }

      await onSwapRequest(swapData)
      toast.success(t('swaps.swapRequestCreatedSuccessfully'))
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('swaps.failedToCreateSwapRequest')
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            {t('swaps.requestShiftSwap')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Assignment Info */}
          {currentAssignment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('swaps.currentAssignment')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{days[currentAssignment.day]}</span>
                  </div>
                  <Badge className={shifts[currentAssignment.shift]?.color || 'bg-gray-100'}>
                    {shifts[currentAssignment.shift]?.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{currentStaff?.full_name}</span>
                  <Badge variant="outline">{currentStaff?.role}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {shifts[currentAssignment.shift]?.time}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manager: Select Requesting Staff */}
          {isManager && (
            <div className="space-y-2">
              <Label>{t('swaps.staffMemberRequestingSwap')}</Label>
              <Select value={requestingStaffId} onValueChange={setRequestingStaffId}>
                <option value="" disabled>{t('swaps.selectStaffMember')}</option>
                {staff.filter(s => s.is_active).map(staffMember => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.full_name} - {staffMember.role}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Swap Type Selection */}
          <Tabs value={swapType} onValueChange={(value) => setSwapType(value as 'specific' | 'auto')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="specific" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('swaps.specificSwap')}
              </TabsTrigger>
              <TabsTrigger value="auto" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t('swaps.autoAssignment')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="specific" className="space-y-4">
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                {t('swaps.specificSwapDescription')}
              </div>

              {/* Target Day Selection */}
              <div className="space-y-2">
                <Label>{t('swaps.targetDay')}</Label>
                <Select value={selectedTargetDay} onValueChange={setSelectedTargetDay}>
                  <option value="" disabled>{t('swaps.selectDay')}</option>
                  {days.map((day, index) => (
                    <option key={index} value={index.toString()}>
                      {day}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Target Shift Selection */}
              <div className="space-y-2">
                <Label>{t('swaps.targetShift')}</Label>
                <Select value={selectedTargetShift} onValueChange={setSelectedTargetShift}>
                  <option value="" disabled>{t('swaps.selectShift')}</option>
                  {shifts.map((shift, index) => (
                    <option key={index} value={index.toString()}>
                      {shift.name} ({shift.time})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Target Staff Selection */}
              {selectedTargetDay && selectedTargetShift !== '' && (
                <div className="space-y-2">
                  <Label>{t('swaps.staffMemberToSwapWith')}</Label>
                  <Select value={selectedTargetStaff} onValueChange={setSelectedTargetStaff}>
                    <option value="" disabled>{t('swaps.selectStaffMember')}</option>
                    {getAvailableStaff().map(staffMember => (
                      <option key={staffMember.id} value={staffMember.id}>
                        {staffMember.full_name} - {staffMember.role} ⭐{staffMember.skill_level || t('common.na')}
                      </option>
                    ))}
                  </Select>
                  {getAvailableStaff().length === 0 && (
                    <p className="text-xs text-gray-500">
                      {t('swaps.noStaffAssignedToShift')}
                    </p>
                  )}
                </div>
              )}

              {/* Swap Preview */}
              {targetStaff && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="font-medium">{currentStaff?.full_name}</div>
                        <div className="text-sm text-gray-600">
                          {days[currentAssignment?.day || 0]} - {shifts[currentAssignment?.shift || 0]?.name}
                        </div>
                      </div>
                      <ArrowLeftRight className="h-5 w-5 text-green-600" />
                      <div className="text-center">
                        <div className="font-medium">{targetStaff.full_name}</div>
                        <div className="text-sm text-gray-600">
                          {days[parseInt(selectedTargetDay)]} - {shifts[parseInt(selectedTargetShift)]?.name}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="auto" className="space-y-4">
              <div className="text-sm text-gray-600 bg-purple-50 p-3 rounded-md">
                {t('swaps.autoAssignmentDescription')}
              </div>

              {/* Preferred Skills */}
              <div className="space-y-2">
                <Label>{t('swaps.preferredSkillsOptional')}</Label>
                <Input
                  placeholder={t('swaps.skillsPlaceholder')}
                  value={preferredSkills.join(', ')}
                  onChange={(e) => setPreferredSkills(
                    e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  )}
                />
                <p className="text-xs text-gray-500">
                  {t('swaps.skillsHelpText')}
                </p>
              </div>

              {/* Avoid Staff */}
              <div className="space-y-2">
                <Label>{t('swaps.avoidSpecificStaffOptional')}</Label>
                <Select 
                  value="" 
                  onValueChange={(value) => {
                    if (value && !avoidStaffIds.includes(value)) {
                      setAvoidStaffIds([...avoidStaffIds, value])
                    }
                  }}
                >
                  <option value="" disabled>{t('swaps.selectStaffToAvoid')}</option>
                  {staff
                    .filter(s => s.is_active && s.id !== currentAssignment?.staffId && !avoidStaffIds.includes(s.id))
                    .map(staffMember => (
                      <option key={staffMember.id} value={staffMember.id}>
                        {staffMember.full_name} - {staffMember.role}
                      </option>
                    ))}
                </Select>
                {avoidStaffIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {avoidStaffIds.map(staffId => {
                      const staffMember = staff.find(s => s.id === staffId)
                      return (
                        <Badge 
                          key={staffId} 
                          variant="secondary" 
                          className="flex items-center gap-1"
                        >
                          {staffMember?.full_name}
                          <button
                            onClick={() => setAvoidStaffIds(avoidStaffIds.filter(id => id !== staffId))}
                            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t('swaps.reasonForSwapRequest')}</Label>
            <Textarea
              placeholder={t('swaps.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label>{t('swaps.urgencyLevel')}</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <option value="" disabled>{t('swaps.selectUrgency')}</option>
              {URGENCY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-2 mt-2">
              {(() => {
                const urgencyLevel = URGENCY_LEVELS.find(l => l.value === urgency)
                const UrgencyIcon = urgencyLevel?.icon || Clock
                return (
                  <>
                    <UrgencyIcon className="h-4 w-4" />
                    <Badge className={urgencyLevel?.color}>
                      {urgencyLevel?.label}
                    </Badge>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !reason.trim()}
              className="flex-1"
            >
              {loading ? t('swaps.creating') : t('swaps.createSwapRequest')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}