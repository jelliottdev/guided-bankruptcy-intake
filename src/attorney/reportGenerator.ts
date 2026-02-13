/**
 * Formatted report generator: filing checklist, client summary, follow-up letter, document request.
 * Outputs HTML for print or plain text for copy.
 */

export interface ReportInputs {
  primaryBlockers: string[];
  clientMustProvide: string[];
  attorneyMustConfirm: string[];
  missingSchedules: string[];
  filingChecklistText: string;
  clientSummaryLines: string[];
  followUpQuestions: string[];
  docRequestLines: string[];
  debtorName?: string;
  caseStatus: string;
}

/** Generate HTML document for printing. */
function htmlDoc(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 24px auto; padding: 0 16px; line-height: 1.5; }
    h1 { font-size: 1.25rem; margin-bottom: 16px; }
    ul { padding-left: 1.5rem; }
    .check-item { margin: 6px 0; }
    .section { margin-top: 20px; }
    .section-title { font-weight: 600; margin-bottom: 8px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${body}
  <p style="margin-top: 24px; font-size: 0.875rem; color: #666;">Generated ${new Date().toLocaleString()} — Guided Bankruptcy Intake</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Filing checklist as HTML (print-friendly). */
export function generateFilingChecklistHtml(input: ReportInputs): string {
  const blocks: string[] = [];
  if (input.primaryBlockers.length > 0) {
    blocks.push(`
      <div class="section">
        <div class="section-title">Blockers</div>
        <ul>${input.primaryBlockers.map((b) => `<li class="check-item">☐ ${escapeHtml(b)}</li>`).join('')}</ul>
      </div>`);
  }
  if (input.clientMustProvide.length > 0) {
    blocks.push(`
      <div class="section">
        <div class="section-title">Client must provide</div>
        <ul>${input.clientMustProvide.map((d) => `<li class="check-item">☐ ${escapeHtml(d)}</li>`).join('')}</ul>
      </div>`);
  }
  if (input.missingSchedules.length > 0) {
    blocks.push(`
      <div class="section">
        <div class="section-title">Missing schedules</div>
        <ul>${input.missingSchedules.map((s) => `<li class="check-item">☐ ${escapeHtml(s)}</li>`).join('')}</ul>
      </div>`);
  }
  if (input.attorneyMustConfirm.length > 0) {
    blocks.push(`
      <div class="section">
        <div class="section-title">Attorney to confirm</div>
        <ul>${input.attorneyMustConfirm.map((c) => `<li class="check-item">☐ ${escapeHtml(c)}</li>`).join('')}</ul>
      </div>`);
  }
  return htmlDoc('Filing Checklist', blocks.join('') || '<p>No items.</p>');
}

/** Client intake summary (one-pager) as HTML. */
export function generateClientSummaryHtml(input: ReportInputs): string {
  const lines = input.clientSummaryLines.length > 0
    ? input.clientSummaryLines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')
    : '<p>No summary data.</p>';
  const title = input.debtorName ? `Intake Summary — ${input.debtorName}` : 'Intake Summary';
  return htmlDoc(title, `<p><strong>Status:</strong> ${escapeHtml(input.caseStatus)}</p>${lines}`);
}

/** Follow-up letter as HTML. */
export function generateFollowUpLetterHtml(input: ReportInputs): string {
  const greeting = input.debtorName ? `Dear ${input.debtorName},` : 'Dear Client,';
  const list =
    input.followUpQuestions.length > 0
      ? `<ul>${input.followUpQuestions.map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ul>`
      : '<p>No follow-up questions at this time.</p>';
  const body = `
    <p>${escapeHtml(greeting)}</p>
    <p>Please provide the following information or documents to move your case forward:</p>
    ${list}
    <p>Thank you,<br/>Legal Team</p>`;
  return htmlDoc('Follow-Up Request', body);
}

/** Document request letter as HTML. */
export function generateDocumentRequestHtml(input: ReportInputs): string {
  const greeting = input.debtorName ? `Dear ${input.debtorName},` : 'Dear Client,';
  const list =
    input.docRequestLines.length > 0
      ? `<ul>${input.docRequestLines.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`
      : '<p>No documents requested at this time.</p>';
  const body = `
    <p>${escapeHtml(greeting)}</p>
    <p>Please upload or provide the following documents:</p>
    ${list}
    <p>If any item is unavailable, please note that in the intake and add a brief explanation.</p>
    <p>Thank you,<br/>Legal Team</p>`;
  return htmlDoc('Document Request', body);
}

/** Open print dialog with the given HTML content. */
export function printHtml(html: string): void {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 250);
}
