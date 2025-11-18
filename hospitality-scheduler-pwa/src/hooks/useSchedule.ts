import { useState, useEffect } from 'react'
import { useApiClient } from './useApi'
import { Facility } from '../types/facility'
import { Staff } from '../types/schedule'
import { ScheduleWithAssignments } from '../types/api'

export function useFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  useEffect(() => {
    const loadFacilities = async () => {
      if (!apiClient) {
        setError('API client not initialized')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await apiClient.getFacilities()
        setFacilities(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load facilities')
      } finally {
        setLoading(false)
      }
    }

    loadFacilities()
  }, [apiClient])

  return { facilities, loading, error, refetch: () => window.location.reload() }
}

export function useStaff() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  useEffect(() => {
    const loadStaff = async () => {
      if (!apiClient) {
        setError('API client not initialized')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await apiClient.getStaff()
        setStaff(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load staff')
      } finally {
        setLoading(false)
      }
    }

    loadStaff()
  }, [apiClient])

  return { staff, loading, error, refetch: () => window.location.reload() }
}

export function useSchedules(facilityId: string | null) {
  const [schedules, setSchedules] = useState<ScheduleWithAssignments[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  useEffect(() => {
    if (!facilityId) {
      setSchedules([])
      setLoading(false)
      return
    }

    if (!apiClient) {
      setError('API client not initialized')
      setLoading(false)
      return
    }

    const loadSchedules = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getFacilitySchedules(facilityId)
        setSchedules(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedules')
      } finally {
        setLoading(false)
      }
    }

    loadSchedules()
  }, [facilityId, apiClient])

  return { schedules, loading, error, refetch: () => window.location.reload() }
}