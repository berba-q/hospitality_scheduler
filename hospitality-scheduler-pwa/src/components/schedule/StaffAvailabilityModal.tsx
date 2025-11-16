import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Clock, 
  User,
  Search,
  RefreshCw,
  CalendarIcon,
  UserX,
  AlertTriangle,
  CheckCircle,
  Users
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { toast } from 'sonner'
import { useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations'
import * as FacilityTypes from '@/types/facility'
import * as ScheduleTypes from '@/types/schedule'

interface StaffAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  facility: FacilityTypes.Facility
  currentDate: Date
}

export function StaffAvailabilityModal({ 
  isOpen, 
  onClose, 
  facility,
  currentDate 
}: StaffAvailabilityModalProps) {
  const { t } = useTranslations()
  const api = useApiClient()
  
  // State
  const [unavailabilityData, setUnavailabilityData] = useState<ScheduleTypes.StaffUnavailability[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(currentDate, { weekStartsOn: 1 }) // Sunday
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showRecurringOnly, setShowRecurringOnly] = useState(false)

  // Quick date range presets
  const quickRanges = [
    { label: t('schedule.thisWeek'), start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) },
    { label: t('schedule.nextWeek'), start: addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 7), end: addDays(endOfWeek(currentDate, { weekStartsOn: 1 }), 7) },
    { label: t('schedule.thisMonth'), start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0) },
    { label: t('schedule.next30Days'), start: new Date(), end: addDays(new Date(), 30) }
  ]

  // Load unavailability data
  const loadUnavailability = async () => {
    if (!facility?.id) return
    
    setLoading(true)
    try {
      // Use the ApiClient method (following same pattern as other methods in api.ts)
      const response = await api.getFacilityUnavailability(
        facility.id,
        dateRange.start.toISOString(),
        dateRange.end.toISOString()
      )
      
      setUnavailabilityData(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Error loading staff unavailability:', error)
      toast.error(t('common.errorLoadingData'))
      setUnavailabilityData([])
    } finally {
      setLoading(false)
    }
  }

  // Load data when modal opens or date range changes
  useEffect(() => {
    if (isOpen) {
      loadUnavailability()
    }
  }, [isOpen, dateRange, facility?.id])

  // Filter unavailability data
  const filteredData = unavailabilityData.filter(item => {
    // Search filter
    if (searchTerm && !item.staff.full_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !item.staff.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    // Role filter
    if (roleFilter !== 'all' && item.staff.role !== roleFilter) {
      return false
    }
    
    // Recurring filter
    if (showRecurringOnly && !item.is_recurring) {
      return false
    }
    
    return true
  })

  // Group by staff member
  const groupedByStaff = filteredData.reduce((acc, item) => {
    if (!acc[item.staff_id]) {
      acc[item.staff_id] = {
        staff: item.staff,
        unavailability: []
      }
    }
    acc[item.staff_id].unavailability.push(item)
    return acc
  }, {} as Record<string, { staff: { id: string; full_name: string; role: string; email: string }, unavailability: ScheduleTypes.StaffUnavailability[] }>)

  // Get unique roles for filter
  const availableRoles = [...new Set(unavailabilityData.map(item => item.staff.role))].sort()

  // Format date range display
  const formatDateRange = () => {
    return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`
  }

  // Set quick date range
  const setQuickRange = (range: { start: Date; end: Date }) => {
    setDateRange({ start: range.start, end: range.end })
  }

  // Get status badge for unavailability
  const getUnavailabilityBadge = (unavail: ScheduleTypes.StaffUnavailability) => {
    const now = new Date()
    const start = new Date(unavail.start)
    const end = new Date(unavail.end)
    
    if (end < now) {
      return <Badge variant="secondary" className="text-xs">{t('common.past')}</Badge>
    } else if (start <= now && end >= now) {
      return <Badge variant="destructive" className="text-xs">{t('schedule.currentlyOff')}</Badge>
    } else {
      return <Badge variant="outline" className="text-xs">{t('common.upcoming')}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size='2xl'>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Users className="w-5 h-5" />
            {t('schedule.staffAvailabilityOverview')}
            <Badge variant="outline" className="ml-2">
              {formatDateRange()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 h-full">
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Date Range Selector */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">{t('schedule.dateRange')}</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {formatDateRange()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {quickRanges.map((range, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickRange(range)}
                            className="text-xs"
                          >
                            {range.label}
                          </Button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">{t('common.startDate')}</Label>
                          <Calendar
                            mode="single"
                            selected={dateRange.start}
                            onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: date }))}
                            initialFocus
                          />
                        </div>
                        <div>
                          <Label className="text-sm">{t('common.endDate')}</Label>
                          <Calendar
                            mode="single"
                            selected={dateRange.end}
                            onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: date }))}
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadUnavailability}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="flex-1">
                <Label className="text-sm font-medium">{t('common.searchStaff')}</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t('common.searchByNameOrEmail')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="min-w-[150px]">
                <Label className="text-sm font-medium">{t('common.role')}</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.allRoles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.allRoles')}</SelectItem>
                    {availableRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recurring Filter */}
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={showRecurringOnly}
                  onChange={(e) => setShowRecurringOnly(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="recurring" className="text-sm">{t('schedule.recurringOnly')}</Label>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">{t('schedule.totalUnavailable')}</p>
                    <p className="text-2xl font-bold">{Object.keys(groupedByStaff).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">{t('schedule.timeOffPeriods')}</p>
                    <p className="text-2xl font-bold">{filteredData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">{t('schedule.recurring')}</p>
                    <p className="text-2xl font-bold">{filteredData.filter(item => item.is_recurring).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">{t('schedule.currentlyOff')}</p>
                    <p className="text-2xl font-bold">
                      {filteredData.filter(item => {
                        const now = new Date()
                        const start = new Date(item.start)
                        const end = new Date(item.end)
                        return start <= now && end >= now
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                {t('common.loadingData')}
              </div>
            ) : Object.keys(groupedByStaff).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <CheckCircle className="w-12 h-12 mb-4 text-green-500" />
                <h3 className="text-lg font-medium">{t('schedule.allStaffAvailable')}</h3>
                <p className="text-sm">{t('schedule.noUnavailabilityFound')}</p>
              </div>
            ) : (
              <div className="divide-y">
                {Object.values(groupedByStaff).map(({ staff, unavailability }) => (
                  <div key={staff.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{staff.full_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{staff.role}</span>
                            <span>•</span>
                            <span>{staff.email}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {unavailability.length} {t('schedule.period')}{unavailability.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      {unavailability.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">
                                {format(new Date(item.start), 'MMM d, h:mm a')} - {format(new Date(item.end), 'MMM d, h:mm a')}
                              </p>
                              {item.reason && (
                                <p className="text-xs text-gray-600 mt-1">{item.reason}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.is_recurring && (
                              <Badge variant="secondary" className="text-xs">{t('schedule.recurring')}</Badge>
                            )}
                            {getUnavailabilityBadge(item)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-500">
              {t('schedule.showingStaffWith', { 
                staffCount: Object.keys(groupedByStaff).length, 
                periodCount: filteredData.length 
              })}
            </p>
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}