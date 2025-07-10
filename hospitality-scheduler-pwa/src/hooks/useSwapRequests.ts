// src/hooks/useSwapRequests.ts
'use client'

import { useState, useEffect } from 'react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

export function useSwapRequests(facilityId?: string) {
  const [swapRequests, setSwapRequests] = useState([])
  const [swapSummary, setSwapSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const apiClient = useApiClient()

  const loadSwapRequests = async () => {
    if (!facilityId) return
    
    setLoading(true)
    try {
      const [requests, summary] = await Promise.all([
        apiClient.get(`/swaps?facility_id=${facilityId}`),
        apiClient.get(`/swaps/summary/${facilityId}`)
      ])
      setSwapRequests(requests)
      setSwapSummary(summary)
    } catch (error) {
      console.error('Failed to load swap requests:', error)
      toast.error('Failed to load swap requests')
    } finally {
      setLoading(false)
    }
  }

  const createSwapRequest = async (swapData: any) => {
    const endpoint = swapData.swap_type === 'specific' ? '/swaps/specific' : '/swaps/auto'
    const response = await apiClient.post(endpoint, swapData)
    await loadSwapRequests() // Refresh data
    return response
  }

  const approveSwap = async (swapId: string, approved: boolean, notes?: string) => {
    const response = await apiClient.put(`/swaps/${swapId}/manager-decision`, {
      approved,
      notes
    })
    await loadSwapRequests() // Refresh data
    return response
  }

  const retryAutoAssignment = async (swapId: string, avoidStaffIds?: string[]) => {
    const response = await apiClient.post(`/swaps/${swapId}/retry-auto-assignment`, {
      avoid_staff_ids: avoidStaffIds || []
    })
    await loadSwapRequests() // Refresh data
    return response
  }

  const respondToSwap = async (swapId: string, accepted: boolean, notes?: string) => {
    const response = await apiClient.put(`/swaps/${swapId}/staff-response`, {
      accepted,
      notes
    })
    await loadSwapRequests() // Refresh data
    return response
  }

  useEffect(() => {
    loadSwapRequests()
  }, [facilityId])

  return {
    swapRequests,
    swapSummary,
    loading,
    createSwapRequest,
    approveSwap,
    retryAutoAssignment,
    respondToSwap,
    refresh: loadSwapRequests
  }
}