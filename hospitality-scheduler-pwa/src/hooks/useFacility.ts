// File: hospitality-scheduler-pwa/src/hooks/useFacility.ts
// Dedicated hook for facility management operations - WITH PROPER TYPES & NULL SAFETY

import { useState, useEffect, useCallback } from 'react'
import { useApiClient } from './useApi'
import { toast } from 'sonner'

// Import centralized types
import * as FacilityTypes from '@/types/facility'

// ==================== MAIN FACILITIES HOOK ====================

export function useFacilities() {
  const [facilities, setFacilities] = useState<FacilityTypes.Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadFacilities = useCallback(async () => {
    if (!apiClient) {
      console.warn('API client not ready, skipping facilities load')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacilities(true) // includeDetails = true
      setFacilities(data)
    } catch (err) {
      const errorMessage = FacilityTypes.handleApiError(err, 'Failed to load facilities')
      setError(errorMessage)
      console.error('Failed to load facilities:', err)
    } finally {
      setLoading(false)
    }
  }, [apiClient])

  useEffect(() => {
    loadFacilities()
  }, [loadFacilities])

  const createFacility = useCallback(async (facilityData: FacilityTypes.CreateFacilityInput): Promise<FacilityTypes.Facility> => {
    if (!apiClient) {
      throw new Error('API client not available. Please try again.')
    }

    try {
      const newFacility = await apiClient.createFacility(facilityData)
      setFacilities(prev => [...prev, newFacility])
      toast.success(`Facility "${facilityData.name}" created successfully!`)
      return newFacility
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to create facility')
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient])

  const updateFacility = useCallback(async (
    facilityId: string, 
    facilityData: FacilityTypes.UpdateFacilityInput
  ): Promise<FacilityTypes.Facility> => {
    if (!apiClient) {
      throw new Error('API client not available. Please try again.')
    }

    try {
      const updatedFacility = await apiClient.updateFacility(facilityId, facilityData)
      setFacilities(prev => 
        prev.map(f => f.id === facilityId ? { ...f, ...updatedFacility } : f)
      )
      toast.success('Facility updated successfully!')
      return updatedFacility
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to update facility')
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient])

  const deleteFacility = useCallback(async (facilityId: string, facilityName?: string): Promise<void> => {
    if (!apiClient) {
      throw new Error('API client not available. Please try again.')
    }

    try {
      await apiClient.deleteFacility(facilityId)
      setFacilities(prev => prev.filter(f => f.id !== facilityId))
      toast.success(`Facility "${facilityName || 'facility'}" deleted successfully!`)
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to delete facility')
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

// ==================== SINGLE FACILITY HOOK ====================

export function useFacility(facilityId?: string) {
  const [facility, setFacility] = useState<FacilityTypes.Facility | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadFacility = useCallback(async () => {
    if (!facilityId || !apiClient) {
      if (!apiClient) {
        console.warn('API client not ready, skipping facility load')
      }
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacility(facilityId)
      setFacility(data)
    } catch (err) {
      const errorMessage = FacilityTypes.handleApiError(err, 'Failed to load facility')
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

// ==================== FACILITY ROLES HOOK ====================

export function useFacilityRoles(facilityId?: string) {
  const [roles, setRoles] = useState<FacilityTypes.FacilityRole[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadRoles = useCallback(async () => {
    if (!facilityId || !apiClient) {
      if (!apiClient) {
        console.warn('API client not ready, skipping roles load')
      }
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacilityRoles(facilityId)
      setRoles(data)
    } catch (err) {
      const errorMessage = FacilityTypes.handleApiError(err, 'Failed to load roles')
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

  const createRole = useCallback(async (roleData: FacilityTypes.CreateRoleInput): Promise<FacilityTypes.FacilityRole> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      const newRole = await apiClient.createFacilityRole(facilityId, roleData)
      setRoles(prev => [...prev, newRole])
      toast.success(`Role "${roleData.role_name}" created successfully!`)
      return newRole
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to create role')
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const updateRole = useCallback(async (
    roleId: string, 
    roleData: FacilityTypes.UpdateRoleInput
  ): Promise<FacilityTypes.FacilityRole> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      const updatedRole = await apiClient.updateFacilityRole(facilityId, roleId, roleData)
      setRoles(prev => 
        prev.map(r => r.id === roleId ? { ...r, ...updatedRole } : r)
      )
      toast.success('Role updated successfully!')
      return updatedRole
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to update role')
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const deleteRole = useCallback(async (roleId: string, roleName?: string): Promise<void> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      await apiClient.deleteFacilityRole(facilityId, roleId)
      setRoles(prev => prev.filter(r => r.id !== roleId))
      toast.success(`Role "${roleName || 'role'}" deleted successfully!`)
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to delete role')
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

// ==================== FACILITY ZONES HOOK ====================

export function useFacilityZones(facilityId?: string) {
  const [zones, setZones] = useState<FacilityTypes.FacilityZone[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadZones = useCallback(async () => {
    if (!facilityId || !apiClient) {
      if (!apiClient) {
        console.warn('API client not ready, skipping zones load')
      }
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacilityZones(facilityId)
      setZones(data.sort((a: FacilityTypes.FacilityZone, b: FacilityTypes.FacilityZone) => a.display_order - b.display_order))
    } catch (err) {
      const errorMessage = FacilityTypes.handleApiError(err, 'Failed to load zones')
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

  const createZone = useCallback(async (zoneData: FacilityTypes.CreateZoneInput): Promise<FacilityTypes.FacilityZone> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      const newZone = await apiClient.createFacilityZone(facilityId, zoneData)
      setZones(prev => [...prev, newZone].sort((a, b) => a.display_order - b.display_order))
      toast.success(`Zone "${zoneData.zone_name}" created successfully!`)
      return newZone
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to create zone')
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const updateZone = useCallback(async (
    zoneId: string, 
    zoneData: FacilityTypes.UpdateZoneInput
  ): Promise<FacilityTypes.FacilityZone> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      const updatedZone = await apiClient.updateFacilityZone(facilityId, zoneId, zoneData)
      setZones(prev => 
        prev.map(z => z.id === zoneId ? { ...z, ...updatedZone } : z)
          .sort((a, b) => a.display_order - b.display_order)
      )
      toast.success('Zone updated successfully!')
      return updatedZone
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to update zone')
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const deleteZone = useCallback(async (zoneId: string, zoneName?: string): Promise<void> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      await apiClient.deleteFacilityZone(facilityId, zoneId)
      setZones(prev => prev.filter(z => z.id !== zoneId))
      toast.success(`Zone "${zoneName || 'zone'}" deleted successfully!`)
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to delete zone')
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

// ==================== FACILITY SHIFTS HOOK ====================

export function useFacilityShifts(facilityId?: string) {
  const [shifts, setShifts] = useState<FacilityTypes.FacilityShift[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadShifts = useCallback(async () => {
    if (!facilityId || !apiClient) {
      if (!apiClient) {
        console.warn('API client not ready, skipping shifts load')
      }
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFacilityShifts(facilityId)
      setShifts(data.sort((a: FacilityTypes.FacilityShift, b: FacilityTypes.FacilityShift) => a.shift_order - b.shift_order))
    } catch (err) {
      const errorMessage = FacilityTypes.handleApiError(err, 'Failed to load shifts')
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

  const createShift = useCallback(async (shiftData: FacilityTypes.CreateShiftInput): Promise<FacilityTypes.FacilityShift> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      const newShift = await apiClient.createFacilityShift(facilityId, shiftData)
      setShifts(prev => [...prev, newShift].sort((a, b) => a.shift_order - b.shift_order))
      toast.success(`Shift "${shiftData.shift_name}" created successfully!`)
      return newShift
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to create shift')
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const updateShift = useCallback(async (
    shiftId: string, 
    shiftData: FacilityTypes.UpdateShiftInput
  ): Promise<FacilityTypes.FacilityShift> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      const updatedShift = await apiClient.updateFacilityShift(facilityId, shiftId, shiftData)
      setShifts(prev => 
        prev.map(s => s.id === shiftId ? { ...s, ...updatedShift } : s)
          .sort((a, b) => a.shift_order - b.shift_order)
      )
      toast.success('Shift updated successfully!')
      return updatedShift
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to update shift')
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const updateShiftsBulk = useCallback(async (
    shifts: FacilityTypes.BulkShiftUpdateInput[]
  ): Promise<FacilityTypes.FacilityShift[]> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      const updatedShifts = await apiClient.updateFacilityShiftsBulk(facilityId, shifts)
      setShifts(updatedShifts.sort((a: FacilityTypes.FacilityShift, b: FacilityTypes.FacilityShift) => a.shift_order - b.shift_order))
      toast.success('Shifts updated successfully!')
      return updatedShifts
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to update shifts')
      toast.error(errorMessage)
      throw error
    }
  }, [apiClient, facilityId])

  const deleteShift = useCallback(async (shiftId: string, shiftName?: string): Promise<void> => {
    if (!facilityId) throw new Error('Facility ID is required')
    if (!apiClient) throw new Error('API client not available. Please try again.')

    try {
      await apiClient.deleteFacilityShift(facilityId, shiftId)
      setShifts(prev => prev.filter(s => s.id !== shiftId))
      toast.success(`Shift "${shiftName || 'shift'}" deleted successfully!`)
    } catch (error) {
      const errorMessage = FacilityTypes.handleApiError(error, 'Failed to delete shift')
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

// ==================== ADDITIONAL UTILITY HOOKS ====================

/**
 * Hook that provides a safe way to check if the API client is ready
 * Useful for conditionally rendering UI elements
 */
export function useFacilityApiStatus() {
  const apiClient = useApiClient()
  
  return {
    isReady: !!apiClient,
    apiClient
  }
}

/**
 * Combined hook that provides all facility-related functionality
 * Use this when you need access to multiple facility operations
 */
export function useCompleteFacilityManagement(facilityId?: string) {
  const facilities = useFacilities()
  const facility = useFacility(facilityId)
  const roles = useFacilityRoles(facilityId)
  const zones = useFacilityZones(facilityId)
  const shifts = useFacilityShifts(facilityId)
  const { isReady } = useFacilityApiStatus()

  return {
    // API status
    isReady,
    
    // All facilities
    facilities: facilities.facilities,
    facilitiesLoading: facilities.loading,
    facilitiesError: facilities.error,
    loadFacilities: facilities.loadFacilities,
    createFacility: facilities.createFacility,
    updateFacility: facilities.updateFacility,
    deleteFacility: facilities.deleteFacility,
    
    // Single facility
    facility: facility.facility,
    facilityLoading: facility.loading,
    facilityError: facility.error,
    loadFacility: facility.loadFacility,
    
    // Roles
    roles: roles.roles,
    rolesLoading: roles.loading,
    rolesError: roles.error,
    loadRoles: roles.loadRoles,
    createRole: roles.createRole,
    updateRole: roles.updateRole,
    deleteRole: roles.deleteRole,
    
    // Zones
    zones: zones.zones,
    zonesLoading: zones.loading,
    zonesError: zones.error,
    loadZones: zones.loadZones,
    createZone: zones.createZone,
    updateZone: zones.updateZone,
    deleteZone: zones.deleteZone,
    
    // Shifts
    shifts: shifts.shifts,
    shiftsLoading: shifts.loading,
    shiftsError: shifts.error,
    loadShifts: shifts.loadShifts,
    createShift: shifts.createShift,
    updateShift: shifts.updateShift,
    updateShiftsBulk: shifts.updateShiftsBulk,
    deleteShift: shifts.deleteShift,
    
    // Global operations
    refreshAll: () => {
      facilities.refetch()
      facility.refetch()
      roles.refetch()
      zones.refetch()
      shifts.refetch()
    }
  }
}