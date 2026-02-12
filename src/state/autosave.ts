import { GBI_STORAGE_KEY, SCHEMA_VERSION } from '../form/defaults';
import type { IntakeState } from '../form/types';

export interface StoredPayload {
  schemaVersion: string;
  answers: IntakeState['answers'];
  uploads: IntakeState['uploads'];
  currentStepIndex: number;
  lastSavedAt: number | null;
}

export function loadFromStorage(): StoredPayload | null {
  try {
    const raw = localStorage.getItem(GBI_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredPayload;
    if (data.schemaVersion !== SCHEMA_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveToStorage(payload: StoredPayload): number | null {
  try {
    const now = Date.now();
    const toSave = { ...payload, lastSavedAt: now };
    localStorage.setItem(GBI_STORAGE_KEY, JSON.stringify(toSave));
    return now;
  } catch {
    return null;
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(GBI_STORAGE_KEY);
  } catch {
    // ignore
  }
}
