import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Divider from '@mui/joy/Divider';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import { loadSchedulingState, saveSchedulingState, type SchedulingState } from '../../scheduling/store';

interface SchedulePanelProps {
  onAppointmentCreated?: (payload: { appointmentId: string; when: string }) => void;
}

function makeAppointmentId(): string {
  return `appt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function prettySlotLabel(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function SchedulePanel({ onAppointmentCreated }: SchedulePanelProps) {
  const [state, setState] = useState<SchedulingState>(() => loadSchedulingState());
  const [typeId, setTypeId] = useState('intake');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [highlightAppointmentId, setHighlightAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    saveSchedulingState(state);
  }, [state]);

  const selectedType = useMemo(
    () => state.appointmentTypes.find((t) => t.id === typeId) ?? state.appointmentTypes[0],
    [state.appointmentTypes, typeId]
  );

  const suggestedSlots = useMemo(() => {
    if ((selectedType?.durationMinutes ?? 0) >= 60) {
      return ['09:00', '11:00', '13:30', '15:30'];
    }
    if ((selectedType?.durationMinutes ?? 0) >= 45) {
      return ['09:00', '10:30', '13:00', '15:00', '16:30'];
    }
    return ['08:30', '10:00', '11:30', '14:00', '15:30', '17:00'];
  }, [selectedType?.durationMinutes]);

  const sortedAppointments = useMemo(
    () => [...state.appointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [state.appointments]
  );

  const minDate = useMemo(() => toDateInputValue(new Date()), []);
  const canCreate = Boolean(date && time && typeId);

  const selectedStartLabel = useMemo(() => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}:00`).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [date, time]);

  const createAppointment = () => {
    if (!date || !time || !typeId) return;
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    const duration = selectedType?.durationMinutes ?? 30;
    const endsAt = new Date(new Date(startsAt).getTime() + duration * 60 * 1000).toISOString();
    const appointmentId = makeAppointmentId();
    setState((prev) => ({
      ...prev,
      appointments: [
        ...prev.appointments,
        {
          id: appointmentId,
          typeId,
          startsAt,
          endsAt,
          timezone: prev.timezonePolicy.displayTimezone,
          status: 'proposed',
          notes: notes.trim() || undefined,
        },
      ],
    }));
    onAppointmentCreated?.({ appointmentId, when: startsAt });
    setHighlightAppointmentId(appointmentId);
    window.setTimeout(() => setHighlightAppointmentId(null), 1800);
    setNotes('');
  };

  const updateAppointmentStatus = (id: string, status: 'confirmed' | 'reschedule_requested' | 'cancelled' | 'completed') => {
    setState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
    }));
  };

  return (
    <Sheet className="schedule-panel joy-schedule-panel" variant="plain">
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography level="title-md">Schedule</Typography>
          <Chip size="sm" color="primary" variant="soft" title="Local timezone used for meeting times">
            {state.timezonePolicy.displayTimezone}
          </Chip>
        </Stack>

        <Sheet variant="soft" sx={{ p: 1.1, borderRadius: 'md' }}>
          <Stack spacing={1}>
            <FormControl size="sm">
              <FormLabel>Appointment type</FormLabel>
              <Select value={typeId} onChange={(_, next) => setTypeId(next ?? 'intake')}>
                {state.appointmentTypes.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.label.replace('_', ' ')} ({t.durationMinutes}m)
                  </Option>
                ))}
              </Select>
            </FormControl>

            <FormControl size="sm">
              <FormLabel>Date</FormLabel>
              <Input
                type="date"
                value={date}
                slotProps={{ input: { min: minDate } }}
                onChange={(e) => setDate(e.target.value)}
              />
            </FormControl>

            <FormControl size="sm">
              <FormLabel>Time</FormLabel>
              <Select value={time || null} placeholder="Select time" onChange={(_, next) => setTime(next ?? '')}>
                {suggestedSlots.map((slot) => (
                  <Option key={slot} value={slot}>
                    {prettySlotLabel(slot)}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <Box className="schedule-slot-row">
              {suggestedSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`schedule-slot-chip ${time === slot ? 'active' : ''}`}
                  onClick={() => setTime(slot)}
                >
                  {prettySlotLabel(slot)}
                </button>
              ))}
            </Box>

            <FormControl size="sm">
              <FormLabel>Notes (optional)</FormLabel>
              <Textarea minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormControl>

            <Sheet className="schedule-preview" variant="soft" color="primary" aria-live="polite">
              {selectedStartLabel ? (
                <>
                  <strong>Proposed:</strong> {selectedStartLabel} ({selectedType?.durationMinutes ?? 30} minutes)
                </>
              ) : (
                <span>Select date and time to preview appointment details.</span>
              )}
            </Sheet>

            <Button type="button" className="schedule-create-btn" disabled={!canCreate} onClick={createAppointment}>
              Create appointment
            </Button>
          </Stack>
        </Sheet>

        <Divider />
        <List size="sm" sx={{ p: 0, gap: 0.75 }}>
          {sortedAppointments.length === 0 ? (
            <ListItem sx={{ px: 0 }}>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                No appointments yet.
              </Typography>
            </ListItem>
          ) : (
            sortedAppointments.map((a) => (
              <ListItem key={a.id} sx={{ px: 0 }}>
                <Sheet
                  className={`schedule-row-item ${highlightAppointmentId === a.id ? 'newly-added' : ''}`}
                  variant="outlined"
                  sx={{ width: '100%', p: 1, borderRadius: 'md' }}
                >
                  <Stack spacing={0.75}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography level="body-sm" sx={{ fontWeight: 'lg', textTransform: 'capitalize' }}>
                        {a.typeId.replace('_', ' ')}
                      </Typography>
                      <Chip
                        size="sm"
                        className={`schedule-status-chip status-${a.status}`}
                        color={
                          a.status === 'confirmed'
                            ? 'success'
                            : a.status === 'reschedule_requested'
                              ? 'warning'
                              : a.status === 'cancelled'
                                ? 'danger'
                                : 'neutral'
                        }
                        variant="soft"
                      >
                        {a.status.replace('_', ' ')}
                      </Chip>
                    </Stack>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      {new Date(a.startsAt).toLocaleString()}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                      <Button size="sm" variant="soft" onClick={() => updateAppointmentStatus(a.id, 'confirmed')}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="soft" onClick={() => updateAppointmentStatus(a.id, 'reschedule_requested')}>
                        Reschedule
                      </Button>
                      <Button size="sm" variant="soft" color="danger" onClick={() => updateAppointmentStatus(a.id, 'cancelled')}>
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                </Sheet>
              </ListItem>
            ))
          )}
        </List>
      </Stack>
    </Sheet>
  );
}
