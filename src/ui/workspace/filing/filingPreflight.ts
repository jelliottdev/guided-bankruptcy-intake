import type { ValidationError } from '../../../form/types';
import type { Issue } from '../../../issues/types';
import { statusFromIssue } from '../../shared/globalStatus';

export function countBlockingValidationErrors(errors: ValidationError[]): number {
  return errors.filter((err) => err.severity !== 'warning').length;
}

export function firstBlockingValidationError(errors: ValidationError[]): ValidationError | null {
  return errors.find((err) => err.severity !== 'warning') ?? null;
}

export function countNeedsReviewThreads(issues: Issue[]): number {
  return issues.filter((issue) => statusFromIssue(issue) === 'needs_review').length;
}

