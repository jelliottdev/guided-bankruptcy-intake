import { scopedStorageKey } from '../state/clientScope';

export type UXEventName =
  | 'issue_created'
  | 'issue_status_changed'
  | 'doc_resolution_started'
  | 'doc_resolution_closed'
  | 'message_sent'
  | 'appointment_created';

const KEY = 'gbi:telemetry:v1';

interface UXEvent {
  name: UXEventName;
  payload?: Record<string, unknown>;
  at: string;
}

export function trackUXEvent(name: UXEventName, payload?: Record<string, unknown>): void {
  const event: UXEvent = { name, payload, at: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(scopedStorageKey(KEY));
    const list = raw ? (JSON.parse(raw) as UXEvent[]) : [];
    list.push(event);
    localStorage.setItem(scopedStorageKey(KEY), JSON.stringify(list.slice(-500)));
  } catch {
    // non-fatal in demo
  }
}

export function readUXEvents(): UXEvent[] {
  try {
    const raw = localStorage.getItem(scopedStorageKey(KEY));
    return raw ? (JSON.parse(raw) as UXEvent[]) : [];
  } catch {
    return [];
  }
}
