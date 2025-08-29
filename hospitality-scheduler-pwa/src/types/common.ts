export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type FormEvent = React.FormEvent<HTMLFormElement>;
export type ChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface StaffAssignment {
  staffId: string;
  name: string;
  role: string;
  status: 'available' | 'busy' | 'unavailable';
  assignedHours?: number;
  maxHours?: number;
}

export interface ScheduleItem {
  id: string;
  name: string;
  date: string;
  status: string;
  staffCount: number;
  totalShifts: number;
  coverage: number;
}

export interface AvailabilityData {
  id: string;
  staffId: string;
  date: string;
  isAvailable: boolean;
  reason?: string;
  startTime?: string;
  endTime?: string;
}

export interface StaffFormData {
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  phone?: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  staffId: string;
  staffName: string;
  role: string;
  status: string;
}

export interface WeeklyEvent extends CalendarEvent {
  dayOfWeek: number;
}