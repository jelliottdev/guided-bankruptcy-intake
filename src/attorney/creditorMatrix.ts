import type { Answers } from '../form/types';
import { hasAnySelectedExceptNone } from '../utils/logic';

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export interface CreditorRow {
  name: string;
  type: 'Secured' | 'Priority' | 'Unsecured' | 'Co-signed';
  balanceOrNote?: string;
}

/** Build creditor list from intake for matrix export */
export function buildCreditorMatrix(answers: Answers): CreditorRow[] {
  const rows: CreditorRow[] = [];

  // Priority debts
  const hasPriority = hasAnySelectedExceptNone(answers, 'priority_debts', 'None of the above');
  if (hasPriority && !isEmpty(answers['priority_debts_details'])) {
    const text = (answers['priority_debts_details'] as string).trim();
    text.split(/\n|;/).forEach((line) => {
      const t = line.trim();
      if (t) rows.push({ name: t.slice(0, 80), type: 'Priority', balanceOrNote: t.length > 80 ? t.slice(80) : undefined });
    });
  }
  if (hasPriority && rows.filter((r) => r.type === 'Priority').length === 0) {
    rows.push({ name: 'Priority debts (see details)', type: 'Priority' });
  }

  // Secured (other than real estate/vehicles — from other_secured_details)
  const hasSecured = hasAnySelectedExceptNone(answers, 'other_secured_debts', 'None of the above');
  if (hasSecured && !isEmpty(answers['other_secured_details'])) {
    const text = (answers['other_secured_details'] as string).trim();
    text.split(/\n|;/).forEach((line) => {
      const t = line.trim();
      if (t) rows.push({ name: t.slice(0, 80), type: 'Secured', balanceOrNote: t.length > 80 ? t.slice(80) : undefined });
    });
  }
  if (hasSecured && rows.filter((r) => r.type === 'Secured').length === 0) {
    rows.push({ name: 'Secured debts (see details)', type: 'Secured' });
  }

  // Co-signed
  if (answers['cosigner_debts'] === 'Yes' && !isEmpty(answers['cosigner_details'])) {
    const text = (answers['cosigner_details'] as string).trim();
    text.split(/\n|;/).forEach((line) => {
      const t = line.trim();
      if (t) rows.push({ name: t.slice(0, 80), type: 'Co-signed', balanceOrNote: t.length > 80 ? t.slice(80) : undefined });
    });
  }

  // Unsecured (from text area)
  if (!isEmpty(answers['unsecured_creditors'])) {
    const text = (answers['unsecured_creditors'] as string).trim();
    text.split(/\n|;/).forEach((line) => {
      const t = line.trim();
      if (t) rows.push({ name: t.slice(0, 80), type: 'Unsecured', balanceOrNote: t.length > 80 ? t.slice(80) : undefined });
    });
  }

  return rows;
}

/** Export as plain text worksheet from intake */
export function exportCreditorWorksheet(answers: Answers): string {
  const rows = buildCreditorMatrix(answers);
  return exportCreditorWorksheetFromRows(rows);
}

/** Export worksheet from any list of creditor rows (e.g. intake + attorney overlay) */
export function exportCreditorWorksheetFromRows(rows: CreditorRow[]): string {
  const lines = ['Creditor Worksheet', '', 'Creditor | Type | Balance/Notes', '---'];
  rows.forEach((r) => {
    lines.push(`${r.name} | ${r.type} | ${r.balanceOrNote ?? ''}`);
  });
  lines.push('', `Total: ${rows.length} entries`, `Exported: ${new Date().toISOString().slice(0, 10)}`);
  return lines.join('\n');
}
