import { useState, useEffect } from 'react'
import { useApiClient } from './useApi'

export function useFacilities() {
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  useEffect(() => {
    const loadFacilities = async () => {
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
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  useEffect(() => {
    const loadStaff = async () => {
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
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  useEffect(() => {
    if (!facilityId) {
      setSchedules([])
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