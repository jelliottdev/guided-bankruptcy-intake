import { GBI_STORAGE_KEY, SCHEMA_VERSION } from '../form/defaults';
import type { IntakeState } from '../form/types';

const MAX_FILENAMES_PER_FIELD = 20;

export interface StoredPayload {
  schemaVersion: string;
  answers: IntakeState['answers'];
  uploads: IntakeState['uploads'];
  currentStepIndex: number;
  lastSavedAt: number | null;
  viewMode?: IntakeState['viewMode'];
}

/** Trim uploads for storage: cap entries per field and keep only { name }-style metadata to avoid localStorage bloat. */
export function trimUploadsForStorage(uploads: IntakeState['uploads']): IntakeState['uploads'] {
  const out: IntakeState['uploads'] = {};
  for (const [fieldId, list] of Object.entries(uploads)) {
    if (!Array.isArray(list) || list.length === 0) continue;
    const names = list
      .slice(-MAX_FILENAMES_PER_FIELD)
      .map((entry) => (typeof entry === 'string' ? entry : (entry as { name?: string }).name ?? ''))
      .filter(Boolean);
    if (names.length > 0) out[fieldId] = names;
  }
  return out;
}

/** Normalize loaded uploads: ensure each entry is a string (filename). */
function normalizeLoadedUploads(uploads: unknown): IntakeState['uploads'] {
  if (!uploads || typeof uploads !== 'object') return {};
  const out: IntakeState['uploads'] = {};
  for (const [fieldId, list] of Object.entries(uploads)) {
    if (!Array.isArray(list)) continue;
    const names = list
      .slice(0, MAX_FILENAMES_PER_FIELD)
      .map((entry) => (typeof entry === 'string' ? entry : (entry as { name?: string }).name ?? ''))
      .filter(Boolean);
    if (names.length > 0) out[fieldId] = names;
  }
  return out;
}

export function loadFromStorage(): StoredPayload | null {
  try {
    const raw = localStorage.getItem(GBI_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredPayload;
    if (data.schemaVersion !== SCHEMA_VERSION) return null;
    return {
      ...data,
      uploads: normalizeLoadedUploads(data.uploads),
      viewMode: data.viewMode ?? 'client',
    };
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
