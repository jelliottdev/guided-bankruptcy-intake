import { z } from 'zod';
import type { Answers } from '../form/types';
import { v4 as uuidv4 } from 'uuid';
import {
    type CaseCanonicalType,
    Debtor,
    CaseFiling,
    CreditCounseling,
    Reporting,
    PriorBankruptcy,
    AliasName,
} from './types';
import { mapAssetsToScheduleB } from '../export/scheduleB';
import { mapRealEstateToScheduleA } from '../export/scheduleA';

// ---------------------------------------------------------------------------
// buildCanonical — single merge point for UI and tests (plan: scalable form system)
// ---------------------------------------------------------------------------

/** Attorney input for buildCanonical (e.g. from loadAttorneyProfile() + signature date). */
export interface BuildCanonicalAttorneyInput {
    name: string;
    firmName: string;
    address: { street1: string; city: string; state: string; zip: string };
    phone: string;
    email: string;
    barNumber: string;
    barState: string;
    /** ISO date string; used for attorney signature and default for debtor dates. */
    signatureDate?: string;
}

/** Optional overrides when building canonical (e.g. attorney-set chapter or fee). */
export interface CaseBuildOverrides {
    filing?: Partial<CaseCanonicalType['filing']>;
    reporting?: Partial<CaseCanonicalType['reporting']>;
    debtor1SignatureDate?: string;
    debtor2SignatureDate?: string;
}

/**
 * Single merge point: build canonical from answers + optional attorney + optional overrides.
 * Use in UI (answers + profile) and in tests (seed answers + WALLACE_DEMO_ATTORNEY).
 * No form-specific patches; same canonical drives all forms.
 */
export function buildCanonical(
    answers: Answers,
    attorney?: BuildCanonicalAttorneyInput | null,
    caseOverrides?: CaseBuildOverrides | null
): CaseCanonicalType {
    const canonical = intakeToCanonical(answers);

    const now = new Date().toISOString();
    const filingDateRaw = answers['filing_date'] ?? answers['signature_date'];
    const signatureDateIso =
        typeof filingDateRaw === 'string' && String(filingDateRaw).trim()
            ? (() => {
                  const d = new Date(String(filingDateRaw).trim());
                  return Number.isNaN(d.getTime()) ? now : d.toISOString();
              })()
            : now;
    const debtor1Date = attorney?.signatureDate ?? signatureDateIso;
    const debtor2Date = attorney?.signatureDate ?? signatureDateIso;

    let out: CaseCanonicalType = {
        ...canonical,
        debtor1SignatureDate: canonical.debtor1SignatureDate ?? debtor1Date,
        ...(canonical.debtor2 && {
            debtor2SignatureDate: canonical.debtor2SignatureDate ?? debtor2Date,
        }),
    };

    if (attorney) {
        out = {
            ...out,
            attorney: {
                name: attorney.name || 'Attorney',
                firmName: attorney.firmName ?? '',
                address: {
                    street1: attorney.address?.street1 ?? '',
                    city: attorney.address?.city ?? '',
                    state: (attorney.address?.state ?? 'FL').slice(0, 2),
                    zip: attorney.address?.zip ?? '00000',
                },
                phone: attorney.phone ?? '',
                email: attorney.email ?? '',
                barNumber: attorney.barNumber ?? '',
                barState: (attorney.barState ?? 'FL').slice(0, 2),
                signatureDate: attorney.signatureDate ?? signatureDateIso,
            },
        };
    }

    if (caseOverrides) {
        if (caseOverrides.filing) {
            out = { ...out, filing: { ...out.filing, ...caseOverrides.filing } };
        }
        if (caseOverrides.reporting) {
            out = { ...out, reporting: { ...out.reporting, ...caseOverrides.reporting } };
        }
        if (caseOverrides.debtor1SignatureDate !== undefined) {
            out = { ...out, debtor1SignatureDate: caseOverrides.debtor1SignatureDate };
        }
        if (caseOverrides.debtor2SignatureDate !== undefined) {
            out = { ...out, debtor2SignatureDate: caseOverrides.debtor2SignatureDate };
        }
    }

    return out;
}

const PLACEHOLDER = 'Not provided';

// ---------------------------------------------------------------------------
// Canonical normalizers — single place for intake → canonical value mapping.
// Used by intakeToCanonical and by tests. B101 conditions depend on these exact values.
// ---------------------------------------------------------------------------

export type FeePaymentCanonical = 'full' | 'installments' | 'waiver_request';
export type DebtTypeCanonical = 'consumer' | 'business' | 'other';

const ASSET_LIABILITY_RANGES = [
    '0-50000', '50001-100000', '100001-500000', '500001-1000000', '1000001-10000000',
    '10000001-50000000', '50000001-100000000', '100000001-500000000', '500000001-1000000000',
    '1000000001-10000000000', '10000000001-50000000000', '50000000000+',
] as const;
export type AssetLiabilityRange = (typeof ASSET_LIABILITY_RANGES)[number];

/** Maps intake filing_fee_method / fee_payment to canonical feePayment (B101: CB5/CB7/CB8). */
export function normalizeFeePayment(raw: unknown): FeePaymentCanonical {
    const s = String(raw ?? 'full').trim().toLowerCase();
    if (s === 'installments' || s.includes('installment')) return 'installments';
    if (s === 'waiver' || s === 'fee_waiver' || s.includes('waiver')) return 'waiver_request';
    return 'full';
}

/** Maps intake debt_nature to canonical debtType (B101: CB18). */
export function normalizeDebtType(raw: unknown): DebtTypeCanonical {
    const s = String(raw ?? 'consumer').trim().toLowerCase();
    if (s === 'business') return 'business';
    if (s === 'both') return 'other';
    return 'consumer';
}

/** Maps intake asset_range / liability_range to canonical enum string (B101: CB22/CB23). */
export function normalizeAssetLiabilityRange(raw: unknown, defaultVal: AssetLiabilityRange = '0-50000'): AssetLiabilityRange {
    const s = String(raw ?? '').trim().replace(/\s+/g, '').replace(/_/g, '-');
    if (!s) return defaultVal;
    const found = ASSET_LIABILITY_RANGES.find((r) => r === s);
    return found ?? defaultVal;
}
const DEFAULT_STATE = 'FL';
const DEFAULT_ZIP = '00000';

/** Split "First Middle Last Suffix" or "Last, First Middle" into parts */
function splitHumanName(input: unknown): { first: string; middle: string; last: string; suffix: string } {
    const raw = String(input ?? '').trim();
    if (!raw) return { first: '', middle: '', last: '', suffix: '' };
    const suffixes = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);
    const cleaned = raw.replace(/\s+/g, ' ');

    if (cleaned.includes(',')) {
        const [lastPart, restPart] = cleaned.split(',').map((s) => s.trim());
        const rest = restPart ? restPart.split(' ').filter(Boolean) : [];
        let suffix = '';
        if (rest.length > 0) {
            const maybeSuffix = (rest[rest.length - 1] ?? '').replace(/\./g, '').toLowerCase();
            if (suffixes.has(maybeSuffix)) suffix = rest.pop() ?? '';
        }
        const first = rest.shift() ?? '';
        const middle = rest.join(' ');
        return { first, middle, last: lastPart ?? '', suffix };
    }
    const parts = cleaned.split(' ').filter(Boolean);
    let suffix = '';
    if (parts.length > 1) {
        const maybeSuffix = (parts[parts.length - 1] ?? '').replace(/\./g, '').toLowerCase();
        if (suffixes.has(maybeSuffix)) suffix = parts.pop() ?? '';
    }
    const first = parts.shift() ?? '';
    const last = parts.length > 0 ? (parts.pop() as string) : '';
    const middle = parts.join(' ');
    return { first, middle, last, suffix };
}

function parseCityStateZip(input: string): { city: string; state: string; zip: string } | null {
    const normalized = input.replace(/\s+/g, ' ').trim();
    const m = normalized.match(/^(.*?)[, ]+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (!m) return null;
    return { city: m[1]?.trim() ?? '', state: (m[2] ?? '').toUpperCase(), zip: (m[3] ?? '').trim() };
}

function parseCommaSeparatedAddress(input: string): { street: string; city: string; state: string; zip: string } | null {
    const normalized = input.replace(/\s+/g, ' ').trim();
    const m = normalized.match(/^(.*?),\s*([^,]+?),\s*([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
    if (!m) return null;
    return {
        street: m[1]?.trim() ?? '',
        city: m[2]?.trim() ?? '',
        state: (m[3] ?? '').toUpperCase(),
        zip: (m[4] ?? '').trim(),
    };
}

/** Parse address string + county into canonical Address shape (required fields get placeholders when missing) */
function parseAddress(input: unknown, countyInput: unknown): { street1: string; street2?: string; city: string; state: string; zip: string; county?: string } {
    const raw = String(input ?? '').trim();
    const county = String(countyInput ?? '').trim() || undefined;
    if (!raw) {
        return {
            street1: PLACEHOLDER,
            city: PLACEHOLDER,
            state: DEFAULT_STATE,
            zip: DEFAULT_ZIP,
            county,
        };
    }
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
        const street1 = lines[0] ?? PLACEHOLDER;
        const cityStateZip = lines.slice(1).join(' ');
        const parsed = parseCityStateZip(cityStateZip);
        return {
            street1,
            city: parsed?.city || PLACEHOLDER,
            state: (parsed?.state && parsed.state.length === 2) ? parsed.state : DEFAULT_STATE,
            zip: parsed?.zip && /^\d{5}(-\d{4})?$/.test(parsed.zip) ? parsed.zip : DEFAULT_ZIP,
            county,
        };
    }
    const parsed = parseCommaSeparatedAddress(raw);
    if (parsed)
        return {
            street1: parsed.street || PLACEHOLDER,
            city: parsed.city || PLACEHOLDER,
            state: parsed.state.length === 2 ? parsed.state : DEFAULT_STATE,
            zip: parsed.zip && /^\d{5}(-\d{4})?$/.test(parsed.zip) ? parsed.zip : DEFAULT_ZIP,
            county,
        };
    return {
        street1: raw,
        city: PLACEHOLDER,
        state: DEFAULT_STATE,
        zip: DEFAULT_ZIP,
        county,
    };
}

/** Parse "Other names" into aliases (up to 2 for B101) */
function parseAliases(raw: unknown): z.infer<typeof AliasName>[] {
    const text = String(raw ?? '').trim();
    if (!text) return [];
    return text
        .split(/[;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2)
        .map((name) => {
            const parts = splitHumanName(name);
            return { first: parts.first, middle: parts.middle || undefined, last: parts.last };
        });
}

/** Parse business names (comma/semicolon/newline separated) */
function parseBusinessNames(raw: unknown): string[] {
    const text = String(raw ?? '').trim();
    if (!text) return [];
    return text.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
}

/** Infer district from state abbreviation in answers or address */
function inferDistrict(answers: Answers, stateAbbrev: string): string {
    const abbr = (stateAbbrev || String(answers['state'] ?? '').trim()).toUpperCase();
    if (abbr === 'TX') return 'Western District of Texas';
    if (abbr === 'FL') return 'Middle District of Florida';
    if (abbr === 'IL') return 'Northern District of Illinois';
    if (abbr.length === 2) return ''; // generic fallback
    return '';
}

/**
 * Transforms raw Intake Answers into the Canonical Engine State.
 * This is the "Gateway" from user input to legal facts.
 */
export function intakeToCanonical(answers: Answers): CaseCanonicalType {
    const filingSetup = String(answers['filing_setup'] ?? '');
    const isJoint = filingSetup.toLowerCase().includes('spouse');

    // 1. Filing
    const priorDistrict = String(answers['prior_bankruptcy_district'] ?? '').trim();
    const priorDate = String(answers['prior_bankruptcy_date'] ?? '').trim();
    const priorCase = String(answers['prior_bankruptcy_case_number'] ?? '').trim();
    const hasPrior = answers['prior_bankruptcy'] === 'Yes';
    const priorBankruptcies: z.infer<typeof PriorBankruptcy>[] = hasPrior && (priorDistrict || priorDate || priorCase)
        ? [{ district: priorDistrict || PLACEHOLDER, dateFiled: priorDate || PLACEHOLDER, caseNumber: priorCase || PLACEHOLDER }]
        : [];

    const debtor1Addr = parseAddress(answers['debtor_address'], answers['county']);
    const district = inferDistrict(answers, debtor1Addr.state) || 'Middle District of Florida';

    const chapterRaw = String(answers['filing_chapter'] ?? answers['chapter'] ?? '7').trim();
    const chapter = ['7', '11', '12', '13'].includes(chapterRaw) ? (chapterRaw as '7' | '11' | '12' | '13') : '7';

    const feePayment = normalizeFeePayment(answers['filing_fee_method'] ?? answers['fee_payment']);

    const filing: z.infer<typeof CaseFiling> = {
        chapter,
        feePayment,
        hasPriorBankruptcies: hasPrior,
        priorBankruptcies,
        hasRelatedCases: false,
        relatedCases: [],
        isRenter: String(answers['real_estate_ownership'] ?? '').toLowerCase().includes('do not own') || String(answers['real_estate_ownership'] ?? '').toLowerCase().includes('rent'),
        hasEvictionJudgment: false,
        district,
        isAmended: false,
        isJointFiling: isJoint,
    };

    // 2. Debtor 1
    const debtor1 = parseDebtor(answers, '', debtor1Addr, isJoint);

    // 3. Debtor 2 (Spouse)
    const debtor2 = isJoint ? parseDebtor(answers, 'spouse_', parseAddress(answers['spouse_address'], answers['spouse_county'] ?? answers['county']), isJoint) : undefined;

    // 4. Schedule B (and Schedule A placeholder)
    const scheduleB = mapAssetsToScheduleB(answers);
    const realProperty = mapRealPropertyToScheduleA(answers);

    // 5. Credit Counseling
    const cc1: z.infer<typeof CreditCounseling> = {
        status: String(answers['debtor_counseling_complete'] ?? answers['credit_counseling'] ?? '').toLowerCase() === 'yes' ? 'completed_with_cert' : 'completed_no_cert',
    };
    const cc2: z.infer<typeof CreditCounseling> | undefined = isJoint
        ? { status: String(answers['spouse_counseling_complete'] ?? '').toLowerCase() === 'yes' ? 'completed_with_cert' : 'completed_no_cert' }
        : undefined;

    // 6. Reporting (Q16–20)
    const debtType = normalizeDebtType(answers['debt_nature']);
    const creditorRange = String(answers['creditor_count_range'] ?? '1-49').trim() || '1-49';
    const estimatedAssets = normalizeAssetLiabilityRange(answers['asset_range']);
    const estimatedLiabilities = normalizeAssetLiabilityRange(answers['liability_range']);
    const reporting: z.infer<typeof Reporting> = {
        debtType,
        estimatedCreditors: creditorRange as z.infer<typeof Reporting>['estimatedCreditors'],
        estimatedAssets,
        estimatedLiabilities,
        ch7FundsAvailable: String(answers['asset_distribution_expected'] ?? 'No').toLowerCase() === 'yes',
    };

    return {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        filing,
        debtor1,
        debtor2,
        business: {
            isSoleProprietor: String(answers['self_employed'] ?? '').toLowerCase() === 'yes',
            soleProprietorships: [],
            isSmallBusinessDebtor: chapter === '11' && String(answers['small_business_debtor'] ?? '').toLowerCase() === 'yes',
        },
        hazardousProperty: {
            hasHazardousProperty: String(answers['hazardous_property'] ?? '').toLowerCase() === 'yes',
        },
        creditCounseling: { debtor1: cc1, debtor2: cc2 },
        reporting,
        hasAttorney: true,
        incomeStub: parseIncomeStub(answers),
        assets: {
            realProperty,
            scheduleA: mapRealEstateToScheduleA(answers),
            scheduleB,
            ...scheduleB,
        },
    };
}

function parseMoney(value: unknown): number | undefined {
    if (value == null) return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    const text = String(value).replace(/[,$\s]/g, '').trim();
    if (!text) return undefined;
    const n = Number.parseFloat(text);
    return Number.isFinite(n) ? n : undefined;
}

function parseIncomeStub(answers: Answers): CaseCanonicalType['incomeStub'] {
    const debtorGross = parseMoney(answers['debtor_gross_pay']);
    const spouseGross = parseMoney(answers['spouse_gross_pay']);
    const ytd = parseMoney(answers['income_current_ytd']);
    if (debtorGross == null && spouseGross == null && ytd == null) return undefined;
    return {
        debtorGrossPay: debtorGross,
        spouseGrossPay: spouseGross,
        incomeCurrentYtd: ytd,
    };
}

function parseDebtor(
    answers: Answers,
    prefix: string,
    primaryAddress: { street1: string; street2?: string; city: string; state: string; zip: string; county?: string },
    _isJoint: boolean
): z.infer<typeof Debtor> {
    const fullName = String(answers[`${prefix}full_name`] ?? (prefix ? answers['spouse_full_name'] : answers['debtor_full_name']) ?? '').trim();
    const nameParts = splitHumanName(fullName);
    const middleKey = prefix ? `${prefix}middle_name` : 'debtor_middle_name';
    const middleOverride = String(answers[middleKey] ?? '').trim();
    if (middleOverride) nameParts.middle = middleOverride;

    const ssnKey = prefix ? `${prefix}ssn_last4` : 'debtor_ssn_last4';
    const ssnRaw = String(answers[ssnKey] ?? '').trim();
    const ssnClean = ssnRaw.replace(/\D/g, '').slice(-4);
    const ssnLast4 = ssnClean.length === 4 ? ssnClean : undefined;

    const address = primaryAddress;
    const mailingDifferent = String(answers[prefix ? 'spouse_mailing_different' : 'mailing_different'] ?? '').toLowerCase() === 'yes';
    const mailingAddress = mailingDifferent
        ? parseAddress(answers[prefix ? 'spouse_mailing_address' : 'mailing_address'], answers[prefix ? 'spouse_county' : 'county'])
        : undefined;

    const otherNamesKey = prefix ? `${prefix}other_names` : 'debtor_other_names';
    const aliases = parseAliases(answers[otherNamesKey]);
    const businessNames = prefix ? [] : parseBusinessNames(answers['business_names']);
    const phone = String(answers[prefix ? 'spouse_phone' : 'debtor_phone'] ?? '').trim() || undefined;
    const email = String(answers[prefix ? 'spouse_email' : 'debtor_email'] ?? '').trim() || undefined;

    return {
        name: {
            first: nameParts.first || PLACEHOLDER,
            middle: nameParts.middle || undefined,
            last: nameParts.last || PLACEHOLDER,
            suffix: (nameParts.suffix || undefined) as z.infer<typeof Debtor>['name']['suffix'],
        },
        aliases,
        businessNames,
        ssnLast4,
        address: {
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            zip: address.zip,
            county: address.county,
        },
        mailingAddress,
        eins: [],
        venueBasis: '180day_residence',
        phone,
        email,
    };
}

/** Schedule A: real property from intake (placeholder structure for engine) */
function mapRealPropertyToScheduleA(answers: Answers): Array<{ address: string; city: string; state: string; zip: string; county?: string; value?: number; type?: string }> {
    const ownership = String(answers['real_estate_ownership'] ?? '');
    if (!ownership.toLowerCase().includes('own') || ownership.toLowerCase().includes('do not')) return [];
    const count = Math.min(3, Math.max(1, parseInt(String(answers['real_estate_count'] ?? '1'), 10) || 1));
    const list: Array<{ address: string; city: string; state: string; zip: string; county?: string; value?: number; type?: string }> = [];
    for (let i = 1; i <= count; i++) {
        const addr = String(answers[`property_${i}_address`] ?? '').trim();
        if (!addr) continue;
        const city = String(answers[`property_${i}_city`] ?? '').trim() || PLACEHOLDER;
        const state = String(answers[`property_${i}_state`] ?? '').trim().slice(0, 2).toUpperCase() || DEFAULT_STATE;
        const zip = String(answers[`property_${i}_zip`] ?? '').trim();
        const zipValid = /^\d{5}(-\d{4})?$/.test(zip) ? zip : DEFAULT_ZIP;
        const county = String(answers[`property_${i}_county`] ?? '').trim() || undefined;
        const valueStr = String(answers[`property_${i}_value`] ?? '').trim();
        const value = valueStr ? parseFloat(valueStr.replace(/[,$]/g, '')) : undefined;
        const type = String(answers[`property_${i}_type`] ?? '').trim() || undefined;
        list.push({ address: addr, city, state, zip: zipValid, county, value: Number.isFinite(value) ? value : undefined, type });
    }
    return list;
}
