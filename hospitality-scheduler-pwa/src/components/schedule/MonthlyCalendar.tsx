'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Clock, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface MonthlyCalendarProps {
  currentMonth: Date
  schedules: any[]
  staff: any[]
  isManager: boolean
  onDayClick: (date: Date) => void
}

export function MonthlyCalendar({
  currentMonth,
  schedules,
  staff,
  isManager,
  onDayClick
}: MonthlyCalendarProps) {
  // Get the first day of the month and calculate calendar grid
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  // Generate calendar days including padding days from previous/next month
  const calendarDays = []
  
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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Helper functions
  const getDateSchedule = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    return schedules.find(schedule => {
      const scheduleStart = new Date(schedule.week_start)
      const scheduleEnd = new Date(scheduleStart)
      scheduleEnd.setDate(scheduleStart.getDate() + 6)
      return date >= scheduleStart && date <= scheduleEnd
    })
  }

  const getDateAssignments = (date: Date) => {
    const schedule = getDateSchedule(date)
    if (!schedule) return []
    
    // Calculate day index within the week (0 = Monday)
    const scheduleStart = new Date(schedule.week_start)
    const dayIndex = Math.floor((date.getTime() - scheduleStart.getTime()) / (24 * 60 * 60 * 1000))
    
    return schedule.assignments?.filter(a => a.day === dayIndex) || []
  }

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
    
    if (!schedule) return { status: 'none', count: 0, color: 'bg-gray-100' }
    if (assignments.length === 0) return { status: 'empty', count: 0, color: 'bg-yellow-100' }
    if (assignments.length < 3) return { status: 'partial', count: assignments.length, color: 'bg-orange-100' }
    return { status: 'full', count: assignments.length, color: 'bg-green-100' }
  }

  const getMonthStats = () => {
    const monthDays = calendarDays.filter(day => day.isCurrentMonth)
    const scheduledDays = monthDays.filter(day => getDateSchedule(day.date)).length
    const totalAssignments = monthDays.reduce((sum, day) => sum + getDateAssignments(day.date).length, 0)
    const averagePerDay = monthDays.length > 0 ? (totalAssignments / monthDays.length).toFixed(1) : '0'
    
    return { scheduledDays, totalAssignments, averagePerDay }
  }

  const stats = getMonthStats()

  return (
    <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span>Monthly Overview - {formatMonthYear(currentMonth)}</span>
          </div>
          {!isManager && (
            <Badge variant="outline" className="text-xs">
              View Only
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Month Statistics */}
        <div className="border-b border-gray-100 p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{stats.scheduledDays}</div>
              <div className="text-xs text-gray-600">Days with Schedules</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{stats.totalAssignments}</div>
              <div className="text-xs text-gray-600">Total Assignments</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">{stats.averagePerDay}</div>
              <div className="text-xs text-gray-600">Avg per Day</div>
            </div>
          </div>
        </div>

        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((calendarDay, index) => {
            const { date, isCurrentMonth } = calendarDay
            const scheduleStatus = getScheduleStatus(date)
            const assignments = getDateAssignments(date)
            const uniqueStaff = new Set(assignments.map(a => a.staff_id)).size
            
            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border-r border-b border-gray-100 transition-all duration-200 ${
                  isCurrentMonth 
                    ? 'bg-white cursor-pointer hover:bg-gray-50' 
                    : 'bg-gray-50 opacity-50'
                } ${isToday(date) ? 'ring-2 ring-blue-300 bg-blue-50' : ''} ${
                  isWeekend(date) && isCurrentMonth ? 'bg-blue-50/30' : ''
                }`}
                onClick={() => isCurrentMonth && onDayClick(date)}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isCurrentMonth 
                      ? isToday(date) 
                        ? 'text-blue-600 font-bold' 
                        : 'text-gray-900'
                      : 'text-gray-400'
                  }`}>
                    {date.getDate()}
                  </span>
                  
                  {/* Schedule Status Indicator */}
                  {isCurrentMonth && (
                    <div className={`w-3 h-3 rounded-full ${scheduleStatus.color}`} 
                         title={`${scheduleStatus.status} schedule`} />
                  )}
                </div>

                {/* Schedule Info */}
                {isCurrentMonth && assignments.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Users className="w-3 h-3" />
                      <span>{uniqueStaff} staff</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{assignments.length} shifts</span>
                    </div>

                    {/* Mini shift indicators */}
                    <div className="flex gap-1 mt-2">
                      {[0, 1, 2].map(shiftId => {
                        const shiftAssignments = assignments.filter(a => a.shift === shiftId)
                        if (shiftAssignments.length === 0) return null
                        
                        const shiftColors = ['bg-yellow-400', 'bg-blue-400', 'bg-purple-400']
                        return (
                          <div
                            key={shiftId}
                            className={`w-2 h-2 rounded-full ${shiftColors[shiftId]}`}
                            title={`${shiftAssignments.length} staff in shift ${shiftId + 1}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State for Current Month Days */}
                {isCurrentMonth && assignments.length === 0 && (
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">No schedule</div>
                    {isManager && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full h-6 text-xs p-0 hover:bg-blue-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDayClick(date)
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-100"></div>
                <span>No Schedule</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-100"></div>
                <span>Empty</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-100"></div>
                <span>Partial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-100"></div>
                <span>Full Coverage</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Click any day to view/edit details
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}