'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Search, Filter, Star, GripVertical, Clock, Phone } from 'lucide-react'

interface Staff {
  id: string
  full_name: string
  role: string
  skill_level: number
  phone?: string
  weekly_hours_max: number
  is_active: boolean
}

interface StaffAssignmentPanelProps {
  staff: Staff[]
  availableRoles: string[]
  filterRole: string
  onFilterChange: (role: string) => void
  onDragStart: (staff: Staff) => void
  onDragEnd: () => void
}

export function StaffAssignmentPanel({
  staff,
  availableRoles,
  filterRole,
  onFilterChange,
  onDragStart,
  onDragEnd
}: StaffAssignmentPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Filter staff based on search and role
  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = filterRole === 'all' || member.role.toLowerCase().includes(filterRole.toLowerCase())
    
    const matchesStatus = showInactive || member.is_active
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Sort staff by role, then skill level, then name
  const sortedStaff = filteredStaff.sort((a, b) => {
    // Managers first
    if (a.role.toLowerCase().includes('manager') && !b.role.toLowerCase().includes('manager')) return -1
    if (!a.role.toLowerCase().includes('manager') && b.role.toLowerCase().includes('manager')) return 1
    
    // Then by skill level (descending)
    if (a.skill_level !== b.skill_level) return b.skill_level - a.skill_level
    
    // Finally by name
    return a.full_name.localeCompare(b.full_name)
  })

  // Get role color
  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Manager': 'bg-purple-100 text-purple-800 border-purple-200',
      'Chef': 'bg-orange-100 text-orange-800 border-orange-200',
      'Sous Chef': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Waiter': 'bg-pink-100 text-pink-800 border-pink-200',
      'Waitress': 'bg-pink-100 text-pink-800 border-pink-200',
      'Bartender': 'bg-red-100 text-red-800 border-red-200',
      'Housekeeping': 'bg-green-100 text-green-800 border-green-200',
      'Security': 'bg-gray-100 text-gray-800 border-gray-200',
      'Front Desk': 'bg-blue-100 text-blue-800 border-blue-200',
      'Concierge': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Maintenance': 'bg-amber-100 text-amber-800 border-amber-200'
    }
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const handleDragStart = (e: React.DragEvent, staff: Staff) => {
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(staff)
  }

  return (
    <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Available Staff ({filteredStaff.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-0 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* Role Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by Role</span>
          </div>
          <select
            value={filterRole}
            onChange={(e) => onFilterChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 transition-all duration-200"
          >
            <option value="all">All Roles</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        {/* Show Inactive Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-inactive"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="show-inactive" className="text-sm text-gray-700">
            Show inactive staff
          </label>
        </div>

        {/* Staff List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {sortedStaff.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No staff found</p>
              <p className="text-gray-400 text-xs">Try adjusting your search or filters</p>
            </div>
          ) : (
            sortedStaff.map((member) => (
              <div
                key={member.id}
                draggable
                onDragStart={(e) => handleDragStart(e, member)}
                onDragEnd={onDragEnd}
                className={`p-3 rounded-lg border transition-all duration-200 cursor-move hover:shadow-md 
                  ${member.is_active ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 opacity-75'}
                  ${getRoleColor(member.role)} border-l-4`}
              >
                <div className="flex items-start gap-3">
                  {/* Drag Handle */}
                  <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  
                  {/* Avatar */}
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {member.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate">{member.full_name}</p>
                      {!member.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: member.skill_level }, (_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">
                            L{member.skill_level}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {member.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span className="truncate">{member.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Max {member.weekly_hours_max}h/week</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drag Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <GripVertical className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-blue-800 text-sm font-medium">Drag & Drop Assignment</p>
              <p className="text-blue-700 text-xs">
                Drag staff members from this panel and drop them onto calendar slots to create assignments
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">
                {staff.filter(s => s.is_active).length}
              </div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-600">
                {availableRoles.length}
              </div>
              <div className="text-xs text-gray-600">Roles</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}