import type { Answers, Flags, ValidationError } from './types';
import { getVisibleSteps } from './steps';
import { getMailingDifferent, isJointFiling } from '../utils/logic';

const MIN_FLAG_NOTE_LENGTH = 10;

function isSatisfiedByFlag(flags: Flags | undefined, fieldId: string): boolean {
  if (!flags || !flags[fieldId]) return false;
  const entry = flags[fieldId];
  return !!entry.flagged && (entry.note ?? '').trim().length >= MIN_FLAG_NOTE_LENGTH;
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function ssnLast4(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{4}$/.test(value.trim());
}

function emailFormat(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** True if string contains @ (soft check for inline hint). */
function emailHasAt(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return value.includes('@');
}

/** Digits only from phone input; length for "too short" warning. */
function phoneDigitCount(value: unknown): number {
  if (typeof value !== 'string') return 0;
  return (value.replace(/\D/g, '')).length;
}

function dateFormat(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

/** Allow numbers, commas, $, optional decimals/minus (money-ish). */
const NUMERIC_LIKE = /^[\d,$.\s-]*$/;

function isNumericLikeField(fieldId: string): boolean {
  return (
    /balance|value|amount|income|ytd|year|two_years/.test(fieldId) ||
    fieldId === 'income_current_ytd' ||
    fieldId === 'income_last_year' ||
    fieldId === 'income_two_years_ago'
  );
}

export function validateAll(answers: Answers, flags?: Flags): ValidationError[] {
  const errors: ValidationError[] = [];
  const steps = getVisibleSteps(answers);

  steps.forEach((step, stepIndex) => {
    step.fields.forEach((field) => {
      if (field.showIf && !field.showIf(answers)) return;
      const value = answers[field.id];
      const required = field.required ?? false;

      if (required && isEmpty(value)) {
        if (isSatisfiedByFlag(flags, field.id)) return;
        const entry = flags?.[field.id];
        if (entry?.flagged) {
          errors.push({
            stepIndex,
            stepId: step.id,
            fieldId: field.id,
            message: 'Note to your attorney must be at least 10 characters.',
          });
        } else {
          errors.push({
            stepIndex,
            stepId: step.id,
            fieldId: field.id,
            message: `${field.label} is required`,
          });
        }
        return;
      }

      if (!isEmpty(value)) {
        if (field.id === 'debtor_ssn_last4' || field.id === 'spouse_ssn_last4') {
          if (!ssnLast4(value)) {
            errors.push({
              stepIndex,
              stepId: step.id,
              fieldId: field.id,
              message: 'Enter exactly 4 digits',
              severity: 'warning',
            });
          }
        } else if (field.id === 'debtor_phone' || field.id === 'spouse_phone') {
          const digits = phoneDigitCount(value);
          if (digits > 0 && digits < 10) {
            errors.push({
              stepIndex,
              stepId: step.id,
              fieldId: field.id,
              message: 'Enter at least 10 digits (e.g. (555) 555-5555)',
              severity: 'warning',
            });
          }
        } else if (field.type === 'email' && typeof value === 'string') {
          if (!emailHasAt(value)) {
            errors.push({
              stepIndex,
              stepId: step.id,
              fieldId: field.id,
              message: 'Enter an email with @ (e.g. name@email.com)',
              severity: 'warning',
            });
          } else if (!emailFormat(value)) {
            errors.push({
              stepIndex,
              stepId: step.id,
              fieldId: field.id,
              message: 'Enter a valid email address',
              severity: 'warning',
            });
          }
        } else if (field.type === 'date' && typeof value === 'string') {
          if (!dateFormat(value)) {
            errors.push({
              stepIndex,
              stepId: step.id,
              fieldId: field.id,
              message: 'Enter a valid date',
            });
          }
        } else if (
          typeof value === 'string' &&
          value.trim().length > 0 &&
          isNumericLikeField(field.id) &&
          !NUMERIC_LIKE.test(value.trim())
        ) {
          errors.push({
            stepIndex,
            stepId: step.id,
            fieldId: field.id,
            message: 'Consider entering a number (e.g. 0, 1,234, $500)',
            severity: 'warning',
          });
        }
      }
    });
  });

  // Conditional required: mailing address if different
  if (getMailingDifferent(answers)) {
    if (isEmpty(answers['mailing_address']) && !isSatisfiedByFlag(flags, 'mailing_address')) {
      const stepIndex = steps.findIndex((s) => s.fields.some((f) => f.id === 'mailing_address'));
      if (stepIndex >= 0) {
        errors.push({
          stepIndex,
          stepId: steps[stepIndex].id,
          fieldId: 'mailing_address',
          message: 'Mailing Address is required when different from street address',
        });
      }
    }
  }

  // Conditional required: spouse fields if joint
  if (isJointFiling(answers)) {
    const spouseRequired = [
      'spouse_full_name',
      'spouse_ssn_last4',
      'spouse_dob',
      'spouse_phone',
      'spouse_email',
    ] as const;
    const spouseStepIndex = steps.findIndex((s) => s.id === 'spouse');
    if (spouseStepIndex >= 0) {
      spouseRequired.forEach((fieldId) => {
        if (isEmpty(answers[fieldId]) && !isSatisfiedByFlag(flags, fieldId)) {
          errors.push({
            stepIndex: spouseStepIndex,
            stepId: steps[spouseStepIndex].id,
            fieldId,
            message: 'Required for joint filing',
          });
        }
      });
      const spouseSsn = answers['spouse_ssn_last4'];
      if (!isEmpty(spouseSsn) && !ssnLast4(spouseSsn)) {
        errors.push({
          stepIndex: spouseStepIndex,
          stepId: steps[spouseStepIndex].id,
          fieldId: 'spouse_ssn_last4',
          message: 'Enter exactly 4 digits',
          severity: 'warning',
        });
      }
    }
  }

  return errors;
}

export function isFullyValid(answers: Answers, flags?: Flags): boolean {
  return validateAll(answers, flags).filter((e) => e.severity !== 'warning').length === 0;
}

/** Errors for a single step (for disabling Next and showing inline errors). Only blocking errors (not warnings). */
export function getErrorsForStep(answers: Answers, stepIndex: number, flags?: Flags): ValidationError[] {
  return validateAll(answers, flags).filter((e) => e.stepIndex === stepIndex && e.severity !== 'warning');
}

/** Warnings for a single step (inline hints only; do not block Next). */
export function getWarningsForStep(answers: Answers, stepIndex: number, flags?: Flags): ValidationError[] {
  return validateAll(answers, flags).filter((e) => e.stepIndex === stepIndex && e.severity === 'warning');
}

export { MIN_FLAG_NOTE_LENGTH };
