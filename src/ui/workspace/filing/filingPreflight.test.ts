import { describe, expect, it } from 'vitest';
import type { ValidationError } from '../../../form/types';
import type { Issue } from '../../../issues/types';
import {
  countBlockingValidationErrors,
  countNeedsReviewThreads,
  firstBlockingValidationError,
} from './filingPreflight';

describe('filingPreflight', () => {
  it('counts blocking validation errors (ignores warnings)', () => {
    const errors: ValidationError[] = [
      { stepIndex: 0, stepId: 'filing', fieldId: 'filing_setup', message: 'Filing type is required' },
      { stepIndex: 1, stepId: 'identity', fieldId: 'debtor_ssn_last4', message: 'Enter exactly 4 digits', severity: 'warning' },
      { stepIndex: 1, stepId: 'identity', fieldId: 'debtor_dob', message: 'Enter a valid date' },
    ];
    expect(countBlockingValidationErrors(errors)).toBe(2);
    expect(firstBlockingValidationError(errors)?.fieldId).toBe('filing_setup');
  });

  it('counts needs_review threads', () => {
    const issues: Issue[] = [
      {
        id: 'a',
        type: 'clarification',
        title: 'Clarify income',
        description: '',
        owner: 'client',
        priority: 'critical',
        status: 'needs_review',
        attachments: [],
        comments: [],
        audit: [],
        createdAt: '2026-02-15T00:00:00.000Z',
        updatedAt: '2026-02-15T00:00:00.000Z',
      },
      {
        id: 'b',
        type: 'task',
        title: 'Attorney note',
        description: '',
        owner: 'attorney',
        priority: 'normal',
        status: 'assigned',
        attachments: [],
        comments: [],
        audit: [],
        createdAt: '2026-02-15T00:00:00.000Z',
        updatedAt: '2026-02-15T00:00:00.000Z',
      },
    ];
    expect(countNeedsReviewThreads(issues)).toBe(1);
  });
});

