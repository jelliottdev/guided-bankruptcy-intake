/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import Box from '@mui/joy/Box';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Tooltip from '@mui/joy/Tooltip';
import type { Field, FieldValue, Flags } from '../form/types';
import { MIN_FLAG_NOTE_LENGTH } from '../form/validate';
import { DocumentUploadWithOcr } from './fields/DocumentUploadWithOcr';
import { getOcrConfig } from '../config/documentOcrConfig';

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
  onResolveDocument?: (input: {
    fieldId: string;
    reason: string;
    detail: string;
    outcomeType: 'needs_review' | 'closed_with_exception';
  }) => void;
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
  onResolveDocument,
}: FieldRendererProps) {
  const shouldFocus = focusFieldId === field.id;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const flagged = !!(flags?.[field.id]?.flagged);
  const flagNote = (flags?.[field.id]?.note ?? '').toString();
  const flagNoteValid = flagNote.trim().length >= MIN_FLAG_NOTE_LENGTH;
  const [noteSavedFlash, setNoteSavedFlash] = useState(false);
  const [resolverOpen, setResolverOpen] = useState(false);
  const [resolverReason, setResolverReason] = useState('');
  const [resolverDetail, setResolverDetail] = useState('');
  useEffect(() => {
    if (!noteSavedFlash) return;
    const t = setTimeout(() => setNoteSavedFlash(false), 2000);
    return () => clearTimeout(t);
  }, [noteSavedFlash]);

  useEffect(() => {
    if (!shouldFocus) return;
    const t = setTimeout(() => onFocusDone?.(), 900);
    return () => clearTimeout(t);
  }, [shouldFocus, onFocusDone]);

  if (field.showIf && !field.showIf(answers)) return null;

  // DEBUG: Log every field being rendered
  console.log(`[FieldRenderer] Rendering field: ${field.id}, type: ${field.type}`);

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
        <label htmlFor={`${field.id}-flag-note`}>Note to your attorney (required only if you mark Can&apos;t answer)</label>
        <textarea
          id={`${field.id}-flag-note`}
          placeholder="Example: I don't have my SSN card right now. I will call the office tomorrow."
          value={flagNote}
          onChange={(e) => onSetFlagNote?.(field.id, e.target.value)}
          aria-describedby={`${field.id}-flag-helper`}
        />
        <p id={`${field.id}-flag-helper`} className="helper">
          Briefly explain why you can&apos;t answer yet or what you will provide later. This note satisfies the required field until resolved.
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
    <Tooltip
      title={
        <Box sx={{ maxWidth: 280, p: 0.5 }}>
          <Typography level="title-sm" sx={{ mb: 0.5, color: 'primary.200' }}>
            Why we ask
          </Typography>
          <Typography level="body-sm" textColor="common.white">
            {field.whyWeAsk}
          </Typography>
        </Box>
      }
      variant="solid"
      color="neutral"
      placement="right"
      arrow
      sx={{
        backdropFilter: 'blur(12px)',
        bgcolor: 'rgba(20, 20, 25, 0.85)',
        border: '1px solid',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        boxShadow: 'lg',
        zIndex: 1000,
        maxWidth: 320,
      }}
    >
      <span
        className="field-why-we-ask-icon"
        style={{ cursor: 'help', display: 'inline-flex', verticalAlign: 'middle', marginLeft: '0.35rem', color: 'var(--joy-palette-primary-500)' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </span>
    </Tooltip>
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
        <div id={`field-${field.id}`} className={wrapClass}>
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
        <div id={`field-${field.id}`} className={wrapClass}>
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
      // Phase 3: Tactile Cards for small option sets (e.g. Yes/No)
      if (field.options && field.options.length <= 4) {
        return (
          <div id={`field-${field.id}`} className={wrapClass}>
            {labelRow}
            <Box sx={{ display: 'grid', gridTemplateColumns: field.options.length > 2 ? '1fr 1fr' : '1fr 1fr', gap: 2, mb: 1 }}>
              {field.options.map((opt) => {
                const isSelected = (value as string) === opt.value;
                return (
                  <Sheet
                    key={opt.value}
                    variant="outlined"
                    onClick={() => onChange(opt.value)}
                    sx={{
                      p: 2,
                      borderRadius: 'lg',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid' : '1px solid',
                      borderColor: isSelected ? 'primary.500' : 'neutral.outlinedBorder',
                      bgcolor: isSelected ? 'primary.50' : 'background.surface',
                      boxShadow: isSelected ? 'sm' : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: isSelected ? 'primary.600' : 'neutral.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'md',
                      },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography fontWeight={isSelected ? 600 : 500} textColor={isSelected ? 'primary.700' : 'text.primary'}>
                      {opt.label}
                    </Typography>
                    {isSelected && (
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: 'primary.500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </Box>
                    )}
                  </Sheet>
                );
              })}
            </Box>
            {helper}
            {renderFlagNoteBox()}
            {err}
            {warn}
          </div>
        );
      }

      // Fallback for larger sets (standard radio list)
      return (
        <div id={`field-${field.id}`} className={wrapClass}>
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
        <div id={`field-${field.id}`} className={wrapClass}>
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
      // Phase 3: Tactile Choices for small option sets
      if (field.options && field.options.length <= 4) {
        return (
          <div id={`field-${field.id}`} className={wrapClass}>
            {labelRow}
            <Box sx={{ display: 'grid', gridTemplateColumns: field.options.length > 2 ? '1fr 1fr' : '1fr', gap: 2, mb: 2 }}>
              {field.options.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <Sheet
                    key={opt.value}
                    variant="outlined"
                    onClick={() => onChange(opt.value)}
                    sx={{
                      p: 2,
                      borderRadius: 'lg',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid' : '1px solid',
                      borderColor: isSelected ? 'primary.500' : 'neutral.outlinedBorder',
                      bgcolor: isSelected ? 'primary.50' : 'background.surface',
                      boxShadow: isSelected ? 'sm' : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: isSelected ? 'primary.600' : 'neutral.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'md',
                      },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography fontWeight={isSelected ? 600 : 500} textColor={isSelected ? 'primary.700' : 'text.primary'}>
                      {opt.label}
                    </Typography>
                    {isSelected && (
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: 'primary.500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </Box>
                    )}
                  </Sheet>
                );
              })}
            </Box>
            {helper}
            {renderFlagNoteBox()}
            {err}
            {warn}
          </div>
        );
      }

      // Fallback to standard Select
      return (
        <div id={`field-${field.id}`} className={wrapClass}>
          {labelRow}
          <Select
            variant="outlined"
            size="lg" // Larger touch target
            value={value as string | null}
            onChange={(_e, val) => onChange(val as string)}
            placeholder="Select one..."
            sx={{
              mb: 2,
              boxShadow: 'sm',
              '&:hover': {
                borderColor: 'primary.outlinedHoverBorder',
              },
            }}
          >
            {field.options?.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
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
        <div id={`field-${field.id}`} className={wrapClass}>
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
      console.log(`[FieldRenderer] ===== FILE CASE ENTERED ===== field.id: ${field.id}`);
      const dontHaveKey = `${field.id}_dont_have`;
      const dontHaveChecked = answers[dontHaveKey] === 'Yes';
      const showDontHave = field.dontHaveYetCheckbox !== false;
      const resolverValid = resolverReason.trim().length > 0;

      // For file uploads, check if OCR is configured
      // Field IDs in this component have format: "assignment-input-node-upload_paystubs"
      // But OCR config uses just: "upload_paystubs"
      // So we need to normalize by stripping the prefix
      const normalizedFieldId = field.id.replace(/^assignment-input-node-/, '');
      const ocrConfig = getOcrConfig(normalizedFieldId);
      console.log(`[FieldRenderer] File field: ${field.id} → normalized: ${normalizedFieldId} → ocrConfig: ${!!ocrConfig}`);

      // Handler for OCR extracted data
      const handleOcrData = (
        extractedData: Record<string, any>,
        confidence: number,
        ownership?: 'debtor' | 'spouse' | 'joint'
      ) => {
        console.log(`OCR extracted data for ${field.id}:`, extractedData, `(confidence: ${Math.round(confidence * 100)}%)`);

        if (!ocrConfig?.fieldMappings || !onSetAnswer) {
          return;
        }

        const mapping = ocrConfig.fieldMappings;

        for (const [ocrKey, fieldId] of Object.entries(mapping)) {
          if (extractedData[ocrKey] != null) {
            let targetFieldId = fieldId;

            // Ownership-aware routing: if ownership is known and field has debtor/spouse variants
            if (ownership) {
              // Check if this is a generic field that should route to debtor or spouse
              // Example: "employer" might route to "debtor_employer" or "spouse_employer"
              if (ownership === 'spouse' && !fieldId.includes('spouse')) {
                // Try to find spouse variant
                const spouseFieldId = fieldId.replace('debtor_', 'spouse_').replace(/^([^_]+)$/, 'spouse_$1');
                // Only update if the spouse field actually exists
                if (spouseFieldId !== fieldId) {
                  targetFieldId = spouseFieldId;
                }
              }
            }

            // Apply the value to the determined target field
            console.log(`  Mapping ${ocrKey} (${extractedData[ocrKey]}) → ${targetFieldId}${ownership ? ` [${ownership}]` : ''}`);
            onSetAnswer(targetFieldId, extractedData[ocrKey]);
          }
        }
      };

      const fileUploadContent = (
        <div id={`field-${field.id}`} className={`field-wrap field-wrap-file${flagged ? ' field-flagged' : ''}${shouldFocus ? ' field-highlight' : ''}`}>
          {labelRow}
          {field.uploadForTag && (
            <p className="upload-for-tag" aria-hidden>Upload for: {field.uploadForTag}</p>
          )}
          {helper && <p className="helper field-help">{field.helper}</p>}
          {field.examples && <p className="upload-examples">{field.examples}</p>}
          {field.examplesMini && field.examplesMini.length > 0 && (
            <p className="upload-examples">Examples: {field.examplesMini.join('; ')}</p>
          )}
          {field.acceptedAlternatives && field.acceptedAlternatives.length > 0 && (
            <p className="upload-alt">Accepted alternatives: {field.acceptedAlternatives.join(' or ')}</p>
          )}
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
          <div className="field-file">
            <label htmlFor={field.id} className="field-file-zone">
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
              <span className="field-file-zone-text">
                {uploads.length > 0
                  ? `${uploads.length} file${uploads.length !== 1 ? 's' : ''} chosen`
                  : 'Choose files'}
              </span>
            </label>
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
          {field.resolutionRequired && (
            <div className="upload-resolution-block">
              <button type="button" className="upload-resolution-btn" onClick={() => setResolverOpen((v) => !v)}>
                {resolverOpen ? 'Hide resolution options' : "Can't provide this?"}
              </button>
              {resolverOpen && (
                <div className="upload-resolution-form">
                  <label htmlFor={`${field.id}-resolver-reason`}>Reason</label>
                  <Select
                    id={`${field.id}-resolver-reason`}
                    value={resolverReason}
                    onChange={(_e, val) => setResolverReason(val as string)}
                    placeholder="Select reason..."
                    sx={{ mb: 1 }}
                  >
                    <Option value="document_not_available">I do not have this document</Option>
                    <Option value="submitted_alternative">I uploaded an alternative document</Option>
                    <Option value="needs_attorney_help">I need attorney help to obtain it</Option>
                  </Select>
                  <label htmlFor={`${field.id}-resolver-detail`}>Details (optional)</label>
                  <textarea
                    id={`${field.id}-resolver-detail`}
                    value={resolverDetail}
                    onChange={(e) => setResolverDetail(e.target.value)}
                    placeholder="Add any context for review."
                  />
                  <button
                    type="button"
                    className="upload-resolution-submit"
                    disabled={!resolverValid}
                    onClick={() => {
                      if (!resolverValid) return;
                      const outcomeType =
                        resolverReason === 'submitted_alternative' ? 'closed_with_exception' : 'needs_review';
                      onResolveDocument?.({
                        fieldId: field.id,
                        reason: resolverReason,
                        detail: resolverDetail.trim(),
                        outcomeType,
                      });
                      setResolverOpen(false);
                      setResolverReason('');
                      setResolverDetail('');
                    }}
                  >
                    Send for review
                  </button>
                </div>
              )}
            </div>
          )}
          {renderFlagNoteBox()}
          {err}
        </div>
      );

      // Wrap with OCR extraction if configured
      if (ocrConfig) {
        return (
          <DocumentUploadWithOcr
            fieldId={field.id}
            documentType={ocrConfig.documentType}
            caseAnswers={answers}
            onUpload={(fileNames) => {
              // Files uploaded after OCR processing
              console.log('[FieldRenderer] OCR complete, uploading:', fileNames);
              onUpload?.(field.id, fileNames);
            }}
            onExtractedData={(data, confidence, ownership) => {
              // Handle extracted data with ownership routing
              handleOcrData(data, confidence, ownership);
            }}
            renderContent={(inputProps, ocrState) => (
              <div id={`field-${field.id}`} className={`field-wrap field-wrap-file${flagged ? ' field-flagged' : ''}${shouldFocus ? ' field-highlight' : ''}`}>
                {labelRow}
                {field.uploadForTag && (
                  <p className="upload-for-tag" aria-hidden>Upload for: {field.uploadForTag}</p>
                )}
                {helper && <p className="helper field-help">{field.helper}</p>}
                {field.examples && <p className="upload-examples">{field.examples}</p>}
                {field.examplesMini && field.examplesMini.length > 0 && (
                  <p className="upload-examples">Examples: {field.examplesMini.join('; ')}</p>
                )}
                {field.acceptedAlternatives && field.acceptedAlternatives.length > 0 && (
                  <p className="upload-alt">Accepted alternatives: {field.acceptedAlternatives.join(' or ')}</p>
                )}
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
                <div className="field-file">
                  <label htmlFor={field.id} className="field-file-zone">
                    {/* OCR-enhanced file input */}
                    <input {...inputProps} />
                    <span className="field-file-zone-text">
                      {ocrState.extracting
                        ? '⏳ Processing with AI...'
                        : uploads.length > 0
                          ? `${uploads.length} file${uploads.length !== 1 ? 's' : ''} chosen`
                          : 'Choose files'}
                    </span>
                  </label>
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
                {field.resolutionRequired && (
                  <div className="upload-resolution-block">
                    <button type="button" className="upload-resolution-btn" onClick={() => setResolverOpen((v) => !v)}>
                      {resolverOpen ? 'Hide resolution options' : "Can't provide this?"}
                    </button>
                    {resolverOpen && (
                      <div className="upload-resolution-form">
                        <label htmlFor={`${field.id}-resolver-reason`}>Reason</label>
                        <Select
                          id={`${field.id}-resolver-reason`}
                          value={resolverReason}
                          onChange={(_e, val) => setResolverReason(val as string)}
                          placeholder="Select reason..."
                          sx={{ mb: 1 }}
                        >
                          <Option value="document_not_available">I do not have this document</Option>
                          <Option value="submitted_alternative">I uploaded an alternative document</Option>
                          <Option value="needs_attorney_help">I need attorney help to obtain it</Option>
                        </Select>
                        <label htmlFor={`${field.id}-resolver-detail`}>Details (optional)</label>
                        <textarea
                          id={`${field.id}-resolver-detail`}
                          value={resolverDetail}
                          onChange={(e) => setResolverDetail(e.target.value)}
                          placeholder="Add any context for review."
                        />
                        <button
                          type="button"
                          className="upload-resolution-submit"
                          disabled={!resolverValid}
                          onClick={() => {
                            if (!resolverValid) return;
                            const outcomeType =
                              resolverReason === 'submitted_alternative' ? 'closed_with_exception' : 'needs_review';
                            onResolveDocument?.({
                              fieldId: field.id,
                              reason: resolverReason,
                              detail: resolverDetail.trim(),
                              outcomeType,
                            });
                            setResolverOpen(false);
                            setResolverReason('');
                            setResolverDetail('');
                          }}
                        >
                          Send for review
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {renderFlagNoteBox()}
                {err}
              </div>
            )}
            autoFill={ocrConfig.autoExtract}
            confidenceThreshold={ocrConfig.confidenceThreshold}
          />
        );
      }

      return fileUploadContent;
    }
    default:
      return null;
  }
}
