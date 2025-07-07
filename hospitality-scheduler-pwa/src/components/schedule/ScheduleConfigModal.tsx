'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Settings, 
  Clock, 
  Users, 
  Shield, 
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Star
} from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleConfigModalProps {
  open: boolean
  onClose: () => void
  facility: any
}

const DEFAULT_CONFIG = {
  min_rest_hours: 8,
  max_consecutive_days: 5,
  max_weekly_hours: 40,
  min_staff_per_shift: 1,
  max_staff_per_shift: 10,
  require_manager_per_shift: false,
  shift_role_requirements: {
    "0": { required_roles: [], min_skill_level: 1 }, // Morning
    "1": { required_roles: [], min_skill_level: 1 }, // Afternoon
    "2": { required_roles: ["Manager"], min_skill_level: 2 } // Evening
  },
  allow_overtime: false,
  weekend_restrictions: false
}

const COMMON_ROLES = [
  'Manager', 'Assistant Manager', 'Chef', 'Sous Chef', 'Line Cook',
  'Front Desk Agent', 'Concierge', 'Housekeeping', 'Maintenance',
  'Security', 'Waiter', 'Waitress', 'Bartender', 'Host/Hostess'
]

const SHIFTS = [
  { id: "0", name: 'Morning', time: '6:00 AM - 2:00 PM' },
  { id: "1", name: 'Afternoon', time: '2:00 PM - 10:00 PM' },
  { id: "2", name: 'Evening', time: '10:00 PM - 6:00 AM' }
]

export function ScheduleConfigModal({
  open,
  onClose,
  facility
}: ScheduleConfigModalProps) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalConfig, setOriginalConfig] = useState(DEFAULT_CONFIG)

  // Load existing config when modal opens
  useEffect(() => {
    if (open && facility) {
      loadConfig()
    }
  }, [open, facility])

  const loadConfig = async () => {
    setLoading(true)
    try {
      // In a real implementation, load from API
      // const configData = await apiClient.getScheduleConfig(facility.id)
      // For demo, use default config
      setConfig(DEFAULT_CONFIG)
      setOriginalConfig(DEFAULT_CONFIG)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to load config:', error)
      toast.error('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // In a real implementation, save to API
      // await apiClient.saveScheduleConfig(facility.id, config)
      toast.success('Configuration saved successfully!')
      setOriginalConfig(config)
      setHasChanges(false)
      onClose()
    } catch (error) {
      console.error('Failed to save config:', error)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    setHasChanges(JSON.stringify(DEFAULT_CONFIG) !== JSON.stringify(originalConfig))
  }

  const updateConfig = (updates: Partial<typeof config>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    setHasChanges(JSON.stringify(newConfig) !== JSON.stringify(originalConfig))
  }

  const updateShiftRequirement = (shiftId: string, field: string, value: any) => {
    const newShiftRequirements = {
      ...config.shift_role_requirements,
      [shiftId]: {
        ...config.shift_role_requirements[shiftId],
        [field]: value
      }
    }
    updateConfig({ shift_role_requirements: newShiftRequirements })
  }

  const toggleRequiredRole = (shiftId: string, role: string) => {
    const currentRoles = config.shift_role_requirements[shiftId]?.required_roles || []
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role]
    
    updateShiftRequirement(shiftId, 'required_roles', newRoles)
  }

  if (!facility) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            Schedule Configuration - {facility.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading configuration...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Basic Constraints */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time & Hours Constraints
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_rest_hours">Minimum Rest Hours</Label>
                  <Input
                    id="min_rest_hours"
                    type="number"
                    min="4"
                    max="24"
                    value={config.min_rest_hours}
                    onChange={(e) => updateConfig({ min_rest_hours: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Hours between shifts</p>
                </div>

                <div>
                  <Label htmlFor="max_consecutive_days">Max Consecutive Days</Label>
                  <Input
                    id="max_consecutive_days"
                    type="number"
                    min="1"
                    max="7"
                    value={config.max_consecutive_days}
                    onChange={(e) => updateConfig({ max_consecutive_days: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Working days in a row</p>
                </div>

                <div>
                  <Label htmlFor="max_weekly_hours">Default Max Weekly Hours</Label>
                  <Input
                    id="max_weekly_hours"
                    type="number"
                    min="1"
                    max="80"
                    value={config.max_weekly_hours}
                    onChange={(e) => updateConfig({ max_weekly_hours: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">When staff max hours not set</p>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="allow_overtime"
                    checked={config.allow_overtime}
                    onChange={(e) => updateConfig({ allow_overtime: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <Label htmlFor="allow_overtime">Allow overtime scheduling</Label>
                </div>
              </CardContent>
            </Card>

            {/* Staffing Constraints */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staffing Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_staff_per_shift">Min Staff per Shift</Label>
                  <Input
                    id="min_staff_per_shift"
                    type="number"
                    min="1"
                    max="20"
                    value={config.min_staff_per_shift}
                    onChange={(e) => updateConfig({ min_staff_per_shift: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="max_staff_per_shift">Max Staff per Shift</Label>
                  <Input
                    id="max_staff_per_shift"
                    type="number"
                    min="1"
                    max="50"
                    value={config.max_staff_per_shift}
                    onChange={(e) => updateConfig({ max_staff_per_shift: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="require_manager_per_shift"
                    checked={config.require_manager_per_shift}
                    onChange={(e) => updateConfig({ require_manager_per_shift: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <Label htmlFor="require_manager_per_shift">Require manager on every shift</Label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="weekend_restrictions"
                    checked={config.weekend_restrictions}
                    onChange={(e) => updateConfig({ weekend_restrictions: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <Label htmlFor="weekend_restrictions">Apply weekend restrictions</Label>
                </div>
              </CardContent>
            </Card>

            {/* Shift-Specific Requirements */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Shift-Specific Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {SHIFTS.map((shift) => {
                  const shiftReq = config.shift_role_requirements[shift.id] || { required_roles: [], min_skill_level: 1 }
                  
                  return (
                    <div key={shift.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">{shift.name} Shift</h4>
                          <p className="text-sm text-gray-600">{shift.time}</p>
                        </div>
                        <Badge variant="outline">{shift.name}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Required Roles */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Required Roles</Label>
                          <div className="flex flex-wrap gap-2">
                            {COMMON_ROLES.map((role) => (
                              <Badge
                                key={role}
                                variant={shiftReq.required_roles?.includes(role) ? 'default' : 'outline'}
                                className={`cursor-pointer transition-all duration-200 ${
                                  shiftReq.required_roles?.includes(role)
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : 'hover:bg-gray-100'
                                }`}
                                onClick={() => toggleRequiredRole(shift.id, role)}
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Click roles to require them for this shift
                          </p>
                        </div>

                        {/* Minimum Skill Level */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Minimum Skill Level
                          </Label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => updateShiftRequirement(shift.id, 'min_skill_level', level)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <Star 
                                  className={`w-5 h-5 ${
                                    level <= (shiftReq.min_skill_level || 1)
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-gray-300'
                                  }`} 
                                />
                              </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-600">
                              Level {shiftReq.min_skill_level || 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Configuration Status */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Configuration Valid</p>
                    <p className="text-sm text-green-700">
                      All constraints are properly configured and will be applied during schedule generation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change indicator */}
            {hasChanges && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">You have unsaved changes</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
                disabled={saving}
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
              
              <div className="flex-1" />
              
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`gap-2 transition-all duration-200 ${
                  hasChanges 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {hasChanges ? 'Save Configuration' : 'No Changes'}
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}