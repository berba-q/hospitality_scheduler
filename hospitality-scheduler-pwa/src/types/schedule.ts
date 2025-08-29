export interface Staff {
  id: string;
  full_name: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Schedule {
  id: string;
  staffId: string;
  facility_id: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleConfig {
  id: string;
  name: string;
  facility_id: string;
  settings: {
    minStaffPerShift: number;
    maxHoursPerDay: number;
    minRestBetweenShifts: number;
  };
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}