// Facility swap modal for schedules page
'use client'

import React, { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeftRight, Building} from 'lucide-react'
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
  
  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('🔧 FacilitySwapModal Debug Info:')
      console.log('- Modal opened:', open)
      console.log('- Window dimensions:', { width: window.innerWidth, height: window.innerHeight })
      console.log('- Facility:', facility?.name)
      console.log('- Swap requests count:', swapRequests?.length)
      
      // Check if modal element exists after a short delay
      setTimeout(() => {
        const modalElement = document.querySelector('[data-radix-dialog-content]')
        if (modalElement) {
          const rect = modalElement.getBoundingClientRect()
          console.log('📏 Modal element dimensions:', {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom
          })
          console.log('📏 Modal computed styles:', window.getComputedStyle(modalElement))
        } else {
          console.warn('❌ Modal element not found')
        }
      }, 100)
    }
  }, [open, facility, swapRequests])

  if (!facility) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        data-debug="facility-swap-modal"
        className="
          max-w-[90vw] 
          w-[90vw] 
          h-[90vh] 
          max-h-[90vh] 
          overflow-hidden 
          flex 
          flex-col 
          p-0 
          !fixed
          !top-[5vh]
          !left-[5vw]
          !transform-none
          !translate-x-0
          !translate-y-0
        "
        style={{
          position: 'fixed',
          top: '5vh',
          left: '5vw',
          transform: 'none',
          maxWidth: '90vw',
          width: '90vw',
          height: '90vh',
          maxHeight: '90vh'
        }}
      >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <ArrowLeftRight className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Swap Management Dashboard</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Building className="h-4 w-4" />
                  <span className="font-medium">{facility.name}</span>
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-gray-50/30">
          <div className="p-6">

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
        </div>
      </DialogContent>
    </Dialog>
  )
}