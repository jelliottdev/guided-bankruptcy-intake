import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { getInitialAnswers, initialIntakeState, SCHEMA_VERSION } from '../form/defaults';
import { getSeededAnswers, getSeededUploads } from '../form/seedData';
import type { Answers, FieldValue, Flags, IntakeState, Uploads, ViewMode } from '../form/types';
import { clearStorage, loadFromStorage, saveToStorage, trimUploadsForStorage } from './autosave';

export type IntakeAction =
  | { type: 'SET_ANSWER'; fieldId: string; value: FieldValue }
  | { type: 'SET_ANSWERS_BATCH'; answers: Partial<Answers> }
  | { type: 'ADD_UPLOAD'; fieldId: string; filenames: string[] }
  | { type: 'REMOVE_UPLOAD'; fieldId: string; filename: string }
  | { type: 'SET_STEP'; stepIndex: number }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; state: Partial<IntakeState> }
  | { type: 'SET_LAST_SAVED'; lastSavedAt: number | null }
  | { type: 'SET_SAVING'; saving: boolean }
  | { type: 'SET_SUBMITTED'; submitted: boolean }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'SET_FLAG'; fieldId: string; flagged: boolean }
  | { type: 'SET_FLAG_NOTE'; fieldId: string; note: string }
  | { type: 'SET_FLAG_RESOLVED'; fieldId: string; resolved: boolean };

function intakeReducer(state: IntakeState, action: IntakeAction): IntakeState {
  switch (action.type) {
    case 'SET_ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.fieldId]: action.value },
      };
    case 'SET_ANSWERS_BATCH': {
      const next: Answers = { ...state.answers };
      for (const [k, v] of Object.entries(action.answers)) {
        if (v !== undefined) next[k] = v as FieldValue;
      }
      return { ...state, answers: next };
    }
    case 'ADD_UPLOAD': {
      const existing = state.uploads[action.fieldId] ?? [];
      const combined = [...existing, ...action.filenames];
      return {
        ...state,
        uploads: { ...state.uploads, [action.fieldId]: combined },
      };
    }
    case 'REMOVE_UPLOAD': {
      const existing = state.uploads[action.fieldId] ?? [];
      const next = existing.filter((f) => f !== action.filename);
      const nextUploads = { ...state.uploads };
      if (next.length > 0) nextUploads[action.fieldId] = next;
      else delete nextUploads[action.fieldId];
      return { ...state, uploads: nextUploads };
    }
    case 'SET_STEP':
      return { ...state, currentStepIndex: Math.max(0, action.stepIndex) };
    case 'RESET':
      clearStorage();
      return { ...initialIntakeState, submitted: false };
    case 'HYDRATE':
      return { ...state, ...action.state };
    case 'SET_LAST_SAVED':
      return { ...state, lastSavedAt: action.lastSavedAt };
    case 'SET_SAVING':
      return { ...state, saving: action.saving };
    case 'SET_SUBMITTED':
      return { ...state, submitted: action.submitted };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'SET_FLAG': {
      const entry = state.flags[action.fieldId] ?? { flagged: false, note: '' };
      const next = { ...state.flags, [action.fieldId]: { ...entry, flagged: action.flagged } };
      if (!action.flagged) next[action.fieldId] = { ...next[action.fieldId], note: '' };
      return { ...state, flags: next };
    }
    case 'SET_FLAG_NOTE': {
      const entry = state.flags[action.fieldId] ?? { flagged: true, note: '' };
      return {
        ...state,
        flags: { ...state.flags, [action.fieldId]: { ...entry, note: action.note } },
      };
    }
    case 'SET_FLAG_RESOLVED': {
      const entry = state.flags[action.fieldId];
      if (!entry) return state;
      return {
        ...state,
        flags: { ...state.flags, [action.fieldId]: { ...entry, resolved: action.resolved } },
      };
    }
    default:
      return state;
  }
}

interface IntakeContextValue {
  state: IntakeState;
  dispatch: Dispatch<IntakeAction>;
  setAnswer: (fieldId: string, value: FieldValue) => void;
  /** Set multiple answers at once (e.g. for random seeding). */
  setAnswersBatch: (answers: Partial<Answers>) => void;
  addUpload: (fieldId: string, filenames: string[]) => void;
  removeUpload: (fieldId: string, filename: string) => void;
  setStep: (stepIndex: number) => void;
  reset: () => void;
  loadSeededDemo: () => void;
  setViewMode: (mode: ViewMode) => void;
  setFlag: (fieldId: string, flagged: boolean) => void;
  setFlagNote: (fieldId: string, note: string) => void;
  setFlagResolved: (fieldId: string, resolved: boolean) => void;
}

/**
 * Keep context identity stable across Vite Fast Refresh.
 * Without this, hot-updating the module that defines the context can recreate the Context,
 * leaving existing Providers/Consumers pointing at different instances and causing
 * `useIntake must be used within IntakeProvider` even though a Provider is rendered.
 */
const INTAKE_CONTEXT_KEY = '__GBI_INTAKE_CONTEXT__';
const globalStore = globalThis as unknown as Record<string, unknown>;
const IntakeContext =
  (globalStore[INTAKE_CONTEXT_KEY] as ReturnType<typeof createContext<IntakeContextValue | null>> | undefined) ??
  createContext<IntakeContextValue | null>(null);
if (!globalStore[INTAKE_CONTEXT_KEY]) globalStore[INTAKE_CONTEXT_KEY] = IntakeContext;

export function useIntake(): IntakeContextValue {
  const ctx = useContext(IntakeContext);
  if (!ctx) throw new Error('useIntake must be used within IntakeProvider');
  return ctx;
}

/** Autosave status for UI */
export type SaveStatus = 'idle' | 'saving' | 'saved';

const DEBOUNCE_MS = 500;

export function IntakeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(intakeReducer, initialIntakeState);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      dispatch({
        type: 'HYDRATE',
        state: {
          answers: { ...getInitialAnswers(), ...(stored.answers as Answers) },
          uploads: (stored.uploads ?? {}) as Uploads,
          flags: (stored.flags ?? {}) as Flags,
          currentStepIndex: Math.max(0, stored.currentStepIndex ?? 0),
          lastSavedAt: stored.lastSavedAt ?? null,
          saving: false,
          submitted: false,
          viewMode: stored.viewMode ?? 'client',
        },
      });
    }
  }, []);

  const setAnswer = useCallback((fieldId: string, value: FieldValue) => {
    dispatch({ type: 'SET_ANSWER', fieldId, value });
  }, []);

  const setAnswersBatch = useCallback((answers: Partial<Answers>) => {
    dispatch({ type: 'SET_ANSWERS_BATCH', answers });
  }, []);

  const addUpload = useCallback((fieldId: string, filenames: string[]) => {
    dispatch({ type: 'ADD_UPLOAD', fieldId, filenames });
  }, []);

  const removeUpload = useCallback((fieldId: string, filename: string) => {
    dispatch({ type: 'REMOVE_UPLOAD', fieldId, filename });
  }, []);

  const setStep = useCallback((stepIndex: number) => {
    dispatch({ type: 'SET_STEP', stepIndex });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const loadSeededDemo = useCallback(() => {
    dispatch({
      type: 'HYDRATE',
      state: {
        answers: getSeededAnswers(),
        uploads: getSeededUploads(),
        flags: {},
        currentStepIndex: 0,
        submitted: false,
      },
    });
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', mode });
  }, []);

  const setFlag = useCallback((fieldId: string, flagged: boolean) => {
    dispatch({ type: 'SET_FLAG', fieldId, flagged });
  }, []);

  const setFlagNote = useCallback((fieldId: string, note: string) => {
    dispatch({ type: 'SET_FLAG_NOTE', fieldId, note });
  }, []);

  const setFlagResolved = useCallback((fieldId: string, resolved: boolean) => {
    dispatch({ type: 'SET_FLAG_RESOLVED', fieldId, resolved });
  }, []);

  const value: IntakeContextValue = {
    state,
    dispatch,
    setAnswer,
    setAnswersBatch,
    addUpload,
    removeUpload,
    setStep,
    reset,
    loadSeededDemo,
    setViewMode,
    setFlag,
    setFlagNote,
    setFlagResolved,
  };

  return (
    <IntakeContext.Provider value={value}>
      {children}
      <AutosaveEffect state={state} dispatch={dispatch} />
    </IntakeContext.Provider>
  );
}

function AutosaveEffect({
  state,
  dispatch,
}: {
  state: IntakeState;
  dispatch: Dispatch<IntakeAction>;
}) {
  useEffect(() => {
    dispatch({ type: 'SET_SAVING', saving: true });
    const t = setTimeout(() => {
      const now = saveToStorage({
        schemaVersion: SCHEMA_VERSION,
        answers: state.answers,
        uploads: trimUploadsForStorage(state.uploads),
        flags: state.flags,
        currentStepIndex: state.currentStepIndex,
        lastSavedAt: state.lastSavedAt,
        viewMode: state.viewMode,
      });
      if (now != null) dispatch({ type: 'SET_LAST_SAVED', lastSavedAt: now });
      dispatch({ type: 'SET_SAVING', saving: false });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // Intentionally omit state.lastSavedAt to avoid re-running on every save
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.answers, state.uploads, state.flags, state.currentStepIndex, state.viewMode, dispatch]);

  return null;
}
