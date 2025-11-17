'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Users, Search, Filter, Star, GripVertical, Clock, Phone } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import { InvitationStatusPanel } from './InvitationStatusPanel'
import * as ScheduleTypes from '@/types/schedule'
import * as FacilityTypes from '@/types/facility'
import type { ApiClient } from '@/hooks/useApi'

interface StaffWithStatus extends ScheduleTypes.Staff {
  status?: 'registered' | 'invited' | 'no_account' | 'unknown'
  userActive?: boolean
  invitationId?: string
}

interface StaffAssignmentPanelProps {
  staff: ScheduleTypes.Staff[]
  availableRoles: string[]
  availableZones?: FacilityTypes.FacilityZone[]
  filterRole: string
  filterZone?: string
  onFilterChange: (role: string) => void
  onZoneFilterChange?: (zone: string) => void
  onDragStart: (staff: ScheduleTypes.Staff) => void
  onDragEnd: () => void
  selectedFacility?: FacilityTypes.Facility
  apiClient?: ApiClient
  showInvitationStatus?: boolean
}

export function StaffAssignmentPanel({
  staff,
  availableRoles,
  availableZones,
  filterRole,
  filterZone,
  onFilterChange,
  onZoneFilterChange,
  onDragStart,
  onDragEnd,
  selectedFacility,
  apiClient,
  showInvitationStatus = false
}: StaffAssignmentPanelProps) {
  const { t } = useTranslations()
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [staffWithStatus, setStaffWithStatus] = useState<StaffWithStatus[]>([])

  const loadStaffStatus = useCallback(async () => {
    if (!apiClient) {
      setStaffWithStatus(staff.map(member => ({ ...member, status: 'unknown' as const })))
      return
    }

    let cancelled = false

    try {
      // Use bulk endpoint to get status for all staff members in a single request
      const staffIds = staff.map(member => member.id)

      if (staffIds.length === 0) {
        setStaffWithStatus([])
        return
      }

      const bulkStatusResults = await apiClient.getStaffBulkStatus(staffIds)

      // Create a map for quick lookup
      const statusMap = new Map(
        bulkStatusResults.map((result) => [result.staff_id, result])
      )

      // Merge status data with staff data
      const staffWithInviteStatus = staff.map((member): StaffWithStatus => {
        const statusData = statusMap.get(member.id)

        if (!statusData) {
          return { ...member, status: 'unknown' as const }
        }

        return {
          ...member,
          status: statusData.status,
          userActive: statusData.user_active,
          invitationId: statusData.invitation_id
        }
      })

      if (!cancelled) {
        setStaffWithStatus(staffWithInviteStatus)
      }
    } catch (error) {
      console.error('Failed to load staff status:', error)
      if (!cancelled) {
        setStaffWithStatus(staff.map(member => ({ ...member, status: 'unknown' as const })))
      }
    }

    return () => {
      cancelled = true
    }
  }, [staff, apiClient])

  useEffect(() => {
    if (staff.length > 0) {
      const cleanup = loadStaffStatus()
      return () => {
        cleanup.then(cleanupFn => cleanupFn?.())
      }
    }
  }, [staff, loadStaffStatus])

  const getStatusBadge = (status?: string, userActive?: boolean) => {
    switch (status) {
      case 'registered':
        return userActive ? 
          <Badge className="bg-green-100 text-green-800 text-xs">{t('staff.statusActive')}</Badge> :
          <Badge className="bg-gray-100 text-gray-800 text-xs">{t('common.inactive')}</Badge>
      case 'invited':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">{t('staff.statusInvited')}</Badge>
      case 'no_account':
        return <Badge className="bg-red-100 text-red-800 text-xs">{t('staff.statusNoAccount')}</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 text-xs">{t('common.unknown')}</Badge>
    }
  }

  // Use staffWithStatus for filtering if available, otherwise use staff prop with default status
  const staffToFilter: StaffWithStatus[] = staffWithStatus.length > 0
    ? staffWithStatus
    : staff.map(s => ({ ...s, status: 'unknown' as const }))

  // Filter staff based on search and role
  const filteredStaff: StaffWithStatus[] = staffToFilter.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = filterRole === 'all' || member.role.toLowerCase().includes(filterRole.toLowerCase())

    const matchesStatus = showInactive || member.is_active

    return matchesSearch && matchesRole && matchesStatus
  })

  // Sort staff by role, then skill level, then name
  const sortedStaff: StaffWithStatus[] = filteredStaff.sort((a, b) => {
    // Managers first
    if (a.role.toLowerCase().includes('manager') && !b.role.toLowerCase().includes('manager')) return -1
    if (!a.role.toLowerCase().includes('manager') && b.role.toLowerCase().includes('manager')) return 1

    // Then by skill level (descending)
    const aSkillLevel = a.skill_level ?? 0
    const bSkillLevel = b.skill_level ?? 0
    if (aSkillLevel !== bSkillLevel) return bSkillLevel - aSkillLevel

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

  const handleDragStart = (e: React.DragEvent, staff: ScheduleTypes.Staff) => {
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(staff)
  }

  return (
    <div className="space-y-4">
      {/* Invitation Status Panel - only show if props are provided */}
      {showInvitationStatus && selectedFacility && apiClient && (
        <InvitationStatusPanel 
          selectedFacility={selectedFacility}
          apiClient={apiClient}
        />
      )}

      {/* Main Staff Assignment Panel */}
      <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm h-fit">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            {t('staff.availableStaff')} ({filteredStaff.length})
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('staff.searchStaff')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-0 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Role Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{t('staff.filterByRole')}</span>
            </div>
            <select
              value={filterRole}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 transition-all duration-200"
            >
              <option value="all">{t('staff.allRoles')}</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Zone Filter */}
          {availableZones && availableZones.length > 0 && onZoneFilterChange && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{t('staff.filterByZone')}</span>
              </div>
              <select
                value={filterZone || 'all'}
                onChange={(e) => onZoneFilterChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 transition-all duration-200"
              >
                <option value="all">{t('staff.allZones')}</option>
                {availableZones.map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.zone_name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {t('staff.showInactiveStaff')}
            </label>
          </div>

          {/* Staff List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {sortedStaff.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">{t('staff.noStaffFound')}</p>
                <p className="text-gray-400 text-xs">{t('common.tryAdjustingFilters')}</p>
              </div>
            ) : (
              sortedStaff.map((memberWithStatus) => (
                <div
                  key={memberWithStatus.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, memberWithStatus)}
                  onDragEnd={onDragEnd}
                  className={`p-3 rounded-lg border transition-all duration-200 cursor-move hover:shadow-md
                    ${memberWithStatus.is_active ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 opacity-75'}
                    ${getRoleColor(memberWithStatus.role)} border-l-4`}
                >
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />

                    {/* Avatar */}
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {memberWithStatus.full_name.split(' ').map(n => n[0]).join('')}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{memberWithStatus.full_name}</p>
                        <div className="flex items-center gap-1">
                          {!memberWithStatus.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              {t('common.inactive')}
                            </Badge>
                          )}
                          {memberWithStatus.status && getStatusBadge(memberWithStatus.status, memberWithStatus.userActive)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {memberWithStatus.role}
                          </Badge>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: memberWithStatus.skill_level ?? 1 }, (_, i) => (
                              <Star key={i} className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                            ))}
                            <span className="text-xs text-gray-500 ml-1">
                              {t('common.levelNumber', { level: memberWithStatus.skill_level ?? 1 })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {memberWithStatus.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span className="truncate">{memberWithStatus.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{t('staff.maxHours', { hours: memberWithStatus.weekly_hours_max ?? 40 })}</span>
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
                <p className="text-blue-800 text-sm font-medium">{t('staff.dragDropAssignment')}</p>
                <p className="text-blue-700 text-xs">
                  {t('staff.dragStaffToCalendar')}
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
                <div className="text-xs text-gray-600">{t('common.active')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-600">
                  {availableRoles.length}
                </div>
                <div className="text-xs text-gray-600">{t('common.roles')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}