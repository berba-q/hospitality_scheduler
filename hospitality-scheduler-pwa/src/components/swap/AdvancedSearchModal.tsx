'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslations } from '@/hooks/useTranslations'
import { Search, X, Filter } from 'lucide-react'

interface AdvancedSearchProps {
  open: boolean
  onClose: () => void
  onSearch: (filters: any) => void
  facilities: any[]
}

export function AdvancedSearchModal({ open, onClose, onSearch, facilities }: AdvancedSearchProps) {
  const { t } = useTranslations()
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
            {t('swaps.advancedSearch')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Search Query */}
          <div className="col-span-2">
            <label className="text-sm font-medium mb-2 block">{t('swaps.searchTerms')}</label>
            <Input
              placeholder={t('swaps.searchByStaffReasonNotes')}
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            />
          </div>

          {/* Facility Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('common.facility')}</label>
            <Select value={filters.facility_id} onValueChange={(value) => setFilters({ ...filters, facility_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder={t('swaps.selectFacility')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('swaps.allFacilities')}</SelectItem>
                {facilities.map((facility) => (
                  <SelectItem key={facility.facility_id} value={facility.facility_id}>
                    {facility.facility_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('common.status')}</label>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder={t('swaps.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('swaps.allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('swaps.pending')}</SelectItem>
                <SelectItem value="manager_approved">{t('swaps.managerApproved')}</SelectItem>
                <SelectItem value="staff_accepted">{t('swaps.staffAccepted')}</SelectItem>
                <SelectItem value="executed">{t('swaps.executed')}</SelectItem>
                <SelectItem value="declined">{t('swaps.declined')}</SelectItem>
                <SelectItem value="cancelled">{t('swaps.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Urgency Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('swaps.urgency')}</label>
            <Select value={filters.urgency} onValueChange={(value) => setFilters({ ...filters, urgency: value })}>
              <SelectTrigger>
                <SelectValue placeholder={t('swaps.selectUrgency')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('swaps.allUrgencyLevels')}</SelectItem>
                <SelectItem value="emergency">{t('swaps.emergency')}</SelectItem>
                <SelectItem value="high">{t('swaps.high')}</SelectItem>
                <SelectItem value="normal">{t('swaps.normal')}</SelectItem>
                <SelectItem value="low">{t('swaps.low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Swap Type Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('swaps.swapType')}</label>
            <Select value={filters.swap_type} onValueChange={(value) => setFilters({ ...filters, swap_type: value })}>
              <SelectTrigger>
                <SelectValue placeholder={t('swaps.selectSwapType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('swaps.allSwapTypes')}</SelectItem>
                <SelectItem value="auto">{t('swaps.autoSwap')}</SelectItem>
                <SelectItem value="specific">{t('swaps.specificSwap')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('swaps.dateFrom')}</label>
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t('swaps.dateTo')}</label>
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            {t('common.reset')}
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t('swaps.applyFilters')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}