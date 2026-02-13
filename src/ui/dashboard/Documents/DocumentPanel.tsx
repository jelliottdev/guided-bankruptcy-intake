/**
 * Document sufficiency panel: list of document types with status and copy request.
 */
import { useState } from 'react';
import { DOCUMENT_IDS } from '../dashboardShared';

export type DocSufficiencyRow = {
  type: string;
  status: string;
  coverageRule: string;
};

export interface DocumentPanelProps {
  documentSufficiency: DocSufficiencyRow[];
  uploads: Record<string, string[]>;
  onCopyRequest: (text: string) => void;
  /** Full smart request text for "Copy all requests" */
  fullDocRequestText?: string;
}

function DocRow({
  doc,
  onCopyRequest,
}: {
  doc: {
    key: string;
    label: string;
    need: string;
    examples: string[];
    files: { name: string; uploadedAt?: string }[];
  };
  onCopyRequest: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const missing = doc.files.length === 0;
  const requestText =
    `Please upload: ${doc.label}\n` +
    `Needed: ${doc.need}\n` +
    (doc.examples.length ? `Examples:\n${doc.examples.map((e) => `• ${e}`).join('\n')}\n` : '');

  return (
    <div className="doc-row">
      <div
        className="doc-row-head"
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
      >
        <div className="doc-category">{doc.label}</div>
        <div className={`doc-status ${missing ? 'missing' : ''}`}>
          {missing ? 'Missing' : 'Received'}
        </div>
        <div className="doc-count">{doc.files.length} file(s)</div>
        <button
          type="button"
          className="btn btn-secondary btn-doc-copy"
          onClick={(e) => {
            e.stopPropagation();
            onCopyRequest(requestText);
          }}
        >
          Copy request
        </button>
      </div>
      {open ? (
        <div className="doc-details">
          <div className="doc-need">
            <strong>Needed:</strong> {doc.need}
          </div>
          {doc.examples.length ? (
            <ul className="doc-examples">
              {doc.examples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          ) : null}
          {doc.files.length ? (
            <ul className="doc-filenames">
              {doc.files.map((f, i) => (
                <li key={i}>
                  {f.name}
                  {f.uploadedAt ? ` — ${f.uploadedAt}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <div className="doc-empty">No files uploaded yet.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function DocumentPanel({
  documentSufficiency,
  uploads,
  onCopyRequest,
  fullDocRequestText,
}: DocumentPanelProps) {
  const received = documentSufficiency.filter((d) => d.status === 'OK' || d.status === 'Waived').length;
  const total = documentSufficiency.length;
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;

  return (
    <div id="documents" className="dashboard-card doc-sufficiency-card">
      <div className="dashboard-card-title">Document sufficiency</div>
      <div className="doc-panel-progress">
        <span className="doc-panel-progress-label">{received} of {total} received</span>
        <div className="doc-panel-progress-bar">
          <div className="doc-panel-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {fullDocRequestText && fullDocRequestText.trim() && (
        <button
          type="button"
          className="btn-doc-copy-all"
          onClick={() => onCopyRequest(fullDocRequestText!)}
        >
          Copy all document requests
        </button>
      )}
      <div className="doc-rows">
        {documentSufficiency.map((d) => {
          const docId = DOCUMENT_IDS.find((x) => x.label === d.type)?.id ?? d.type;
          const files = (uploads[docId] ?? []).map((name) => ({ name }));
          const examples: string[] =
            docId === 'upload_paystubs'
              ? ['Paystubs: last 60 days, all employers']
              : docId === 'upload_bank_statements'
                ? ['Bank statements: 2–3 months']
                : docId === 'upload_tax_returns'
                  ? ['Tax returns: last 2 years']
                  : [];
          return (
            <DocRow
              key={d.type}
              doc={{
                key: docId,
                label: d.type,
                need: d.coverageRule,
                examples,
                files,
              }}
              onCopyRequest={onCopyRequest}
            />
          );
        })}
      </div>
    </div>
  );
}
