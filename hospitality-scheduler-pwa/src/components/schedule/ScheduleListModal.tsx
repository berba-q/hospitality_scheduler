'use client'

// Schedule list component

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Trash2, 
  Calendar, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Eye,
  Search,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from '@/hooks/useTranslations'

interface ScheduleListModalProps {
  open: boolean
  onClose: () => void
  schedules: any[]
  currentSchedule: any | null
  onScheduleSelect: (schedule: any) => void
  onScheduleDelete: (scheduleId: string) => void
  isManager: boolean
}

export function ScheduleListModal({
  open,
  onClose,
  schedules,
  currentSchedule,
  onScheduleSelect,
  onScheduleDelete,
  isManager
}: ScheduleListModalProps) {
  const { t } = useTranslations()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'empty' | 'partial' | 'complete'>('all')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const getScheduleStatus = (schedule: any) => {
    const assignmentCount = schedule.assignments?.length || 0
    
    if (assignmentCount === 0) {
      return { 
        label: t('schedule.empty'), 
        color: 'bg-gray-100 text-gray-600 border-gray-200', 
        icon: AlertTriangle,
        key: 'empty'
      }
    } else if (assignmentCount < 10) {
      return { 
        label: t('schedule.partial'), 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
        icon: Clock,
        key: 'partial'
      }
    } else {
      return { 
        label: t('schedule.complete'), 
        color: 'bg-green-100 text-green-700 border-green-200', 
        icon: CheckCircle,
        key: 'complete'
      }
    }
  }

  const handleDeleteClick = (schedule: any) => {
    const assignmentCount = schedule.assignments?.length || 0
    const weekDate = formatDate(schedule.week_start)
    
    const confirmed = window.confirm(
      t('schedule.deleteScheduleConfirmation', { 
        weekDate, 
        assignmentCount 
      })
    )
    
    if (confirmed) {
      handleDelete(schedule.id)
    }
  }

  const handleDelete = async (scheduleId: string) => {
    setDeletingId(scheduleId)
    try {
      await onScheduleDelete(scheduleId)
      toast.success(t('schedule.scheduleDeletedSuccessfully'))
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      toast.error(t('schedule.failedDeleteSchedule'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleScheduleClick = (schedule: any) => {
    onScheduleSelect(schedule)
    onClose() // Close modal after selection
  }

  const isCurrentSchedule = (schedule: any) => {
    return currentSchedule?.id === schedule.id
  }

  // Filter schedules based on search and status
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = searchQuery === '' || 
      formatWeekRange(schedule.week_start).toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatDate(schedule.week_start).toLowerCase().includes(searchQuery.toLowerCase())
    
    const status = getScheduleStatus(schedule)
    const matchesStatus = statusFilter === 'all' || status.key === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Sort schedules by week_start date (most recent first)
  const sortedSchedules = [...filteredSchedules].sort((a, b) => 
    new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('schedule.manageSchedules')}
            <Badge variant="secondary" className="ml-2">
              {schedules.length} {t('common.total')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Search and Filter Controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('schedule.searchSchedules')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
            >
              <option value="all">{t('schedule.allStatus')}</option>
              <option value="empty">{t('schedule.empty')}</option>
              <option value="partial">{t('schedule.partial')}</option>
              <option value="complete">{t('schedule.complete')}</option>
            </select>
          </div>
        </div>

        {/* Schedule List */}
        <div className="overflow-y-auto max-h-[400px] space-y-3">
          {sortedSchedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{t('schedule.noSchedulesFound')}</p>
              {searchQuery && (
                <p className="text-sm">{t('schedule.tryAdjustingFilters')}</p>
              )}
            </div>
          ) : (
            sortedSchedules.map((schedule) => {
              const status = getScheduleStatus(schedule)
              const StatusIcon = status.icon
              const assignmentCount = schedule.assignments?.length || 0
              const isCurrent = isCurrentSchedule(schedule)
              
              return (
                <div
                  key={schedule.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    isCurrent 
                      ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer'
                  }`}
                  onClick={() => !isCurrent && handleScheduleClick(schedule)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {t('common.weekOf')} {formatDate(schedule.week_start)}
                        </h3>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs">
                            {t('common.current')}
                          </Badge>
                        )}
                        <Badge className={`text-xs border ${status.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {formatWeekRange(schedule.week_start)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {assignmentCount} {t('common.assignments')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {schedule.created_at ? formatDate(schedule.created_at) : t('schedule.unknownDate')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleScheduleClick(schedule)
                          }}
                          className="text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          {t('common.view')}
                        </Button>
                      )}
                      
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">
                          {t('common.current')}
                        </Badge>
                      )}
                      
                      {isManager && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(schedule)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingId === schedule.id}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-500">
            {sortedSchedules.length} {t('common.of')} {schedules.length} {t('common.schedulesShown')}
          </p>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}