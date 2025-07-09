'use client'
// Main schedule management page
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  Clock, 
  Users, 
  Settings, 
  Plus, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Save, 
  Zap, 
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Building,
  MapPin,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { DailyCalendar } from '@/components/schedule/DailyCalendar'
import { WeeklyCalendar } from '@/components/schedule/WeeklyCalendar'
import { MonthlyCalendar } from '@/components/schedule/MonthlyCalendar'
import { SmartGenerateModal } from '@/components/schedule/SmartGenerateModal'
import { ScheduleConfigModal } from '@/components/schedule/ScheduleConfigModal'
import { StaffAssignmentPanel } from '@/components/schedule/StaffAssignmentPanel'
import { FacilityZoneSelector } from '@/components/schedule/FacilityZoneSelector'
import { toast } from 'sonner'

type ViewPeriod = 'daily' | 'weekly' | 'monthly'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHIFTS = [
  { id: 0, name: 'Morning', time: '6:00 AM - 2:00 PM', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 1, name: 'Afternoon', time: '2:00 PM - 10:00 PM', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 2, name: 'Evening', time: '10:00 PM - 6:00 AM', color: 'bg-purple-100 text-purple-800 border-purple-200' }
]

// Facility zones/departments mapping
const FACILITY_ZONES = {
  'hotel': [
    { id: 'front-desk', name: 'Front Desk', roles: ['Front Desk Agent', 'Concierge', 'Manager'] },
    { id: 'housekeeping', name: 'Housekeeping', roles: ['Housekeeping', 'Maintenance'] },
    { id: 'restaurant', name: 'Restaurant', roles: ['Chef', 'Sous Chef', 'Waiter', 'Waitress'] },
    { id: 'bar', name: 'Bar & Lounge', roles: ['Bartender', 'Host/Hostess'] },
    { id: 'security', name: 'Security', roles: ['Security'] }
  ],
  'restaurant': [
    { id: 'kitchen', name: 'Kitchen', roles: ['Chef', 'Sous Chef', 'Line Cook'] },
    { id: 'dining', name: 'Dining Room', roles: ['Waiter', 'Waitress', 'Host/Hostess'] },
    { id: 'bar', name: 'Bar', roles: ['Bartender'] },
    { id: 'management', name: 'Management', roles: ['Manager', 'Assistant Manager'] }
  ],
  'default': [
    { id: 'all', name: 'All Areas', roles: [] }
  ]
}

export default function SchedulePage() {
  const router = useRouter()
  const { isManager, isAuthenticated, isLoading: authLoading } = useAuth()
  const apiClient = useApiClient()
  
  // Core state
  const [facilities, setFacilities] = useState([])
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [selectedZones, setSelectedZones] = useState([])
  const [staff, setStaff] = useState([])
  const [schedules, setSchedules] = useState([])
  const [currentSchedule, setCurrentSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // View state
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('weekly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showStaffPanel, setShowStaffPanel] = useState(true)
  const [filterRole, setFilterRole] = useState('all')
  const [filterZone, setFilterZone] = useState('all')
  
  // Modal state
  const [showSmartGenerateModal, setShowSmartGenerateModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  
  // Schedule editing state
  const [draggedStaff, setDraggedStaff] = useState(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Get facility zones based on facility type
  const getFacilityZones = (facility) => {
    if (!facility) return FACILITY_ZONES.default
    
    const facilityName = facility.name.toLowerCase()
    if (facilityName.includes('hotel')) return FACILITY_ZONES.hotel
    if (facilityName.includes('restaurant') || facilityName.includes('bistro')) return FACILITY_ZONES.restaurant
    return FACILITY_ZONES.default
  }

  // Load initial data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData()
    }
  }, [authLoading, isAuthenticated])

  // DEBUG: check current schedule state
  useEffect(() => {
  console.log('🔄 Schedule state changed:', currentSchedule)
  if (currentSchedule === null) {
    console.trace('Schedule set to null - stack trace:')
  }
}, [currentSchedule])

  const loadData = async () => {
    try {
      setLoading(true)
      const [facilitiesData, staffData] = await Promise.all([
        apiClient.getFacilities(),
        apiClient.getStaff()
      ])
      
      setFacilities(facilitiesData)
      setStaff(staffData)
      
      // Auto-select first facility
      if (facilitiesData.length > 0) {
        setSelectedFacility(facilitiesData[0])
        // Auto-select all zones for the facility
        const zones = getFacilityZones(facilitiesData[0])
        setSelectedZones(zones.map(z => z.id))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }

  // Load schedules when facility or date changes
  useEffect(() => {
    if (selectedFacility) {
      loadSchedules()
    }
  }, [selectedFacility, currentDate, viewPeriod])

    // normalise data returned from API
  const normalizeAssignments = (assignments: any[]): any[] => {
    if (!assignments) return []
    
    return assignments.map((assignment, index) => {
      // Ensure consistent format
      return {
        id: assignment.id || `assignment-${assignment.schedule_id || 'temp'}-${assignment.day}-${assignment.shift}-${assignment.staff_id}-${index}`,
        day: Number(assignment.day),
        shift: Number(assignment.shift),
        staff_id: String(assignment.staff_id),
        // Include any other fields that might be present
        schedule_id: assignment.schedule_id,
        zone_id: assignment.zone_id,
        staff_name: assignment.staff_name,
        staff_role: assignment.staff_role
      }
    })
  }

  const loadSchedules = async () => {
    if (!selectedFacility) {
      console.log('No facility selected, skipping schedule load')
      return
    }
    
    try {
      console.log('Loading schedules for facility:', selectedFacility.name)
      
      const periodStart = getPeriodStart(currentDate, viewPeriod)
      const schedulesData = await apiClient.getFacilitySchedules(selectedFacility.id)
      
      // Normalize schedule data
      const normalizedSchedules = schedulesData.map(schedule => ({
        ...schedule,
        week_start: schedule.week_start.split('T')[0],
        assignments: normalizeAssignments(schedule.assignments || [])
      }))
      
      console.log('Raw schedules loaded:', schedulesData.length)
      setSchedules(normalizedSchedules)
      
      // Find schedule for current period
      const currentPeriodSchedule = normalizedSchedules.find(s => {
        const scheduleDate = new Date(s.week_start)
        return scheduleDate.toDateString() === periodStart.toDateString()
      })
      
      console.log('Found schedule for current period:', currentPeriodSchedule)
      console.log('Current date:', currentDate.toDateString())
      console.log('Period start:', periodStart.toDateString())
      console.log('Available schedules:', normalizedSchedules.map(s => ({ 
        id: s.id, 
        week_start: s.week_start,
        assignments_count: s.assignments?.length || 0 
      })))
      
      // DEBUG: Log current state before decision
      console.log('Current state check:', {
        unsavedChanges,
        currentSchedule: currentSchedule?.id,
        is_generated: currentSchedule?.is_generated,
        foundScheduleId: currentPeriodSchedule?.id
      })
      
      // FIXED LOGIC: Handle unsaved changes more carefully
      if (unsavedChanges && currentSchedule) {
        console.log('Unsaved changes detected')
        
        // Check if current schedule is a generated/temp schedule that should be preserved
        const isGeneratedSchedule = currentSchedule.id?.includes('temp') || 
                                  currentSchedule.id?.includes('generated') || 
                                  currentSchedule.is_generated === true
        
        console.log('Is generated schedule?', isGeneratedSchedule)
        
        // Check if we're navigating to a different period
        let isDifferentPeriod = false
        try {
          const currentPeriodStart = getPeriodStart(new Date(currentSchedule.week_start), viewPeriod)
          const newPeriodStart = periodStart
          isDifferentPeriod = currentPeriodStart.toDateString() !== newPeriodStart.toDateString()
          console.log('Period comparison:', {
            currentPeriod: currentPeriodStart.toDateString(),
            newPeriod: newPeriodStart.toDateString(),
            isDifferent: isDifferentPeriod
          })
        } catch (error) {
          console.error('Error comparing periods:', error)
          isDifferentPeriod = false
        }
        
        if (isGeneratedSchedule && !isDifferentPeriod) {
          console.log('PRESERVING generated schedule for same period - RETURNING EARLY')
          // Keep the current generated schedule, don't replace it
          return
        } else if (isDifferentPeriod) {
          console.log('Period changed - prompting user for unsaved changes')
          
          const shouldDiscard = window.confirm(
            'You have unsaved changes. Do you want to discard them and view the other period?'
          )
          
          if (!shouldDiscard) {
            console.log('User chose to keep unsaved changes - reverting navigation')
            return
          } else {
            console.log('User chose to discard unsaved changes')
            setUnsavedChanges(false)
          }
        } else {
          console.log('Unsaved changes but not generated or different period - continuing with load')
        }
      }
      
      // Update the current schedule
      console.log('SETTING current schedule to:', currentPeriodSchedule?.id || 'null')
      setCurrentSchedule(currentPeriodSchedule || null)
      
      if (currentPeriodSchedule) {
        console.log('Schedule loaded for current period:', currentPeriodSchedule.id)
        console.log('Assignments loaded:', currentPeriodSchedule.assignments?.length || 0)
        
        // Clear unsaved changes when loading a saved schedule
        setUnsavedChanges(false)
      } else {
        console.log('No schedule found for current period - creating empty state')
        
        // Only clear unsaved changes if we don't have a generated schedule
        if (!unsavedChanges) {
          setUnsavedChanges(false)
        }
      }
      
    } catch (error) {
      console.error('Failed to load schedules:', error)
      setSchedules([])
      
      // Only clear current schedule if we don't have unsaved changes or user confirmed
      if (!unsavedChanges) {
        setCurrentSchedule(null)
      }
    }
  }

  // Helper functions for date navigation
  const getPeriodStart = (date: Date, period: ViewPeriod) => {
    const result = new Date(date)
    
    switch (period) {
      case 'daily':
        return result
      case 'weekly':
        const dayOfWeek = result.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        result.setDate(result.getDate() - daysToMonday)
        return result
      case 'monthly':
        result.setDate(1)
        return result
    }
  }

  const navigatePeriod = (direction: number) => {
    // Check for unsaved changes before navigation
    if (unsavedChanges && currentSchedule) {
      const isGeneratedSchedule = currentSchedule.id?.includes('temp') || 
                                currentSchedule.id?.includes('generated') || 
                                currentSchedule.is_generated
      
      if (isGeneratedSchedule) {
        const shouldDiscard = window.confirm(
          'You have an unsaved generated schedule. Do you want to save it before navigating?'
        )
        
        if (shouldDiscard) {
          // Trigger save first, then navigate
          handleSaveSchedule().then(() => {
            // Navigate after save completes
            performNavigation(direction)
          }).catch((error) => {
            console.error('Save failed:', error)
            toast.error('Failed to save schedule')
          })
          return
        }
      }
    }
    
    // Perform the navigation
    performNavigation(direction)
  }

  const performNavigation = (direction: number) => {
    const newDate = new Date(currentDate)
    
    switch (viewPeriod) {
      case 'daily':
        newDate.setDate(currentDate.getDate() + direction)
        break
      case 'weekly':
        newDate.setDate(currentDate.getDate() + (direction * 7))
        break
      case 'monthly':
        newDate.setMonth(currentDate.getMonth() + direction)
        break
    }
    
    setCurrentDate(newDate)
    
    // Clear unsaved changes flag after navigation
    setUnsavedChanges(false)
  }

  const formatPeriodDisplay = (date: Date, period: ViewPeriod) => {
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'weekly':
        const weekStart = getPeriodStart(date, 'weekly')
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'monthly':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    }
  }

  // Handle assignments
  const handleAssignmentChange = (day: number, shift: number, staffId: string) => {
  console.log('Assignment change called:', { day, shift, staffId })
  console.log(' Current schedule before update:', currentSchedule)
  
  setUnsavedChanges(true)
  
  // Check if we have a schedule to update
  if (!currentSchedule) {
    console.warn(' No current schedule - creating new one')
    
    // Create a new schedule structure
    const newSchedule = {
      id: `temp-schedule-${Date.now()}`,
      facility_id: selectedFacility?.id,
      week_start: getPeriodStart(currentDate, viewPeriod).toISOString().split('T')[0],
      assignments: []
    }

    // Add the new assignment
    const newAssignment = {
      id: `temp-assignment-${Date.now()}`,
      day,
      shift,
      staff_id: staffId
    }
    
    newSchedule.assignments.push(newAssignment)
    console.log('➕ Creating new schedule with assignment:', newSchedule)
    
    setCurrentSchedule(newSchedule)
    // Show success message
    const staffMember = staff.find(s => s.id === staffId)
    const shiftName = SHIFTS.find(s => s.id === shift)?.name || 'Shift'
    const dayName = DAYS[day] || 'Day'
    
    if (staffMember) {
      toast.success(`${staffMember.full_name} assigned to ${dayName} ${shiftName}`)
    }
    
    return
  }

  // Check if staff is already assigned to this day/shift
  const existingAssignment = currentSchedule.assignments?.find(a => 
    a.day === day && a.shift === shift && a.staff_id === staffId
  )
  
  if (existingAssignment) {
    toast.error('Staff member is already assigned to this shift')
    return
  }
  
  // Create new assignment
  const newAssignment = {
    id: `temp-assignment-${Date.now()}`,
    day,
    shift,
    staff_id: staffId
  }
  
  console.log(' Adding assignment to existing schedule:', newAssignment)
  
  // Update the current schedule immutably
  setCurrentSchedule(prevSchedule => {
    if (!prevSchedule) {
      console.warn(' Previous schedule is null in setter')
      return prevSchedule
    }
    
    const updatedSchedule = {
      ...prevSchedule,
      assignments: [...(prevSchedule.assignments || []), newAssignment]
    }
    
    console.log(' Updated schedule:', updatedSchedule)
    return updatedSchedule
  })
  
  // Show success message
  const staffMember = staff.find(s => s.id === staffId)
  const shiftName = SHIFTS.find(s => s.id === shift)?.name || 'Shift'
  const dayName = DAYS[day] || 'Day'
  
  if (staffMember) {
    toast.success(`${staffMember.full_name} assigned to ${dayName} ${shiftName}`)
    }
  }

  // Fix the remove assignment handler
const handleRemoveAssignment = (assignmentId: string) => {
  console.log('Remove assignment called:', assignmentId)
  console.log(' Current schedule before removal:', currentSchedule)
  
  setUnsavedChanges(true)
  
  if (!currentSchedule) {
    console.warn(' No current schedule to remove from')
    return
  }
  
  // Find the assignment to get staff info for success message
  const assignmentToRemove = currentSchedule.assignments?.find(a => a.id === assignmentId)
  
  setCurrentSchedule(prevSchedule => {
    if (!prevSchedule) {
      console.warn(' Previous schedule is null in remove setter')
      return prevSchedule
    }
    
    const updatedSchedule = {
      ...prevSchedule,
      assignments: prevSchedule.assignments?.filter(a => a.id !== assignmentId) || []
    }
    
    console.log(' Schedule after removal:', updatedSchedule)
    return updatedSchedule
  })
  
  // Show success message
  if (assignmentToRemove) {
    const staffMember = staff.find(s => s.id === assignmentToRemove.staff_id)
    if (staffMember) {
      toast.success(`${staffMember.full_name} removed from schedule`)
    }
  }
}

  const handleSmartGenerate = async (config) => {
    console.log('Smart generate started with config:', config)
    
    if (!selectedFacility) {
      console.error('No facility selected')
      toast.error('Please select a facility first')
      return
    }
    
    try {
      const periodStart = getPeriodStart(currentDate, viewPeriod)
      console.log('Period start calculated:', periodStart)
      
      const requestData = {
        facility_id: selectedFacility.id,
        period_start: periodStart.toISOString().split('T')[0],
        period_type: viewPeriod,
        zones: selectedZones,
        role_mapping: config.role_mapping || {},
        use_constraints: config.use_constraints,
        ...config
      }
      
      console.log('Making API request:', requestData)
      
      const result = await apiClient.generateSmartSchedule(requestData)
      console.log('API response received:', result)
      
      // Create a temporary schedule object for the frontend
      if (!result || !result.assignments) {
        throw new Error('Invalid response: no assignments generated')
      }
      
      // Create a temporary schedule object with generated assignments
      const scheduleData = {
        id: `temp-generated-${Date.now()}`,
        facility_id: selectedFacility.id,
        week_start: periodStart.toISOString().split('T')[0],
        assignments: normalizeAssignments(result.assignments),
        created_at: new Date().toISOString(),
        is_generated: true, // IMPORTANT: Mark as generated (not saved)
        zone_coverage: result.zone_coverage || {},
        optimization_metrics: result.optimization_metrics || {},
        ...result
      }
      
      console.log('Created temporary schedule data:', {
        id: scheduleData.id,
        is_generated: scheduleData.is_generated,
        assignments_count: scheduleData.assignments.length,
        week_start: scheduleData.week_start
      })
      
      // Update the current schedule state
      setCurrentSchedule(scheduleData)
      
      // Mark as having unsaved changes since it's only generated, not saved
      setUnsavedChanges(true)
      console.log('Marked as unsaved changes - save button should appear')
      
      // Show success message
      const periodName = viewPeriod.charAt(0).toUpperCase() + viewPeriod.slice(1)
      const assignmentCount = scheduleData.assignments.length
      
      console.log('Showing success toast')
      toast.success(`${periodName} schedule generated successfully! ${assignmentCount} assignments created. Click "Save Changes" to persist.`)
      
    } catch (error) {
      console.error('Smart generate failed:', error)
      
      // Better error handling
      let errorMessage = 'Failed to generate schedule'
      
      if (error.message?.includes('fetch')) {
        errorMessage = 'Network error - check if backend is running'
      } else if (error.message?.includes('404')) {
        errorMessage = 'Smart scheduling endpoint not found'
      } else if (error.message?.includes('422')) {
        errorMessage = 'Invalid scheduling parameters'
      } else if (error.message) {
        errorMessage = `Generation failed: ${error.message}`
      }
      
      console.log('Showing error toast:', errorMessage)
      toast.error(errorMessage)
    }
  }


  // Save schedule changes
  const handleSaveSchedule = async () => {
    console.log('SAVE SCHEDULE STARTED')
    
    if (!currentSchedule) {
      console.log('No current schedule')
      toast.error('No schedule to save')
      return
    }
    
    try {
      console.log('Current schedule being saved:', {
        id: currentSchedule.id,
        is_generated: currentSchedule.is_generated,
        assignments_count: currentSchedule.assignments?.length || 0
      })
      
      let savedSchedule
      
      // Check if this is a new/generated schedule (temp ID or marked as generated)
      const isNewSchedule = !currentSchedule.id || 
                          currentSchedule.id.includes('temp') || 
                          currentSchedule.id.includes('generated') ||
                          currentSchedule.is_generated === true
      
      console.log('Schedule type check:', {
        id: currentSchedule.id,
        isNewSchedule,
        is_generated: currentSchedule.is_generated
      })
      
      if (isNewSchedule) {
        console.log('Creating new schedule via API')
        
        // Create new schedule
        const scheduleToSave = {
          facility_id: currentSchedule.facility_id,
          week_start: currentSchedule.week_start,
          assignments: currentSchedule.assignments || []
        }
        
        console.log('Data being sent to createSchedule:', {
          facility_id: scheduleToSave.facility_id,
          week_start: scheduleToSave.week_start,
          assignments_count: scheduleToSave.assignments.length
        })
        
        savedSchedule = await apiClient.createSchedule(scheduleToSave)
        console.log('New schedule created:', {
          id: savedSchedule.id,
          assignments_count: savedSchedule.assignments?.length || 0
        })
        
      } else {
        console.log('Updating existing schedule via API')
        
        // Update existing schedule
        const updateData = {
          assignments: currentSchedule.assignments || []
        }
        
        console.log('Data being sent to updateSchedule:', {
          id: currentSchedule.id,
          assignments_count: updateData.assignments.length
        })
        
        savedSchedule = await apiClient.updateSchedule(currentSchedule.id, updateData)
        console.log('Schedule updated:', {
          id: savedSchedule.id,
          assignments_count: savedSchedule.assignments?.length || 0
        })
      }
      
      console.log('API call successful, processing response...')

      // Ensure the saved schedule has the correct format
      savedSchedule = {
        ...savedSchedule,
        assignments: normalizeAssignments(savedSchedule.assignments || []),
        is_generated: false // Now it's saved, not just generated
      }

      console.log('Normalized saved schedule:', {
        id: savedSchedule.id,
        is_generated: savedSchedule.is_generated,
        assignments_count: savedSchedule.assignments.length
      })
      
      // Update the current schedule with the saved version
      setCurrentSchedule(savedSchedule)
      setUnsavedChanges(false)
      
      console.log('State updated - reloading schedules...')
      
      // Reload schedules to get the latest data
      await loadSchedules()
      
      console.log('Everything completed successfully!')
      toast.success('Schedule saved successfully!')
      
    } catch (error) {
      console.error('SAVE FAILED:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      })
      
      // Better error handling
      let errorMessage = 'Failed to save schedule'
      
      if (error.message?.includes('404')) {
        errorMessage = 'Schedule not found - it may have been deleted'
      } else if (error.message?.includes('405')) {
        errorMessage = 'Save endpoint not available - check backend configuration'
      } else if (error.message?.includes('403')) {
        errorMessage = 'Permission denied - check authentication'
      } else if (error.message?.includes('422')) {
        errorMessage = 'Invalid schedule data'
      } else if (error.message) {
        errorMessage = `Save failed: ${error.message}`
      }
      
      toast.error(errorMessage)
    }
  } // end save function

  // Filter staff based on facility, zones, and roles
  const facilityStaff = staff.filter(member => 
    member.facility_id === selectedFacility?.id && member.is_active
  )

  const filteredStaff = facilityStaff.filter(member => {
    // Zone filter
    if (filterZone !== 'all' && selectedZones.length > 0) {
      const zones = getFacilityZones(selectedFacility)
      const zone = zones.find(z => z.id === filterZone)
      if (zone && zone.roles.length > 0 && !zone.roles.includes(member.role)) {
        return false
      }
    }
    
    // Role filter
    if (filterRole !== 'all' && !member.role.toLowerCase().includes(filterRole.toLowerCase())) {
      return false
    }
    
    return true
  })

  // Get available roles and zones
  const availableRoles = [...new Set(facilityStaff.map(member => member.role))]
  const availableZones = getFacilityZones(selectedFacility)

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading schedule data...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="gap-2 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Smart Schedule Management
                </h1>
                <p className="text-gray-600 mt-1">
                  {isManager ? 'AI-powered scheduling with zone-based optimization' : 'View your work schedule'}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStaffPanel(!showStaffPanel)}
                className="gap-2"
              >
                {showStaffPanel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showStaffPanel ? 'Hide' : 'Show'} Staff
              </Button>
              
              {isManager && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfigModal(true)}
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Config
                  </Button>
                  
                  <Button
                    onClick={() => setShowSmartGenerateModal(true)}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Zap className="w-4 h-4" />
                    Smart Generate
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Facility & Zone Selection */}
            <Card className="lg:col-span-2 border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Facility & Zones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Facility Selector */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Facility</label>
                  <select
                    value={selectedFacility?.id || ''}
                    onChange={(e) => {
                      const facility = facilities.find(f => f.id === e.target.value)
                      setSelectedFacility(facility)
                      if (facility) {
                        const zones = getFacilityZones(facility)
                        setSelectedZones(zones.map(z => z.id))
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  >
                    <option value="">Select a facility</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Zone Selection */}
                {selectedFacility && (
                  <FacilityZoneSelector
                    zones={availableZones}
                    selectedZones={selectedZones}
                    onZoneChange={setSelectedZones}
                    staff={facilityStaff}
                  />
                )}
              </CardContent>
            </Card>

            {/* Period Selection */}
            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  View Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={viewPeriod} onValueChange={(value) => setViewPeriod(value as ViewPeriod)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigatePeriod(-1)}
                    className="p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentDate(new Date())}
                      className="text-xs"
                    >
                      Today
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigatePeriod(1)}
                    className="p-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="text-sm font-medium text-center mt-2">
                  {formatPeriodDisplay(currentDate, viewPeriod)}
                </p>
              </CardContent>
            </Card>

            {/* Schedule Status */}
            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentSchedule ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Schedule Active</p>
                        <p className="text-xs text-gray-500">
                          {currentSchedule.assignments?.length || 0} assignments
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-800">No Schedule</p>
                        <p className="text-xs text-gray-500">Generate or create schedule</p>
                      </div>
                    </div>
                  )}
                  
                  {unsavedChanges && (
                    <Button
                      size="sm"
                      onClick={handleSaveSchedule}
                      className="w-full gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                  )}
                  
                  {selectedZones.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Active Zones:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedZones.map(zoneId => {
                          const zone = availableZones.find(z => z.id === zoneId)
                          return zone ? (
                            <Badge key={zoneId} variant="outline" className="text-xs">
                              {zone.name}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Staff Panel */}
            {showStaffPanel && (
              <div className="lg:col-span-1">
                <StaffAssignmentPanel
                  staff={filteredStaff}
                  availableRoles={availableRoles}
                  availableZones={availableZones}
                  filterRole={filterRole}
                  filterZone={filterZone}
                  onFilterChange={setFilterRole}
                  onZoneFilterChange={setFilterZone}
                  onDragStart={setDraggedStaff}
                  onDragEnd={() => setDraggedStaff(null)}
                />
              </div>
            )}

            {/* Calendar Views */}
            <div className={showStaffPanel ? 'lg:col-span-3' : 'lg:col-span-4'}>
              {viewPeriod === 'daily' && (
                <DailyCalendar
                  key={`daily-${currentDate.getTime()}`}
                  currentDate={currentDate}
                  schedule={currentSchedule}
                  staff={facilityStaff}
                  shifts={SHIFTS}
                  isManager={isManager}
                  draggedStaff={draggedStaff}
                  onAssignmentChange={(shift, staffId) => {
                  // For daily calendar, day is always 0
                  handleAssignmentChange(0, shift, staffId)
                  }}
                  onRemoveAssignment={handleRemoveAssignment}
                />
              )}
              
              {viewPeriod === 'weekly' && (
                <WeeklyCalendar
                  key={`weekly-${currentDate.getTime()}`} 
                  currentWeek={getPeriodStart(currentDate, 'weekly')}
                  schedule={currentSchedule}
                  staff={facilityStaff}
                  shifts={SHIFTS}
                  days={DAYS}
                  isManager={isManager}
                  draggedStaff={draggedStaff}
                  onAssignmentChange={handleAssignmentChange}
                  onRemoveAssignment={handleRemoveAssignment}
                />
              )}
              
              {viewPeriod === 'monthly' && (
                <MonthlyCalendar
                  key={`monthly-${getPeriodStart(currentDate, 'monthly').getTime()}`}
                  currentMonth={getPeriodStart(currentDate, 'monthly')}
                  schedules={schedules}
                  staff={facilityStaff}
                  isManager={isManager}
                  onDayClick={(date) => {
                    setCurrentDate(date)
                    setViewPeriod('daily')
                  }}
                />
              )}
            </div>
          </div>

          {/* No Facility Selected */}
          {!selectedFacility && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Select a Facility</h3>
              <p className="text-gray-600">
                Choose a facility from the dropdown above to view and manage schedules
              </p>
            </div>
          )}
        </div>

        {/* Modals */}
        {isManager && (
          <>
            <SmartGenerateModal
              open={showSmartGenerateModal}
              onClose={() => setShowSmartGenerateModal(false)}
              facility={selectedFacility}
              zones={availableZones}
              selectedZones={selectedZones}
              staff={facilityStaff}
              periodStart={getPeriodStart(currentDate, viewPeriod)}
              periodType={viewPeriod}
              onGenerate={handleSmartGenerate}
            />
            
            <ScheduleConfigModal
              open={showConfigModal}
              onClose={() => setShowConfigModal(false)}
              facility={selectedFacility}
            />
          </>
        )}
      </div>
    </AppLayout>
  )
}