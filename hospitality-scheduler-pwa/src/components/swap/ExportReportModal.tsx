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
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Calendar as CalendarIcon,
  Filter,
  Loader2
} from 'lucide-react'

interface ExportReportProps {
  open: boolean
  onClose: () => void
  facilitySummaries: any[]
  allSwapRequests: any[]
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Swap Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div>
            <label className="text-sm font-medium mb-3 block">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={config.format === 'csv' ? 'default' : 'outline'}
                onClick={() => setConfig({ ...config, format: 'csv' })}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                CSV
              </Button>
              <Button
                variant={config.format === 'excel' ? 'default' : 'outline'}
                onClick={() => setConfig({ ...config, format: 'excel' })}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button
                variant={config.format === 'pdf' ? 'default' : 'outline'}
                onClick={() => setConfig({ ...config, format: 'pdf' })}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-3 block">Date Range</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.dateRange.from ? config.dateRange.from.toLocaleDateString() : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
                <label className="text-xs text-gray-600 mb-1 block">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.dateRange.to ? config.dateRange.to.toLocaleDateString() : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
            <label className="text-sm font-medium mb-3 block">Facilities</label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-facilities"
                  checked={config.facilities.length === facilitySummaries.length}
                  onCheckedChange={toggleAllFacilities}
                />
                <label htmlFor="all-facilities" className="text-sm font-medium">
                  All Facilities ({facilitySummaries.length})
                </label>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {facilitySummaries.map((facility) => (
                  <div key={facility.facility_id} className="flex items-center space-x-2 pl-6">
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
            <label className="text-sm font-medium mb-3 block">Filters</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Status</label>
                <Select onValueChange={(value) => addFilter('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Urgency</label>
                <Select onValueChange={(value) => addFilter('urgency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add urgency filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Swap Type</label>
                <Select onValueChange={(value) => addFilter('swapType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add type filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto Assignment</SelectItem>
                    <SelectItem value="specific">Specific Request</SelectItem>
                    <SelectItem value="manual">Manual Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters */}
            {(config.filters.status?.length || config.filters.urgency?.length || config.filters.swapType?.length) && (
              <div className="mt-3">
                <label className="text-xs text-gray-600 mb-2 block">Active Filters:</label>
                <div className="flex flex-wrap gap-2">
                  {config.filters.status?.map(status => (
                    <span key={status} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Status: {status}
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
                      Urgency: {urgency}
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
                      Type: {type}
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
            <label className="text-sm font-medium mb-3 block">Include Fields</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(config.includeFields).map(([field, value]) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={value}
                    onCheckedChange={(checked) => updateIncludeField(field as keyof typeof config.includeFields, !!checked)}
                  />
                  <label htmlFor={field} className="text-sm capitalize">
                    {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium mb-1">Export Preview</h4>
            <p className="text-xs text-gray-600">
              {config.facilities.length === 0 ? 'All facilities' : `${config.facilities.length} facility(ies)`} • 
              {config.dateRange.from || config.dateRange.to ? ' Custom date range' : ' All dates'} • 
              ~{allSwapRequests.length} total records
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Integration function for the main page
export function useExportFunctionality(apiClient: any) {
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
      
      toast.success('Report exported successfully!')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report')
    }
  }

  return {
    showExportModal,
    setShowExportModal,
    handleExport
  }
}