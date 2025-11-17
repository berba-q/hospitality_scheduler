// MonthlyCalendar to display assignments from weekly schedules

'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import * as ScheduleTypes from '@/types/schedule'
import * as SwapTypes from '@/types/swaps'
import * as FacilityTypes from '@/types/facility'

interface MonthlyCalendarProps {
  currentMonth: Date
  schedules: ScheduleTypes.Schedule[]
  staff: ScheduleTypes.Staff[]
  shifts?: FacilityTypes.FacilityShift[]
  isManager: boolean
  onDayClick: (date: Date) => void
  swapRequests?: SwapTypes.SwapRequest[]
  highlightStaffId?: string
  showMineOnly?: boolean
}

export function MonthlyCalendar({
  currentMonth,
  schedules,
  staff,
  shifts,
  isManager,
  onDayClick,
  swapRequests = [],
  highlightStaffId,
  showMineOnly
}: MonthlyCalendarProps) {
  const { t } = useTranslations()
  
  console.log('🗓️ MonthlyCalendar render:', {
    currentMonth: currentMonth.toDateString(),
    schedules_count: schedules.length,
    schedules: schedules.map(s => ({
      id: s.id,
      week_start: s.week_start,
      assignments_count: s.assignments?.length || 0
    }))
  })

  // Get the first day of the month and calculate calendar grid
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  // Generate calendar days including padding days from previous/next month
  interface CalendarDay {
    date: Date
    isCurrentMonth: boolean
    isPrevMonth: boolean
  }

  const calendarDays: CalendarDay[] = []

  // Previous month padding days
  const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i
    calendarDays.push({
      date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day),
      isCurrentMonth: false,
      isPrevMonth: true
    })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
      isCurrentMonth: true,
      isPrevMonth: false
    })
  }

  // Next month padding days to complete the grid (42 days = 6 weeks)
  const remainingDays = 42 - calendarDays.length
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day),
      isCurrentMonth: false,
      isPrevMonth: false
    })
  }

  const weekDays = [
    t('common.sun'), 
    t('common.mon'), 
    t('common.tue'), 
    t('common.wed'), 
    t('common.thu'), 
    t('common.fri'), 
    t('common.sat')
  ]

  // Helper function to find schedule that contains a specific date
  const getDateSchedule = (date: Date) => {
    return schedules.find(schedule => {
      const scheduleStart = new Date(schedule.week_start)
      const scheduleEnd = new Date(scheduleStart)
      scheduleEnd.setDate(scheduleStart.getDate() + 6) // Weekly schedules span 7 days
      
      const isWithinRange = date >= scheduleStart && date <= scheduleEnd
      
      console.log(`📅 Checking if ${date.toDateString()} is in schedule ${schedule.id}:`, {
        schedule_start: scheduleStart.toDateString(),
        schedule_end: scheduleEnd.toDateString(),
        is_within_range: isWithinRange
      })
      
      return isWithinRange
    })
  }

  // Helper function to check for swaps
  const hasSwapsOnDate = (date: Date, swapRequests: SwapTypes.SwapRequest[] = []) => {
    return swapRequests.some(swap => {
      // Check if this date matches any swap activity
      const schedule = getDateSchedule(date)
      if (!schedule) return false
      
      const scheduleStart = new Date(schedule.week_start)
      const dayIndex = Math.floor((date.getTime() - scheduleStart.getTime()) / (24 * 60 * 60 * 1000))
      
      // Check if swap affects this day
      return (swap.original_day === dayIndex) || 
            (swap.target_day === dayIndex && swap.swap_type === 'specific')
    })
  }

  // Helper function to get assignments for a specific date
  const getDateAssignments = (date: Date) => {
    const schedule = getDateSchedule(date)
    if (!schedule || !schedule.assignments) {
      console.log(`🔭 No assignments found for ${date.toDateString()}`)
      return []
    }

    // Calculate day index within the week (0 = Monday, but we need to handle Sunday start)
    const scheduleStart = new Date(schedule.week_start)
    const dayIndex = Math.floor((date.getTime() - scheduleStart.getTime()) / (24 * 60 * 60 * 1000))

    let assignments = schedule.assignments.filter(a => a.day === dayIndex)

    // Filter to show only specific staff member's assignments if showMineOnly is enabled
    if (showMineOnly && highlightStaffId) {
      assignments = assignments.filter(a => a.staff_id === highlightStaffId)
    }

    console.log(`📋 Assignments for ${date.toDateString()}:`, {
      schedule_id: schedule.id,
      day_index: dayIndex,
      assignments_count: assignments.length,
      assignments: assignments.map(a => ({ shift: a.shift, staff_id: a.staff_id })),
      filtered_by_staff: showMineOnly && highlightStaffId
    })

    return assignments
  }

  // Helper functions for styling
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  const getScheduleStatus = (date: Date) => {
    const schedule = getDateSchedule(date)
    const assignments = getDateAssignments(date)
    
    if (!schedule) return { status: 'none', count: 0, color: 'bg-gray-100', textColor: 'text-gray-400' }
    if (assignments.length === 0) return { status: 'empty', count: 0, color: 'bg-yellow-100', textColor: 'text-yellow-600' }
    if (assignments.length < 6) return { status: 'partial', count: assignments.length, color: 'bg-orange-100', textColor: 'text-orange-600' }
    return { status: 'full', count: assignments.length, color: 'bg-green-100', textColor: 'text-green-600' }
  }

  const getMonthStats = () => {
    const monthDays = calendarDays.filter(day => day.isCurrentMonth)
    const scheduledDays = monthDays.filter(day => getDateSchedule(day.date)).length
    const totalAssignments = monthDays.reduce((sum, day) => sum + getDateAssignments(day.date).length, 0)
    const averagePerDay = monthDays.length > 0 ? (totalAssignments / monthDays.length).toFixed(1) : 0
    const uniqueStaff = new Set()
    
    monthDays.forEach(day => {
      getDateAssignments(day.date).forEach(assignment => {
        uniqueStaff.add(assignment.staff_id)
      })
    })

    return {
      totalDays: monthDays.length,
      scheduledDays,
      totalAssignments,
      averagePerDay,
      uniqueStaff: uniqueStaff.size,
      coveragePercentage: Math.round((scheduledDays / monthDays.length) * 100)
    }
  }

  const monthStats = getMonthStats()

  return (
    <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('schedule.monthlyOverview')}
            <Badge variant="outline" className="ml-2">
              {monthStats.coveragePercentage}% {t('common.covered')}
            </Badge>
          </span>
          {!isManager && (
            <Badge variant="outline" className="text-xs">
              {t('common.viewOnly')}
            </Badge>
          )}
        </CardTitle>
        <div className="text-sm text-gray-600">
          {formatMonthYear(currentMonth)}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-4">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((calendarDay, index) => {
              const { date, isCurrentMonth } = calendarDay
              const scheduleStatus = getScheduleStatus(date)
              const assignments = getDateAssignments(date)
              const daySchedule = getDateSchedule(date)
              
              return (
                <div
                  key={`${date.getMonth()}-${date.getDate()}-${index}`}
                  className={`
                    relative min-h-[80px] p-2 border border-gray-200 rounded-lg transition-all duration-200
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isToday(date) ? 'ring-2 ring-blue-300 bg-blue-50' : ''}
                    ${isWeekend(date) ? 'bg-gray-50' : ''}
                    ${isManager ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}
                    ${scheduleStatus.color}
                  `}
                  onClick={() => {
                    console.log('📅 Day clicked:', {
                      date: date.toDateString(),
                      has_schedule: !!daySchedule,
                      assignments_count: assignments.length
                    })
                    onDayClick(date)
                  }}
                >
                  {/* Day number */}
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  } ${isToday(date) ? 'text-blue-600 font-bold' : ''}`}>
                    {date.getDate()}
                  </div>

                  {/* Schedule indicator */}
                  {daySchedule && (
                    <div className="space-y-1">
                      {assignments.length > 0 ? (
                        <>
                          <div className={`text-xs font-medium ${scheduleStatus.textColor}`}>
                            {assignments.length} {t('common.shifts')}
                          </div>
                          {/* Show shift distribution */}
                          <div className="flex gap-1">
                            {(shifts && shifts.length > 0 ? shifts : [0, 1, 2]).map((shift, index) => {
                              const shiftId = typeof shift === 'number' ? shift : index
                              const shiftAssignments = assignments.filter(a => a.shift === shiftId)
                              const shiftName = typeof shift === 'object' && shift.name
                                ? shift.name
                                : [t('common.morning'), t('common.afternoon'), t('common.evening')][shiftId]
                              const shiftColor = typeof shift === 'object' && shift.color
                                ? shift.color
                                : shiftId === 0 ? 'bg-yellow-500'
                                  : shiftId === 1 ? 'bg-blue-500'
                                  : 'bg-purple-500'

                              return (
                                <div
                                  key={shiftId}
                                  className={`w-2 h-2 rounded-full ${
                                    shiftAssignments.length > 0
                                      ? shiftColor
                                      : 'bg-gray-300'
                                  }`}
                                  title={`${shiftName}: ${shiftAssignments.length} ${t('common.staff')}`}
                                />
                              )
                            })}
                          </div>
                          {/* Show some staff names if space allows */}
                          {assignments.slice(0, 2).map((assignment, idx) => {
                            const staffMember = staff.find(s => s.id === assignment.staff_id)
                            const isHighlighted = highlightStaffId && assignment.staff_id === highlightStaffId
                            return staffMember ? (
                              <div
                                key={idx}
                                className={`text-xs truncate ${
                                  isHighlighted
                                    ? 'text-blue-700 font-semibold'
                                    : 'text-gray-600'
                                }`}
                              >
                                {staffMember.full_name.split(' ')[0]}
                                {isHighlighted && ' ★'}
                              </div>
                            ) : null
                          })}
                          {assignments.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{assignments.length - 2} {t('common.more')}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-yellow-600">
                          {t('schedule.scheduleExists')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* No schedule indicator */}
                  {!daySchedule && isCurrentMonth && (
                    <div className="text-xs text-gray-400">
                      {t('schedule.noSchedule')}
                    </div>
                  )}
                  
                  {/* Swap activity indicator */}
                  {hasSwapsOnDate(date, swapRequests) && (
                    <div className="absolute bottom-1 right-1 w-2 h-2 bg-orange-500 rounded-full" title={t('schedule.swapActivity')}></div>
                  )}

                  {/* Today indicator */}
                  {isToday(date) && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Monthly Statistics */}
          <div className="border-t border-gray-100 mt-6 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {monthStats.totalAssignments}
                </div>
                <div className="text-xs text-gray-600">{t('schedule.totalAssignments')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {monthStats.scheduledDays}
                </div>
                <div className="text-xs text-gray-600">{t('schedule.daysScheduled')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">
                  {monthStats.uniqueStaff}
                </div>
                <div className="text-xs text-gray-600">{t('schedule.staffInvolved')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {monthStats.averagePerDay}
                </div>
                <div className="text-xs text-gray-600">{t('common.avgPerDay')}</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span>{t('schedule.fullyStaffed')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
                <span>{t('schedule.partiallyStaffed')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                <span>{t('schedule.scheduleExists')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                <span>{t('schedule.noSchedule')}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}