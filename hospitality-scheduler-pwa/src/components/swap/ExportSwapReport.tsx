// Export & Reporting Component
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

interface ExportConfig {
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
                      {config.dateRange.from ? 
                        config.dateRange.from.toLocaleDateString() : 
                        "Select date"
                      }
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
                      {config.dateRange.to ? 
                        config.dateRange.to.toLocaleDateString() : 
                        "Select date"
                      }
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
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Facilities Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Facilities</label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleAllFacilities}
              >
                {config.facilities.length === facilitySummaries.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {facilitySummaries.map((facility) => (
                <div key={facility.facility_id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={config.facilities.includes(facility.facility_id)}
                    onCheckedChange={() => toggleFacility(facility.facility_id)}
                  />
                  <label className="text-sm">{facility.facility_name}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Include Fields */}
          <div>
            <label className="text-sm font-medium mb-3 block">Include Fields</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.includeFields.staffDetails}
                  onCheckedChange={(checked) => updateIncludeField('staffDetails', !!checked)}
                />
                <label className="text-sm">Staff Details</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.includeFields.timestamps}
                  onCheckedChange={(checked) => updateIncludeField('timestamps', !!checked)}
                />
                <label className="text-sm">Timestamps</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.includeFields.notes}
                  onCheckedChange={(checked) => updateIncludeField('notes', !!checked)}
                />
                <label className="text-sm">Notes & Comments</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.includeFields.history}
                  onCheckedChange={(checked) => updateIncludeField('history', !!checked)}
                />
                <label className="text-sm">Change History</label>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div>
            <label className="text-sm font-medium mb-3 block">Filters</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Status</label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const currentStatuses = config.filters.status || []
                    if (!currentStatuses.includes(value)) {
                      setConfig({
                        ...config,
                        filters: {
                          ...config.filters,
                          status: [...currentStatuses, value]
                        }
                      })
                    }
                  }}
                >
                  <option value="">Add Status Filter</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="declined">Declined</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Urgency</label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const currentUrgencies = config.filters.urgency || []
                    if (!currentUrgencies.includes(value)) {
                      setConfig({
                        ...config,
                        filters: {
                          ...config.filters,
                          urgency: [...currentUrgencies, value]
                        }
                      })
                    }
                  }}
                >
                  <option value="">Add Urgency Filter</option>
                  <option value="emergency">Emergency</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Type</label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const currentTypes = config.filters.swapType || []
                    if (!currentTypes.includes(value)) {
                      setConfig({
                        ...config,
                        filters: {
                          ...config.filters,
                          swapType: [...currentTypes, value]
                        }
                      })
                    }
                  }}
                >
                  <option value="">Add Type Filter</option>
                  <option value="specific">Specific</option>
                  <option value="auto">Auto Assignment</option>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(config.filters.status?.length || config.filters.urgency?.length || config.filters.swapType?.length) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {config.filters.status?.map(status => (
                  <span key={status} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Status: {status}
                    <button 
                      onClick={() => setConfig({
                        ...config,
                        filters: {
                          ...config.filters,
                          status: config.filters.status?.filter(s => s !== status)
                        }
                      })}
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
                      onClick={() => setConfig({
                        ...config,
                        filters: {
                          ...config.filters,
                          urgency: config.filters.urgency?.filter(u => u !== urgency)
                        }
                      })}
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
                      onClick={() => setConfig({
                        ...config,
                        filters: {
                          ...config.filters,
                          swapType: config.filters.swapType?.filter(t => t !== type)
                        }
                      })}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
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