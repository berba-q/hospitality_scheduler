// src/hooks/useExportFunctionality.ts
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { SwapRequest, SwapStatus, SwapUrgency } from '@/types/swaps'
import type { ApiClient } from '@/lib/api'

// Define the simplified config interface to match what the modal sends
interface ExportConfig {
  format: 'excel' | 'csv' | 'pdf'
  facility_id?: string
  status?: string
  urgency?: string
  include_staff_details?: boolean
  include_timestamps?: boolean
}

export function useExportFunctionality(apiClient: ApiClient, swapRequests: SwapRequest[] = []) {
  const [showExportModal, setShowExportModal] = useState(false)

  const handleExport = async (config: ExportConfig) => {
    try {
      if (config.format === 'csv') {
        // Generate and download CSV
        const csvData = generateSwapCSV(swapRequests, config)
        downloadCSV(csvData, `swap-report-${new Date().toISOString().split('T')[0]}.csv`)
      } else {
        // For Excel/PDF, try the API endpoint if available
        try {
          // Transform simplified config to match what the API expects
          // Using type assertion since the API method has an extended inline type
          const blob = await apiClient.exportSwapReport({
            format: config.format,
            dateRange: {
              from: undefined,
              to: undefined
            },
            facilities: config.facility_id ? [config.facility_id] : [],
            includeFields: {
              staffDetails: config.include_staff_details ?? false,
              timestamps: config.include_timestamps ?? false,
              notes: false,
              history: false,
              roleInformation: false,
              workflowStatus: false,
              timingMetrics: false
            },
            filters: {
              status: config.status ? [config.status as SwapStatus] : undefined,
              urgency: config.urgency ? [config.urgency as SwapUrgency] : undefined,
              swapType: undefined
            }
          })
          const link = document.createElement('a')
          const url = URL.createObjectURL(blob)
          link.href = url
          link.download = `swap-report-${new Date().toISOString().split('T')[0]}.${config.format}`
          link.click()
          URL.revokeObjectURL(url)
        } catch {
          // Fallback to CSV if API not available
          console.warn('API export not available, falling back to CSV')
          const csvData = generateSwapCSV(swapRequests, config)
          downloadCSV(csvData, `swap-report-${new Date().toISOString().split('T')[0]}.csv`)
        }
      }

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

// Helper functions
function generateSwapCSV(swapRequests: SwapRequest[], config: ExportConfig): string {
  // Build headers based on config
  const headers = [
    'ID',
    'Status', 
    'Urgency',
    'Swap Type',
    'Requesting Staff',
    'Target Staff',
    'Reason',
    'Created Date'
  ]
  
  if (config.include_staff_details) {
    headers.push('Requesting Role', 'Target Role', 'Facility')
  }
  
  if (config.include_timestamps) {
    headers.push('Updated Date', 'Completed Date', 'Expires At')
  }
  
  // Build rows
  const rows = swapRequests
    .filter(swap => {
      // Apply filters
      if (config.facility_id && swap.facility_id !== config.facility_id) return false
      if (config.status && swap.status !== config.status) return false
      if (config.urgency && swap.urgency !== config.urgency) return false
      return true
    })
    .map(swap => {
      const row = [
        swap.id || '',
        swap.status || '',
        swap.urgency || '',
        swap.swap_type || '',
        swap.requesting_staff?.full_name || '',
        swap.target_staff?.full_name || swap.assigned_staff?.full_name || '',
        `"${(swap.reason || '').replace(/"/g, '""')}"`, // Escape quotes in CSV
        formatDate(swap.created_at)
      ]

      if (config.include_staff_details) {
        row.push(
          swap.requesting_staff?.role || '',
          swap.target_staff?.role || swap.assigned_staff?.role || '',
          swap.facility?.name || ''
        )
      }

      if (config.include_timestamps) {
        row.push(
          formatDate(swap.updated_at),
          formatDate(swap.completed_at),
          formatDate(swap.expires_at)
        )
      }

      return row.join(',')
    })

  return [headers.join(','), ...rows].join('\n')
}

function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatDate(dateString?: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}