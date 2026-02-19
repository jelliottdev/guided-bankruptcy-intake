/**
 * Canonical intake schema: single source of truth for the intake field set.
 * Seed, questionnaire graph, and form generation should align to this set.
 */
import { ALL_STEPS } from './steps';
import type { Answers, Uploads } from './types';

/** Every form field id from ALL_STEPS. Used to detect stale templates and align seed/export. */
export const CANONICAL_INTAKE_FIELD_IDS = new Set(
  ALL_STEPS.flatMap((step) => step.fields.map((f) => f.id))
);

/** Demo case = Answers from seed. Re-export type for form generation and tests. */
export type DemoCaseAnswers = Answers;

/** Demo case = Uploads from seed. Re-export type for form generation and tests. */
export type DemoCaseUploads = Uploads;
