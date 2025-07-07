'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus, Clock, User, Star } from 'lucide-react'
import { toast } from 'sonner'

interface Assignment {
  id: string
  day: number
  shift: number
  staff_id: string
}

interface Staff {
  id: string
  full_name: string
  role: string
  skill_level: number
  is_active: boolean
}

interface Shift {
  id: number
  name: string
  time: string
  color: string
}

interface WeeklyCalendarProps {
  currentWeek: Date
  schedule: { assignments: Assignment[] } | null
  staff: Staff[]
  shifts: Shift[]
  days: string[]
  isManager: boolean
  draggedStaff: Staff | null
  onAssignmentChange: (day: number, shift: number, staffId: string) => void
  onRemoveAssignment: (assignmentId: string) => void
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
  onRemoveAssignment
}: WeeklyCalendarProps) {
  const [selectedCell, setSelectedCell] = useState<{day: number, shift: number} | null>(null)

  // Get staff member by ID
  const getStaffMember = (staffId: string) => {
    return staff.find(s => s.id === staffId)
  }

  // Get assignments for a specific day and shift
  const getAssignments = (day: number, shift: number) => {
    if (!schedule?.assignments) return []
    return schedule.assignments.filter(a => a.day === day && a.shift === shift)
  }

  // Handle drop event
  const handleDrop = (e: React.DragEvent, day: number, shift: number) => {
    e.preventDefault()
    
    if (!isManager || !draggedStaff) return
    
    // Check if staff is already assigned to this day
    const existingAssignments = schedule?.assignments?.filter(a => 
      a.day === day && a.staff_id === draggedStaff.id
    ) || []
    
    if (existingAssignments.length > 0) {
      toast.error(`${draggedStaff.full_name} is already assigned on ${days[day]}`)
      return
    }
    
    onAssignmentChange(day, shift, draggedStaff.id)
    toast.success(`${draggedStaff.full_name} assigned to ${days[day]} ${shifts[shift].name}`)
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
            Weekly Schedule
          </span>
          {!isManager && (
            <Badge variant="outline" className="text-xs">
              View Only
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 bg-gray-50/50">
              <div className="p-4 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-600">Shift / Day</span>
              </div>
              {days.map((day, index) => (
                <div key={day} className="p-4 border-r border-gray-200 text-center">
                  <div className="font-medium text-gray-900">{day}</div>
                  <div className="text-sm text-gray-500">
                    {formatDate(index)}
                  </div>
                </div>
              ))}
            </div>

            {/* Schedule Grid */}
            {shifts.map((shift) => (
              <div key={shift.id} className="grid grid-cols-8 border-b border-gray-100">
                {/* Shift Header */}
                <div className={`p-4 border-r border-gray-200 ${shift.color} border-l-4`}>
                  <div className="font-medium">{shift.name}</div>
                  <div className="text-xs opacity-75">{shift.time}</div>
                </div>

                {/* Day Cells */}
                {days.map((day, dayIndex) => {
                  const assignments = getAssignments(dayIndex, shift.id)
                  const isSelected = selectedCell?.day === dayIndex && selectedCell?.shift === shift.id
                  
                  return (
                    <div
                      key={`${dayIndex}-${shift.id}`}
                      className={`p-2 border-r border-gray-200 min-h-[120px] transition-all duration-200 ${
                        isManager ? 'cursor-pointer hover:bg-blue-50' : ''
                      } ${isSelected ? 'bg-blue-100 ring-2 ring-blue-300' : ''} ${
                        draggedStaff ? 'hover:bg-green-50 hover:ring-2 hover:ring-green-300' : ''
                      }`}
                      onClick={() => isManager && setSelectedCell({day: dayIndex, shift: shift.id})}
                      onDrop={(e) => handleDrop(e, dayIndex, shift.id)}
                      onDragOver={handleDragOver}
                    >
                      <div className="space-y-2">
                        {assignments.length === 0 ? (
                          <div className="flex items-center justify-center h-full">
                            {isManager ? (
                              <div className="text-center">
                                <Plus className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                                <span className="text-xs text-gray-400">
                                  {draggedStaff ? 'Drop here' : 'Assign staff'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No assignment</span>
                            )}
                          </div>
                        ) : (
                          assignments.map((assignment) => {
                            const staffMember = getStaffMember(assignment.staff_id)
                            if (!staffMember) return null

                            return (
                              <div
                                key={assignment.id}
                                className={`p-2 rounded-lg border ${getRoleColor(staffMember.role)} 
                                  hover:shadow-md transition-all duration-200 group relative`}
                              >
                                {/* Remove button for managers */}
                                {isManager && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onRemoveAssignment(assignment.id)
                                    }}
                                    className="absolute -top-1 -right-1 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 
                                      transition-opacity duration-200 bg-red-500 hover:bg-red-600 text-white rounded-full"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}

                                {/* Staff Info */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-semibold">
                                      {staffMember.full_name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="text-xs font-medium truncate flex-1">
                                      {staffMember.full_name}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs opacity-75">{staffMember.role}</span>
                                    <div className="flex items-center gap-0.5">
                                      {Array.from({ length: staffMember.skill_level }, (_, i) => (
                                        <Star key={i} className="w-2.5 h-2.5 fill-current" />
                                      ))}
                                    </div>
                                  </div>
                                </div>
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
            <h3 className="text-lg font-semibold mb-2">No Schedule for This Week</h3>
            <p className="text-gray-600 mb-6">
              {isManager 
                ? 'Generate a new schedule or manually assign staff to shifts'
                : 'No schedule has been created for this week yet'
              }
            </p>
            {isManager && (
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Schedule
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
                <div className="text-xs text-gray-600">Total Assignments</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {new Set(schedule.assignments.map(a => a.staff_id)).size}
                </div>
                <div className="text-xs text-gray-600">Staff Scheduled</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {Math.round((schedule.assignments.length / (7 * 3)) * 100)}%
                </div>
                <div className="text-xs text-gray-600">Coverage</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">
                  {schedule.assignments.length * 8}
                </div>
                <div className="text-xs text-gray-600">Total Hours</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}