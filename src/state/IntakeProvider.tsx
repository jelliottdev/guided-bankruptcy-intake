import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { initialIntakeState } from '../form/defaults';
import type { Answers, FieldValue, IntakeState, Uploads } from '../form/types';
import { clearStorage, loadFromStorage, saveToStorage } from './autosave';

export type IntakeAction =
  | { type: 'SET_ANSWER'; fieldId: string; value: FieldValue }
  | { type: 'ADD_UPLOAD'; fieldId: string; filenames: string[] }
  | { type: 'REMOVE_UPLOAD'; fieldId: string; filename: string }
  | { type: 'SET_STEP'; stepIndex: number }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; state: Partial<IntakeState> }
  | { type: 'SET_LAST_SAVED'; lastSavedAt: number | null }
  | { type: 'SET_SAVING'; saving: boolean }
  | { type: 'SET_SUBMITTED'; submitted: boolean };

function intakeReducer(state: IntakeState, action: IntakeAction): IntakeState {
  switch (action.type) {
    case 'SET_ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.fieldId]: action.value },
      };
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
    default:
      return state;
  }
}

interface IntakeContextValue {
  state: IntakeState;
  dispatch: Dispatch<IntakeAction>;
  setAnswer: (fieldId: string, value: FieldValue) => void;
  addUpload: (fieldId: string, filenames: string[]) => void;
  removeUpload: (fieldId: string, filename: string) => void;
  setStep: (stepIndex: number) => void;
  reset: () => void;
}

const IntakeContext = createContext<IntakeContextValue | null>(null);

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
          answers: stored.answers as Answers,
          uploads: (stored.uploads ?? {}) as Uploads,
          currentStepIndex: Math.max(0, stored.currentStepIndex ?? 0),
          lastSavedAt: stored.lastSavedAt ?? null,
          saving: false,
          submitted: false,
        },
      });
    }
  }, []);

  const setAnswer = useCallback((fieldId: string, value: FieldValue) => {
    dispatch({ type: 'SET_ANSWER', fieldId, value });
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

  const value: IntakeContextValue = {
    state,
    dispatch,
    setAnswer,
    addUpload,
    removeUpload,
    setStep,
    reset,
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
        schemaVersion: 'v1',
        answers: state.answers,
        uploads: state.uploads,
        currentStepIndex: state.currentStepIndex,
        lastSavedAt: state.lastSavedAt,
      });
      if (now != null) dispatch({ type: 'SET_LAST_SAVED', lastSavedAt: now });
      dispatch({ type: 'SET_SAVING', saving: false });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // Intentionally omit state.lastSavedAt to avoid re-running on every save
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.answers, state.uploads, state.currentStepIndex, dispatch]);

  return null;
}
