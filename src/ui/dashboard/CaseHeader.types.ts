export type NextAction = {
  title: string;
  reason: string;
  severity: 'critical' | 'important' | 'followup';
  ctaLabel: string;
  onClick: () => void;
};
