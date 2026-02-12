import { useEffect, useRef } from 'react';
import type { Field, FieldValue } from '../form/types';

interface FieldRendererProps {
  field: Field;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
  onUpload?: (fieldId: string, filenames: string[]) => void;
  uploads?: string[];
  error?: string;
  answers: Record<string, FieldValue>;
  focusFieldId?: string | null;
  onFocusDone?: () => void;
}

export function FieldRenderer({
  field,
  value,
  onChange,
  onUpload,
  uploads = [],
  error,
  answers,
  focusFieldId,
  onFocusDone,
}: FieldRendererProps) {
  const shouldFocus = focusFieldId === field.id;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      inputRef.current.focus();
      onFocusDone?.();
    }
  }, [shouldFocus, onFocusDone]);

  if (field.showIf && !field.showIf(answers)) return null;

  // Single source of truth: labels are plain text; required marker comes only from the renderer (one place).
  // Strip ALL asterisk-like chars (ASCII * and Unicode variants) so we never double up.
  const rawLabel = String(field.label).trim();
  const displayLabel = rawLabel
    .replace(/[\*\u2217\u204E\u2055\uFF0A]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const label = (
    <label id={`${field.id}-label`} htmlFor={field.id}>
      {displayLabel}
      {field.required && <span className="req" aria-hidden="true"> *</span>}
    </label>
  );

  const helper = field.helper ? <p className="helper">{field.helper}</p> : null;
  const err = error ? <p className="error">{error}</p> : null;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'date': {
      const v = (value as string) ?? '';
      return (
        <div className="field-wrap">
          {label}
          <input
            ref={shouldFocus ? (inputRef as React.RefObject<HTMLInputElement>) : undefined}
            id={field.id}
            type={field.type}
            value={v}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
          />
          {helper}
          {err}
        </div>
      );
    }
    case 'textarea':
      return (
        <div className="field-wrap">
          {label}
          <textarea
            ref={shouldFocus ? (inputRef as React.RefObject<HTMLTextAreaElement>) : undefined}
            id={field.id}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
          />
          {helper}
          {err}
        </div>
      );
    case 'radio':
      return (
        <div className="field-wrap">
          {label}
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
          {err}
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
        <div className="field-wrap">
          {label}
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
          {err}
        </div>
      );
    }
    case 'select': {
      const v = (value as string) ?? '';
      return (
        <div className="field-wrap">
          {label}
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
          {err}
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
        <div className="field-wrap">
          {label}
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
                {rows.map((row, rowIdx) => (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    {columns.map((col, colIdx) => (
                      <td key={col.id}>
                        <input
                          type="radio"
                          id={rowIdx === 0 && colIdx === 0 ? field.id : undefined}
                          name={`${field.id}_${row.id}`}
                          value={col.id}
                          checked={gridVal[row.id] === col.id}
                          onChange={() => onChange({ ...gridVal, [row.id]: col.id })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {helper}
          {err}
        </div>
      );
    }
    case 'file':
      return (
        <div className="field-wrap">
          {label}
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
              <ul>
                {uploads.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
          </div>
          {helper}
          {err}
        </div>
      );
    default:
      return null;
  }
}
