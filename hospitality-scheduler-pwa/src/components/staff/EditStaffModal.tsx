'use client'
// Edit staff modal component
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Star, User, MapPin, Phone, Clock, Save, Mail } from 'lucide-react'
import { useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'
import * as ScheduleTypes from '@/types/schedule'
import * as FacilityTypes from '@/types/facility'

interface EditStaffModalProps {
  open: boolean
  onClose: () => void
  staff: ScheduleTypes.Staff
  facilities: FacilityTypes.Facility[]
  onSuccess: () => void
}

const COMMON_ROLES = [
  'Manager', 'Assistant Manager', 'Chef', 'Sous Chef', 'Line Cook',
  'Front Desk Agent', 'Concierge', 'Housekeeping', 'Maintenance',
  'Security', 'Waiter', 'Waitress', 'Bartender', 'Host/Hostess'
]

interface StaffFormData {
  full_name: string
  email: string
  role: string
  skill_level: number
  phone: string
  facility_id: string
  weekly_hours_max: number
  is_active: boolean
}

export function EditStaffModal({ open, onClose, staff, facilities, onSuccess }: EditStaffModalProps) {
  const apiClient = useApiClient()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(false)
  const [originalData, setOriginalData] = useState<StaffFormData | null>(null)
  const [formData, setFormData] = useState<StaffFormData>({
    full_name: '',
    email: '',
    role: '',
    skill_level: 3,
    phone: '',
    facility_id: '',
    weekly_hours_max: 40,
    is_active: true
  })

  // Populate form when staff changes
  useEffect(() => {
    if (staff) {
      const data = {
        full_name: staff.full_name || '',
        email: staff.email || '',
        role: staff.role || '',
        skill_level: staff.skill_level || 3,
        phone: staff.phone || '',
        facility_id: staff.facility_id || '',
        weekly_hours_max: staff.weekly_hours_max || 40,
        is_active: staff.is_active !== false
      }
      setFormData(data)
      setOriginalData(data) // Store original data for comparison
    }
  }, [staff])

  // Check if form has been modified
  const hasChanges = originalData && JSON.stringify(formData) !== JSON.stringify(originalData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.full_name || !formData.role || !formData.facility_id) {
      toast.error(t('staff.fillRequiredFields'))
      return
    }

    if (!hasChanges) {
      toast.info(t('staff.noChangesToSave'))
      return
    }

    if (!apiClient) {
      toast.error(t('common.authenticationRequired'))
      return
    }

    setLoading(true)
    try {
      // Check for duplicates if name or facility changed
      if (originalData && (formData.full_name !== originalData.full_name || formData.facility_id !== originalData.facility_id)) {
        const duplicateCheck = await apiClient.checkStaffExists(formData.full_name, formData.facility_id)
        if (duplicateCheck.exists) {
          toast.error(t('staff.staffNameExistsAtFacility', { name: formData.full_name }))
          setLoading(false)
          return
        }
      }

      // Update staff via API
      await apiClient.updateStaff(staff.id, formData)
      toast.success(t('staff.staffUpdatedSuccessfully', { name: formData.full_name }))
      onSuccess()
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('409') || errorMessage.includes('already exists')) {
        toast.error(t('staff.staffNameAlreadyExists'))
      } else {
        toast.error(t('staff.failedUpdateStaff'))
      }
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelect = (role: string) => {
    setFormData(prev => ({ ...prev, role }))
  }

  const getSkillLevelName = (level: number) => {
    const skillLevels = {
      1: t('staff.skillBeginner'),
      2: t('staff.skillBasic'),
      3: t('staff.skillIntermediate'),
      4: t('staff.skillAdvanced'),
      5: t('staff.skillExpert')
    }
    return skillLevels[level as keyof typeof skillLevels] || t('staff.skillIntermediate')
  }

  const renderSkillLevel = () => (
    <div className="space-y-3">
      <Label>{t('staff.skillLevel')}</Label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, skill_level: level }))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Star 
              className={`w-6 h-6 ${
                level <= formData.skill_level 
                  ? 'text-yellow-400 fill-current' 
                  : 'text-gray-300'
              }`} 
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {t('staff.levelNumber', { level: formData.skill_level })} - {getSkillLevelName(formData.skill_level)}
        </span>
      </div>
    </div>
  )

  if (!staff) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            {t('staff.editStaffMember', { name: staff.full_name })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('staff.basicInformation')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('staff.fullName')} *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder={t('staff.fullNamePlaceholder')}
                  className="bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('staff.emailAddress')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={t('staff.emailPlaceholder')}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('staff.phoneNumber')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder={t('staff.phonePlaceholder')}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">{t('staff.roleAndSkills')}</h3>
            
            <div className="space-y-3">
              <Label>{t('staff.role')} *</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ROLES.map((role) => (
                  <Badge
                    key={role}
                    variant={formData.role === role ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all duration-200 ${
                      formData.role === role 
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleRoleSelect(role)}
                  >
                    {role}
                  </Badge>
                ))}
              </div>
              
              {/* Custom Role Input */}
              <div className="flex gap-2 mt-2">
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder={t('staff.customRolePlaceholder')}
                  className="bg-white"
                />
              </div>
            </div>

            {renderSkillLevel()}
          </div>

          {/* Work Details */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('staff.workDetails')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facility_id">{t('staff.facility')} *</Label>
                <select
                  id="facility_id"
                  value={formData.facility_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, facility_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
                  required
                >
                  <option value="">{t('staff.selectFacility')}</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly_hours_max">{t('staff.maxWeeklyHours')}</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="weekly_hours_max"
                    type="number"
                    min="1"
                    max="80"
                    value={formData.weekly_hours_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, weekly_hours_max: parseInt(e.target.value) }))}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
              />
              <Label htmlFor="is_active">{t('staff.activeStaffMember')}</Label>
            </div>
          </div>

          {/* Change indicator */}
          {hasChanges && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{t('common.unsavedChanges')}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasChanges}
              className={`flex-1 transition-all duration-200 ${
                hasChanges 
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('staff.updating')}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {hasChanges ? t('common.saveChanges') : t('staff.noChanges')}
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}