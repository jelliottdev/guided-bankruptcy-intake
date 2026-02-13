/**
 * Strategy signals: Chapter 7 candidate, non-exempt risk, priority debts, urgency.
 */
export type StrategySignal = { id: string; label: string; note?: string };

export interface StrategySignalsCardProps {
  strategySignals: StrategySignal[];
}

export function StrategySignalsCard({ strategySignals }: StrategySignalsCardProps) {
  if (strategySignals.length === 0) return null;
  return (
    <div className="dashboard-card strategy-signals-inline">
      <div className="dashboard-card-title">Strategy signals</div>
      <ul className="strategy-list-inline">
        {strategySignals.map((s) => (
          <li key={s.id}>
            <span className="strategy-label">{s.label}</span>
            {s.note && <span className="strategy-note"> — {s.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
