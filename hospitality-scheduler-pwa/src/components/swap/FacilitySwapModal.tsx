// Create new file: src/components/swap/FacilitySwapModal.tsx

'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight, Building, X } from 'lucide-react'
import { SwapManagementDashboard } from './SwapManagementDashboard'

interface FacilitySwapModalProps {
  open: boolean
  onClose: () => void
  facility: any
  swapRequests: any[]
  swapSummary: any
  days: string[]
  shifts: any[]
  onApproveSwap: (swapId: string, approved: boolean, notes?: string) => Promise<void>
  onRetryAutoAssignment: (swapId: string, avoidStaffIds?: string[]) => Promise<void>
  onViewSwapHistory: (swapId: string) => void
  onRefresh: () => void
}

export function FacilitySwapModal({
  open,
  onClose,
  facility,
  swapRequests,
  swapSummary,
  days,
  shifts,
  onApproveSwap,
  onRetryAutoAssignment,
  onViewSwapHistory,
  onRefresh
}: FacilitySwapModalProps) {
  if (!facility) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ArrowLeftRight className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Swap Management</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="h-4 w-4" />
                  {facility.name}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <SwapManagementDashboard
            facility={facility}
            swapRequests={swapRequests}
            swapSummary={swapSummary}
            days={days}
            shifts={shifts}
            onApproveSwap={onApproveSwap}
            onRetryAutoAssignment={onRetryAutoAssignment}
            onViewSwapHistory={onViewSwapHistory}
            onRefresh={onRefresh}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}