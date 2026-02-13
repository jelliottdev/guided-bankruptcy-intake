/**
 * Action queue priority scoring: weight by severity, step order, and impact.
 * Higher score = higher priority (show first).
 */
export type ActionQueueItemForScore = {
  severity: 'critical' | 'important' | 'follow-up';
  label: string;
  reason: string;
  action: string;
  stepIndex: number;
  fieldId?: string;
};

const SEVERITY_WEIGHT: Record<ActionQueueItemForScore['severity'], number> = {
  critical: 1000,
  important: 100,
  'follow-up': 10,
};

/**
 * Score a single action item for ordering.
 * Critical items first, then by step order (earlier steps = higher priority), then by label.
 */
export function scoreActionItem(item: ActionQueueItemForScore): number {
  const severityScore = SEVERITY_WEIGHT[item.severity];
  const stepOrder = Math.max(0, 50 - item.stepIndex);
  const fieldOrder = (item.fieldId ?? '').localeCompare('');
  return severityScore * 1000 + stepOrder * 100 + fieldOrder;
}

/**
 * Sort action queue by priority (critical first, then by step order).
 */
export function sortActionQueueByPriority(items: ActionQueueItemForScore[]): ActionQueueItemForScore[] {
  return [...items].sort((a, b) => {
    const scoreA = scoreActionItem(a);
    const scoreB = scoreActionItem(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (a.label || '').localeCompare(b.label || '');
  });
}
