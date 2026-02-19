import { useSyncExternalStore } from 'react';
import { scopedStorageKey } from '../state/clientScope';
import type { OcrResult, OcrState } from './types';

const STORAGE_KEY = scopedStorageKey('gbi:ocr:v1');
const MAX_RAW_TEXT_CHARS = 50_000;

function emptyState(): OcrState {
  return { schemaVersion: 1, resultsByFileId: {} };
}

function safeParse(input: string | null): OcrState {
  if (!input) return emptyState();
  try {
    const parsed = JSON.parse(input) as Partial<OcrState>;
    if (parsed.schemaVersion !== 1 || typeof parsed.resultsByFileId !== 'object' || !parsed.resultsByFileId) {
      return emptyState();
    }
    return {
      schemaVersion: 1,
      resultsByFileId: parsed.resultsByFileId as Record<string, OcrResult>,
    };
  } catch {
    return emptyState();
  }
}

function truncateRawText(text: string | undefined): string | undefined {
  if (!text) return text;
  if (text.length <= MAX_RAW_TEXT_CHARS) return text;
  return text.slice(0, MAX_RAW_TEXT_CHARS);
}

let state: OcrState = (() => {
  if (typeof window === 'undefined') return emptyState();
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyState();
  }
})();

type Listener = () => void;
const listeners = new Set<Listener>();

let saveTimer: number | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function scheduleSave() {
  if (typeof window === 'undefined') return;
  if (saveTimer != null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, 180);
}

export function loadOcrState(): OcrState {
  if (typeof window === 'undefined') return emptyState();
  try {
    state = safeParse(localStorage.getItem(STORAGE_KEY));
  } catch {
    state = emptyState();
  }
  emit();
  return state;
}

export function clearOcrState(): void {
  state = emptyState();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && saveTimer != null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  emit();
}

export function getOcrState(): OcrState {
  return state;
}

export function getOcrResult(fileId: string): OcrResult | null {
  return state.resultsByFileId[fileId] ?? null;
}

export function upsertOcrResult(input: Partial<OcrResult> & { fileId: string }): OcrResult {
  const prev = state.resultsByFileId[input.fileId];
  const next: OcrResult = {
    ...(prev ?? ({} as OcrResult)),
    ...input,
    fileId: input.fileId,
  };
  next.rawText = truncateRawText(next.rawText);

  state = {
    schemaVersion: 1,
    resultsByFileId: {
      ...state.resultsByFileId,
      [input.fileId]: next,
    },
  };
  scheduleSave();
  emit();
  return next;
}

export function subscribeOcrState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOcrState(): OcrState {
  return useSyncExternalStore(subscribeOcrState, getOcrState, getOcrState);
}
