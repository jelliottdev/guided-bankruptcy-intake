/**
 * B101 validation: read form values from a filled PDF and assert against gold.
 * Used by the backend validation loop (no UI).
 */
import { PDFDocument, PDFName } from 'pdf-lib';
import type { CaseCanonical } from '../types';
import { WALLACE_DEMO_ATTORNEY } from '../../attorney/attorneyProfile';

function decodePdfKey(s: string): string {
  return s.replace(/#20/g, ' ').replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((prev: unknown, curr: string) => {
    return prev != null && typeof prev === 'object' && curr in (prev as object)
      ? (prev as Record<string, unknown>)[curr]
      : undefined;
  }, obj);
}

function formatDateForGold(value: unknown): string {
  if (value == null) return '';
  const s = typeof value === 'string' ? value : (value as Date).toISOString?.() ?? String(value);
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${mm}/${dd}/${yyyy}`;
  }
  return String(value).trim();
}

function fullNameFromGold(obj: unknown): string {
  if (obj == null || typeof obj !== 'object') return '';
  const n = obj as { first?: string; middle?: string; last?: string; suffix?: string };
  const parts = [n.first, n.middle, n.last].filter(Boolean) as string[];
  const full = parts.join(' ').trim();
  const suffix = (n.suffix ?? '').toString().trim();
  return suffix ? `${full} ${suffix}`.trim() : full;
}


/** Read all form field values from a filled B101 PDF. Keys = field names. */
export async function readB101FormValues(pdfBytes: Uint8Array): Promise<Record<string, unknown>> {
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();
  const fields = form.getFields();
  const result: Record<string, unknown> = {};

  for (const f of fields) {
    const name = f.getName();
    const type = f.constructor.name;
    try {
      if (type === 'PDFTextField') {
        result[name] = (f as { getText(): string }).getText()?.trim() ?? '';
      } else if (type === 'PDFCheckBox') {
        const cb = f as { isChecked(): boolean; acroField?: { dict?: { get?(n: unknown): unknown } } };
        result[name] = cb.isChecked();
        const dict = cb.acroField?.dict;
        if (dict?.get) {
          try {
            const v = dict.get(PDFName.of('V'));
            const as = dict.get(PDFName.of('AS'));
            if (v != null) result[`${name}.V`] = decodePdfKey(String(v));
            if (as != null) result[`${name}.AS`] = decodePdfKey(String(as));
          } catch {
            // ignore
          }
        }
      } else if (type === 'PDFDropdown') {
        const sel = (f as { getSelected(): string[] }).getSelected?.();
        result[name] = sel?.length ? sel.join(', ') : '';
      }
    } catch {
      result[name] = undefined;
    }
  }
  return result;
}

/** Try to get value for a field by name or alternate names. */
function getValue(values: Record<string, unknown>, fieldNames: string[]): { value: unknown; field: string } | null {
  for (const name of fieldNames) {
    if (name in values && values[name] !== undefined) return { value: values[name], field: name };
    const vKey = `${name}.V`;
    const asKey = `${name}.AS`;
    if (vKey in values && values[vKey] !== undefined) return { value: values[vKey], field: vKey };
    if (asKey in values && values[asKey] !== undefined) return { value: values[asKey], field: asKey };
  }
  return null;
}

export type AssertResult = {
  passed: string[];
  failed: Array<{ label: string; field: string; expected: string | boolean; actual: unknown }>;
};

/** Assert filled B101 PDF against gold canonical. Returns passed/failed per check. */
export async function assertB101Gold(pdfBytes: Uint8Array, gold: CaseCanonical): Promise<AssertResult> {
  const values = await readB101FormValues(pdfBytes);
  const passed: string[] = [];
  const failed: AssertResult['failed'] = [];

  const expectText = (label: string, fieldNames: string[], expected: string) => {
    const got = getValue(values, fieldNames);
    const actual = got?.value != null ? String(got.value).trim() : undefined;
    if (actual === expected || (expected !== '' && actual === expected)) {
      passed.push(label);
    } else {
      failed.push({ label, field: got?.field ?? fieldNames[0], expected, actual: got?.value ?? '(missing)' });
    }
  };

  const expectChecked = (label: string, fieldNames: string[], wantChecked: boolean) => {
    const got = getValue(values, fieldNames);
    const actual = got?.value === true || got?.value === 'checked';
    if (actual === wantChecked) {
      passed.push(label);
    } else {
      failed.push({ label, field: got?.field ?? fieldNames[0], expected: wantChecked, actual: got?.value });
    }
  };

  const expectCheckboxValue = (label: string, fieldNames: string[], expectedValues: string[]) => {
    const got = getValue(values, fieldNames);
    let actual = got?.value != null ? String(got.value).trim() : '';
    if (actual.startsWith('/')) actual = actual.slice(1);
    actual = decodePdfKey(actual);
    const match = expectedValues.some((exp) => actual === exp || actual === decodePdfKey(exp));
    if (match) {
      passed.push(label);
    } else {
      failed.push({ label, field: got?.field ?? fieldNames[0], expected: expectedValues[0], actual: got?.value });
    }
  };

  // Chapter 13 (header / Q7): template uses Check Box1 multi-kid with value "Chapter 13", or legacy Check Box2/4
  const ch1Val = getValue(values, ['Check Box1.V', 'Check Box1.AS', 'Check Box1'])?.value;
  const ch13Checked =
    (typeof ch1Val === 'string' && (ch1Val.includes('Chapter 13') || decodePdfKey(ch1Val).includes('Chapter 13'))) ||
    getValue(values, ['Check Box4'])?.value === true ||
    getValue(values, ['Check Box2'])?.value === true;
  if (ch13Checked) {
    passed.push('Chapter 13 (header/Q7)');
  } else {
    failed.push({
      label: 'Chapter 13 (header/Q7)',
      field: 'Check Box1.V or Check Box2/4',
      expected: true,
      actual: ch1Val ?? false,
    });
  }

  // Fee: Pay in installments (multi-kid Check Box7; value is in .V or .AS)
  expectCheckboxValue('Fee: Pay in installments', ['Check Box7.AS', 'Check Box7.V', 'Check Box7'], ['Pay in installments', 'Pay#20in#20installments']);

  // Consumer debt Yes
  expectChecked('Consumer debt Yes (Check Box18)', ['Check Box18'], true);

  // Assets range (value may be in .V or .AS)
  expectCheckboxValue(
    'Assets 500001-1000000',
    ['Check Box22.V', 'Check Box22.AS', 'Check Box22', 'Check Box20.V', 'Check Box20'],
    ['500001-1000000', '$500,001-$1 million', '$500,001–$1 million']
  );

  // Liabilities range
  expectCheckboxValue(
    'Liabilities 500001-1000000',
    ['Check Box23.V', 'Check Box23.AS', 'Check Box23', 'Check Box22.V', 'Check Box22'],
    ['500001-1000000', '$500,001-$1 million', '$500,001–$1 million']
  );

  // Debtor 1 name
  const debtor1Name = fullNameFromGold(gold.debtor1?.name);
  expectText('Debtor 1 name', ['Debtor1.Name'], debtor1Name);

  // Debtor 1 date signed
  const debtor1Date = formatDateForGold(gold.debtor1SignatureDate);
  expectText('Debtor 1 date signed', ['Debtor1.Date signed', 'Executed on', 'Date signed'], debtor1Date);

  // Attorney
  if (gold.attorney) {
    expectText('Attorney printed name', ['Attorney.Printed name', 'Debtor1.Attorney', 'Printed name'], gold.attorney.name);
    expectText('Attorney firm', ['Attorney.Firm name', 'Debtor1.Firm name', 'Firm name'], gold.attorney.firmName);
    const attorneyDate = formatDateForGold(gold.attorney.signatureDate);
    expectText('Attorney date signed', ['Attorney.Date signed', 'Date signed'], attorneyDate);
    expectText('Attorney bar number', ['Attorney.Bar number', 'Bar number'], gold.attorney.barNumber);
  } else {
    // Gold always has attorney from fixture; use WALLACE_DEMO_ATTORNEY for expected
    expectText('Attorney printed name', ['Attorney.Printed name', 'Debtor1.Attorney', 'Printed name'], WALLACE_DEMO_ATTORNEY.name);
    expectText('Attorney firm', ['Attorney.Firm name', 'Debtor1.Firm name', 'Firm name'], WALLACE_DEMO_ATTORNEY.firmName);
    expectText('Attorney date signed', ['Attorney.Date signed', 'Date signed'], '11/26/2025');
    expectText('Attorney bar number', ['Attorney.Bar number', 'Bar number'], WALLACE_DEMO_ATTORNEY.barNumber);
  }

  // Venue / district
  const district = (resolvePath(gold as unknown as Record<string, unknown>, 'filing.district') as string) || '';
  if (district) expectText('Bankruptcy district', ['Bankruptcy District Information'], district);

  return { passed, failed };
}
