// src/components/swap/SwapStatusIndicator.tsx
'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/hooks/useTranslations'
import {
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react'
import * as SwapTypes from '@/types/swaps'

interface SwapStatusIndicatorProps {
  swapRequests: SwapTypes.SwapRequest[]
  day: number
  shift: number
  staffId: string
  size?: 'sm' | 'md' | 'lg'
}

export function SwapStatusIndicator({
  swapRequests,
  day,
  shift,
  staffId,
  size = 'sm'
}: SwapStatusIndicatorProps) {
  const { t } = useTranslations()

  // Find swap requests affecting this assignment
  const affectingSwaps = swapRequests.filter((swap) => {
    // Original assignment swap requests
    const isOriginalAssignment = 
      swap.requesting_staff?.id === staffId &&
      swap.original_day === day &&
      swap.original_shift === shift

    // Target assignment for specific swaps
    const isTargetAssignment = 
      swap.swap_type === 'specific' &&
      swap.target_staff?.id === staffId &&
      swap.target_day === day &&
      swap.target_shift === shift

    // Auto assignment coverage
    const isAutoAssignment = 
      swap.swap_type === 'auto' &&
      swap.assigned_staff?.id === staffId &&
      swap.original_day === day &&
      swap.original_shift === shift

    return isOriginalAssignment || isTargetAssignment || isAutoAssignment
  })

  if (affectingSwaps.length === 0) return null

  // Get the most relevant swap (highest priority)
  const relevantSwap = affectingSwaps.reduce((prev, current) => {
    // Define urgency order with proper typing
    const urgencyOrder: Record<SwapTypes.SwapUrgency, number> = {
      [SwapTypes.SwapUrgency.Emergency]: 4,
      [SwapTypes.SwapUrgency.High]: 3,
      [SwapTypes.SwapUrgency.Normal]: 2,
      [SwapTypes.SwapUrgency.Low]: 1
    }

    const prevUrgency = urgencyOrder[prev.urgency] || 0
    const currentUrgency = urgencyOrder[current.urgency] || 0

    if (currentUrgency > prevUrgency) return current
    if (currentUrgency < prevUrgency) return prev

    // Same urgency, prefer pending over other statuses
    if (current.status === SwapTypes.SwapStatus.Pending && prev.status !== SwapTypes.SwapStatus.Pending) return current
    if (prev.status === SwapTypes.SwapStatus.Pending && current.status !== SwapTypes.SwapStatus.Pending) return prev

    return prev
  })

  const getStatusConfig = (swap: SwapTypes.SwapRequest) => {
    if (swap.status === SwapTypes.SwapStatus.Executed) {
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        label: t('swaps.swapped')
      }
    }

    if (swap.status === SwapTypes.SwapStatus.Declined ||
        swap.status === SwapTypes.SwapStatus.Cancelled ||
        swap.status === SwapTypes.SwapStatus.StaffDeclined ||
        swap.status === SwapTypes.SwapStatus.AssignmentDeclined) {
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        label: t('common.declined')
      }
    }

    if (swap.status === SwapTypes.SwapStatus.Pending) {
      if (swap.urgency === SwapTypes.SwapUrgency.Emergency) {
        return {
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: AlertTriangle,
          label: t('swaps.emergencySwap')
        }
      }
      if (swap.urgency === SwapTypes.SwapUrgency.High) {
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: AlertTriangle,
          label: t('swaps.urgentSwap')
        }
      }
      if (swap.swap_type === 'auto') {
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Zap,
          label: t('swaps.autoSwap')
        }
      }
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: ArrowLeftRight,
        label: t('swaps.swapPending')
      }
    }

    if (swap.status === SwapTypes.SwapStatus.ManagerApproved ||
        swap.status === SwapTypes.SwapStatus.StaffAccepted) {
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: CheckCircle,
        label: t('common.approved')
      }
    }

    return {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: Clock,
      label: t('swaps.swapRequest')
    }
  }

  const statusConfig = getStatusConfig(relevantSwap)
  const StatusIcon = statusConfig.icon

  const sizeClasses = {
    sm: 'text-xs px-1 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2 py-1'
  }

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5'
  }

  return (
    <Badge 
      className={`${statusConfig.color} ${sizeClasses[size]} flex items-center gap-1 animate-pulse`}
      title={`${statusConfig.label} - ${relevantSwap.reason}`}
    >
      <StatusIcon className={iconSizes[size]} />
      {size !== 'sm' && <span>{statusConfig.label}</span>}
      {affectingSwaps.length > 1 && (
        <span className="ml-1 text-xs">+{affectingSwaps.length - 1}</span>
      )}
    </Badge>
  )
}