import type { Answers, IntakeState } from './types';
import { ALL_STEPS } from './steps';

export const SCHEMA_VERSION = 'v1';
export const GBI_STORAGE_KEY = 'gbi:intake:v1';

/** Safe defaults for petition/filing fields so transform and form fillers never see undefined. */
const PETITION_DEFAULTS: Partial<Answers> = {
  filing_chapter: '7',
  filing_fee_method: 'full',
  debt_nature: 'consumer',
  creditor_count_range: '1-49',
  asset_range: '0-50000',
  liability_range: '0-50000',
};

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
  for (const [key, value] of Object.entries(PETITION_DEFAULTS)) {
    if (a[key] === '' || a[key] === undefined) {
      a[key] = value as Answers[string];
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
