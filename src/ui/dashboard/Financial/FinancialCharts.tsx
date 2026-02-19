/**
 * Financial charts: debt breakdown (donut), asset vs debt (bars), income vs expenses (bars).
 * Uses deterministic CSS/JS visuals to avoid hidden SVG render failures.
 */
import { useEffect, useMemo, useState } from 'react';
import Button from '@mui/joy/Button';
import type { AttorneyFinancialEntry } from '../dashboardShared';
import { formatCurrency } from '../dashboardShared';

const DEBT_COLORS = { Secured: '#3b82f6', Priority: '#f59e0b', Unsecured: '#8b5cf6' };
const BAR_COLORS = { income: '#22c55e', expenses: '#ef4444', assets: '#3b82f6', debt: '#f59e0b' };

export interface FinancialChartsProps {
  attorneyFinancial: AttorneyFinancialEntry;
  scheduleCoverage: { schedule: string; status: string }[];
  onAddNumbers?: () => void;
  usingInferredValues?: boolean;
  renderState?: 'loading' | 'ready';
  errorMessage?: string;
  lastComputedAt?: string;
  onRetry?: () => void;
}

export function FinancialCharts({
  attorneyFinancial,
  scheduleCoverage,
  onAddNumbers,
  usingInferredValues = false,
  renderState = 'ready',
  errorMessage,
  lastComputedAt,
  onRetry,
}: FinancialChartsProps) {
  const [animateDonut, setAnimateDonut] = useState(false);
  const scheduleReadyCount = scheduleCoverage.filter((s) => s.status === 'Ready').length;
  const scheduleTotalCount = scheduleCoverage.length;
  const secured = attorneyFinancial.securedDebt ?? 0;
  const priority = attorneyFinancial.priorityDebt ?? 0;
  const unsecured = attorneyFinancial.unsecuredDebt ?? 0;
  const totalDebt = secured + priority + unsecured;
  const income = attorneyFinancial.monthlyIncome ?? 0;
  const expenses = attorneyFinancial.monthlyExpenses ?? 0;
  const assets = attorneyFinancial.assetTotal ?? 0;

  const debtPieData = useMemo(
    () => [
      ...(secured > 0 ? [{ name: 'Secured', value: secured, color: DEBT_COLORS.Secured, shortLabel: 'Sec.' }] : []),
      ...(priority > 0 ? [{ name: 'Priority', value: priority, color: DEBT_COLORS.Priority, shortLabel: 'Pri.' }] : []),
      ...(unsecured > 0 ? [{ name: 'Unsecured', value: unsecured, color: DEBT_COLORS.Unsecured, shortLabel: 'Unsec.' }] : []),
    ],
    [secured, priority, unsecured]
  );

  const assetDebtData = [
    { name: 'Assets', value: assets, fill: BAR_COLORS.assets },
    { name: 'Total debt', value: totalDebt, fill: BAR_COLORS.debt },
  ].filter((d) => d.value > 0);

  const incomeExpenseData = [
    { name: 'Income', value: income, fill: BAR_COLORS.income },
    { name: 'Expenses', value: expenses, fill: BAR_COLORS.expenses },
  ].filter((d) => d.value > 0);

  const hasCharts = debtPieData.length > 0 || incomeExpenseData.length > 0;
  const schedulePct = scheduleTotalCount > 0 ? Math.round((scheduleReadyCount / scheduleTotalCount) * 100) : 0;
  const incomeExpenseMax = Math.max(...incomeExpenseData.map((item) => item.value), 1);
  const donutSegments = useMemo(() => {
    if (totalDebt <= 0) return [];
    let offset = 0;
    return debtPieData.map((segment, index) => {
      const pct = (segment.value / totalDebt) * 100;
      const next = {
        ...segment,
        pct,
        offset,
        delayMs: index * 90,
      };
      offset += pct;
      return next;
    });
  }, [debtPieData, totalDebt]);

  useEffect(() => {
    setAnimateDonut(false);
    const timer = setTimeout(() => setAnimateDonut(true), 28);
    return () => clearTimeout(timer);
  }, [secured, priority, unsecured]);

  return (
    <div className="dashboard-card financial-charts-card">
      <div className="financial-charts-head">
        <div className="dashboard-card-title">Financial charts</div>
        <div className="financial-charts-meta">
          <span className={`financial-charts-state state-${errorMessage ? 'error' : renderState}`}>
            {errorMessage ? 'Error' : renderState === 'loading' ? 'Computing' : 'Up to date'}
          </span>
          {lastComputedAt ? (
            <span className="financial-charts-timestamp">Last computed {new Date(lastComputedAt).toLocaleTimeString()}</span>
          ) : null}
        </div>
      </div>
      {usingInferredValues && (
        <p className="financial-charts-empty-text financial-charts-estimate-banner">
          Showing estimate-based chart values from intake answers. Add attorney numbers to confirm.
        </p>
      )}
      {errorMessage ? (
        <div className="financial-charts-empty financial-charts-error">
          <p className="financial-charts-empty-text">{errorMessage}</p>
          <div className="financial-charts-empty-actions">
            {onRetry ? (
              <Button size="sm" variant="soft" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
            {onAddNumbers ? (
              <Button size="sm" variant="plain" onClick={onAddNumbers}>
                Edit numbers
              </Button>
            ) : null}
          </div>
        </div>
      ) : renderState === 'loading' ? (
        <div className="financial-charts-loading-grid" aria-label="Loading charts">
          <div className="financial-chart-skeleton" />
          <div className="financial-chart-skeleton" />
          <div className="financial-chart-skeleton" />
        </div>
      ) : !hasCharts ? (
        <div className="financial-charts-empty">
          <p className="financial-charts-empty-text">
            Add numbers in Financial signals to see debt and income charts.
          </p>
          {onAddNumbers && (
            <Button size="sm" variant="plain" onClick={onAddNumbers}>
              Add numbers
            </Button>
          )}
        </div>
      ) : (
        <div className="financial-charts-grid">
          <div className="financial-chart-wrap">
            <div className="financial-chart-title">Debt breakdown</div>
            {debtPieData.length > 0 ? (
              <>
                <div className="financial-donut-wrap">
                  <div className="financial-donut">
                    <svg
                      className="financial-donut-svg"
                      viewBox="0 0 120 120"
                      aria-label={`Debt breakdown chart showing ${debtPieData.map((segment) => `${segment.name} ${formatCurrency(segment.value)}`).join(', ')}`}
                      role="img"
                    >
                      <circle
                        className="financial-donut-track"
                        cx="60"
                        cy="60"
                        r="46"
                        pathLength={100}
                      />
                      {donutSegments.map((segment) => {
                        const displayedPct = animateDonut ? segment.pct : 0;
                        return (
                          <circle
                            key={segment.name}
                            className="financial-donut-segment"
                            cx="60"
                            cy="60"
                            r="46"
                            pathLength={100}
                            stroke={segment.color}
                            strokeDasharray={`${displayedPct} ${100 - displayedPct}`}
                            strokeDashoffset={-segment.offset}
                            style={{ transitionDelay: `${segment.delayMs}ms` }}
                          />
                        );
                      })}
                    </svg>
                    <div className="financial-donut-core">
                      <span>{formatCurrency(totalDebt)}</span>
                      <small>Total debt</small>
                    </div>
                  </div>
                </div>
                <div className="financial-pie-legend" aria-label="Debt legend">
                  {debtPieData.map((d) => (
                    <div key={d.name} className="financial-legend-item">
                      <span className="financial-legend-dot" style={{ background: d.color }} aria-hidden="true" />
                      <span className="financial-legend-label">{d.name}</span>
                      <span className="financial-legend-value">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="financial-chart-empty-note">No debt values entered yet.</p>
            )}
          </div>
          <div className="financial-chart-wrap">
            <div className="financial-chart-title">Income vs expenses (monthly)</div>
            {incomeExpenseData.length > 0 ? (
              <div className="financial-metric-bars">
                {incomeExpenseData.map((item) => (
                  <div key={`income-expense-${item.name}`} className="financial-metric-bar-row">
                    <div className="financial-metric-bar-head">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                    <div className="financial-metric-bar-track">
                      <div
                        className="financial-metric-bar-fill"
                        style={{
                          width: `${Math.max(6, (item.value / incomeExpenseMax) * 100)}%`,
                          background: `linear-gradient(90deg, ${item.fill}, ${item.fill}dd)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="financial-chart-empty-note">Add monthly income and expenses to render this chart.</p>
            )}
          </div>
          <div className="financial-chart-wrap">
            <div className="financial-chart-title">Assets vs total debt (summary)</div>
            {assetDebtData.length > 0 ? (
              <div className="financial-metric-bars">
                {assetDebtData.map((item) => (
                  <div key={`asset-debt-${item.name}`} className="financial-metric-bar-row">
                    <div className="financial-metric-bar-head">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="financial-chart-empty-note">Add assets and debt totals to compare exposure.</p>
            )}
          </div>
        </div>
      )}
      <div className="financial-chart-schedule">
        <span className="financial-chart-schedule-label">Schedule completion</span>
        <div className="financial-chart-schedule-bar">
          <div
            className="financial-chart-schedule-fill"
            style={{ width: `${schedulePct}%` }}
          />
        </div>
        <span className="financial-chart-schedule-value">{scheduleReadyCount}/{scheduleTotalCount}</span>
      </div>
    </div>
  );
}
