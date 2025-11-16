'use client'
// smart schedule generation modal component
import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Zap, 
  Users, 
  Calendar,
  Shield,
  MapPin,
  Brain,
  Target,
  Layers
} from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import * as FacilityTypes from '@/types/facility'
import * as ScheduleTypes from '@/types/schedule'

interface SmartGenerateModalProps {
  open: boolean
  onClose: () => void
  facility: FacilityTypes.Facility
  zones: FacilityTypes.FacilityZone[]
  selectedZones: string[]
  staff: ScheduleTypes.Staff[]
  periodStart: Date
  periodType: 'daily' | 'weekly' | 'monthly'
  onGenerate: (config: ScheduleTypes.ScheduleGenerationConfig) => void
}

export function SmartGenerateModal({
  open,
  onClose,
  facility,
  zones,
  selectedZones,
  staff,
  periodStart,
  periodType,
  onGenerate
}: SmartGenerateModalProps) {
  const { t } = useTranslations()
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('zones')
  const [config, setConfig] = useState<Pick<ScheduleTypes.ScheduleGenerationConfig, 'use_constraints' | 'auto_assign_by_zone' | 'balance_workload' | 'prioritize_skill_match' | 'min_staff_per_shift' | 'max_staff_per_shift' | 'require_manager_per_shift' | 'allow_overtime' | 'coverage_priority' | 'shift_preferences'>>({
    use_constraints: true,
    auto_assign_by_zone: true,
    balance_workload: true,
    prioritize_skill_match: true,
    min_staff_per_shift: 1,
    max_staff_per_shift: 4,
    require_manager_per_shift: true,
    allow_overtime: false,
    coverage_priority: 'balanced' as const,
    shift_preferences: {
      morning_multiplier: 1.0,
      afternoon_multiplier: 1.0,
      evening_multiplier: 1.2
    }
  })

  const [zoneAssignments, setZoneAssignments] = useState<Record<string, ScheduleTypes.ZoneAssignment>>({})
  const [roleMapping, setRoleMapping] = useState<Record<string, string[]>>({})

  const initializeAssignments = useCallback(() => {
    // Auto-assign staff to zones based on their roles
    const newZoneAssignments: Record<string, ScheduleTypes.ZoneAssignment> = {}
    const newRoleMapping: Record<string, string[]> = {}

    selectedZones.forEach(zoneId => {
      const zone = zones.find(z => z.id === zoneId)
      if (zone) {
        const zoneRoles = [...(zone.required_roles || []), ...(zone.preferred_roles || [])]
        newZoneAssignments[zoneId] = {
          required_staff: getZoneRequiredStaff(zone),
          assigned_roles: zoneRoles,
          priority: getZonePriority(zone),
          coverage_hours: {
            morning: true,
            afternoon: true,
            evening: zone.zone_id === 'security' || zone.zone_id === 'front-desk' // 24/7 zones
          }
        }

        // Map roles to zones
        zoneRoles.forEach((role: string) => {
          if (!newRoleMapping[role]) {
            newRoleMapping[role] = []
          }
          if (!newRoleMapping[role].includes(zoneId)) {
            newRoleMapping[role].push(zoneId)
          }
        })
      }
    })

    setZoneAssignments(newZoneAssignments)
    setRoleMapping(newRoleMapping)
  }, [zones, selectedZones]) 

  // Initialize zone assignments and role mapping
  useEffect(() => {
    if (zones.length > 0 && staff.length > 0) {
      initializeAssignments()
    }
  }, [zones, staff, selectedZones, initializeAssignments])


  const getZoneRequiredStaff = (zone: FacilityTypes.FacilityZone) => {
    // Use zone's configured staff requirements or smart defaults based on zone type
    if (zone.min_staff_per_shift && zone.max_staff_per_shift) {
      return { min: zone.min_staff_per_shift, max: zone.max_staff_per_shift }
    }

    const staffCounts: Record<string, { min: number; max: number }> = {
      'front-desk': { min: 1, max: 2 },
      'housekeeping': { min: 2, max: 4 },
      'restaurant': { min: 3, max: 6 },
      'kitchen': { min: 2, max: 4 },
      'dining': { min: 2, max: 5 },
      'bar': { min: 1, max: 3 },
      'security': { min: 1, max: 2 },
      'management': { min: 1, max: 1 },
      'all': { min: 1, max: 3 }
    }

    return staffCounts[zone.zone_id as string] || { min: 1, max: 3 }
  }

  const getZonePriority = (zone: FacilityTypes.FacilityZone): 'low' | 'medium' | 'high' => {
    // Priority order for scheduling
    const priorities: Record<string, number> = {
      'front-desk': 10, // Highest priority
      'security': 9,
      'kitchen': 8,
      'management': 7,
      'dining': 6,
      'restaurant': 6,
      'bar': 5,
      'housekeeping': 4,
      'all': 3
    }

    const priorityValue = priorities[zone.zone_id] || 5
    if (priorityValue >= 8) return 'high'
    if (priorityValue >= 5) return 'medium'
    return 'low'
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const generateConfig: ScheduleTypes.ScheduleGenerationConfig = {
        ...config,
        zone_assignments: zoneAssignments,
        role_mapping: roleMapping,
      }

      onGenerate(generateConfig)
      onClose()
    } catch (error) {
      console.error('Failed to generate schedule:', error)
    } finally {
      setGenerating(false)
    }
  }

  const updateZoneAssignment = (
    zoneId: string, 
    field: keyof ScheduleTypes.ZoneAssignment, 
    value: ScheduleTypes.ZoneAssignment[keyof ScheduleTypes.ZoneAssignment]
  ) => {
    setZoneAssignments(prev => ({
      ...prev,
      [zoneId]: {
        ...prev[zoneId],
        [field]: value
      }
    }))
  }

  const formatPeriodDisplay = (date: Date, type: string) => {
    switch (type) {
      case 'daily':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'weekly':
        const weekEnd = new Date(date)
        weekEnd.setDate(date.getDate() + 6)
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'monthly':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      default:
        return ''
    }
  }

  // Calculate staffing analytics
  const totalStaffNeeded = Object.values(zoneAssignments).reduce((sum: number, zone: ScheduleTypes.ZoneAssignment) =>
    sum + (zone?.required_staff?.min || 0), 0
  ) * (periodType === 'daily' ? 3 : periodType === 'weekly' ? 21 : 90) // shifts per period

  const availableStaff = staff.filter(s => s.is_active || s.isActive).length
  const feasibility = totalStaffNeeded <= (availableStaff * (periodType === 'daily' ? 3 : periodType === 'weekly' ? 21 : 90))
    ? 'high' : 'medium'

  // Get staff distribution by zone
  const staffByZone: Record<string, ScheduleTypes.Staff[]> = {}
  selectedZones.forEach(zoneId => {
    const zone = zones.find(z => z.id === zoneId)
    if (zone) {
      const zoneRoles = [...(zone.required_roles || []), ...(zone.preferred_roles || [])]
      staffByZone[zoneId] = staff.filter(s =>
        zoneRoles.includes(s.role) || zoneRoles.length === 0
      )
    }
  })

  // Helper function to get translated period type with proper capitalization
  const getPeriodTypeLabel = (type: string) => {
    const key = `schedule.${type}` as const
    return t(key).charAt(0).toUpperCase() + t(key).slice(1)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            {t('schedule.smartScheduleGeneration')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Period Info */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">{facility?.name}</p>
                    <p className="text-sm text-purple-700">{t('common.facility')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{formatPeriodDisplay(periodStart, periodType)}</p>
                    <p className="text-sm text-blue-700">{getPeriodTypeLabel(periodType)} {t('schedule.schedule')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">{staff.filter(s => s.is_active).length} {t('common.staff')}</p>
                    <p className="text-sm text-green-700">{t('common.available')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Layers className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-orange-900">{selectedZones.length} {t('common.zones')}</p>
                    <p className="text-sm text-orange-700">{t('common.selected')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="zones">{t('schedule.zoneSetup')}</TabsTrigger>
              <TabsTrigger value="constraints">{t('schedule.constraints')}</TabsTrigger>
              <TabsTrigger value="optimization">{t('schedule.aiOptimization')}</TabsTrigger>
              <TabsTrigger value="preview">{t('schedule.previewAndGenerate')}</TabsTrigger>
            </TabsList>

            {/* Zone Configuration */}
            <TabsContent value="zones" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {t('schedule.zoneBasedStaffAssignment')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedZones.map(zoneId => {
                    const zone = zones.find(z => z.id === zoneId)
                    const zoneStaff = staffByZone[zoneId] || []
                    const assignment = zoneAssignments[zoneId] || {}
                    
                    return zone ? (
                      <div key={zoneId} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium text-lg">{zone.zone_name}</h4>
                            <p className="text-sm text-gray-600">
                              {zoneStaff.length} {t('schedule.availableStaff')} • {t('common.priority')}: {getZonePriority(zone)}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {(zone.required_roles?.length || 0) + (zone.preferred_roles?.length || 0)} {t('common.roles')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Staff Requirements */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">{t('schedule.staffPerShift')}</Label>
                            <div className="flex gap-2">
                              <div>
                                <label className="text-xs text-gray-500">{t('common.minStaff')}</label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={assignment.required_staff?.min || 1}
                                  onChange={(e) => updateZoneAssignment(zoneId, 'required_staff', {
                                    ...(assignment.required_staff || { min: 1, max: 3 }),
                                    min: parseInt(e.target.value)
                                  })}
                                  className="w-16 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">{t('common.maxStaff')}</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={assignment.required_staff?.max || 3}
                                  onChange={(e) => updateZoneAssignment(zoneId, 'required_staff', {
                                    ...assignment.required_staff,
                                    max: parseInt(e.target.value)
                                  })}
                                  className="w-16 text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Coverage Hours */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">{t('schedule.coverage')}</Label>
                            <div className="space-y-1">
                              {(['morning', 'afternoon', 'evening'] as const).map(shift => (
                                <div key={shift} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={assignment.coverage_hours?.[shift] || false}
                                    onChange={(e) => updateZoneAssignment(zoneId, 'coverage_hours', {
                                      ...assignment.coverage_hours,
                                      [shift]: e.target.checked
                                    })}
                                    className="w-3 h-3 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                                  />
                                  <span className="text-sm capitalize">{t(`common.${shift}`)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Assigned Staff */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">
                              {t('schedule.availableStaff')} ({zoneStaff.length})
                            </Label>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {zoneStaff.slice(0, 5).map((member: ScheduleTypes.Staff) => (
                                <div key={member.id} className="flex items-center gap-2 text-xs">
                                  <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                                    {member.full_name.charAt(0)}
                                  </div>
                                  <span className="truncate">{member.full_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {member.role}
                                  </Badge>
                                </div>
                              ))}
                              {zoneStaff.length > 5 && (
                                <p className="text-xs text-gray-500">+{zoneStaff.length - 5} {t('common.more')}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Role Assignment */}
                        <div className="mt-4">
                          <Label className="text-sm font-medium mb-2 block">{t('schedule.requiredRoles')}</Label>
                          <div className="flex flex-wrap gap-2">
                            {[...(zone.required_roles || []), ...(zone.preferred_roles || [])].map((role: string) => (
                              <Badge key={role} variant="default" className="text-xs">
                                {role}
                              </Badge>
                            )) || (
                              <Badge variant="outline" className="text-xs">{t('schedule.allRolesAccepted')}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Constraints */}
            <TabsContent value="constraints" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {t('schedule.schedulingConstraints')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{t('schedule.useSmartConstraints')}</p>
                        <p className="text-sm text-gray-600">{t('schedule.applyBusinessRules')}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.use_constraints}
                        onChange={(e) => setConfig(prev => ({ ...prev, use_constraints: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{t('schedule.requireManagerPerShift')}</p>
                        <p className="text-sm text-gray-600">{t('schedule.ensureManagerialOversight')}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.require_manager_per_shift}
                        onChange={(e) => setConfig(prev => ({ ...prev, require_manager_per_shift: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{t('schedule.balanceWorkload')}</p>
                        <p className="text-sm text-gray-600">{t('schedule.distributeHoursEvenly')}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.balance_workload}
                        onChange={(e) => setConfig(prev => ({ ...prev, balance_workload: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{t('schedule.allowOvertime')}</p>
                        <p className="text-sm text-gray-600">{t('schedule.permitOvertimeScheduling')}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.allow_overtime}
                        onChange={(e) => setConfig(prev => ({ ...prev, allow_overtime: e.target.checked }))}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Optimization */}
            <TabsContent value="optimization" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    {t('schedule.aiOptimizationSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">{t('schedule.coveragePriority')}</Label>
                    <select
                      value={config.coverage_priority}
                      onChange={(e) => setConfig(prev => ({ ...prev, coverage_priority: e.target.value as 'minimal' | 'balanced' | 'maximum' }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="minimal">{t('schedule.minimalCoverage')}</option>
                      <option value="balanced">{t('schedule.balancedCoverage')}</option>
                      <option value="maximum">{t('schedule.maximumCoverage')}</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">{t('schedule.shiftPreferenceMultipliers')}</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">{t('common.morning')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="2.0"
                          value={config.shift_preferences?.morning_multiplier || 1.0}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            shift_preferences: {
                              morning_multiplier: parseFloat(e.target.value),
                              afternoon_multiplier: prev.shift_preferences?.afternoon_multiplier || 1.0,
                              evening_multiplier: prev.shift_preferences?.evening_multiplier || 1.0
                            }
                          }))}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">{t('common.afternoon')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="2.0"
                          value={config.shift_preferences?.afternoon_multiplier || 1.0}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            shift_preferences: {
                              morning_multiplier: prev.shift_preferences?.morning_multiplier || 1.0,
                              afternoon_multiplier: parseFloat(e.target.value),
                              evening_multiplier: prev.shift_preferences?.evening_multiplier || 1.0
                            }
                          }))}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">{t('common.evening')}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="2.0"
                          value={config.shift_preferences?.evening_multiplier || 1.2}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            shift_preferences: {
                              morning_multiplier: prev.shift_preferences?.morning_multiplier || 1.0,
                              afternoon_multiplier: prev.shift_preferences?.afternoon_multiplier || 1.0,
                              evening_multiplier: parseFloat(e.target.value)
                            }
                          }))}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('schedule.higherValuesIncrease')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-900">{t('schedule.prioritizeSkillMatching')}</p>
                      <p className="text-sm text-blue-700">{t('schedule.matchStaffSkillsToZone')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.prioritize_skill_match}
                      onChange={(e) => setConfig(prev => ({ ...prev, prioritize_skill_match: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preview & Generate */}
            <TabsContent value="preview" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {t('schedule.generationPreview')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Feasibility Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{totalStaffNeeded}</div>
                      <div className="text-sm text-blue-700">{t('schedule.totalAssignmentsNeeded')}</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{availableStaff}</div>
                      <div className="text-sm text-green-700">{t('common.available')} {t('common.staff')}</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Badge variant={feasibility === 'high' ? 'default' : 'secondary'} className="text-lg px-3 py-1">
                        {feasibility === 'high' ? t('schedule.optimal') : t('schedule.challenging')}
                      </Badge>
                      <div className="text-sm text-purple-700 mt-1">{t('schedule.feasibility')}</div>
                    </div>
                  </div>

                  {/* Zone Summary */}
                  <div>
                    <h4 className="font-medium mb-3">{t('schedule.zoneCoverageSummary')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedZones.map(zoneId => {
                        const zone = zones.find(z => z.id === zoneId)
                        const assignment = zoneAssignments[zoneId] || {}
                        const zoneStaff = staffByZone[zoneId] || []
                        
                        return zone ? (
                          <div key={zoneId} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{zone.zone_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {typeof assignment.required_staff === 'object' ? `${assignment.required_staff.min}-${assignment.required_staff.max}` : assignment.required_staff || 1} {t('common.staff')}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {zoneStaff.length} {t('common.available')} • {(zone.required_roles?.length || 0) + (zone.preferred_roles?.length || 0)} {t('common.roles')}
                            </div>
                            <div className="flex gap-1 mt-2">
                              {(['morning', 'afternoon', 'evening'] as const).map(shift => (
                                <Badge 
                                  key={shift} 
                                  variant={assignment.coverage_hours?.[shift] ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {t(`common.${shift}`).charAt(0).toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>

                  {/* Generation Info */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Brain className="w-6 h-6 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-purple-900">{t('schedule.aiPoweredGeneration')}</p>
                        <p className="text-purple-700 text-sm mt-1">
                          {t('schedule.aiScheduleDescription', { periodType: getPeriodTypeLabel(periodType).toLowerCase() })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={generating}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || selectedZones.length === 0}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {generating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('schedule.generatingSmartSchedule')}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {t('schedule.generateSchedule')} {getPeriodTypeLabel(periodType)}
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}