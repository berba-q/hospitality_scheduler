import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Clock, CheckCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from '@/hooks/useTranslations'

export function InvitationStatusPanel({ selectedFacility, apiClient }) {
  const { t } = useTranslations()
  const [invitationStats, setInvitationStats] = useState(null)
  const [pendingInvitations, setPendingInvitations] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedFacility) {
      loadInvitationData()
    }
  }, [selectedFacility])

  const loadInvitationData = async () => {
    if (!selectedFacility) return
    
    setLoading(true)
    try {
      // Load invitation statistics
      const statsResponse = await apiClient.get('/invitations/stats')
      setInvitationStats(statsResponse)
      
      // Load pending invitations
      const invitationsResponse = await apiClient.get('/invitations/?status=pending')
      setPendingInvitations(invitationsResponse.filter(
        inv => inv.facility_id === selectedFacility.id
      ))
      
    } catch (error) {
      console.error('Failed to load invitation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resendInvitation = async (invitationId) => {
    try {
      await apiClient.post(`/invitations/${invitationId}/resend`)
      toast.success(t('staff.invitationResent'))
      loadInvitationData() // Refresh
    } catch (error) {
      toast.error(t('staff.failedResendInvitation'))
    }
  }

  if (!selectedFacility) return null

  if (loading) {
    return (
      <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">{t('staff.loadingInvitationStatus')}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5" />
          {t('staff.invitationStatus')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Stats Overview */}
        {invitationStats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">
                {invitationStats.accepted}
              </div>
              <div className="text-xs text-gray-600">{t('common.accepted')}</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="text-lg font-bold text-yellow-600">
                {invitationStats.pending}
              </div>
              <div className="text-xs text-gray-600">{t('common.pending')}</div>
            </div>
          </div>
        )}

        {/* Pending Invitations Alert */}
        {pendingInvitations.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-yellow-800">
                  {t('staff.pendingInvitationsCount', { 
                    count: pendingInvitations.length,
                    plural: pendingInvitations.length > 1 ? 's' : ''
                  })}
                </p>
                <div className="space-y-1">
                  {pendingInvitations.slice(0, 3).map((invitation, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-yellow-700">
                        • {invitation.staff_name}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resendInvitation(invitation.id)}
                        className="h-6 px-2 text-xs"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {t('staff.resend')}
                      </Button>
                    </div>
                  ))}
                  {pendingInvitations.length > 3 && (
                    <div className="text-sm text-yellow-700">
                      {t('staff.andCountMore', { count: pendingInvitations.length - 3 })}
                    </div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* All Good */}
        {pendingInvitations.length === 0 && invitationStats?.pending === 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="text-sm text-green-800">
                {t('staff.allStaffRegistered')}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadInvitationData}
            disabled={loading}
            className="flex-1"
          >
            {t('common.refresh')}
          </Button>
        </div>

        {/* Explanation */}
        <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded">
          💡 <strong>{t('common.note')}:</strong> {t('staff.pendingInvitationsNote')}
        </div>
      </CardContent>
    </Card>
  )
}