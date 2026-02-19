import type { Answers, Flags } from '../../form/types';
import type { ContextLink } from '../../workflow/actionables';
import { computeCaseReadiness, getPrimaryBlockers } from '../readiness';

export type FilingReadinessGate = 'ready_to_draft' | 'not_ready';

export interface FilingReadinessBlocker {
  id: string;
  title: string;
  whyBlocking: string;
  type: 'data' | 'documents' | 'risk' | 'deadline';
  severity: 'critical' | 'high' | 'normal';
  owner: 'client' | 'staff' | 'attorney';
  responsible: 'client' | 'staff' | 'attorney';
  dueAt?: string;
  actionableId?: string;
  links: ContextLink[];
}

export interface FilingReadinessVM {
  gate: FilingReadinessGate;
  status: 'ready' | 'not_ready';
  label: string;
  blockerCount: number;
  blockers: FilingReadinessBlocker[];
  criteria: {
    requiredDataComplete: boolean;
    requiredDocsVerifiedOrWaived: boolean;
    criticalRisksReviewed: boolean;
    attorneyApprovalGatePassed: boolean;
  };
  secondaryScore?: number;
}

interface BuildReadinessVMInput {
  answers: Answers;
  uploads: Record<string, string[]>;
  flags: Flags;
  missingFieldLabels: string[];
  requiredDocsVerifiedOrWaived: boolean;
  criticalRisksReviewed: boolean;
  attorneyApprovalGatePassed: boolean;
}

export function buildReadinessVM(input: BuildReadinessVMInput): FilingReadinessVM {
  const base = computeCaseReadiness(input.answers, input.uploads, input.flags);
  const requiredDataComplete = input.missingFieldLabels.length === 0;
  const primary = getPrimaryBlockers(input.answers, input.uploads, input.missingFieldLabels);

  const blockers: FilingReadinessBlocker[] = primary.map((label, idx) => ({
    id: `readiness-${idx}`,
    title: label,
    whyBlocking: 'Required filing evidence or answer is incomplete.',
    type: /tax|paystub|statement|doc/i.test(label) ? 'documents' : 'data',
    severity: idx === 0 ? 'critical' : 'high',
    owner: 'client',
    responsible: 'client',
    links: [],
  }));

  if (!input.criticalRisksReviewed) {
    blockers.push({
      id: 'risk-review-gate',
      title: 'Critical risk review required',
      whyBlocking: 'Attorney risk decision has not been recorded.',
      type: 'risk',
      severity: 'critical',
      owner: 'attorney',
      responsible: 'attorney',
      links: [],
    });
  }

  if (!input.attorneyApprovalGatePassed) {
    blockers.push({
      id: 'attorney-approval-gate',
      title: 'Attorney approval required',
      whyBlocking: 'Case has not passed attorney approval gate.',
      type: 'risk',
      severity: 'high',
      owner: 'attorney',
      responsible: 'attorney',
      links: [],
    });
  }

  if (!input.requiredDocsVerifiedOrWaived && !blockers.some((b) => b.type === 'documents')) {
    blockers.push({
      id: 'doc-verification-gate',
      title: 'Required documents not verified',
      whyBlocking: 'Required categories need verification or waiver reason.',
      type: 'documents',
      severity: 'critical',
      owner: 'client',
      responsible: 'staff',
      links: [],
    });
  }

  const criteria = {
    requiredDataComplete,
    requiredDocsVerifiedOrWaived: input.requiredDocsVerifiedOrWaived,
    criticalRisksReviewed: input.criticalRisksReviewed,
    attorneyApprovalGatePassed: input.attorneyApprovalGatePassed,
  };

  const gate: FilingReadinessGate =
    criteria.requiredDataComplete &&
      criteria.requiredDocsVerifiedOrWaived &&
      criteria.criticalRisksReviewed &&
      criteria.attorneyApprovalGatePassed
      ? 'ready_to_draft'
      : 'not_ready';

  return {
    gate,
    status: gate === 'ready_to_draft' ? 'ready' : 'not_ready',
    label: gate === 'ready_to_draft' ? 'Ready to draft' : 'Not ready',
    blockerCount: blockers.length,
    blockers,
    criteria,
    secondaryScore: base.score,
  };
}
