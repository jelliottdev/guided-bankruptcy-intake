// =============================================================================
// VERIDOCKET CANONICAL BANKRUPTCY CASE SCHEMA
// =============================================================================
// Derived from Official Form B101 (06/24) — Voluntary Petition for Individuals
// This is the single source of truth for all case data.
// Forms are projections over this schema, not the other way around.
// =============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives & Reusable Types
// ---------------------------------------------------------------------------

export const Name = z.object({
    first: z.string().min(1),
    middle: z.string().optional(),
    last: z.string().min(1),
    suffix: z.enum(["Sr.", "Jr.", "II", "III", ""]).optional(),
});

export const Address = z.object({
    street1: z.string().min(1),
    street2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
    county: z.string().optional(),
});

export const MailingAddress = z.object({
    street1: z.string().min(1),
    poBox: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
});

export const PriorBankruptcy = z.object({
    district: z.string(),
    dateFiled: z.string(), // MM/DD/YYYY
    caseNumber: z.string(),
});

export const RelatedCase = z.object({
    debtorName: z.string(),
    relationship: z.string(),
    district: z.string(),
    dateFiled: z.string(),
    caseNumber: z.string().optional(),
});

export const AliasName = z.object({
    first: z.string(),
    middle: z.string().optional(),
    last: z.string(),
});

// ---------------------------------------------------------------------------
// Data Provenance — every extracted/edited field carries this
// ---------------------------------------------------------------------------

export const Provenance = z.object({
    source: z.enum(["intake", "ocr", "attorney", "system", "computed"]),
    sourceDocumentId: z.string().optional(),
    page: z.number().optional(),
    bbox: z
        .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
        })
        .optional(),
    confidence: z.number().min(0).max(1).optional(),
    extractorVersion: z.string().optional(),
    acceptedBy: z.string().optional(), // attorney userId or "system"
    acceptedAt: z.string().optional(), // ISO datetime
    timestamp: z.string(), // ISO datetime when this value was set
});

// ---------------------------------------------------------------------------
// Core Entities — derived from B101 Parts 1-7
// ---------------------------------------------------------------------------

// Part 1: Identify Yourself (Questions 1-6)
export const Debtor = z.object({
    // Q1: Full legal name
    name: Name,

    // Q2: Other names used in last 8 years
    aliases: z.array(AliasName).default([]),
    businessNames: z.array(z.string()).default([]),

    // Q3: SSN last 4
    ssnLast4: z
        .string()
        .regex(/^\d{4}$/)
        .optional(),
    itin: z
        .string()
        .regex(/^\d{4}$/)
        .optional(),

    // Q4: EIN (up to 2 per debtor)
    eins: z.array(z.string().regex(/^\d{2}-\d{7}$/)).default([]),

    // Q5: Residence
    address: Address,
    mailingAddress: MailingAddress.optional(), // only if different from residence

    // Q6: Venue basis
    venueBasis: z.enum(["180day_residence", "other"]),
    venueExplanation: z.string().optional(), // required if "other"

    // Contact (Part 7 signature block)
    phone: z.string().optional(),
    email: z.string().optional(),
});

// Part 2: Tell the Court About Your Bankruptcy Case (Questions 7-11)
export const CaseFiling = z.object({
    // Q7: Chapter
    chapter: z.enum(["7", "11", "12", "13"]),

    // Q8: Fee payment method
    feePayment: z.enum(["full", "installments", "waiver_request"]),

    // Q9: Prior bankruptcies in last 8 years
    hasPriorBankruptcies: z.boolean(),
    priorBankruptcies: z.array(PriorBankruptcy).default([]),

    // Q10: Related pending cases
    hasRelatedCases: z.boolean(),
    relatedCases: z.array(RelatedCase).default([]),

    // Q11: Rental / eviction
    isRenter: z.boolean(),
    hasEvictionJudgment: z.boolean().optional(), // only if isRenter

    // Filing metadata
    district: z.string(), // e.g. "Middle District of Florida"
    caseNumber: z.string().optional(), // assigned by court
    isAmended: z.boolean().default(false),
    isJointFiling: z.boolean().default(false),
});

// Part 3: Sole Proprietorship (Questions 12-13)
export const SoleProprietorship = z.object({
    name: z.string().optional(),
    address: Address.optional(),
    businessType: z
        .enum([
            "health_care",
            "single_asset_real_estate",
            "stockbroker",
            "commodity_broker",
            "none",
        ])
        .optional(),
});

export const BusinessInfo = z.object({
    // Q12
    isSoleProprietor: z.boolean(),
    soleProprietorships: z.array(SoleProprietorship).default([]),

    // Q13: Chapter 11 small business
    isSmallBusinessDebtor: z.boolean().optional(),
    subchapterV: z.boolean().optional(),
});

// Part 4: Hazardous / Urgent Property (Question 14)
export const HazardousProperty = z.object({
    hasHazardousProperty: z.boolean(),
    hazardDescription: z.string().optional(),
    attentionReason: z.string().optional(),
    propertyAddress: Address.optional(),
});

// Part 5: Credit Counseling (Question 15)
export const CreditCounseling = z.object({
    status: z.enum([
        "completed_with_cert", // received briefing + have certificate
        "completed_no_cert", // received briefing, no cert yet (14 day deadline)
        "requested_waiver", // asked but couldn't get within 7 days
        "exempt_incapacity",
        "exempt_disability",
        "exempt_active_duty",
    ]),
    certificateDocId: z.string().optional(),
    paymentPlanDocId: z.string().optional(),
});

// Part 6: Reporting (Questions 16-20)
export const Reporting = z.object({
    // Q16: Debt type
    debtType: z.enum(["consumer", "business", "other"]),
    otherDebtDescription: z.string().optional(),

    // Q17: Chapter 7 funds available
    ch7FundsAvailable: z.boolean().optional(), // only if chapter 7

    // Q18: Estimated number of creditors
    estimatedCreditors: z.enum([
        "1-49",
        "50-99",
        "100-199",
        "200-999",
        "1000-5000",
        "5001-10000",
        "10001-25000",
        "25001-50000",
        "50001-100000",
        "100000+",
    ]),

    // Q19: Estimated assets
    estimatedAssets: z.enum([
        "0-50000",
        "50001-100000",
        "100001-500000",
        "500001-1000000",
        "1000001-10000000",
        "10000001-50000000",
        "50000001-100000000",
        "100000001-500000000",
        "500000001-1000000000",
        "1000000001-10000000000",
        "10000000001-50000000000",
        "50000000000+",
    ]),

    // Q20: Estimated liabilities
    estimatedLiabilities: z.enum([
        "0-50000",
        "50001-100000",
        "100001-500000",
        "500001-1000000",
        "1000001-10000000",
        "10000001-50000000",
        "50000001-100000000",
        "100000001-500000000",
        "500000001-1000000000",
        "1000000001-10000000000",
        "10000000001-50000000000",
        "50000000000+",
    ]),
});

// Part 7: Signatures
export const Attorney = z.object({
    name: z.string(),
    firmName: z.string(),
    address: Address,
    phone: z.string(),
    email: z.string().email(),
    barNumber: z.string(),
    barState: z.string().length(2),
    signatureDate: z.string().optional(),
});

export const ProSeDebtor = z.object({
    awareOfConsequences: z.boolean(),
    awareOfFraudRisks: z.boolean(),
    paidNonAttorneyPreparer: z.boolean(),
    preparerName: z.string().optional(),
    phone: z.string().optional(),
    cellPhone: z.string().optional(),
    email: z.string().optional(),
    signatureDate: z.string().optional(),
});

// ---------------------------------------------------------------------------
// EXPANSION SCHEMAS — Schedule C/D/E-F/G, I/J, SOFA, means test (vision: full form set)
// ---------------------------------------------------------------------------

/** Schedule D: secured creditor (property-backed claim). */
export const SecuredCreditor = z.object({
    id: z.string().optional(),
    creditorName: z.string(),
    mailingAddress: z.string().optional(),
    last4OfAccount: z.string().optional(),
    dateIncurred: z.string().optional(),
    propertyDescription: z.string().optional(),
    claimAmount: z.number().optional(),
    valueOfCollateral: z.number().optional(),
});
export type SecuredCreditorType = z.infer<typeof SecuredCreditor>;

/** Schedule E/F: unsecured creditor. */
export const UnsecuredCreditor = z.object({
    id: z.string().optional(),
    creditorName: z.string(),
    mailingAddress: z.string().optional(),
    last4OfAccount: z.string().optional(),
    dateIncurred: z.string().optional(),
    claimAmount: z.number().optional(),
    claimType: z.enum(["priority", "nonpriority"]).optional(),
});
export type UnsecuredCreditorType = z.infer<typeof UnsecuredCreditor>;

/** Schedule G: executory contract or unexpired lease. */
export const ExecutoryContract = z.object({
    id: z.string().optional(),
    nameAndAddress: z.string(),
    description: z.string().optional(),
});
export type ExecutoryContractType = z.infer<typeof ExecutoryContract>;

/** Schedule C: property claimed as exempt (statute + value). */
export const ExemptionClaim = z.object({
    id: z.string().optional(),
    assetDescription: z.string(),
    statute: z.string().optional(),
    valueClaimed: z.number().optional(),
    currentValue: z.number().optional(),
});
export type ExemptionClaimType = z.infer<typeof ExemptionClaim>;

/** Schedule I / Form 122: current monthly income (employment, other). */
export const IncomeSchema = z.object({
    employmentIncome: z.number().optional(),
    otherMonthlyIncome: z.number().optional(),
    totalMonthlyIncome: z.number().optional(),
    /** Line items for Schedule I / 122 (source + amount). */
    lineItems: z.array(z.object({
        source: z.string(),
        amount: z.number(),
    })).optional(),
});
export type IncomeSchemaType = z.infer<typeof IncomeSchema>;

/** Schedule J: current monthly expenses. */
export const ExpensesSchema = z.object({
    totalMonthlyExpenses: z.number().optional(),
    /** Line items (category + amount). */
    lineItems: z.array(z.object({
        category: z.string(),
        amount: z.number(),
    })).optional(),
});
export type ExpensesSchemaType = z.infer<typeof ExpensesSchema>;

/** B107 Statement of Financial Affairs: question number + answer text. */
export const SofaAnswer = z.object({
    questionId: z.string(), // e.g. "1", "2a", "14"
    answer: z.string().optional(),
    subAnswers: z.array(z.object({ subId: z.string(), answer: z.string() })).optional(),
});
export type SofaAnswerType = z.infer<typeof SofaAnswer>;

/** Form 122A/122C means-test data (Ch 7 / Ch 13). */
export const MeansTestSchema = z.object({
    currentMonthlyIncome: z.number().optional(),
    medianIncome: z.number().optional(),
    disposableIncome: z.number().optional(),
    /** Presumption of abuse / disposable income result. */
    presumptionResult: z.enum(["below_median", "above_median_no_presumption", "presumption_arises"]).optional(),
});
export type MeansTestSchemaType = z.infer<typeof MeansTestSchema>;

// ---------------------------------------------------------------------------
// CANONICAL CASE SCHEMA — the single source of truth
// ---------------------------------------------------------------------------

export const CaseCanonical = z.object({
    // System metadata
    id: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),

    // Core B101 data
    filing: CaseFiling,
    debtor1: Debtor,
    debtor2: Debtor.optional(), // only in joint cases

    business: BusinessInfo,
    hazardousProperty: HazardousProperty,

    creditCounseling: z.object({
        debtor1: CreditCounseling,
        debtor2: CreditCounseling.optional(),
    }),

    reporting: Reporting,

    // Representation
    hasAttorney: z.boolean(),
    attorney: Attorney.optional(),
    proSe: z
        .object({
            debtor1: ProSeDebtor.optional(),
            debtor2: ProSeDebtor.optional(),
        })
        .optional(),

    // Signature dates
    debtor1SignatureDate: z.string().optional(),
    debtor2SignatureDate: z.string().optional(),

    // ---------------------------------------------------------------------------
    // EXPANSION POINTS — these will be populated by other forms
    // ---------------------------------------------------------------------------
    /** Income values used for OCR conflict checks and means test (from intake) */
    incomeStub: z.object({
        debtorGrossPay: z.number().optional(),
        spouseGrossPay: z.number().optional(),
        incomeCurrentYtd: z.number().optional(),
    }).optional(),
    /** Schedule I / Form 122: current monthly income. Populated from intake or OCR. */
    income: IncomeSchema.optional(),
    /** Schedule J: current monthly expenses. Populated from intake or OCR. */
    expenses: ExpensesSchema.optional(),
    /** Schedule A/B and other asset forms. Set in intakeToCanonical: realProperty, scheduleA (ScheduleAData), scheduleB (ScheduleBData), plus spread of scheduleB. Fillers read assets.scheduleA / assets.scheduleB. */
    assets: z.any().optional(),
    /** Schedule C: property claimed as exempt. */
    exemptions: z.array(ExemptionClaim).optional(),
    /** Schedule D: creditors with secured claims. */
    securedDebts: z.array(SecuredCreditor).optional(),
    /** Schedule E/F: unsecured creditors. */
    unsecuredDebts: z.array(UnsecuredCreditor).optional(),
    /** Schedule G: executory contracts and unexpired leases. */
    executoryContracts: z.array(ExecutoryContract).optional(),
    /** B107 Statement of Financial Affairs: question/answer pairs. */
    sofa: z.array(SofaAnswer).optional(),
    /** Form 122A-1 / 122C: means-test calculation (Ch 7 / Ch 13). */
    meansTest: MeansTestSchema.optional(),
});

export type CaseCanonical = z.infer<typeof CaseCanonical>;
export type CaseCanonicalType = z.infer<typeof CaseCanonical>; // Alias for user plan consistency

// ---------------------------------------------------------------------------
// PROVENANCE MAP — tracks source for every field
// ---------------------------------------------------------------------------

export type ProvenanceMap = Record<string, z.infer<typeof Provenance>>;

// ---------------------------------------------------------------------------
// AUDIT LOG — every change is recorded
// ---------------------------------------------------------------------------

export const AuditEvent = z.object({
    id: z.string().uuid(),
    timestamp: z.string(),
    actor: z.enum(["system", "attorney", "client", "ocr"]),
    actorId: z.string().optional(),
    action: z.enum(["set", "update", "accept_ocr", "reject_ocr", "clear"]),
    fieldPath: z.string(), // e.g. "debtor1.name.first"
    oldValue: z.unknown().optional(),
    newValue: z.unknown().optional(),
    reason: z.string().optional(),
});

export type AuditEventType = z.infer<typeof AuditEvent>;
