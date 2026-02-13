/**
 * Financial charts: debt breakdown (pie), asset vs debt (bar), income vs expenses (bar).
 * Uses attorney overlay numbers when available.
 */
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AttorneyFinancialEntry } from '../dashboardShared';
import { formatCurrency } from '../dashboardShared';

const DEBT_COLORS = { Secured: '#3b82f6', Priority: '#f59e0b', Unsecured: '#8b5cf6' };
const BAR_COLORS = { income: '#22c55e', expenses: '#ef4444', assets: '#3b82f6', debt: '#f59e0b' };

export interface FinancialChartsProps {
  attorneyFinancial: AttorneyFinancialEntry;
  scheduleCoverage: { schedule: string; status: string }[];
  onAddNumbers?: () => void;
}

export function FinancialCharts({
  attorneyFinancial,
  scheduleCoverage,
  onAddNumbers,
}: FinancialChartsProps) {
  const scheduleReadyCount = scheduleCoverage.filter((s) => s.status === 'Ready').length;
  const scheduleTotalCount = scheduleCoverage.length;
  const secured = attorneyFinancial.securedDebt ?? 0;
  const priority = attorneyFinancial.priorityDebt ?? 0;
  const unsecured = attorneyFinancial.unsecuredDebt ?? 0;
  const totalDebt = secured + priority + unsecured;
  const income = attorneyFinancial.monthlyIncome ?? 0;
  const expenses = attorneyFinancial.monthlyExpenses ?? 0;
  const assets = attorneyFinancial.assetTotal ?? 0;

  const debtPieData = [
    ...(secured > 0 ? [{ name: 'Secured', value: secured, color: DEBT_COLORS.Secured, shortLabel: 'Sec.' }] : []),
    ...(priority > 0 ? [{ name: 'Priority', value: priority, color: DEBT_COLORS.Priority, shortLabel: 'Pri.' }] : []),
    ...(unsecured > 0 ? [{ name: 'Unsecured', value: unsecured, color: DEBT_COLORS.Unsecured, shortLabel: 'Unsec.' }] : []),
  ];

  const assetDebtBarData = [
    { name: 'Assets', value: assets, fill: BAR_COLORS.assets },
    { name: 'Total debt', value: totalDebt, fill: BAR_COLORS.debt },
  ].filter((d) => d.value > 0);

  const incomeExpenseBarData = [
    { name: 'Income', value: income, fill: BAR_COLORS.income },
    { name: 'Expenses', value: expenses, fill: BAR_COLORS.expenses },
  ].filter((d) => d.value > 0);

  const hasCharts = debtPieData.length > 0 || assetDebtBarData.length > 0 || incomeExpenseBarData.length > 0;
  const schedulePct = scheduleTotalCount > 0 ? Math.round((scheduleReadyCount / scheduleTotalCount) * 100) : 0;

  return (
    <div className="dashboard-card financial-charts-card">
      <div className="dashboard-card-title">Financial charts</div>
      {!hasCharts ? (
        <div className="financial-charts-empty">
          <p className="financial-charts-empty-text">
            Add numbers in Financial signals to see debt and income charts.
          </p>
          {onAddNumbers && (
            <button type="button" className="btn btn-link" onClick={onAddNumbers}>
              Add numbers
            </button>
          )}
        </div>
      ) : (
        <div className="financial-charts-grid">
          {debtPieData.length > 0 && (
            <div className="financial-chart-wrap">
              <div className="financial-chart-title">Debt breakdown</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={debtPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={false}
                    labelLine={false}
                  >
                    {debtPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number | undefined) => formatCurrency(v ?? 0)}
                    contentStyle={{ background: 'rgba(17, 24, 39, 0.98)', border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 12 }}
                    itemStyle={{ color: 'rgba(226, 232, 240, 0.92)' }}
                    labelStyle={{ color: 'rgba(148, 163, 184, 0.75)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="financial-pie-legend" aria-label="Debt legend">
                {debtPieData.map((d) => (
                  <div key={d.name} className="financial-legend-item">
                    <span className="financial-legend-dot" style={{ background: d.color }} aria-hidden="true" />
                    <span className="financial-legend-label">{d.name}</span>
                    <span className="financial-legend-value">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {incomeExpenseBarData.length > 0 && (
            <div className="financial-chart-wrap">
              <div className="financial-chart-title">Income vs expenses (monthly)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={incomeExpenseBarData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number | undefined) => `$${v != null && v >= 1000 ? `${v / 1000}k` : v ?? 0}`} />
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                  <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {assetDebtBarData.length > 0 && (
            <div className="financial-chart-wrap">
              <div className="financial-chart-title">Assets vs total debt</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={assetDebtBarData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number | undefined) => `$${v != null && v >= 1000 ? `${v / 1000}k` : v ?? 0}`} />
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                  <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
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
