// File: hospitality-scheduler-pwa/src/hooks/useFacility.ts
// Dedicated hook for facility management operations

import { useState, useEffect, useCallback } from 'react'
import { useApiClient } from './useApi'
import { toast } from 'sonner'

// Types
interface Facility {
  id: string
  name: string
  location?: string
  facility_type: string
  address?: string
  phone?: string
  email?: string
  description?: string
  shifts?: any[]
  roles?: any[]
  zones?: any[]
  staff_count?: number
  active_schedules?: number
  created_at: string
  updated_at?: string
}

interface FacilityRole {
  id: string
  role_name: string
  min_skill_level: number
  max_skill_level: number
  is_management: boolean
  hourly_rate_min?: number
  hourly_rate_max?: number
  is_active: boolean
  created_at: string
}

interface FacilityZone {
  id: string
  zone_id: string
  zone_name: string
  description?: string
  required_roles: string[]
  preferred_roles: string[]
  min_staff_per_shift: number
  max_staff_per_shift: number
  is_active: boolean
  display_order: number
  created_at: string
}

interface FacilityShift {
  id: string
  shift_name: string
  start_time: string
  end_time: string
  requires_manager: boolean
  min_staff: number
  max_staff: number
  shift_order: number
  is_active: boolean
  color?: string
  created_at: string
}

// Main facilities hook
export function useFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadFacilities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacilities(true) // includeDetails = true
      setFacilities(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load facilities'
      setError(errorMessage)
      console.error('Failed to load facilities:', err)
    } finally {
      setLoading(false)
    }
  }, [apiClient])

  useEffect(() => {
    loadFacilities()
  }, [loadFacilities])

  const createFacility = useCallback(async (facilityData: {
    name: string
    location?: string
    facility_type?: string
    address?: string
    phone?: string
    email?: string
    description?: string
  }) => {
    try {
      const newFacility = await apiClient.createFacility(facilityData)
      setFacilities(prev => [...prev, newFacility])
      toast.success(`Facility "${facilityData.name}" created successfully!`)
      return newFacility
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create facility'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient])

  const updateFacility = useCallback(async (facilityId: string, facilityData: {
    name?: string
    location?: string
    facility_type?: string
    address?: string
    phone?: string
    email?: string
    description?: string
  }) => {
    try {
      const updatedFacility = await apiClient.updateFacility(facilityId, facilityData)
      setFacilities(prev => 
        prev.map(f => f.id === facilityId ? { ...f, ...updatedFacility } : f)
      )
      toast.success('Facility updated successfully!')
      return updatedFacility
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update facility'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient])

  const deleteFacility = useCallback(async (facilityId: string, facilityName?: string) => {
    try {
      await apiClient.deleteFacility(facilityId)
      setFacilities(prev => prev.filter(f => f.id !== facilityId))
      toast.success(`Facility "${facilityName || 'facility'}" deleted successfully!`)
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete facility'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient])

  return {
    facilities,
    loading,
    error,
    loadFacilities,
    createFacility,
    updateFacility,
    deleteFacility,
    refetch: loadFacilities
  }
}

// Facility roles hook
export function useFacilityRoles(facilityId?: string) {
  const [roles, setRoles] = useState<FacilityRole[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadRoles = useCallback(async () => {
    if (!facilityId) return

    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacilityRoles(facilityId)
      setRoles(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load roles'
      setError(errorMessage)
      console.error('Failed to load facility roles:', err)
    } finally {
      setLoading(false)
    }
  }, [apiClient, facilityId])

  useEffect(() => {
    if (facilityId) {
      loadRoles()
    }
  }, [loadRoles, facilityId])

  const createRole = useCallback(async (roleData: {
    role_name: string
    min_skill_level?: number
    max_skill_level?: number
    is_management?: boolean
    hourly_rate_min?: number
    hourly_rate_max?: number
  }) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      const newRole = await apiClient.createFacilityRole(facilityId, roleData)
      setRoles(prev => [...prev, newRole])
      toast.success(`Role "${roleData.role_name}" created successfully!`)
      return newRole
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create role'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const updateRole = useCallback(async (roleId: string, roleData: {
    role_name?: string
    min_skill_level?: number
    max_skill_level?: number
    is_management?: boolean
    hourly_rate_min?: number
    hourly_rate_max?: number
    is_active?: boolean
  }) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      const updatedRole = await apiClient.updateFacilityRole(facilityId, roleId, roleData)
      setRoles(prev => 
        prev.map(r => r.id === roleId ? { ...r, ...updatedRole } : r)
      )
      toast.success('Role updated successfully!')
      return updatedRole
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update role'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const deleteRole = useCallback(async (roleId: string, roleName?: string) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      await apiClient.deleteFacilityRole(facilityId, roleId)
      setRoles(prev => prev.filter(r => r.id !== roleId))
      toast.success(`Role "${roleName || 'role'}" deleted successfully!`)
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete role'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  return {
    roles,
    loading,
    error,
    loadRoles,
    createRole,
    updateRole,
    deleteRole,
    refetch: loadRoles
  }
}

// Facility zones hook
export function useFacilityZones(facilityId?: string) {
  const [zones, setZones] = useState<FacilityZone[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadZones = useCallback(async () => {
    if (!facilityId) return

    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacilityZones(facilityId)
      setZones(data.sort((a: FacilityZone, b: FacilityZone) => a.display_order - b.display_order))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load zones'
      setError(errorMessage)
      console.error('Failed to load facility zones:', err)
    } finally {
      setLoading(false)
    }
  }, [apiClient, facilityId])

  useEffect(() => {
    if (facilityId) {
      loadZones()
    }
  }, [loadZones, facilityId])

  const createZone = useCallback(async (zoneData: {
    zone_id: string
    zone_name: string
    description?: string
    required_roles?: string[]
    preferred_roles?: string[]
    min_staff_per_shift?: number
    max_staff_per_shift?: number
    display_order?: number
  }) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      const newZone = await apiClient.createFacilityZone(facilityId, zoneData)
      setZones(prev => [...prev, newZone].sort((a, b) => a.display_order - b.display_order))
      toast.success(`Zone "${zoneData.zone_name}" created successfully!`)
      return newZone
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create zone'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const updateZone = useCallback(async (zoneId: string, zoneData: {
    zone_id?: string
    zone_name?: string
    description?: string
    required_roles?: string[]
    preferred_roles?: string[]
    min_staff_per_shift?: number
    max_staff_per_shift?: number
    is_active?: boolean
    display_order?: number
  }) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      const updatedZone = await apiClient.updateFacilityZone(facilityId, zoneId, zoneData)
      setZones(prev => 
        prev.map(z => z.id === zoneId ? { ...z, ...updatedZone } : z)
          .sort((a, b) => a.display_order - b.display_order)
      )
      toast.success('Zone updated successfully!')
      return updatedZone
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update zone'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const deleteZone = useCallback(async (zoneId: string, zoneName?: string) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      await apiClient.deleteFacilityZone(facilityId, zoneId)
      setZones(prev => prev.filter(z => z.id !== zoneId))
      toast.success(`Zone "${zoneName || 'zone'}" deleted successfully!`)
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete zone'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  return {
    zones,
    loading,
    error,
    loadZones,
    createZone,
    updateZone,
    deleteZone,
    refetch: loadZones
  }
}

// Facility shifts hook
export function useFacilityShifts(facilityId?: string) {
  const [shifts, setShifts] = useState<FacilityShift[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadShifts = useCallback(async () => {
    if (!facilityId) return

    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacilityShifts(facilityId)
      setShifts(data.sort((a: FacilityShift, b: FacilityShift) => a.shift_order - b.shift_order))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load shifts'
      setError(errorMessage)
      console.error('Failed to load facility shifts:', err)
    } finally {
      setLoading(false)
    }
  }, [apiClient, facilityId])

  useEffect(() => {
    if (facilityId) {
      loadShifts()
    }
  }, [loadShifts, facilityId])

  const createShift = useCallback(async (shiftData: {
    shift_name: string
    start_time: string
    end_time: string
    requires_manager?: boolean
    min_staff?: number
    max_staff?: number
    shift_order?: number
    color?: string
  }) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      const newShift = await apiClient.createFacilityShift(facilityId, shiftData)
      setShifts(prev => [...prev, newShift].sort((a, b) => a.shift_order - b.shift_order))
      toast.success(`Shift "${shiftData.shift_name}" created successfully!`)
      return newShift
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create shift'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const updateShift = useCallback(async (shiftId: string, shiftData: {
    shift_name?: string
    start_time?: string
    end_time?: string
    requires_manager?: boolean
    min_staff?: number
    max_staff?: number
    shift_order?: number
    is_active?: boolean
    color?: string
  }) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      const updatedShift = await apiClient.updateFacilityShift(facilityId, shiftId, shiftData)
      setShifts(prev => 
        prev.map(s => s.id === shiftId ? { ...s, ...updatedShift } : s)
          .sort((a, b) => a.shift_order - b.shift_order)
      )
      toast.success('Shift updated successfully!')
      return updatedShift
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update shift'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const updateShiftsBulk = useCallback(async (shifts: Array<{
    shift_name: string
    start_time: string
    end_time: string
    requires_manager?: boolean
    min_staff?: number
    max_staff?: number
    shift_order?: number
    color?: string
  }>) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      const updatedShifts = await apiClient.updateFacilityShiftsBulk(facilityId, shifts)
      setShifts(updatedShifts.sort((a: FacilityShift, b: FacilityShift) => a.shift_order - b.shift_order))
      toast.success('Shifts updated successfully!')
      return updatedShifts
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update shifts'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const deleteShift = useCallback(async (shiftId: string, shiftName?: string) => {
    if (!facilityId) throw new Error('Facility ID is required')

    try {
      await apiClient.deleteFacilityShift(facilityId, shiftId)
      setShifts(prev => prev.filter(s => s.id !== shiftId))
      toast.success(`Shift "${shiftName || 'shift'}" deleted successfully!`)
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete shift'
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  return {
    shifts,
    loading,
    error,
    loadShifts,
    createShift,
    updateShift,
    updateShiftsBulk,
    deleteShift,
    refetch: loadShifts
  }
}

// Single facility hook (for detailed facility management)
export function useFacility(facilityId?: string) {
  const [facility, setFacility] = useState<Facility | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadFacility = useCallback(async () => {
    if (!facilityId) return

    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacility(facilityId)
      setFacility(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load facility'
      setError(errorMessage)
      console.error('Failed to load facility:', err)
    } finally {
      setLoading(false)
    }
  }, [apiClient, facilityId])

  useEffect(() => {
    if (facilityId) {
      loadFacility()
    }
  }, [loadFacility, facilityId])

  return {
    facility,
    loading,
    error,
    loadFacility,
    refetch: loadFacility
  }
}

// Export types for use in components
export type {
  Facility,
  FacilityRole,
  FacilityZone,
  FacilityShift
}