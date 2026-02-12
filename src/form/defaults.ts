import type { IntakeState } from './types';

export const SCHEMA_VERSION = 'v1';
export const GBI_STORAGE_KEY = 'gbi:intake:v1';

export const initialIntakeState: IntakeState = {
  answers: {},
  uploads: {},
  currentStepIndex: 0,
  lastSavedAt: null,
  saving: false,
  submitted: false,
};
