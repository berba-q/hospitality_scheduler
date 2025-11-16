'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { X, Plus, Clock, User, Star } from 'lucide-react'
import { toast } from 'sonner'
import { SwapStatusIndicator } from '@/components/swap/SwapStatusIndicator'
import { ArrowLeftRight } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import * as ScheduleTypes from '@/types/schedule'
import * as SwapTypes from '@/types/swaps'
import * as FacilityTypes from '@/types/facility'

interface WeeklyCalendarProps {
  currentWeek: Date
  schedule: ScheduleTypes.Schedule | null
  staff: ScheduleTypes.Staff[]
  shifts: FacilityTypes.FacilityShift[]
  days: string[]
  isManager: boolean
  draggedStaff: ScheduleTypes.Staff | null
  onAssignmentChange: (day: number, shift: number, staffId: string) => void
  onRemoveAssignment: (assignmentId: string) => void
  swapRequests?: SwapTypes.SwapRequest[]
  onSwapRequest?: (day: number, shift: number, staffId: string) => void
  highlightStaffId?: string
  showMineOnly?: boolean
  onToggleMineOnly?: () => void
}

export function WeeklyCalendar({
  currentWeek,
  schedule,
  staff,
  shifts,
  days,
  isManager,
  draggedStaff,
  onAssignmentChange,
  onRemoveAssignment,
  swapRequests = [],
  onSwapRequest,
  highlightStaffId,
  showMineOnly = false,
  onToggleMineOnly,
}: WeeklyCalendarProps) {
  const [selectedCell, setSelectedCell] = useState<{day: number, shift: number} | null>(null)
  const { t } = useTranslations()

  // Get staff member by ID
  const getStaffMember = (staffId: string) => {
    return staff.find(s => s.id === staffId)
  }

  // Return assignments for a given day/shift column.
  // If showMineOnly is active, keep just the current staff member's rows.
  const getAssignments = (day: number, shiftIndex: number) => {
    if (!schedule?.assignments) return []

    const base = schedule.assignments.filter(
      (a) =>
        Number(a.day) === Number(day) &&
        Number(a.shift) === Number(shiftIndex)
    )

    if (!showMineOnly) return base
    if (!highlightStaffId) return base // nothing to filter by → show all

    return base.filter(
      (a) => String(a.staff_id) === String(highlightStaffId)
    )
  }

  // Handle drop event
  const handleDrop = (e: React.DragEvent, day: number, shift: number) => {
    e.preventDefault()
    
    console.log('Drop event triggered:', { day, shift, draggedStaff, isManager })

    if (!isManager || !draggedStaff) return
    
    // Check if staff is already assigned to this day
    const existingAssignments = schedule?.assignments?.filter(a => 
      a.day === day && a.staff_id === draggedStaff.id
    ) || []
    
    if (existingAssignments.length > 0) {
      toast.error(`${draggedStaff.full_name} is already assigned on ${days[day]}`)
      return
    }
    
    console.log('Calling onAssignmentChange:', { day, shift, staffId: draggedStaff.id })
    onAssignmentChange(day, shift, draggedStaff.id)
    toast.success(`${draggedStaff.full_name} ${t('common.assigned')} to ${days[day]} ${shifts[shift].name}`)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Get role color
  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Manager': 'bg-purple-100 text-purple-800 border-purple-200',
      'Chef': 'bg-orange-100 text-orange-800 border-orange-200',
      'Waiter': 'bg-pink-100 text-pink-800 border-pink-200',
      'Bartender': 'bg-red-100 text-red-800 border-red-200',
      'Housekeeping': 'bg-green-100 text-green-800 border-green-200',
      'Security': 'bg-gray-100 text-gray-800 border-gray-200',
      'Front Desk': 'bg-blue-100 text-blue-800 border-blue-200',
      'Concierge': 'bg-indigo-100 text-indigo-800 border-indigo-200'
    }
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Format date for display
  const formatDate = (dayIndex: number) => {
    const date = new Date(currentWeek)
    date.setDate(currentWeek.getDate() + dayIndex)
    return date.getDate()
  }

  return (
    <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t('schedule.weeklySchedule')}
          </span>
          {!isManager && (
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
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 bg-gray-50/50">
              <div className="p-4 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-600">{t('schedule.shiftDay')}</span>
              </div>
              {days.map((day, index) => (
                <div key={`header-${day}-${index}`} className="p-4 border-r border-gray-200 text-center">
                  <div className="font-medium text-gray-900">{day}</div>
                  <div className="text-sm text-gray-500">
                    {formatDate(index)}
                  </div>
                </div>
              ))}
            </div>

            {/* Schedule Grid */}
            {shifts.map((shift, shiftIdx) => (
              
              <div key={`shift-${shift.id}`} className="grid grid-cols-8 border-b border-gray-100">
                {/* Shift Header */}
                <div className={`p-4 border-r border-gray-200 ${shift.color} border-l-4`}>
                  <div className="font-medium">{shift.shift_name || shift.name}</div>
                  <div className="text-xs opacity-75">{shift.start_time} - {shift.end_time}</div>
                </div>

                {/* Day Cells */}
                {days.map((_day, dayIndex) => {
                  const shiftIndex = shift.shift_index ?? shiftIdx
                  const assignments = getAssignments(dayIndex, shiftIndex)
                  const isSelected = selectedCell?.day === dayIndex && selectedCell?.shift === shiftIndex
                  
                  return (
                    <div
                      key={`day-${shift.id}-${dayIndex}`}
                      className={`p-2 border-r border-gray-200 min-h-[120px] transition-all duration-200 ${
                        isManager ? 'cursor-pointer hover:bg-blue-50' : ''
                      } ${isSelected ? 'bg-blue-100 ring-2 ring-blue-300' : ''} ${
                        draggedStaff ? 'hover:bg-green-50 hover:ring-2 hover:ring-green-300' : ''
                      }`}
                      onClick={() => isManager && setSelectedCell({day: dayIndex, shift: shiftIndex})}
                      onDrop={(e) => handleDrop(e, dayIndex, shiftIndex)}
                      onDragOver={handleDragOver}
                    >
                      <div className="space-y-2">
                        {assignments.length === 0 ? (
                          <div 
                            key={`empty-${shift.id}-${dayIndex}`}
                            className="flex items-center justify-center h-full"
                          >
                            {isManager ? (
                              <div className="text-center">
                                <Plus className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                                <span className="text-xs text-gray-400">
                                  {draggedStaff ? t('schedule.dropHere') : t('schedule.assignStaff')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">{t('schedule.noAssignment')}</span>
                            )}
                          </div>
                        ) : (
                          assignments.map((assignment) => {
                            const staffMember = getStaffMember(assignment.staff_id)
                            
                            return (
                              <div
                                key={assignment.id}
                                className={`p-3 rounded-lg border ${
                                    assignment.staff_id === highlightStaffId ? 'ring-2 ring-indigo-500' : ''
                                  } ${
                                  staffMember ? getRoleColor(staffMember.role) : 'bg-red-100 text-red-800 border-red-200'
                                } relative group transition-all duration-200 hover:shadow-sm`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex-shrink-0">
                                      <User className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium truncate">
                                        {staffMember?.full_name || `${t('staff.missingStaff')} (${assignment.staff_id})`}
                                      </p>
                                      <p className="text-sm opacity-75">
                                        {staffMember?.role || t('staff.unknownRole')}
                                      </p>
                                    </div>
                                    {staffMember?.skill_level && staffMember.skill_level > 2 && (
                                      <div className="flex-shrink-0">
                                        <Star className="w-4 h-4 text-yellow-500" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Action buttons container */}
                                  <div className="flex items-center gap-2">
                                    {/* Swap Status Indicator */}
                                    <SwapStatusIndicator
                                      swapRequests={swapRequests}
                                      day={dayIndex}
                                      shift={shiftIndex}
                                      staffId={assignment.staff_id}
                                      size="sm"
                                    />

                                    {/* Action Buttons - only show on hover */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                      {/* Swap Request Button */}
                                      {onSwapRequest && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onSwapRequest(dayIndex, shiftIndex, assignment.staff_id)
                                          }}
                                          className="h-7 w-7 p-0"
                                          title={t('swaps.requestShiftSwap')}
                                        >
                                          <ArrowLeftRight className="h-3 w-3" />
                                        </Button>
                                      )}

                                      {/* Remove Assignment Button */}
                                      {isManager && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onRemoveAssignment(assignment.id)
                                          }}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {staffMember && 'email' in staffMember && staffMember.email && (
                                  <p className="text-xs opacity-60 mt-1">
                                    {staffMember.email}
                                  </p>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {!schedule && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('schedule.noScheduleForThisWeek')}</h3>
            <p className="text-gray-600 mb-6">
              {isManager 
                ? t('schedule.generateNewScheduleOrAssign')
                : t('schedule.noScheduleCreatedYet')
              }
            </p>
            {isManager && (
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t('schedule.createSchedule')}
              </Button>
            )}
          </div>
        )}

        {/* Schedule Stats */}
        {schedule && schedule.assignments && (
          <div className="border-t border-gray-100 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {schedule.assignments.length}
                </div>
                <div className="text-xs text-gray-600">{t('schedule.totalAssignments')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {new Set(schedule.assignments.map(a => a.staff_id)).size}
                </div>
                <div className="text-xs text-gray-600">{t('schedule.staffScheduled')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {Math.round((schedule.assignments.length / (7 * 3)) * 100)}%
                </div>
                <div className="text-xs text-gray-600">{t('schedule.coverage')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">
                  {schedule.assignments.length * 8}
                </div>
                <div className="text-xs text-gray-600">{t('schedule.totalHours')}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}