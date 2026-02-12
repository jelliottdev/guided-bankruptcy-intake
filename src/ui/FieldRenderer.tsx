import { useEffect, useRef, useState } from 'react';
import type { Field, FieldValue, Flags } from '../form/types';
import { MIN_FLAG_NOTE_LENGTH } from '../form/validate';

interface FieldRendererProps {
  field: Field;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
  onUpload?: (fieldId: string, filenames: string[]) => void;
  onRemoveUpload?: (fieldId: string, filename: string) => void;
  uploads?: string[];
  error?: string;
  /** Inline hint (does not block Next); e.g. format warnings */
  warning?: string;
  answers: Record<string, FieldValue>;
  flags?: Flags;
  focusFieldId?: string | null;
  onFocusDone?: () => void;
  /** For file fields: set auxiliary answers (e.g. fieldId_dont_have) */
  onSetAnswer?: (fieldId: string, value: FieldValue) => void;
  onSetFlag?: (fieldId: string, flagged: boolean) => void;
  onSetFlagNote?: (fieldId: string, note: string) => void;
}

export function FieldRenderer({
  field,
  value,
  onChange,
  onUpload,
  onRemoveUpload,
  uploads = [],
  error,
  warning,
  answers,
  flags,
  focusFieldId,
  onFocusDone,
  onSetAnswer,
  onSetFlag,
  onSetFlagNote,
}: FieldRendererProps) {
  const shouldFocus = focusFieldId === field.id;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const flagged = !!(flags?.[field.id]?.flagged);
  const flagNote = (flags?.[field.id]?.note ?? '').toString();
  const flagNoteValid = flagNote.trim().length >= MIN_FLAG_NOTE_LENGTH;
  const [noteSavedFlash, setNoteSavedFlash] = useState(false);
  useEffect(() => {
    if (!noteSavedFlash) return;
    const t = setTimeout(() => setNoteSavedFlash(false), 2000);
    return () => clearTimeout(t);
  }, [noteSavedFlash]);

  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      inputRef.current.focus();
      const t = setTimeout(() => onFocusDone?.(), 2000);
      return () => clearTimeout(t);
    }
  }, [shouldFocus, onFocusDone]);

  if (field.showIf && !field.showIf(answers)) return null;

  const renderFlagButton = () => {
    if (!field.required || !onSetFlag) return null;
    return (
      <button
        type="button"
        className={`field-cant-answer${flagged ? ' field-cant-answer-flagged' : ''}`}
        onClick={() => onSetFlag(field.id, !flagged)}
        aria-pressed={flagged}
        aria-label="Can't answer right now"
        title="Can't answer right now"
      >
        <svg className="field-cant-answer-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="5" y1="22" x2="5" y2="2" />
          <path d="M5 2v8l9-4-9-4z" />
        </svg>
      </button>
    );
  };

  const renderFlagNoteBox = () => {
    if (!flagged || !field.required || !onSetFlag) return null;
    return (
      <div className="field-flag-note-box">
        <label htmlFor={`${field.id}-flag-note`}>Note to your attorney (required)</label>
        <textarea
          id={`${field.id}-flag-note`}
          placeholder="Example: I don't have my SSN card right now. I will call the office tomorrow."
          value={flagNote}
          onChange={(e) => onSetFlagNote?.(field.id, e.target.value)}
          aria-describedby={`${field.id}-flag-helper`}
        />
        <p id={`${field.id}-flag-helper`} className="helper">
          Briefly explain why you can&apos;t answer yet or what you will provide later.
        </p>
        <div className="field-flag-actions">
          <button
            type="button"
            className="field-flag-save-btn"
            disabled={!flagNoteValid}
            onClick={() => flagNoteValid && setNoteSavedFlash(true)}
          >
            Save note for attorney
          </button>
          {noteSavedFlash && <span className="field-flag-saved">Saved</span>}
          {flagNoteValid && !noteSavedFlash && (
            <span className="field-flag-will-see">Your attorney will see this note.</span>
          )}
        </div>
        <p className="field-flag-reassurance">This won&apos;t stop your intake — it just alerts your attorney.</p>
      </div>
    );
  };

  // Single source of truth: labels are plain text; required marker comes only from the renderer (one place).
  // Strip ALL asterisk-like chars (ASCII * and Unicode variants) so we never double up.
  const rawLabel = String(field.label).trim();
  const displayLabel = rawLabel
    .replace(/[*\u2217\u204E\u2055\uFF0A]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const whyWeAskIcon = field.whyWeAsk ? (
    <span className="field-why-we-ask-icon" title={field.whyWeAsk} aria-label="Why we ask this">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    </span>
  ) : null;

  const label = (
    <label id={`${field.id}-label`} htmlFor={field.id} className={whyWeAskIcon ? 'field-label-with-hint' : ''}>
      {displayLabel}
      {whyWeAskIcon}
      {field.required && <span className="req" aria-hidden="true"> *</span>}
    </label>
  );

  const labelRow = (
    <div className="field-label-row">
      {label}
      {renderFlagButton()}
    </div>
  );

  const helper = field.helper ? <p className="helper">{field.helper}</p> : null;
  const err = error ? <p className="error">{error}</p> : null;
  const warn = warning ? <p className="field-warning" role="status">{warning}</p> : null;
  const wrapClass = `field-wrap${flagged ? ' field-flagged' : ''}${shouldFocus ? ' field-highlight' : ''}${field.groupStart ? ' field-group-start' : ''}`;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'date': {
      const v = (value as string) ?? '';
      const isSsnLast4 = field.id === 'debtor_ssn_last4' || field.id === 'spouse_ssn_last4';
      const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let next = e.target.value;
        if (isSsnLast4) next = next.replace(/\D/g, '').slice(0, 4);
        onChange(next);
      };
      return (
        <div className={wrapClass}>
          {labelRow}
          <input
            ref={shouldFocus ? (inputRef as React.RefObject<HTMLInputElement>) : undefined}
            id={field.id}
            type={field.type}
            value={v}
            onChange={handleTextChange}
            placeholder={field.placeholder}
            inputMode={isSsnLast4 ? 'numeric' : undefined}
            maxLength={isSsnLast4 ? 4 : undefined}
            aria-invalid={!!error}
          />
          {helper}
          {renderFlagNoteBox()}
          {err}
          {warn}
        </div>
      );
    }
    case 'textarea':
      return (
        <div className={wrapClass}>
          {labelRow}
          <textarea
            ref={shouldFocus ? (inputRef as React.RefObject<HTMLTextAreaElement>) : undefined}
            id={field.id}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            aria-invalid={!!error}
          />
          {helper}
          {renderFlagNoteBox()}
          {err}
          {warn}
        </div>
      );
    case 'radio':
      return (
        <div className={wrapClass}>
          {labelRow}
          <div className="field-radio" role="radiogroup" aria-labelledby={`${field.id}-label`}>
            {field.options?.map((opt, idx) => (
              <label key={opt.value} htmlFor={idx === 0 ? field.id : undefined}>
                <input
                  ref={shouldFocus && idx === 0 ? (inputRef as React.RefObject<HTMLInputElement>) : undefined}
                  type="radio"
                  id={idx === 0 ? field.id : undefined}
                  name={field.id}
                  value={opt.value}
                  checked={(value as string) === opt.value}
                  onChange={() => onChange(opt.value)}
                  aria-invalid={!!error}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {helper}
          {renderFlagNoteBox()}
          {err}
          {warn}
        </div>
      );
    case 'checkbox': {
      const arr = (Array.isArray(value) ? value : []) as string[];
      const handleChange = (optValue: string, checked: boolean) => {
        if (field.options?.find((o) => o.value === optValue)?.noneOfAbove && checked) {
          onChange([optValue]);
          return;
        }
        if (checked) {
          const withoutNone = arr.filter((v) => !field.options?.find((o) => o.value === v)?.noneOfAbove);
          onChange([...withoutNone, optValue]);
        } else {
          onChange(arr.filter((v) => v !== optValue));
        }
      };
      return (
        <div className={wrapClass}>
          {labelRow}
          <div className="field-checkbox" role="group" aria-labelledby={`${field.id}-label`}>
            {field.options?.map((opt, idx) => (
              <label key={opt.value} htmlFor={idx === 0 ? field.id : undefined}>
                <input
                  type="checkbox"
                  id={idx === 0 ? field.id : undefined}
                  value={opt.value}
                  checked={arr.includes(opt.value)}
                  onChange={(e) => handleChange(opt.value, e.target.checked)}
                  aria-invalid={!!error}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {helper}
          {renderFlagNoteBox()}
          {err}
          {warn}
        </div>
      );
    }
    case 'select': {
      const v = (value as string) ?? '';
      return (
        <div className={wrapClass}>
          {labelRow}
          <select
            ref={shouldFocus ? (inputRef as React.RefObject<HTMLSelectElement>) : undefined}
            id={field.id}
            value={v}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {helper}
          {renderFlagNoteBox()}
          {err}
          {warn}
        </div>
      );
    }
    case 'grid': {
      const gridVal = (typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : {}) as Record<string, string>;
      const rows = field.rows ?? [];
      const columns = field.columns ?? [];
      return (
        <div className={wrapClass}>
          {labelRow}
          <div className="field-grid">
            <table>
              <thead>
                <tr>
                  <th></th>
                  {columns.map((col) => (
                    <th key={col.id}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    {columns.map((col) => {
                      const cellId = `${field.id}_${row.id}_${col.id}`;
                      return (
                        <td key={col.id} data-label={col.label}>
                          <label htmlFor={cellId} className="field-grid-cell-label">
                            <input
                              type="radio"
                              id={cellId}
                              name={`${field.id}_${row.id}`}
                              value={col.id}
                              checked={gridVal[row.id] === col.id}
                              onChange={() => onChange({ ...gridVal, [row.id]: col.id })}
                              aria-label={`${row.label}: ${col.label}`}
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {helper}
          {renderFlagNoteBox()}
          {err}
          {warn}
        </div>
      );
    }
    case 'file': {
      const dontHaveKey = `${field.id}_dont_have`;
      const dontHaveChecked = answers[dontHaveKey] === 'Yes';
      const showDontHave = field.dontHaveYetCheckbox !== false;
      return (
        <div className={`field-wrap field-wrap-file${flagged ? ' field-flagged' : ''}${shouldFocus ? ' field-highlight' : ''}`}>
          {labelRow}
          {field.uploadForTag && (
            <p className="upload-for-tag" aria-hidden>Upload for: {field.uploadForTag}</p>
          )}
          {helper && <p className="helper">{field.helper}</p>}
          {field.examples && <p className="upload-examples">{field.examples}</p>}
          {field.doNotUpload && <p className="upload-do-not">{field.doNotUpload}</p>}
          {field.dateRangeRequested && (
            <p className="upload-date-range">Date range requested: {field.dateRangeRequested}</p>
          )}
          {field.requestedDocsList && field.requestedDocsList.length > 0 && (
            <ul className="upload-requested-list">
              {field.requestedDocsList.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          <p className="helper field-file-demo">Demo: stores filenames only. No file is uploaded.</p>
          <div className="field-file">
            <input
              type="file"
              id={field.id}
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (files && onUpload) {
                  const names = Array.from(files).map((f) => f.name);
                  onUpload(field.id, names);
                }
                e.target.value = '';
              }}
            />
            {uploads.length > 0 && (
              <div className="upload-selected-block">
                <p className="upload-selected-label">Selected files:</p>
                <ul className="upload-list">
                  {uploads.map((name) => (
                    <li key={name}>
                      <span>• {name}</span>
                      {onRemoveUpload && (
                        <button
                          type="button"
                          className="upload-remove"
                          onClick={() => onRemoveUpload(field.id, name)}
                          aria-label={`Remove ${name}`}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {field.uploadAppliesTo && <p className="upload-applies-to">{field.uploadAppliesTo}</p>}
          {showDontHave && (
            <label className="upload-dont-have">
              <input
                type="checkbox"
                checked={dontHaveChecked}
                onChange={(e) => onSetAnswer?.(dontHaveKey, e.target.checked ? 'Yes' : '')}
                aria-describedby={field.id}
              />
              I don&apos;t have this yet — will provide later
            </label>
          )}
          {renderFlagNoteBox()}
          {err}
        </div>
      );
    }
    default:
      return null;
  }
}
