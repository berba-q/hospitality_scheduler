// Staff swaps page component
'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeftRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MessageSquare,
  History,
  Plus,
  Filter,
  Search,
  Bell,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

// Enhanced Staff Swaps Component
function StaffSwapDashboard({ user, apiClient }) {
  const [swapRequests, setSwapRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSwap, setSelectedSwap] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadSwapRequests()
  }, [])

  const loadSwapRequests = async () => {
    try {
      setLoading(true)
      const swaps = await apiClient.getMySwapRequests(undefined, 100)
      setSwapRequests(swaps)
    } catch (error) {
      console.error('Failed to load swap requests:', error)
      toast.error('Failed to load swap requests')
    } finally {
      setLoading(false)
    }
  }

  // Filter swaps based on active tab and filters
  const getFilteredSwaps = () => {
    let filtered = swapRequests

    // Filter by tab
    switch (activeTab) {
      case 'my-requests':
        filtered = filtered.filter(swap => swap.requesting_staff_id === user.id)
        break
      case 'for-me':
        filtered = filtered.filter(swap => swap.target_staff_id === user.id)
        break
      case 'pending':
        filtered = filtered.filter(swap => swap.status === 'pending')
        break
      case 'completed':
        filtered = filtered.filter(swap => ['executed', 'completed'].includes(swap.status))
        break
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(swap => swap.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(swap => 
        swap.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.requesting_staff_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.target_staff_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }

  const handleSwapClick = (swap) => {
    setSelectedSwap(swap)
    setShowDetailModal(true)
  }

  const handleSwapResponse = async (swapId, accepted, notes = '') => {
    try {
      await apiClient.respondToSwap(swapId, accepted, notes)
      await loadSwapRequests()
      setShowDetailModal(false)
      toast.success(accepted ? 'Swap request accepted!' : 'Swap request declined')
    } catch (error) {
      console.error('Failed to respond to swap:', error)
      toast.error('Failed to respond to swap request')
    }
  }

  const handleCancelSwap = async (swapId, reason = '') => {
    try {
      await apiClient.cancelSwapRequest(swapId, reason)
      await loadSwapRequests()
      setShowDetailModal(false)
      toast.success('Swap request cancelled')
    } catch (error) {
      console.error('Failed to cancel swap:', error)
      toast.error('Failed to cancel swap request')
    }
  }

  const getStatusBadge = (status, urgency) => {
    const urgencyColors = {
      'emergency': 'bg-red-500 text-white',
      'high': 'bg-orange-500 text-white',
      'normal': 'bg-blue-500 text-white',
      'low': 'bg-gray-500 text-white'
    }

    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'manager_approved': 'bg-green-100 text-green-800',
      'staff_accepted': 'bg-green-100 text-green-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'executed': 'bg-green-100 text-green-800',
      'declined': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    }

    return (
      <div className="flex gap-2">
        <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
          {status.replace('_', ' ')}
        </Badge>
        <Badge className={urgencyColors[urgency] || 'bg-gray-500 text-white'}>
          {urgency}
        </Badge>
      </div>
    )
  }

  const getSwapActions = (swap) => {
    const isMyRequest = swap.requesting_staff_id === user.id
    const isForMe = swap.target_staff_id === user.id
    const canRespond = isForMe && swap.status === 'pending' && swap.target_staff_accepted === null
    const canCancel = isMyRequest && ['pending', 'manager_approved'].includes(swap.status)

    return { isMyRequest, isForMe, canRespond, canCancel }
  }

  const filteredSwaps = getFilteredSwaps()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              My Swap Requests
            </h1>
            <p className="text-gray-600 mt-1">Manage your shift swap requests and respond to others</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Plus className="w-4 h-4" />
              New Swap Request
            </Button>
            <Button 
              variant="outline" 
              onClick={loadSwapRequests}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search swaps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="manager_approved">Manager Approved</SelectItem>
              <SelectItem value="staff_accepted">Staff Accepted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="executed">Completed</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({swapRequests.length})</TabsTrigger>
            <TabsTrigger value="my-requests">
              My Requests ({swapRequests.filter(s => s.requesting_staff_id === user.id).length})
            </TabsTrigger>
            <TabsTrigger value="for-me">
              For Me ({swapRequests.filter(s => s.target_staff_id === user.id).length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({swapRequests.filter(s => s.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({swapRequests.filter(s => ['executed', 'completed'].includes(s.status)).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Swap Requests List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSwaps.length === 0 ? (
          <div className="text-center py-16">
            <ArrowLeftRight className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Swap Requests</h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'all' ? 'No swap requests found' : `No ${activeTab.replace('-', ' ')} swap requests`}
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Swap Request
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSwaps.map((swap) => {
              const actions = getSwapActions(swap)
              
              return (
                <Card 
                  key={swap.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500"
                  onClick={() => handleSwapClick(swap)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            {actions.isMyRequest ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                My Request
                              </Badge>
                            ) : actions.isForMe ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                For Me
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                Involved
                              </Badge>
                            )}
                          </div>
                          {getStatusBadge(swap.status, swap.urgency)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Original Shift</p>
                            <p className="font-medium">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][swap.original_day]} - 
                              {['Morning', 'Afternoon', 'Evening'][swap.original_shift]}
                            </p>
                          </div>
                          
                          {swap.swap_type === 'specific' && (
                            <div>
                              <p className="text-sm text-gray-600">Requested Shift</p>
                              <p className="font-medium">
                                {swap.target_day !== null ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][swap.target_day] : 'N/A'} - 
                                {swap.target_shift !== null ? ['Morning', 'Afternoon', 'Evening'][swap.target_shift] : 'N/A'}
                              </p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-sm text-gray-600">Requested By</p>
                            <p className="font-medium">{swap.requesting_staff_name || 'Unknown'}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">Reason</p>
                          <p className="text-gray-800">{swap.reason}</p>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(swap.created_at).toLocaleDateString()}
                          </span>
                          {swap.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Expires: {new Date(swap.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSwapClick(swap)
                          }}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>

                        {actions.canRespond && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSwapResponse(swap.id, true)
                              }}
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSwapResponse(swap.id, false)
                              }}
                              className="gap-1 text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4" />
                              Decline
                            </Button>
                          </div>
                        )}

                        {actions.canCancel && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelSwap(swap.id)
                            }}
                            className="gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Swap Detail Modal */}
        <SwapDetailModal 
          swap={selectedSwap}
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onSwapResponse={handleSwapResponse}
          onCancelSwap={handleCancelSwap}
          user={user}
          apiClient={apiClient}
        />

        {/* Create Swap Modal - You can implement this */}
        {/* <CreateSwapModal 
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSwapCreated={loadSwapRequests}
          apiClient={apiClient}
        /> */}
      </div>
    </div>
  )
}

export default StaffSwapDashboard