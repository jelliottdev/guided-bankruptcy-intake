/**
 * Form registry: single dispatch for generating and validating court forms.
 * Each form has: template path, filler, and optional validator.
 * Add new forms by registering here and adding mapping + spec + filler following FORM_SPEC_APPROACH.md.
 */
import type { CaseCanonical } from '../types';
import { generateB101 } from '../export/b101';
import { generateScheduleAB } from '../export/scheduleAB';
import type { AssertResult } from '../export/b101-validate';
import { assertB101Gold } from '../export/b101-validate';

export type FormId = 'b101' | 'schedule-ab';

export interface FormRegistration {
  formId: FormId;
  /** Template path relative to public/ (e.g. forms/b101.pdf). */
  templatePath: string;
  /** Human-readable label for UI. */
  label: string;
  /** Generate filled PDF from canonical + template buffer. */
  generate: (data: CaseCanonical, templateBuffer: ArrayBuffer) => Promise<Uint8Array>;
  /** Optional: assert filled PDF against gold canonical (for tests). */
  assertGold?: (pdfBytes: Uint8Array, gold: CaseCanonical) => Promise<AssertResult>;
}

const REGISTRY: FormRegistration[] = [
  {
    formId: 'b101',
    templatePath: 'forms/b101.pdf',
    label: 'Form 101 (Voluntary Petition)',
    generate: generateB101,
    assertGold: assertB101Gold,
  },
  {
    formId: 'schedule-ab',
    templatePath: 'forms/form_b106ab.pdf',
    label: 'Schedule A/B (Property)',
    generate: generateScheduleAB,
  },
];

const BY_ID = new Map<FormId, FormRegistration>(REGISTRY.map((r) => [r.formId, r]));

/** All registered form IDs. */
export function getRegisteredFormIds(): FormId[] {
  return REGISTRY.map((r) => r.formId);
}

/**
 * Form IDs that apply to this case (by chapter and options).
 * Today: all registered forms apply to all cases; when B108 (Ch 7), 122A (Ch 7), 122C (Ch 13) are added, filter by data.filing.chapter.
 */
export function getApplicableFormIds(data: CaseCanonical): FormId[] {
  const chapter = data.filing?.chapter ?? '7';
  const registered = getRegisteredFormIds();
  // When we add formId 'b108' | 'b122a-1' | 'b122c-1': include b108 and b122a-1 only when chapter === '7'; b122c-1 only when chapter === '13'.
  return registered.filter((formId) => {
    if (formId === 'b101' || formId === 'schedule-ab') return true;
    return true;
  });
}

export interface PacketEntry {
  formId: FormId;
  label: string;
  pdfBytes: Uint8Array;
}

/**
 * Generate a full packet: all forms that apply to the case.
 * Caller must provide a way to load template buffers (e.g. from public/ or a CDN).
 */
export async function generatePacket(
  data: CaseCanonical,
  loadTemplate: (formId: FormId) => Promise<ArrayBuffer>
): Promise<PacketEntry[]> {
  const formIds = getApplicableFormIds(data);
  const results: PacketEntry[] = [];
  for (const formId of formIds) {
    const reg = BY_ID.get(formId);
    if (!reg) continue;
    const templateBuffer = await loadTemplate(formId);
    const pdfBytes = await reg.generate(data, templateBuffer);
    results.push({ formId, label: reg.label, pdfBytes });
  }
  return results;
}

/** Get registration for a form. */
export function getFormRegistration(formId: FormId): FormRegistration | undefined {
  return BY_ID.get(formId);
}

/**
 * Generate a filled form PDF. Caller must fetch the template (e.g. from templatePath).
 * @param formId Registered form id
 * @param data Canonical case data
 * @param templateBuffer ArrayBuffer of the blank PDF template
 */
export async function generateForm(
  formId: FormId,
  data: CaseCanonical,
  templateBuffer: ArrayBuffer
): Promise<Uint8Array> {
  const reg = BY_ID.get(formId);
  if (!reg) throw new Error(`Unknown form: ${formId}`);
  return reg.generate(data, templateBuffer);
}

/**
 * Assert filled PDF against gold canonical (only for forms that have assertGold).
 */
export async function assertFormGold(
  formId: FormId,
  pdfBytes: Uint8Array,
  gold: CaseCanonical
): Promise<AssertResult> {
  const reg = BY_ID.get(formId);
  if (!reg?.assertGold) throw new Error(`Form ${formId} has no validator`);
  return reg.assertGold(pdfBytes, gold);
}
