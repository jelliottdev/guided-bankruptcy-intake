import type { Answers, IntakeState } from './types';
import { ALL_STEPS } from './steps';

export const SCHEMA_VERSION = 'v1';
export const GBI_STORAGE_KEY = 'gbi:intake:v1';

/** Default value per field type to avoid controlled/uncontrolled warnings. Exported for hydrate merge. */
export function getInitialAnswers(): Answers {
  const a: Answers = {};
  for (const step of ALL_STEPS) {
    for (const field of step.fields) {
      if (field.type === 'checkbox') a[field.id] = [];
      else if (field.type === 'grid') a[field.id] = {};
      else a[field.id] = '';
    }
  }
  return a;
}

export const initialIntakeState: IntakeState = {
  answers: getInitialAnswers(),
  uploads: {},
  flags: {},
  currentStepIndex: 0,
  lastSavedAt: null,
  saving: false,
  submitted: false,
  viewMode: 'client',
};
