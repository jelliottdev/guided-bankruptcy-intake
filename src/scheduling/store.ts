import type { Appointment, AvailabilityRule, AppointmentType, TimezonePolicy } from './types';
import { scopedStorageKey } from '../state/clientScope';

const KEY = 'gbi:scheduling:v1';
const VERSION = 1;

export interface SchedulingState {
  appointmentTypes: AppointmentType[];
  availability: AvailabilityRule[];
  appointments: Appointment[];
  timezonePolicy: TimezonePolicy;
}

export const DEFAULT_SCHEDULING_STATE: SchedulingState = {
  appointmentTypes: [
    { id: 'intake', label: 'intake', durationMinutes: 45 },
    { id: 'review', label: 'review', durationMinutes: 30 },
    { id: 'emergency', label: 'emergency', durationMinutes: 20 },
    { id: 'follow_up', label: 'follow_up', durationMinutes: 20 },
  ],
  availability: [
    { dayOfWeek: 1, startHour24: 9, endHour24: 17, bufferMinutes: 15 },
    { dayOfWeek: 2, startHour24: 9, endHour24: 17, bufferMinutes: 15 },
    { dayOfWeek: 3, startHour24: 9, endHour24: 17, bufferMinutes: 15 },
    { dayOfWeek: 4, startHour24: 9, endHour24: 17, bufferMinutes: 15 },
    { dayOfWeek: 5, startHour24: 9, endHour24: 17, bufferMinutes: 15 },
  ],
  appointments: [],
  timezonePolicy: {
    displayTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    attorneyTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    convertToAttorneyView: true,
  },
};

export function loadSchedulingState(): SchedulingState {
  try {
    const raw = localStorage.getItem(scopedStorageKey(KEY));
    if (!raw) return DEFAULT_SCHEDULING_STATE;
    const parsed = JSON.parse(raw) as { schemaVersion?: number; data?: SchedulingState };
    if (!parsed?.data) return DEFAULT_SCHEDULING_STATE;
    return {
      ...DEFAULT_SCHEDULING_STATE,
      ...parsed.data,
      appointmentTypes: parsed.data.appointmentTypes ?? DEFAULT_SCHEDULING_STATE.appointmentTypes,
      availability: parsed.data.availability ?? DEFAULT_SCHEDULING_STATE.availability,
      appointments: parsed.data.appointments ?? [],
      timezonePolicy: parsed.data.timezonePolicy ?? DEFAULT_SCHEDULING_STATE.timezonePolicy,
    };
  } catch {
    return DEFAULT_SCHEDULING_STATE;
  }
}

export function saveSchedulingState(state: SchedulingState): void {
  try {
    localStorage.setItem(scopedStorageKey(KEY), JSON.stringify({ schemaVersion: VERSION, data: state }));
  } catch {
    // non-fatal in demo
  }
}
