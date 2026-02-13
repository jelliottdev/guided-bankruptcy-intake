/**
 * Creditor matrix card: intake + attorney-added creditors, add/edit/remove, copy worksheet.
 */
import type { CreditorRow } from '../../../attorney/creditorMatrix';
import type { AttorneyCreditorEntry } from '../dashboardShared';

export interface CreditorMatrixCardProps {
  creditorMatrix: CreditorRow[];
  attorneyCreditors: AttorneyCreditorEntry[];
  mergedCreditorMatrix: CreditorRow[];
  creditorCountByType: Record<string, number>;
  creditorFormOpen: boolean;
  creditorEditingId: string | null;
  creditorDraft: { name: string; type: CreditorRow['type']; balanceOrNote: string };
  onOpenAddCreditor: () => void;
  onOpenEditCreditor: (entry: AttorneyCreditorEntry) => void;
  onSaveCreditorDraft: () => void;
  onCancelCreditorForm: () => void;
  onRemoveAttorneyCreditor: (id: string) => void;
  onCreditorDraftChange: (draft: {
    name: string;
    type: CreditorRow['type'];
    balanceOrNote: string;
  }) => void;
  onCopyWorksheet: (text: string) => void;
  exportWorksheetText: string;
}

export function CreditorMatrixCard({
  creditorMatrix,
  attorneyCreditors,
  mergedCreditorMatrix,
  creditorCountByType,
  creditorFormOpen,
  creditorEditingId,
  creditorDraft,
  onOpenAddCreditor,
  onOpenEditCreditor,
  onSaveCreditorDraft,
  onCancelCreditorForm,
  onRemoveAttorneyCreditor,
  onCreditorDraftChange,
  onCopyWorksheet,
  exportWorksheetText,
}: CreditorMatrixCardProps) {
  const typeClass = (t: string) =>
    (t || '').toLowerCase().replace(' ', '-').replace('-signed', 'signed');

  return (
    <div className="dashboard-card creditor-export-card">
      <div className="creditor-matrix-header">
        <div className="dashboard-card-title">Creditor matrix</div>
        <button type="button" className="btn-creditor-add" onClick={onOpenAddCreditor}>
          Add creditor
        </button>
      </div>
      {mergedCreditorMatrix.length > 0 && (
        <div className="creditor-summary-tiles">
          <div className="creditor-tile">
            <span className="creditor-tile-label">Total</span>
            <span className="creditor-tile-value">{mergedCreditorMatrix.length}</span>
          </div>
          {(['Priority', 'Secured', 'Unsecured', 'Co-signed'] as const).map(
            (t) =>
              (creditorCountByType[t] ?? 0) > 0 && (
                <div
                  key={t}
                  className={`creditor-tile creditor-tile-${typeClass(t)}`}
                >
                  <span className="creditor-tile-label">{t}</span>
                  <span className="creditor-tile-value">{creditorCountByType[t] ?? 0}</span>
                </div>
              )
          )}
        </div>
      )}
      {creditorFormOpen && (
        <div className="creditor-entry-form">
          <input
            type="text"
            className="creditor-input-name"
            placeholder="Creditor name"
            value={creditorDraft.name}
            onChange={(e) =>
              onCreditorDraftChange({ ...creditorDraft, name: e.target.value })
            }
          />
          <select
            className="creditor-input-type"
            value={creditorDraft.type}
            onChange={(e) =>
              onCreditorDraftChange({
                ...creditorDraft,
                type: e.target.value as CreditorRow['type'],
              })
            }
          >
            <option value="Priority">Priority</option>
            <option value="Secured">Secured</option>
            <option value="Unsecured">Unsecured</option>
            <option value="Co-signed">Co-signed</option>
          </select>
          <input
            type="text"
            className="creditor-input-balance"
            placeholder="Balance or notes"
            value={creditorDraft.balanceOrNote}
            onChange={(e) =>
              onCreditorDraftChange({ ...creditorDraft, balanceOrNote: e.target.value })
            }
          />
          <div className="creditor-form-actions">
            <button
              type="button"
              className="btn-creditor-save"
              onClick={onSaveCreditorDraft}
            >
              {creditorEditingId ? 'Save' : 'Add'}
            </button>
            <button
              type="button"
              className="btn-creditor-cancel"
              onClick={onCancelCreditorForm}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {creditorMatrix.length > 0 && (
        <div className="creditor-matrix-section">
          <div className="creditor-section-label">From intake</div>
          <ul className="creditor-matrix-list compact">
            {creditorMatrix.slice(0, 8).map((row, i) => (
              <li
                key={`intake-${i}`}
                className={`creditor-row type-${typeClass(row.type || '')}`}
              >
                <span className="creditor-name">{row.name}</span>
                <span className="creditor-type">{row.type}</span>
                {row.balanceOrNote && (
                  <span className="creditor-balance">{row.balanceOrNote}</span>
                )}
              </li>
            ))}
          </ul>
          {creditorMatrix.length > 8 && (
            <p className="muted-inline">+{creditorMatrix.length - 8} more</p>
          )}
        </div>
      )}
      {attorneyCreditors.length > 0 && (
        <div className="creditor-matrix-section">
          <div className="creditor-section-label">Attorney-added</div>
          <ul className="creditor-matrix-list attorney-added">
            {attorneyCreditors.map((c) => (
              <li
                key={c.id}
                className={`creditor-row type-${typeClass(c.type || '')}`}
              >
                <span className="creditor-name">{c.name}</span>
                <span className="creditor-type">{c.type}</span>
                {c.balanceOrNote && (
                  <span className="creditor-balance">{c.balanceOrNote}</span>
                )}
                <span className="creditor-row-actions">
                  <button
                    type="button"
                    className="btn-creditor-inline"
                    onClick={() => onOpenEditCreditor(c)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-creditor-inline btn-creditor-remove"
                    onClick={() => onRemoveAttorneyCreditor(c.id)}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {mergedCreditorMatrix.length === 0 && !creditorFormOpen && (
        <p className="muted-inline">None yet. Add creditors above or complete intake.</p>
      )}
      <button
        type="button"
        className="btn-quick-action"
        onClick={() => onCopyWorksheet(exportWorksheetText)}
      >
        Copy worksheet
      </button>
    </div>
  );
}
