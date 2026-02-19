/**
 * Dashboard header: case status, next best action, AI summary.
 */
import type { ReactNode } from 'react';
import type { NextAction } from './CaseHeader.types';
import { lastSavedText } from './dashboardShared';

export interface CaseHeaderProps {
  aiSummaryCard: ReactNode;
  caseStatus: { label: string; color: string; className?: string };
  readinessScore: number;
  missingCount: number;
  docReceived: number;
  docTotal: number;
  primaryBlockers: string[];
  nextBestActionSingle: { action: string; title: string };
  nextBestActions: NextAction[];
  missingRequiredCount: number;
  missingDocsCount: number;
  flaggedAndUrgencyCount: number;
  docRequestMessage: string;
  lastSavedAt: number | null;
  copyToast: 'Copied' | 'Copy failed' | null;
  onScrollToActionQueue: () => void;
  onScrollToFlags: () => void;
  onCopy: (text: string) => void;
  onCopyExportBundle: () => void;
  onCopyCaseSnapshot: () => void;
  onReset: () => void;
  onToggleClientView: () => void;
}

export function CaseHeader({
  aiSummaryCard,
  caseStatus,
  readinessScore,
  missingCount,
  docReceived,
  docTotal,
  primaryBlockers,
  nextBestActionSingle,
  nextBestActions,
  missingRequiredCount,
  missingDocsCount,
  flaggedAndUrgencyCount,
  docRequestMessage,
  lastSavedAt,
  copyToast,
  onScrollToActionQueue,
  onScrollToFlags,
  onCopy,
  onCopyExportBundle,
  onCopyCaseSnapshot,
  onReset,
  onToggleClientView,
}: CaseHeaderProps) {
  const handleNextActionClick = () => {
    if (nextBestActionSingle.action === 'openActionQueue') onScrollToActionQueue();
    else if (nextBestActionSingle.action === 'copyDocRequest') onCopy(docRequestMessage);
    else if (nextBestActionSingle.action === 'openFlags') onScrollToFlags();
    else onScrollToActionQueue();
  };

  const nextActionCtaLabel =
    nextBestActionSingle.action === 'openActionQueue'
      ? 'Open Action Queue'
      : nextBestActionSingle.action === 'copyDocRequest'
        ? 'Request missing docs'
        : nextBestActionSingle.action === 'openFlags'
          ? 'Jump to Flags'
          : 'Open Action Queue';

  return (
    <>
      <header className="attorney-header-bar">
        <div className="attorney-header-left">
          <h1 className="attorney-title">Attorney View</h1>
          <span className="attorney-subtitle">Case Intake Snapshot</span>
        </div>
        <div className="attorney-header-right">
          <span className="attorney-meta">{lastSavedText(lastSavedAt)}</span>
          <span className="header-action-group">
            <button
              type="button"
              className="btn-header btn-header-group"
              onClick={onCopyExportBundle}
              title="Copy answers + uploads JSON"
            >
              Copy
            </button>
            <button
              type="button"
              className="btn-header btn-header-group btn-export-snapshot"
              onClick={onCopyCaseSnapshot}
              title="Copy full case snapshot (answers, uploads, flags) for export or backup"
            >
              Export Case Snapshot
            </button>
            <button type="button" className="btn-header btn-header-group" onClick={onReset}>
              Reset
            </button>
          </span>
          <button
            type="button"
            className="btn-header modeToggle on"
            onClick={onToggleClientView}
            aria-label="Toggle Client View"
          >
            <span className="pill">
              <span className="knob" />
            </span>
            View as Client
          </button>
          {copyToast && (
            <span
              className={`attorney-toast ${copyToast === 'Copy failed' ? 'attorney-toast-error' : ''}`}
            >
              {copyToast}
            </span>
          )}
        </div>
      </header>

      <div className="dashboard-header-grid">
        <div
          className="dashboard-card case-status-card"
          role="status"
          style={{ borderColor: caseStatus.color }}
        >
          <div className="dashboard-card-title">Case status</div>
          <div className="case-status-oneline" style={{ color: caseStatus.color }}>
            {caseStatus.label} — {readinessScore}% · {missingCount} missing · {docReceived}/{docTotal}{' '}
            docs
          </div>
          {primaryBlockers.length > 0 && (
            <div className="case-status-blockers-inline">{primaryBlockers.join(', ')}</div>
          )}
        </div>
        <div className="dashboard-card next-best-action-card">
          <div className="dashboard-card-title">Next best action</div>
          {nextBestActionSingle.action === 'openSummary' && nextBestActions.length === 0 ? (
            <p className="next-action-empty">No blocking actions. Review checklist or case note.</p>
          ) : (
            <>
              <div className="next-action-title">{nextBestActionSingle.title}</div>
              <div className="next-action-reason">
                {nextBestActionSingle.action === 'openActionQueue' &&
                  `${missingRequiredCount} required fields are missing (blocks filing).`}
                {nextBestActionSingle.action === 'copyDocRequest' &&
                  `${missingDocsCount} document categories are missing.`}
                {nextBestActionSingle.action === 'openFlags' &&
                  `${flaggedAndUrgencyCount} items were flagged by the client.`}
                {nextBestActionSingle.action === 'openSummary' &&
                  'Review intake and strategy signals.'}
              </div>
              <button type="button" className="btn-next-action-cta" onClick={handleNextActionClick}>
                {nextActionCtaLabel}
              </button>
            </>
          )}
        </div>
        {aiSummaryCard}
      </div>
    </>
  );
}
