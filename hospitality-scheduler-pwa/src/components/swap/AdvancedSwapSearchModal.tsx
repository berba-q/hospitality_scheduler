// Advanced Search Modal Component
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Search, Filter } from 'lucide-react'

interface AdvancedSearchProps {
  open: boolean
  onClose: () => void
  onSearch: (filters: SearchFilters) => void
  facilities: any[]
}

interface SearchFilters {
  query: string
  facility_id?: string
  status?: string
  urgency?: string
  swap_type?: string
  date_from?: string
  date_to?: string
  requesting_staff?: string
  target_staff?: string
}

export function AdvancedSearchModal({ open, onClose, onSearch, facilities }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
  })
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()

  const handleSearch = () => {
    const searchFilters = {
      ...filters,
      date_from: dateFrom?.toISOString().split('T')[0],
      date_to: dateTo?.toISOString().split('T')[0],
    }
    onSearch(searchFilters)
    onClose()
  }

  const handleReset = () => {
    setFilters({ query: '' })
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Search Query */}
          <div className="col-span-2">
            <label className="text-sm font-medium mb-2 block">Search Terms</label>
            <Input
              placeholder="Search by staff name, reason, notes..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            />
          </div>

          {/* Facility Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Facility</label>
            <Select 
              value={filters.facility_id || ''} 
              onValueChange={(value) => setFilters({ ...filters, facility_id: value || undefined })}
            >
              <option value="">All Facilities</option>
              {facilities.map((facility) => (
                <option key={facility.facility_id} value={facility.facility_id}>
                  {facility.facility_name}
                </option>
              ))}
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select 
              value={filters.status || ''} 
              onValueChange={(value) => setFilters({ ...filters, status: value || undefined })}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="manager_approved">Manager Approved</option>
              <option value="staff_accepted">Staff Accepted</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          {/* Urgency Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Urgency</label>
            <Select 
              value={filters.urgency || ''} 
              onValueChange={(value) => setFilters({ ...filters, urgency: value || undefined })}
            >
              <option value="">All Urgencies</option>
              <option value="emergency">Emergency</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </Select>
          </div>

          {/* Swap Type Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Swap Type</label>
            <Select 
              value={filters.swap_type || ''} 
              onValueChange={(value) => setFilters({ ...filters, swap_type: value || undefined })}
            >
              <option value="">All Types</option>
              <option value="specific">Specific Request</option>
              <option value="auto">Auto Assignment</option>
            </Select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? dateFrom.toLocaleDateString() : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? dateTo.toLocaleDateString() : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSearch}>
            Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}