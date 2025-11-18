// types/availability.ts - Availability and time-off request types

import type { LucideIcon } from 'lucide-react'

// ==================== TIME OFF REQUEST TYPES ====================

// Time period patterns for unavailability requests
export type TimePattern = 'morning' | 'afternoon' | 'evening' | 'fullday' | 'custom'

// Quick pattern configuration for UI
export interface QuickPattern {
  id: TimePattern
  name: string
  description: string
  icon: LucideIcon
  color: string
}

// Request type for single date or date range
export type RequestType = 'single' | 'range'

// Base time-off request with pattern-based time
export interface PatternBasedRequest {
  pattern: TimePattern
  date: Date
  reason?: string
  is_recurring: boolean
}

// Time-off request with custom start/end times
export interface CustomTimeRequest {
  start: string // ISO datetime string
  end: string // ISO datetime string
  reason?: string
  is_recurring: boolean
}

// Union type for all time-off request formats
export type TimeOffRequest = PatternBasedRequest | CustomTimeRequest

// ==================== MODAL PROP TYPES ====================

export interface TimeOffRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (requestData: TimeOffRequest) => Promise<void>
  userStaffId: string
}

export interface StaffAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  staffId: string
  staffName: string
}
