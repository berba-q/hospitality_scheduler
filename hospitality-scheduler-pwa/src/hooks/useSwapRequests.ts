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
        apiClient.getSwapRequests(facilityId),
        apiClient.getSwapSummary(facilityId)
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
    //const endpoint = swapData.swap_type === 'specific' ? '/swaps/specific' : '/swaps/auto'
    const response = await apiClient.createSwapRequest(swapData)
    await loadSwapRequests() // Refresh data
    return response
  }

  const approveSwap = async (swapId: string, approved: boolean, notes?: string) => {
    const response = await apiClient.approveSwap(swapId, approved, notes)
    await loadSwapRequests() // Refresh data
    return response
  }

    const retryAutoAssignment = async (swapId: string, avoidStaffIds?: string[]) => {
      // Changed from: apiClient.post(`/swaps/${swapId}/retry-auto-assignment`, { avoid_staff_ids: avoidStaffIds })
      const response = await apiClient.retryAutoAssignment(swapId, avoidStaffIds)
      await loadSwapRequests() // Refresh data
      return response
    }

  const respondToSwap = async (swapId: string, accepted: boolean, notes?: string) => {
    const response = await apiClient.respondToSwap(swapId, accepted, notes)
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