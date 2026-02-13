/**
 * AI summary card: generate/regenerate summary, copy to notes.
 */
export interface AISummaryCardProps {
  aiSummary: string;
  aiSummaryCooldownRemaining: number;
  caseNoteText: string;
  onGenerate: () => void;
  onCopyToNotes: (text: string) => void;
}

export function AISummaryCard({
  aiSummary,
  aiSummaryCooldownRemaining,
  caseNoteText,
  onGenerate,
  onCopyToNotes,
}: AISummaryCardProps) {
  return (
    <div className="dashboard-card ai-summary-card">
      <div className="dashboard-card-title">AI summary</div>
      {aiSummary ? (
        <>
          <p className="ai-summary-memo">{aiSummary}</p>
          <div className="ai-summary-actions-row">
            <button type="button" className="btn-ai-summary" onClick={() => onCopyToNotes(caseNoteText)}>
              Copy to notes
            </button>
            <button
              type="button"
              className="btn-ai-summary"
              onClick={onGenerate}
              disabled={aiSummaryCooldownRemaining > 0}
              title={
                aiSummaryCooldownRemaining > 0
                  ? `Available in ${aiSummaryCooldownRemaining}s`
                  : 'Regenerate summary (available every 10s)'
              }
            >
              {aiSummaryCooldownRemaining > 0
                ? `Regenerate (${aiSummaryCooldownRemaining}s)`
                : 'Regenerate'}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn-ai-summary" onClick={onGenerate}>
          Generate summary
        </button>
      )}
    </div>
  );
}
