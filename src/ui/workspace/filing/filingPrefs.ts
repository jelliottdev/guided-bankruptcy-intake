export const FILING_STATE_OVERRIDE_KEY = 'gbi:ui:filing:stateOverride';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

function getDefaultStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadFilingStateOverride(storage: ReadableStorage | null = getDefaultStorage()): string {
  if (!storage) return '';
  try {
    return (storage.getItem(FILING_STATE_OVERRIDE_KEY) ?? '').trim();
  } catch {
    return '';
  }
}

export function saveFilingStateOverride(
  value: string,
  storage: WritableStorage | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(FILING_STATE_OVERRIDE_KEY, value.trim());
  } catch {
    // ignore in local demo
  }
}

