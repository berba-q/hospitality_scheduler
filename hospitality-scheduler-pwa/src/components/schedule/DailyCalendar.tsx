// Daily calendar component to display assignments

'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus, Clock, User, Star, MapPin, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { SwapStatusIndicator } from '@/components/swap/SwapStatusIndicator'
import { ArrowLeftRight } from 'lucide-react'

interface DailyCalendarProps {
  currentDate: Date
  schedule: any
  staff: any[]
  shifts: any[]
  isManager: boolean
  draggedStaff: any
  onAssignmentChange: (shift: number, staffId: string) => void
  onRemoveAssignment: (assignmentId: string) => void
  getShiftAssignments?: (shift: number) => any[] // Optional override
  swapRequests?: any[]
  onSwapRequest?: (day: number, shift: number, staffId: string) => void
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
  getShiftAssignments: customGetShiftAssignments,
  swapRequests = [],
  onSwapRequest
}: DailyCalendarProps) {
  const [selectedShift, setSelectedShift] = useState<number | null>(null)

  console.log('DailyCalendar render:', {
    currentDate: currentDate.toDateString(),
    schedule: schedule ? {
      id: schedule.id,
      week_start: schedule.week_start,
      assignments_count: schedule.assignments?.length || 0
    } : null
  })

  // Get staff member by ID
  const getStaffMember = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId)
    if (!staffMember) {
      console.warn('⚠️ Staff member not found:', staffId)
    }
    return staffMember
  }

  // Calculate which day of the week this date represents within the schedule
  const calculateDayIndex = () => {
    if (!schedule?.week_start) return 0
    
    const scheduleStart = new Date(schedule.week_start)
    const daysDiff = Math.floor((currentDate.getTime() - scheduleStart.getTime()) / (24 * 60 * 60 * 1000))
    const dayIndex = Math.max(0, Math.min(6, daysDiff)) // Clamp between 0-6
    
    console.log('📊 Day index calculation:', {
      schedule_start: scheduleStart.toDateString(),
      current_date: currentDate.toDateString(),
      days_diff: daysDiff,
      day_index: dayIndex
    })
    
    return dayIndex
  }

  // Get assignments for a specific shift on the current day
  const getShiftAssignments = (shift: number) => {
  if (!schedule?.assignments) return []
  
  // Calculate which day of the week this date represents
  const calculateDayIndex = () => {
    if (!schedule?.week_start) return 0
    
    const scheduleStart = new Date(schedule.week_start)
    const daysDiff = Math.floor((currentDate.getTime() - scheduleStart.getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, Math.min(6, daysDiff))
  }
  
  const dayIndex = calculateDayIndex()
  return schedule.assignments.filter(a => a.day === dayIndex && a.shift === shift)
}

  // Handle drop event
  const handleDrop = (e: React.DragEvent, shift: number) => {
    e.preventDefault()
    
    if (!isManager || !draggedStaff) return
    
    console.log('🎯 Drop event on daily calendar:', {
      shift,
      draggedStaff: draggedStaff.full_name,
      currentDate: currentDate.toDateString()
    })
    
    const dayIndex = calculateDayIndex()
    
    // Check if staff is already assigned to any shift on this day
    const existingAssignments = schedule?.assignments?.filter(a => 
      a.day === dayIndex && a.staff_id === draggedStaff.id
    ) || []
    
    console.log('🔍 Checking existing assignments:', {
      day_index: dayIndex,
      staff_id: draggedStaff.id,
      existing_count: existingAssignments.length
    })
    
    if (existingAssignments.length > 0) {
      toast.error(`${draggedStaff.full_name} is already assigned on ${currentDate.toLocaleDateString()}`)
      return
    }
    
    onAssignmentChange(shift, draggedStaff.id)
    toast.success(`${draggedStaff.full_name} assigned to ${shifts[shift].name} shift`)
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
      'Front Desk Agent': 'bg-blue-100 text-blue-800 border-blue-200',
      'Concierge': 'bg-indigo-100 text-indigo-800 border-indigo-200'
    }
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

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
        assignments: dayAssignments.filter(a => a.shift === shift.id).length
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
            Daily Schedule
            <Badge variant="outline" className="ml-2">
              {stats.totalAssignments} assignments
            </Badge>
          </span>
          {!isManager && (
            <Badge variant="outline" className="text-xs">
              View Only
            </Badge>
          )}
        </CardTitle>
        <div className="text-sm text-gray-600">
          {formatDate(currentDate)}
          {schedule && (
            <span className="ml-2">
              • From weekly schedule: {new Date(schedule.week_start).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-6">
          {/* Shift Cards */}
          <div className="space-y-4">
            {shifts.map((shift) => {
              const assignments = getShiftAssignments(shift.id)
              const isSelected = selectedShift === shift.id
              
              return (
                <Card
                  key={shift.id}
                  className={`transition-all duration-200 ${
                    isManager ? 'cursor-pointer hover:shadow-md' : ''
                  } ${isSelected ? 'ring-2 ring-blue-300' : ''} ${
                    draggedStaff ? 'hover:ring-2 hover:ring-green-300' : ''
                  }`}
                  onClick={() => isManager && setSelectedShift(shift.id)}
                  onDrop={(e) => handleDrop(e, shift.id)}
                  onDragOver={handleDragOver}
                >
                  <CardHeader className={`${shift.color} border-l-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{shift.name}</CardTitle>
                        <p className="text-sm opacity-75">{shift.time}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white/50">
                          {assignments.length} assigned
                        </Badge>
                        {isManager && assignments.length === 0 && (
                          <Badge variant="outline" className="bg-white/50 text-orange-600 border-orange-200">
                            Drop staff here
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    {assignments.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-gray-400">
                        <div className="text-center">
                          <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">
                            {isManager ? 'No staff assigned - drag & drop to assign' : 'No staff scheduled'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {assignments.map((assignment) => {
                          const staffMember = getStaffMember(assignment.staff_id)
                          
                          return (
                            <div
                              key={assignment.id}
                              className={`p-3 rounded-lg border ${
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
                                      {staffMember?.full_name || `Missing Staff (${assignment.staff_id})`}
                                    </p>
                                    <p className="text-sm opacity-75">
                                      {staffMember?.role || 'Unknown Role'}
                                    </p>
                                  </div>
                                  {staffMember?.skill_level && staffMember.skill_level > 2 && (
                                    <div className="flex-shrink-0">
                                      <Star className="w-4 h-4 text-yellow-500" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Action buttons */}
                                <div className="flex items-center gap-2">
                                  {/* Swap Status Indicator */}
                                  <SwapStatusIndicator
                                    swapRequests={swapRequests}
                                    day={calculateDayIndex()}
                                    shift={shift.id}
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
                                          onSwapRequest(calculateDayIndex(), shift.id, assignment.staff_id)
                                        }}
                                        className="h-7 w-7 p-0"
                                        title="Request shift swap"
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
                                          console.log('🗑️ Removing daily assignment:', assignment.id)
                                          onRemoveAssignment(assignment.id)
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {staffMember?.email && (
                                <p className="text-xs opacity-60 mt-1">
                                  {staffMember.email}
                                </p>
                              )}
                            </div>
                          )
                    })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* No Schedule Message */}
          {!schedule && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Schedule Found</h3>
              <p className="text-gray-600 mb-4">
                No weekly schedule includes {currentDate.toLocaleDateString()}
              </p>
              {isManager && (
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Weekly Schedule
                </Button>
              )}
            </div>
          )}

          {/* Daily Summary */}
          {schedule && (
            <div className="border-t border-gray-100 mt-6 pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {stats.totalAssignments}
                  </div>
                  <div className="text-xs text-gray-600">Total Assignments</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {new Set(schedule.assignments?.filter(a => a.day === calculateDayIndex()).map(a => a.staff_id) || []).size}
                  </div>
                  <div className="text-xs text-gray-600">Staff Scheduled</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">
                    {stats.totalAssignments * 8}
                  </div>
                  <div className="text-xs text-gray-600">Total Hours</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}