import type { Answers, Flags, Uploads } from '../form/types';
import type { Issue } from '../issues/types';
import { validateAll } from '../form/validate';
import { getDocumentSufficiency } from '../attorney/snapshot';
import { scopedStorageKey } from '../state/clientScope';

const BASELINE_KEY = 'gbi:baseline:v1';

export interface BaselineSnapshot {
  at: string;
  missingDocCount: number;
  unresolvedActionCount: number;
  requiredIncompleteCount: number;
}

export function computeBaselineSnapshot(
  answers: Answers,
  uploads: Uploads,
  flags: Flags,
  issues: Issue[]
): BaselineSnapshot {
  const missingDocCount = getDocumentSufficiency(answers, uploads).filter(
    (d) => d.status === 'Missing' || d.status === 'Partial'
  ).length;
  const unresolvedActionCount = issues.filter(
    (i) => i.id.startsWith('action:') && ['assigned', 'in_progress', 'needs_review'].includes(i.status)
  ).length;
  const requiredIncompleteCount = validateAll(answers, flags).filter((e) => e.severity !== 'warning').length;
  return {
    at: new Date().toISOString(),
    missingDocCount,
    unresolvedActionCount,
    requiredIncompleteCount,
  };
}

export function saveBaselineSnapshot(snapshot: BaselineSnapshot): void {
  try {
    localStorage.setItem(scopedStorageKey(BASELINE_KEY), JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}
