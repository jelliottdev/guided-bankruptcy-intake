/**
 * Schedule A/B validation: read form values from a filled 106A/B PDF and assert against gold.
 * Used by the backend validation loop (no UI). Same pattern as b101-validate.
 */
import { PDFDocument } from 'pdf-lib';
import type { ScheduleAData } from './scheduleA';
import type { ScheduleBData } from './scheduleB';
import { formatCurrency } from './calculations';

/** Read all form field values from a filled Schedule A/B PDF. Keys = field names. */
export async function readScheduleABFormValues(
  pdfBytes: Uint8Array
): Promise<Record<string, unknown>> {
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
        const cb = f as { isChecked(): boolean };
        result[name] = cb.isChecked();
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

function getValue(values: Record<string, unknown>, fieldName: string): unknown {
  return values[fieldName];
}

function normalizeCurrency(s: unknown): string {
  if (s == null) return '';
  const t = String(s).trim();
  if (!t) return '';
  return t.replace(/\s+/g, ' ');
}

export type ScheduleABAssertResult = {
  passed: string[];
  failed: Array<{ label: string; field: string; expected: string | boolean; actual: unknown }>;
};

/**
 * Assert filled Schedule A/B PDF against gold Schedule A + Schedule B data.
 * Returns passed/failed per check. "Perfect" when failed.length === 0.
 */
export async function assertScheduleABGold(
  pdfBytes: Uint8Array,
  goldA: ScheduleAData,
  goldB: ScheduleBData
): Promise<ScheduleABAssertResult> {
  const values = await readScheduleABFormValues(pdfBytes);
  const passed: string[] = [];
  const failed: ScheduleABAssertResult['failed'] = [];

  const expectText = (label: string, fieldName: string, expected: string) => {
    const actual = getValue(values, fieldName);
    const actualStr = actual != null ? String(actual).trim() : '';
    const expectedNorm = expected.trim();
    const actualNorm = actualStr;
    if (actualNorm === expectedNorm || normalizeCurrency(actual) === normalizeCurrency(expected)) {
      passed.push(label);
    } else {
      failed.push({ label, field: fieldName, expected: expectedNorm, actual: actual ?? '(missing)' });
    }
  };

  // Part 1: Real property (first property) – address line is street only; City/State/ZIP/County separate; undefined_2/undefined_3 for value
  const prop = goldA.properties[0];
  if (prop) {
    const addressLine = (prop.address.street || '').trim();
    expectText('Part 1 real property address (1 1)', '1 1', addressLine);
    expectText('Part 1 City', 'City', prop.address.city || '');
    expectText('Part 1 State', 'State', prop.address.state || '');
    expectText('Part 1 ZIP Code', 'ZIP Code', prop.address.zip || '');
    expectText('Part 1 County', 'County', prop.address.county || '');
    expectText('Part 1 real property value (undefined_2)', 'undefined_2', formatCurrency(prop.value));
    expectText('Part 1 real property value portion (undefined_3)', 'undefined_3', formatCurrency(prop.value));
  }

  // Part 2: Vehicles (first vehicle)
  const vehicle = goldB.vehicles[0];
  if (vehicle) {
    const desc = `${vehicle.year} ${vehicle.make} ${vehicle.model} \nVIN: ${vehicle.vin || 'N/A'}`;
    expectText('Part 2 vehicle description (3 1)', '3 1', desc);
    expectText('Part 2 vehicle value (3 4)', '3 4', formatCurrency(vehicle.value));
  }

  // Q16: Cash
  if (goldB.cashOnHand > 0) {
    expectText('Q16 Cash amount', '16 Cash amount', formatCurrency(goldB.cashOnHand));
  }

  // Q17: First two checking/savings accounts (seed has 3: 2 Checking, 1 Savings)
  const accounts = goldB.financialAccounts.filter(
    (a) => a.accountType === 'Checking' || a.accountType === 'Savings'
  );
  if (accounts.length >= 1) {
    expectText(
      'Q17.1 Checking account',
      '17.1 Checking account',
      accounts[0].description || ''
    );
    expectText(
      'Q17.1 Checking amount',
      '17.1 Checking amount',
      formatCurrency(accounts[0].value)
    );
  }
  if (accounts.length >= 2) {
    expectText(
      'Q17.2 Checking account',
      '17.2 Checking account',
      accounts[1].description || ''
    );
    expectText(
      'Q17.2 Checking amount',
      '17.2 Checking amount',
      formatCurrency(accounts[1].value)
    );
  }

  // Part 8: Totals – skipped until manifest identifies correct PDF field names (undefined_155/163 are wrong)
  // When total.real_estate and total.personal_property are mapped in scheduleABFieldMap, assert here.

  return { passed, failed };
}
