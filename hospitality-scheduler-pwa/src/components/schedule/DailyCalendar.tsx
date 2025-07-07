'use client'
// Daily calendar component for displaying and managing staff assignments
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus, Clock, User, Star, MapPin, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface DailyCalendarProps {
  currentDate: Date
  schedule: any
  staff: any[]
  shifts: any[]
  isManager: boolean
  draggedStaff: any
  onAssignmentChange: (shift: number, staffId: string) => void
  onRemoveAssignment: (assignmentId: string) => void
}

export function DailyCalendar({
  currentDate,
  schedule,
  staff,
  shifts,
  isManager,
  draggedStaff,
  onAssignmentChange,
  onRemoveAssignment
}: DailyCalendarProps) {
  const [selectedShift, setSelectedShift] = useState<number | null>(null)

  // Get staff member by ID
  const getStaffMember = (staffId: string) => {
    return staff.find(s => s.id === staffId)
  }

  // Get assignments for a specific shift on the current day
  const getShiftAssignments = (shift: number) => {
    if (!schedule?.assignments) return []
    // For daily view, we assume day 0 represents the current date
    return schedule.assignments.filter(a => a.day === 0 && a.shift === shift)
  }

  // Handle drop event
  const handleDrop = (e: React.DragEvent, shift: number) => {
    e.preventDefault()
    
    if (!isManager || !draggedStaff) return
    
    // Check if staff is already assigned to any shift today
    const existingAssignments = schedule?.assignments?.filter(a => 
      a.day === 0 && a.staff_id === draggedStaff.id
    ) || []
    
    if (existingAssignments.length > 0) {
      toast.error(`${draggedStaff.full_name} is already assigned today`)
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
      'Front Desk': 'bg-blue-100 text-blue-800 border-blue-200',
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

  const getTotalAssignments = () => {
    if (!schedule?.assignments) return 0
    return schedule.assignments.filter(a => a.day === 0).length
  }

  const getUniqueStaffCount = () => {
    if (!schedule?.assignments) return 0
    const uniqueStaff = new Set(schedule.assignments.filter(a => a.day === 0).map(a => a.staff_id))
    return uniqueStaff.size
  }

  return (
    <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <div>
              <span>Daily Schedule</span>
              <p className="text-sm font-normal text-gray-600 mt-1">
                {formatDate(currentDate)}
              </p>
            </div>
          </div>
          {!isManager && (
            <Badge variant="outline" className="text-xs">
              View Only
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="space-y-1">
          {shifts.map((shift) => {
            const assignments = getShiftAssignments(shift.id)
            const isSelected = selectedShift === shift.id
            
            return (
              <div
                key={shift.id}
                className={`border-l-4 transition-all duration-200 ${
                  isSelected ? 'bg-blue-50 border-l-blue-400' : 'border-l-gray-200'
                }`}
              >
                {/* Shift Header */}
                <div className={`p-4 ${shift.color} border-b border-gray-100`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{shift.name} Shift</h3>
                      <p className="text-sm opacity-75">{shift.time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {assignments.length} assigned
                      </Badge>
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Assignment Area */}
                <div
                  className={`p-4 min-h-[150px] transition-all duration-200 ${
                    isManager ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${isSelected ? 'bg-blue-50' : ''} ${
                    draggedStaff ? 'hover:bg-green-50 hover:ring-2 hover:ring-green-300' : ''
                  }`}
                  onClick={() => isManager && setSelectedShift(shift.id)}
                  onDrop={(e) => handleDrop(e, shift.id)}
                  onDragOver={handleDragOver}
                >
                  {assignments.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      {isManager ? (
                        <div className="text-center">
                          <Plus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <span className="text-gray-400">
                            {draggedStaff ? 'Drop staff here' : 'No assignments - click to assign'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No staff assigned</span>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {assignments.map((assignment) => {
                        const staffMember = getStaffMember(assignment.staff_id)
                        if (!staffMember) return null

                        return (
                          <div
                            key={assignment.id}
                            className={`p-4 rounded-lg border ${getRoleColor(staffMember.role)} 
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
                                className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 
                                  transition-opacity duration-200 bg-red-500 hover:bg-red-600 text-white rounded-full"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}

                            {/* Staff Info */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-sm font-semibold shadow-sm">
                                  {staffMember.full_name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{staffMember.full_name}</p>
                                  <p className="text-sm opacity-75">{staffMember.role}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: staffMember.skill_level }, (_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-current" />
                                  ))}
                                  <span className="text-xs opacity-75 ml-1">
                                    Level {staffMember.skill_level}
                                  </span>
                                </div>
                                
                                {staffMember.phone && (
                                  <span className="text-xs opacity-75 truncate">
                                    {staffMember.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Daily Summary */}
        {schedule && (
          <div className="border-t border-gray-100 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {getTotalAssignments()}
                </div>
                <div className="text-xs text-gray-600">Total Assignments</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {getUniqueStaffCount()}
                </div>
                <div className="text-xs text-gray-600">Staff Scheduled</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">
                  {getTotalAssignments() * 8}
                </div>
                <div className="text-xs text-gray-600">Total Hours</div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!schedule && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Schedule for Today</h3>
            <p className="text-gray-600 mb-6">
              {isManager 
                ? 'Create a schedule to assign staff to shifts'
                : 'No schedule has been created for this date yet'
              }
            </p>
            {isManager && (
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Daily Schedule
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}