/**
 * Export panel: print filing checklist, client summary, follow-up letter, document request.
 */
import {
  generateFilingChecklistHtml,
  generateClientSummaryHtml,
  generateFollowUpLetterHtml,
  generateDocumentRequestHtml,
  printHtml,
} from '../../../attorney/reportGenerator';

export interface ExportPanelProps {
  primaryBlockers: string[];
  filingChecklist: { clientMustProvide: string[]; attorneyMustConfirm: string[] };
  missingSchedules: string[];
  clientSummaryLines: string[];
  followUpQuestions: string[];
  docRequestLines: string[];
  debtorName?: string;
  caseStatus: string;
}

export function ExportPanel({
  primaryBlockers,
  filingChecklist,
  missingSchedules,
  clientSummaryLines,
  followUpQuestions,
  docRequestLines,
  debtorName,
  caseStatus,
}: ExportPanelProps) {
  const inputs = {
    primaryBlockers,
    clientMustProvide: filingChecklist.clientMustProvide,
    attorneyMustConfirm: filingChecklist.attorneyMustConfirm,
    missingSchedules,
    filingChecklistText: '',
    clientSummaryLines,
    followUpQuestions,
    docRequestLines,
    debtorName,
    caseStatus,
  };

  return (
    <div className="dashboard-card export-panel-card">
      <div className="dashboard-card-title">Reports</div>
      <p className="export-panel-desc">Print formatted reports for filing or client communication.</p>
      <div className="export-panel-buttons">
        <button
          type="button"
          className="btn-export-report"
          onClick={() => printHtml(generateFilingChecklistHtml(inputs))}
        >
          Print filing checklist
        </button>
        <button
          type="button"
          className="btn-export-report"
          onClick={() => printHtml(generateClientSummaryHtml(inputs))}
        >
          Print client summary
        </button>
        <button
          type="button"
          className="btn-export-report"
          onClick={() => printHtml(generateFollowUpLetterHtml(inputs))}
        >
          Print follow-up letter
        </button>
        <button
          type="button"
          className="btn-export-report"
          onClick={() => printHtml(generateDocumentRequestHtml(inputs))}
        >
          Print document request
        </button>
      </div>
    </div>
  );
}
