export interface AppointmentType {
  id: string;
  label: 'intake' | 'review' | 'emergency' | 'follow_up';
  durationMinutes: number;
}

export interface AvailabilityRule {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startHour24: number;
  endHour24: number;
  bufferMinutes: number;
  blackoutDates?: string[];
}

export interface Appointment {
  id: string;
  typeId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: 'proposed' | 'confirmed' | 'reschedule_requested' | 'cancelled' | 'completed';
  notes?: string;
  linkedIssueId?: string;
}

export interface TimezonePolicy {
  displayTimezone: string;
  attorneyTimezone: string;
  convertToAttorneyView: boolean;
}
