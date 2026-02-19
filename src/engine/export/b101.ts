/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFDocument, PDFName } from 'pdf-lib';
import { CaseCanonical } from '../types';
import { B101_FIELD_MAP } from '../mapping/b101';
import { B101_MULTI_KID_SPEC } from './b101-multi-kid-spec';

/**
 * Generates a filled Form B101 PDF using Canonical Data.
 * @param data The canonical case data
 * @param templateBuffer ArrayBuffer of the blank PDF template
 * @returns Uint8Array of the filled PDF
 */
export async function generateB101(
    data: CaseCanonical,
    templateBuffer: ArrayBuffer
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const form = pdfDoc.getForm();

    const namesToTry = (m: (typeof B101_FIELD_MAP)[0]) =>
        m.pdfFieldNames?.length ? m.pdfFieldNames : [m.pdfFieldName];

    for (const mapping of B101_FIELD_MAP) {
        const value = resolvePath(data, mapping.canonicalPath);

        if (value === undefined || value === null) {
            continue;
        }
        if (mapping.type === 'text' && value === '') {
            continue;
        }

        let set = false;
        for (const name of namesToTry(mapping)) {
            try {
                if (mapping.type === 'text') {
                    const textVal = formatTextValue(value, mapping.transform);
                    if (textVal === '') break;
                    form.getTextField(name).setText(textVal);
                    set = true;
                } else if (mapping.type === 'checkbox') {
                    const shouldUncheck = mapping.uncheckWhen && mapping.uncheckWhen(value);
                    if (shouldUncheck) {
                        form.getCheckBox(name).uncheck();
                        set = true;
                    } else if (mapping.condition && mapping.condition(value)) {
                        form.getCheckBox(name).check();
                        set = true;
                    } else if (value === true) {
                        form.getCheckBox(name).check();
                        set = true;
                    }
                } else if (mapping.type === 'checkboxValue') {
                    if (mapping.condition && mapping.condition(value) && typeof value === 'string') {
                        const valuesToTry = value === '500001-1000000'
                            ? ['$500,001-$1 million', '$500,001\u2013$1 million', value]
                            : [value];
                        for (const v of valuesToTry) {
                            try {
                                setCheckBoxValue(form, name, v);
                                set = true;
                                break;
                            } catch {
                                continue;
                            }
                        }
                    }
                } else if (mapping.type === 'dropdown') {
                    form.getDropdown(name).select(String(value));
                    set = true;
                }
            } catch {
                continue;
            }
            if (set) break;
        }
        if (!set && (mapping.type === 'checkbox' || mapping.type === 'checkboxValue') && mapping.condition?.(value) && !mapping.uncheckWhen?.(value)) {
            console.warn(`Checkbox not found for: ${mapping.label}`, namesToTry(mapping));
        }
    }

    // Multi-kid checkboxes: spec-driven (see b101-multi-kid-spec.ts)
    try {
        if (data.filing?.chapter) {
            setMultiKidBySpec(form, 'Check Box1', data.filing.chapter);
        }
        if (data.filing?.feePayment === 'installments') {
            setMultiKidBySpec(form, 'Check Box7', 'Pay in installments');
        }
        if (data.filing?.chapter && data.filing.chapter !== '11') {
            setMultiKidBySpec(form, 'Check Box14', 'Not filing under Chapter 11');
        }
        if (data.filing?.chapter === '7') {
            setMultiKidBySpec(form, 'Check Box20', 'Yes');
        } else if (data.filing?.chapter) {
            setMultiKidBySpec(form, 'Check Box20', 'No');
        }
        if (data.reporting?.estimatedAssets === '500001-1000000') {
            setMultiKidBySpec(form, 'Check Box22', '500001-1000000');
        }
        if (data.reporting?.estimatedLiabilities === '500001-1000000') {
            setMultiKidBySpec(form, 'Check Box23', '500001-1000000');
        }
        const proSe = data.proSe?.debtor1;
        setMultiKidBySpec(form, 'Check Box24', proSe?.awareOfConsequences !== false ? 'Yes' : 'No');
        setMultiKidBySpec(form, 'Check Box25', proSe?.awareOfFraudRisks !== false ? 'Yes' : 'No');
        setMultiKidBySpec(form, 'Check Box26', proSe?.paidNonAttorneyPreparer === true ? 'Yes' : 'No');
    } catch {
        // Non-fatal: template may differ from spec
    }

    return pdfDoc.save();
}

/** Dict-like view for pdf-lib field/widget (get/set/context). */
interface DictLike {
    get?: (n: PDFName) => unknown;
    set?: (k: PDFName, v: unknown) => void;
    context?: { lookup: (ref: unknown) => DictLike };
    dict?: DictLike;
}

/**
 * Set a multi-kid checkbox from spec only: look up kidIndex + rawKey, set parent V and each kid AS.
 * Iterates exactly kidCount times (e.g. 3 for CB7, 12 for CB22). No runtime AP/N inspection.
 */
function setMultiKidBySpec(
    form: ReturnType<PDFDocument['getForm']>,
    fieldName: string,
    canonicalValue: string
): void {
    const spec = B101_MULTI_KID_SPEC[fieldName];
    if (!spec) return;
    const option = spec.options.find((o) => o.value === canonicalValue);
    if (!option) return;
    const { kidCount } = spec;
    const { kidIndex, rawKey, kidIndices } = option;
    const indicesToSet = kidIndices ?? [kidIndex];

    const cb = form.getCheckBox(fieldName) as unknown as { acroField: { dict: DictLike } };
    const fieldDict = cb?.acroField?.dict;
    if (!fieldDict?.get || !fieldDict.context) return;
    const ctx = fieldDict.context;
    const kids = fieldDict.get(PDFName.of('Kids')) as { get: (i: number) => unknown } | undefined;
    if (!kids || typeof kids.get !== 'function') return;

    const setDict = (d: DictLike, key: string, val: string) => {
        try {
            if (typeof d.set === 'function') d.set(PDFName.of(key), PDFName.of(val));
        } catch {
            // skip invalid name
        }
    };
    setDict(fieldDict, 'V', rawKey);
    for (let j = 0; j < kidCount; j++) {
        try {
            const kidRef = kids.get(j);
            const widget = ctx.lookup(kidRef) as DictLike;
            const w = widget?.dict ?? widget;
            if (w?.set) {
                const as = indicesToSet.includes(j) ? rawKey : 'Off';
                setDict(w, 'AS', as);
            }
        } catch {
            // skip
        }
    }
}

/**
 * Set a checkbox field's value to a string (e.g. /500001-1000000 for B101 assets/liabilities).
 * Uses the AcroForm widget's setValue so the field stores the range string like Check Box21's /1-49.
 * Caller should catch: PDFName.of() may throw for invalid chars; then try next value.
 */
function setCheckBoxValue(form: ReturnType<PDFDocument['getForm']>, name: string, value: string): void {
    const cb = form.getCheckBox(name) as unknown as { acroField: { setValue: (v: PDFName) => void }; markAsDirty?: () => void };
    if (cb.acroField && typeof cb.acroField.setValue === 'function') {
        cb.acroField.setValue(PDFName.of(value));
        cb.markAsDirty?.();
    }
}

/**
 * Resolve dot-notation path (supports array indices, e.g. filing.priorBankruptcies.0.district).
 */
function resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
        return prev != null ? prev[curr] : undefined;
    }, obj);
}

/**
 * Format value for PDF text field: string, name object, date, or signature.
 */
function formatTextValue(value: unknown, transform?: string): string {
    if (value == null) return '';
    const isNameObj = typeof value === 'object' && value !== null && 'first' in value && 'last' in value;
    if (transform === 'signature' && isNameObj) {
        const n = value as { first?: string; middle?: string; last?: string; suffix?: string };
        const parts = [n.first, n.middle, n.last].filter(Boolean) as string[];
        const full = parts.join(' ').trim();
        return full ? `/s/ ${full}` : '';
    }
    if (transform === 'fullName' || isNameObj) {
        const n = value as { first?: string; middle?: string; last?: string; suffix?: string };
        const parts = [n.first, n.middle, n.last].filter(Boolean) as string[];
        const full = parts.join(' ').trim();
        const suffix = (n.suffix ?? '').toString().trim();
        return suffix ? `${full} ${suffix}`.trim() : full;
    }
    if (transform === 'formatDate' && (typeof value === 'string' || value instanceof Date)) {
        const s = typeof value === 'string' ? value : value.toISOString();
        const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const [, yyyy, mm, dd] = match;
            return `${mm}/${dd}/${yyyy}`;
        }
        const d = typeof value === 'string' ? new Date(value) : value;
        if (!Number.isNaN(d.getTime())) {
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${mm}/${dd}/${yyyy}`;
        }
    }
    return String(value).trim();
}
