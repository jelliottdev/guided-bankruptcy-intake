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
  options?: FieldOption[];
  rows?: GridRow[];
  columns?: GridColumn[];
  /** Optional: show this field only when predicate is true */
  showIf?: (answers: Answers) => boolean;
}

export type Answers = Record<string, FieldValue>;

export type Uploads = Record<string, string[]>;

export interface Step {
  id: string;
  title: string;
  description?: string;
  fields: Field[];
  /** Step is included in wizard only when showIf returns true */
  showIf: (answers: Answers) => boolean;
}

export interface IntakeState {
  answers: Answers;
  uploads: Uploads;
  currentStepIndex: number;
  lastSavedAt: number | null;
  saving: boolean;
  submitted: boolean;
}

export interface ValidationError {
  stepIndex: number;
  stepId: string;
  fieldId: string;
  message: string;
}
