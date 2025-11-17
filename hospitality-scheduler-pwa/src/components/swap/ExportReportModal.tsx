'use client'

// Export & Reporting Component
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { useTranslations } from '@/hooks/useTranslations'
import * as SwapTypes from '@/types/swaps'
import {
  Download,
  FileText,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  Loader2
} from 'lucide-react'

interface ExportReportProps {
  open: boolean
  onClose: () => void
  facilitySummaries: SwapTypes.FacilitySummary[]
  allSwapRequests: SwapTypes.SwapRequest[]
  onExport: (config: ExportConfig) => Promise<void>
}

// Export this type so it can be used in other files
export interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf'
  dateRange: {
    from?: Date
    to?: Date
  }
  facilities: string[]
  includeFields: {
    staffDetails: boolean
    timestamps: boolean
    notes: boolean
    history: boolean
  }
  filters: {
    status?: string[]
    urgency?: string[]
    swapType?: string[]
  }
}

export function ExportReportModal({ open, onClose, facilitySummaries, allSwapRequests, onExport }: ExportReportProps) {
  const { t } = useTranslations()
  const [config, setConfig] = useState<ExportConfig>({
    format: 'excel',
    dateRange: {},
    facilities: [],
    includeFields: {
      staffDetails: true,
      timestamps: true,
      notes: true,
      history: false
    },
    filters: {}
  })
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      await onExport(config)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const updateIncludeField = (field: keyof typeof config.includeFields, value: boolean) => {
    setConfig({
      ...config,
      includeFields: {
        ...config.includeFields,
        [field]: value
      }
    })
  }

  const toggleFacility = (facilityId: string) => {
    const isSelected = config.facilities.includes(facilityId)
    setConfig({
      ...config,
      facilities: isSelected 
        ? config.facilities.filter(id => id !== facilityId)
        : [...config.facilities, facilityId]
    })
  }

  const toggleAllFacilities = () => {
    const allSelected = config.facilities.length === facilitySummaries.length
    setConfig({
      ...config,
      facilities: allSelected ? [] : facilitySummaries.map(f => f.facility_id)
    })
  }

  const addFilter = (type: 'status' | 'urgency' | 'swapType', value: string) => {
    setConfig({
      ...config,
      filters: {
        ...config.filters,
        [type]: [...(config.filters[type] || []), value]
      }
    })
  }

  const removeFilter = (type: 'status' | 'urgency' | 'swapType', value: string) => {
    setConfig({
      ...config,
      filters: {
        ...config.filters,
        [type]: config.filters[type]?.filter(item => item !== value)
      }
    })
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      staffDetails: t('swaps.staffDetails'),
      timestamps: t('swaps.timestamps'),
      notes: t('common.notes'),
      history: t('swaps.history')
    }
    return labels[field] || field.replace(/([A-Z])/g, ' $1').toLowerCase()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('swaps.exportSwapReport')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div>
            <label className="text-sm font-medium mb-3 block">{t('swaps.exportFormat')}</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={config.format === 'csv' ? 'default' : 'outline'}
                onClick={() => setConfig({ ...config, format: 'csv' })}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {t('common.csv')}
              </Button>
              <Button
                variant={config.format === 'excel' ? 'default' : 'outline'}
                onClick={() => setConfig({ ...config, format: 'excel' })}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t('common.excel')}
              </Button>
              <Button
                variant={config.format === 'pdf' ? 'default' : 'outline'}
                onClick={() => setConfig({ ...config, format: 'pdf' })}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {t('common.pdf')}
              </Button>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-3 block">{t('swaps.dateRange')}</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">{t('common.from')}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.dateRange.from ? 
                        config.dateRange.from.toLocaleDateString() : 
                        t('swaps.selectDate')
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={config.dateRange.from}
                      onSelect={(date) => setConfig({
                        ...config,
                        dateRange: { ...config.dateRange, from: date }
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">{t('common.to')}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.dateRange.to ? 
                        config.dateRange.to.toLocaleDateString() : 
                        t('swaps.selectDate')
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={config.dateRange.to}
                      onSelect={(date) => setConfig({
                        ...config,
                        dateRange: { ...config.dateRange, to: date }
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Facilities Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">{t('swaps.selectFacilities')}</label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-facilities"
                  checked={config.facilities.length === facilitySummaries.length}
                  onCheckedChange={toggleAllFacilities}
                />
                <label htmlFor="all-facilities" className="text-sm font-medium">
                  {t('swaps.allFacilities')} ({facilitySummaries.length})
                </label>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pl-6">
                {facilitySummaries.map((facility) => (
                  <div key={facility.facility_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={facility.facility_id}
                      checked={config.facilities.includes(facility.facility_id)}
                      onCheckedChange={() => toggleFacility(facility.facility_id)}
                    />
                    <label htmlFor={facility.facility_id} className="text-sm">
                      {facility.facility_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div>
            <label className="text-sm font-medium mb-3 block">{t('swaps.addFilters')}</label>
            <div className="grid grid-cols-3 gap-4">
              <Select onValueChange={(value) => addFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('status.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('status.pending')}</SelectItem>
                  <SelectItem value="approved">{t('status.approved')}</SelectItem>
                  <SelectItem value="executed">{t('status.executed')}</SelectItem>
                  <SelectItem value="declined">{t('status.declined')}</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => addFilter('urgency', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('swaps.urgency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">{t('swaps.emergency')}</SelectItem>
                  <SelectItem value="high">{t('swaps.high')}</SelectItem>
                  <SelectItem value="normal">{t('swaps.normal')}</SelectItem>
                  <SelectItem value="low">{t('swaps.low')}</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => addFilter('swapType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('swaps.type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('swaps.autoSwap')}</SelectItem>
                  <SelectItem value="specific">{t('swaps.specificSwap')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            {(config.filters.status?.length || config.filters.urgency?.length || config.filters.swapType?.length) && (
              <div className="mt-3">
                <div className="text-xs text-gray-600 mb-2">{t('swaps.activeFilters')}:</div>
                <div className="flex flex-wrap gap-1">
                  {config.filters.status?.map(status => (
                    <span key={status} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {t('status.status')}: {t(`status.${status}`)}
                      <button 
                        onClick={() => removeFilter('status', status)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {config.filters.urgency?.map(urgency => (
                    <span key={urgency} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                      {t('swaps.urgency')}: {t(`swaps.${urgency}`)}
                      <button 
                        onClick={() => removeFilter('urgency', urgency)}
                        className="ml-1 text-orange-600 hover:text-orange-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {config.filters.swapType?.map(type => (
                    <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      {t('swaps.type')}: {type === 'auto' ? t('swaps.autoSwap') : t('swaps.specificSwap')}
                      <button 
                        onClick={() => removeFilter('swapType', type)}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Include Fields */}
          <div>
            <label className="text-sm font-medium mb-3 block">{t('swaps.includeFields')}</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(config.includeFields).map(([field, value]) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={value}
                    onCheckedChange={(checked) => updateIncludeField(field as keyof typeof config.includeFields, !!checked)}
                  />
                  <label htmlFor={field} className="text-sm">
                    {getFieldLabel(field)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium mb-1">{t('swaps.exportPreview')}</h4>
            <p className="text-xs text-gray-600">
              {config.facilities.length === 0 ? 
                t('swaps.allFacilities') : 
                t('swaps.facilitiesSelected', { count: config.facilities.length })
              } • 
              {config.dateRange.from || config.dateRange.to ? 
                t('swaps.customDateRange') : 
                t('swaps.allDates')
              } • 
              ~{allSwapRequests.length} {t('swaps.totalRecords')}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('swaps.exporting')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('swaps.exportReport')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Integration function for the main page
export function useExportFunctionality(apiClient: { exportSwapReport: (data: unknown) => Promise<Blob> }) {
  const { t } = useTranslations()
  const [showExportModal, setShowExportModal] = useState(false)

  const handleExport = async (config: ExportConfig) => {
    try {
      // Convert the export config to API parameters
      const exportData = {
        format: config.format,
        filters: {
          facility_ids: config.facilities.length > 0 ? config.facilities : undefined,
          date_from: config.dateRange.from?.toISOString().split('T')[0],
          date_to: config.dateRange.to?.toISOString().split('T')[0],
          status: config.filters.status,
          urgency: config.filters.urgency,
          swap_type: config.filters.swapType
        },
        include_fields: config.includeFields
      }

      // Call the export API (you'll need to implement this in your API client)
      const blob = await apiClient.exportSwapReport(exportData)
      
      // Download the file
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `swap-report-${new Date().toISOString().split('T')[0]}.${config.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success(t('swaps.reportExportedSuccessfully'))
    } catch (error) {
      console.error('Export failed:', error)
      toast.error(t('swaps.failedExportReport'))
    }
  }

  return {
    showExportModal,
    setShowExportModal,
    handleExport
  }
}