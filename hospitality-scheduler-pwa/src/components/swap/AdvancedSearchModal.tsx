'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Search } from 'lucide-react'

interface AdvancedSearchProps {
  open: boolean
  onClose: () => void
  onSearch: (filters: any) => void
  facilities: any[]
}

export function AdvancedSearchModal({ open, onClose, onSearch, facilities }: AdvancedSearchProps) {
  const [filters, setFilters] = useState({
    query: '',
    facility_id: '',
    status: '',
    urgency: '',
    swap_type: '',
    date_from: '',
    date_to: ''
  })

  const handleSearch = () => {
    onSearch(filters)
    onClose()
  }

  const handleReset = () => {
    setFilters({
      query: '',
      facility_id: '',
      status: '',
      urgency: '',
      swap_type: '',
      date_from: '',
      date_to: ''
    })
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
              value={filters.facility_id} 
              onValueChange={(value) => setFilters({ ...filters, facility_id: value })}
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
              value={filters.status} 
              onValueChange={(value) => setFilters({ ...filters, status: value })}
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
              value={filters.urgency} 
              onValueChange={(value) => setFilters({ ...filters, urgency: value })}
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
              value={filters.swap_type} 
              onValueChange={(value) => setFilters({ ...filters, swap_type: value })}
            >
              <option value="">All Types</option>
              <option value="specific">Specific Request</option>
              <option value="auto">Auto Assignment</option>
            </Select>
          </div>

          {/* Date Range - using simple date inputs */}
          <div>
            <label className="text-sm font-medium mb-2 block">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
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