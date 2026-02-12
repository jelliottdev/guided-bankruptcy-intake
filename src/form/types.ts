/** Field value: string, array (checkbox), or record (grid row -> column) */
export type FieldValue = string | string[] | Record<string, string>;

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'date'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'grid'
  | 'file';

export interface FieldOption {
  value: string;
  label: string;
  /** Option id for "None of the above" behavior */
  noneOfAbove?: boolean;
}

export interface GridRow {
  id: string;
  label: string;
}

export interface GridColumn {
  id: string;
  label: string;
}

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  helper?: string;
  /** Placeholder for text/email inputs (e.g. (555) 555-5555, name@email.com) */
  placeholder?: string;
  /** One-line "Why we ask" text for sensitive fields; shown as tooltip/link */
  whyWeAsk?: string;
  /** Start of a logical cluster; adds extra spacing above this field */
  groupStart?: boolean;
  options?: FieldOption[];
  rows?: GridRow[];
  columns?: GridColumn[];
  /** Optional: show this field only when predicate is true */
  showIf?: (answers: Answers) => boolean;
  /** File upload UX: tag shown above upload box (e.g. "Upload for: Bank Accounts") */
  uploadForTag?: string;
  /** File upload: example file types/sources line */
  examples?: string;
  /** File upload: "Do not upload" hint */
  doNotUpload?: string;
  /** File upload: date range reminder (e.g. "Last 6 months") */
  dateRangeRequested?: string;
  /** File upload: bullet list of requested doc types */
  requestedDocsList?: string[];
  /** File upload: show "I don't have this yet" checkbox (default true) */
  dontHaveYetCheckbox?: boolean;
  /** File upload: small caption under upload box (e.g. "Applies to: Checking, Savings") */
  uploadAppliesTo?: string;
}

export interface Step {
  id: string;
  title: string;
  description?: string;
  /** One-line reassurance under header (e.g. "If you're unsure, enter your best estimate.") */
  reassurance?: string;
  /** Shown at top of step when present (e.g. global document upload instructions) */
  uploadInstructions?: string;
  fields: Field[];
  showIf: (answers: Answers) => boolean;
}

export type Answers = Record<string, FieldValue>;

export type Uploads = Record<string, string[]>;

/** Per-field "can't answer right now" + note; resolved = moved to audit trail. */
export interface FlagEntry {
  flagged: boolean;
  note: string;
  resolved?: boolean;
}

export type Flags = Record<string, FlagEntry>;

export type ViewMode = 'client' | 'attorney';

export interface IntakeState {
  answers: Answers;
  uploads: Uploads;
  flags: Flags;
  currentStepIndex: number;
  lastSavedAt: number | null;
  saving: boolean;
  submitted: boolean;
  viewMode: ViewMode;
}

export interface ValidationError {
  stepIndex: number;
  stepId: string;
  fieldId: string;
  message: string;
  /** When 'warning', does not block Next/submit (e.g. soft numeric hint). */
  severity?: 'error' | 'warning';
}
