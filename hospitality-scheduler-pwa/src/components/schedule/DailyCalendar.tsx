// Daily calendar component to display assignments

// DailyCalendar debug fix - Enhanced logging and data structure handling
'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { X, Plus, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { SwapStatusIndicator } from '@/components/swap/SwapStatusIndicator'
import { ArrowLeftRight } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import * as ScheduleTypes from '@/types/schedule'
import * as SwapTypes from '@/types/swaps'
import * as FacilityTypes from '@/types/facility'

interface DailyCalendarProps {
  currentDate: Date
  schedule: ScheduleTypes.Schedule | null
  staff: ScheduleTypes.Staff[]
  shifts: FacilityTypes.FacilityShift[]
  isManager: boolean
  draggedStaff: ScheduleTypes.Staff | null
  onAssignmentChange: (shift: number, staffId: string) => void
  onRemoveAssignment: (assignmentId: string) => void
  getShiftAssignments?: (shift: number) => ScheduleTypes.ScheduleAssignment[]
  swapRequests?: SwapTypes.SwapRequest[]
  onSwapRequest?: (day: number, shift: number, staffId: string) => void
  highlightStaffId?: string
  showMineOnly?: boolean
  onToggleMineOnly?: () => void
}

export function DailyCalendar({
  currentDate,
  schedule,
  staff,
  shifts,
  isManager,
  draggedStaff,
  onAssignmentChange,
  onRemoveAssignment,
  swapRequests = [],
  onSwapRequest,
  highlightStaffId,
  showMineOnly,
  onToggleMineOnly
}: DailyCalendarProps) {
  const [selectedShift, setSelectedShift] = useState<number | null>(null)
  const { t } = useTranslations()

  // ENHANCED DEBUG LOGGING
  console.log('=== DailyCalendar Debug Info ===')
  console.log('Current Date:', currentDate.toDateString())
  console.log('Schedule:', schedule ? {
    id: schedule.id,
    week_start: schedule.week_start,
    assignments_count: schedule.assignments?.length || 0,
    assignments_sample: schedule.assignments?.slice(0, 3) || []
  } : 'NO SCHEDULE')
  console.log('Shifts Array:', shifts.map(s => ({
    id: s.id,
    shift_index: s.shift_index,
    name: s.name,
    start_time: s.start_time,
    end_time: s.end_time
  })))
  console.log('Staff Count:', staff.length)

  // Get staff member by ID
  const getStaffMember = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId)
    if (!staffMember) {
      console.warn('Staff member not found:', staffId, 'Available staff:', staff.map(s => s.id))
    }
    return staffMember
  }

  // Calculate which day of the week this date represents within the schedule
  const calculateDayIndex = () => {
    if (!schedule?.week_start) {
      console.warn('No schedule week_start found')
      return 0
    }
    
    const scheduleStart = new Date(schedule.week_start)
    const daysDiff = Math.floor((currentDate.getTime() - scheduleStart.getTime()) / (24 * 60 * 60 * 1000))
    const dayIndex = Math.max(0, Math.min(6, daysDiff))
    
    console.log('Day calculation:', {
      schedule_start: scheduleStart.toDateString(),
      current_date: currentDate.toDateString(),
      days_diff: daysDiff,
      day_index: dayIndex
    })
    
    return dayIndex
  }

  // ------------------------------------------------------------------
  // Get assignments for a specific shift *index* on the current day
  // ------------------------------------------------------------------
  const getShiftAssignments = (shiftIndex: number) => {
    if (!schedule?.assignments) {
      console.log('[DailyCalendar] No schedule assignments found')
      return []
    }

    const dayIndex = calculateDayIndex()

    console.log('[DailyCalendar] 🔍 Looking for assignments', {
      dayIndex,
      shiftIndex,
      totalAssignments: schedule.assignments.length,
    })

    // Filter assignments by day and shift index
    let assignments = schedule.assignments.filter((assignment) => {
      const matchesDay = Number(assignment.day) === dayIndex
      const matchesShift =
        Number(assignment.shift) === Number(shiftIndex) || // primary check
        assignment.shift_index === shiftIndex ||           // fallback if normalised elsewhere
        assignment.shift_id === shiftIndex                 // ultra‑defensive

      return matchesDay && matchesShift
    })

    // Apply "Mine Only" filter if enabled
    if (showMineOnly && highlightStaffId) {
      assignments = assignments.filter(
        (a) => String(a.staff_id) === String(highlightStaffId)
      )
    }

    console.log(
      `[DailyCalendar] ✅ Found ${assignments.length} assignments for day ${dayIndex}, shift ${shiftIndex}`,
    )

    return assignments
  }

  // Handle drop event
  const handleDrop = (e: React.DragEvent, shiftIdOrIndex: number | string) => {
    e.preventDefault()
    
    if (!isManager || !draggedStaff) return
    
    console.log('Drop event:', {
      shiftIdOrIndex,
      draggedStaff: draggedStaff.full_name,
      staffId: draggedStaff.id
    })
    
    onAssignmentChange(shiftIdOrIndex as number, draggedStaff.id)
    toast.success(`${draggedStaff.full_name} ${t('common.assigned')} to shift`)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getDayStats = () => {
    const dayIndex = calculateDayIndex()
    const dayAssignments = schedule?.assignments?.filter(a => a.day === dayIndex) || []
    
    return {
      totalAssignments: dayAssignments.length,
      coverageByShift: shifts.map(shift => ({
        ...shift,
        assignments: dayAssignments.filter(a => {
          // Check multiple possible shift identifiers
          return a.shift === Number(shift.shift_index) ||
                 (shift.shift_index !== undefined && a.shift_index === shift.shift_index)
        }).length
      }))
    }
  }

  const stats = getDayStats()

  return (
    <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('schedule.dailySchedule')}
            <Badge variant="outline" className="ml-2">
              {stats.totalAssignments} {t('common.assignments')}
            </Badge>
          </span>
          {!isManager ? (
            <div className="flex items-center gap-2">
              <Switch
                checked={showMineOnly}
                onCheckedChange={() => onToggleMineOnly && onToggleMineOnly()}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                {t('schedule.mineOnly')}
              </span>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">
              {t('common.viewOnly')}
            </Badge>
          )}
        </CardTitle>
        <div className="text-sm text-gray-600">
          {formatDate(currentDate)}
          {schedule && (
            <span className="ml-2">
              {t('schedule.schedule')}: {new Date(schedule.week_start).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-6">
          {/* Shift Cards */}
          <div className="space-y-4">
            {shifts.map((shift) => {
              // Use shift_index as the primary identifier, fallback to shift_order
              const shiftIndex = shift.shift_index ?? shift.shift_order
              const assignments = getShiftAssignments(shiftIndex)
              const isSelected = selectedShift === shiftIndex

              console.log(`Rendering shift ${shift.shift_name || shift.name}:`, {
                shift,
                shiftIndex,
                assignments_count: assignments.length,
                assignments
              })
              
              return (
                <Card
                  key={`shift-${shiftIndex}`}
                  className={`transition-all duration-200 ${
                    isManager ? 'cursor-pointer hover:shadow-md' : ''
                  } ${isSelected ? 'ring-2 ring-blue-300' : ''} ${
                    draggedStaff ? 'hover:bg-green-50 border-green-200' : ''
                  }`}
                  onClick={() => isManager && setSelectedShift(isSelected ? null : shiftIndex)}
                  onDrop={(e) => handleDrop(e, shiftIndex)}
                  onDragOver={handleDragOver}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full`}
                          style={{ backgroundColor: shift.color || '#3B82F6' }}
                        />
                        <span className="font-medium">{shift.shift_name || shift.name}</span>
                        <span className="text-sm text-gray-500">
                          {shift.start_time} - {shift.end_time}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {assignments.length} {t('common.assigned')}
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2">
                      {assignments.length === 0 ? (
                        <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-200 rounded-lg">
                          {isManager ? (
                            <div className="text-center">
                              <Plus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                              <span className="text-sm text-gray-500">
                                {t('schedule.dropStaffHere')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">{t('schedule.noAssignment')}</span>
                          )}
                        </div>
                      ) : (
                        assignments.map((assignment, index) => {
                          const staffMember = getStaffMember(assignment.staff_id)
                          
                          if (!staffMember) {
                            return (
                              <div key={`missing-${index}`} className="p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                                {t('staff.staffNotFound')}: {assignment.staff_id}
                              </div>
                            )
                          }
                          
                          return (
                            <div
                              key={assignment.id || `assignment-${index}`}
                              className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors ${
                                assignment.staff_id === highlightStaffId
                                  ? 'bg-indigo-50 ring-2 ring-indigo-500'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {staffMember.full_name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {staffMember.full_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {staffMember.role}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {swapRequests && swapRequests.length > 0 && (
                                  <SwapStatusIndicator
                                    swapRequests={swapRequests}
                                    day={calculateDayIndex()}
                                    shift={shiftIndex}
                                    staffId={staffMember.id}
                                    size="sm"
                                  />
                                )}

                                {onSwapRequest && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onSwapRequest(calculateDayIndex(), shiftIndex, staffMember.id)
                                    }}
                                  >
                                    <ArrowLeftRight className="w-4 h-4" />
                                  </Button>
                                )}

                                {isManager && assignment.id &&(
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onRemoveAssignment(assignment.id!)
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* No schedule message */}
          {!schedule && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('schedule.noSchedule')}</h3>
              <p className="text-gray-600">{t('schedule.noScheduleAvailable')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}