// =============================================================================
// FORM B101 FIELD MAPPING — Canonical Schema → PDF AcroForm Fields
// =============================================================================
// Derived from docs/b101-field-mapping.ts

export type FieldType = "text" | "checkbox" | "dropdown" | "checkboxValue";

export interface FieldMapping {
    label: string;
    /** Primary PDF AcroForm field name (used if pdfFieldNames not set). */
    pdfFieldName: string;
    /** Alternate names to try (e.g. different template variants). First success wins. */
    pdfFieldNames?: string[];
    canonicalPath: string; // dot-notation path
    type: FieldType;
    condition?: (value: any) => boolean;
    /** When true, uncheck the box instead of checking (e.g. consumer "No" so /No is not written). */
    uncheckWhen?: (value: any) => boolean;
    transform?: "uppercase" | "ssnLast4" | "formatDate" | "einFormat" | "fullName" | "signature";
    question: string;
    required: boolean;
    statutoryRef?: string;
}

export const B101_FIELD_MAP: FieldMapping[] = [
    // -------------------------------------------------------------------------
    // CASE HEADER
    // -------------------------------------------------------------------------
    {
        label: "Bankruptcy District",
        pdfFieldName: "Bankruptcy District Information",
        canonicalPath: "filing.district",
        type: "dropdown",
        question: "header",
        required: true,
    },
    // Chapter (header + Part 2 Q7): set via multi-kid spec on Check Box1 in b101.ts — not in loop

    // -------------------------------------------------------------------------
    // PART 1: IDENTIFY YOURSELF
    // -------------------------------------------------------------------------
    // Name
    { label: "Debtor 1 First Name", pdfFieldName: "Debtor1.First name", canonicalPath: "debtor1.name.first", type: "text", question: "1", required: true },
    { label: "Debtor 1 Middle Name", pdfFieldName: "Debtor1.Middle name", canonicalPath: "debtor1.name.middle", type: "text", question: "1", required: false },
    { label: "Debtor 1 Last Name", pdfFieldName: "Debtor1.Last name", canonicalPath: "debtor1.name.last", type: "text", question: "1", required: true },
    { label: "Debtor 1 Suffix", pdfFieldName: "Debtor1.Suffix Sr Jr II III", canonicalPath: "debtor1.name.suffix", type: "text", question: "1", required: false },
    {
        label: "Debtor 1 Full Name",
        pdfFieldName: "Debtor1.Name",
        canonicalPath: "debtor1.name",
        type: "text",
        transform: "fullName", // We will need to implement this transform
        question: "1",
        required: true
    },
    { label: "Debtor 1 SSN", pdfFieldName: "Debtor1.SSNum", canonicalPath: "debtor1.ssnLast4", type: "text", question: "3", required: true },

    // Address (Q5)
    { label: "Debtor 1 Street", pdfFieldName: "Debtor1.Street", canonicalPath: "debtor1.address.street1", type: "text", question: "5", required: true },
    { label: "Debtor 1 City", pdfFieldName: "Debtor1.City", canonicalPath: "debtor1.address.city", type: "text", question: "5", required: true },
    { label: "Debtor 1 State", pdfFieldName: "Debtor1.State", canonicalPath: "debtor1.address.state", type: "text", question: "5", required: true },
    { label: "Debtor 1 ZIP", pdfFieldName: "Debtor1.ZIP Code", canonicalPath: "debtor1.address.zip", type: "text", question: "5", required: true },
    { label: "Debtor 1 County", pdfFieldName: "Debtor1.County", canonicalPath: "debtor1.address.county", type: "text", question: "5", required: false },

    // Mailing Address (Q6) - Only if different
    {
        label: "Debtor 1 Mailing Street",
        pdfFieldName: "Debtor1.Street_2", // Matches legacy
        canonicalPath: "debtor1.mailingAddress.street1",
        type: "text",
        question: "6",
        required: false
    },
    { label: "Debtor 1 Mailing City", pdfFieldName: "Debtor1.City_2", canonicalPath: "debtor1.mailingAddress.city", type: "text", question: "6", required: false },
    { label: "Debtor 1 Mailing State", pdfFieldName: "Debtor1.State_2", canonicalPath: "debtor1.mailingAddress.state", type: "text", question: "6", required: false },
    { label: "Debtor 1 Mailing ZIP", pdfFieldName: "Debtor1.ZIP Code_2", canonicalPath: "debtor1.mailingAddress.zip", type: "text", question: "6", required: false },

    // Joint Debtor
    { label: "Debtor 2 First Name", pdfFieldName: "Debtor2.First name", canonicalPath: "debtor2.name.first", type: "text", question: "1", required: false },
    { label: "Debtor 2 Middle Name", pdfFieldName: "Debtor2.Middle name_2", canonicalPath: "debtor2.name.middle", type: "text", question: "1", required: false },
    { label: "Debtor 2 Last Name", pdfFieldName: "Debtor2.Last name", canonicalPath: "debtor2.name.last", type: "text", question: "1", required: false },
    { label: "Debtor 2 SSN", pdfFieldName: "Debtor2 SSNum", pdfFieldNames: ["Debtor2 SSNum", "Debtor2.SSNum"], canonicalPath: "debtor2.ssnLast4", type: "text", question: "3", required: false },

    // Debtor 2 address (Q5) — joint filing
    { label: "Debtor 2 Street", pdfFieldName: "Debtor2.Street", pdfFieldNames: ["Debtor2.Street", "Street2", "Street"], canonicalPath: "debtor2.address.street1", type: "text", question: "5", required: false },
    { label: "Debtor 2 City", pdfFieldName: "Debtor2.City", pdfFieldNames: ["Debtor2.City", "City"], canonicalPath: "debtor2.address.city", type: "text", question: "5", required: false },
    { label: "Debtor 2 State", pdfFieldName: "Debtor2.State", pdfFieldNames: ["Debtor2.State", "State"], canonicalPath: "debtor2.address.state", type: "text", question: "5", required: false },
    { label: "Debtor 2 ZIP", pdfFieldName: "Debtor2.ZIP Code", pdfFieldNames: ["Debtor2.ZIP Code", "Debtor2.ZIP", "ZIP_2", "ZIP"], canonicalPath: "debtor2.address.zip", type: "text", question: "5", required: false },
    { label: "Debtor 2 County", pdfFieldName: "Debtor2.County", pdfFieldNames: ["Debtor2.County", "County_2"], canonicalPath: "debtor2.address.county", type: "text", question: "5", required: false },

    // Q6: Venue basis (28 U.S.C. § 1408) — D1 = Check Box5, D2 = Check Box6 (separate from fee; CB7 = installments)
    {
        label: "D1 Venue: 180-day residence",
        pdfFieldName: "Check Box5",
        pdfFieldNames: ["Check Box5", "venue_d1_180day", "180 days", "Over the last 180 days"],
        canonicalPath: "debtor1.venueBasis",
        type: "checkbox",
        condition: (v) => v === "180day_residence",
        question: "6",
        required: true,
    },
    {
        label: "D2 Venue: 180-day residence",
        pdfFieldName: "Check Box6",
        pdfFieldNames: ["Check Box6", "venue_d2_180day", "Lived in this district"],
        canonicalPath: "debtor2.venueBasis",
        type: "checkbox",
        condition: (v) => v === "180day_residence",
        question: "6",
        required: false,
    },

    // -------------------------------------------------------------------------
    // PART 2: BANKRUPTCY INFO
    // -------------------------------------------------------------------------

    // Q7: Chapter Selection (Body)
    // Legacy maps this to Check Box1 just like header.

    // Q8: Filing Fee — Check Box6 is D2 venue; Check Box7 = installments, Check Box5 = pay entire, Check Box8 = waiver (per template inspection)
    {
        label: "Pay Fee Entirely",
        pdfFieldName: "Check Box5",
        pdfFieldNames: ["Check Box5", "Pay entire fee", "I will pay the entire fee"],
        canonicalPath: "filing.feePayment",
        type: "checkbox",
        condition: (v) => v === "Pay entirely" || v === "full",
        question: "8",
        required: true
    },
    {
        label: "Pay Fee in Installments",
        pdfFieldName: "Check Box7",
        pdfFieldNames: ["Check Box7", "Installments", "I need to pay the fee in installments"],
        canonicalPath: "filing.feePayment",
        type: "checkbox",
        condition: (v) => v === "installments",
        question: "8",
        required: true
    },
    {
        label: "Request Fee Waiver",
        pdfFieldName: "Check Box8",
        pdfFieldNames: ["Check Box8", "Waiver", "I request that my fee be waived"],
        canonicalPath: "filing.feePayment",
        type: "checkbox",
        condition: (v) => v === "waiver_request",
        question: "8",
        required: true
    },

    // Q9: Prior Bankruptcy
    {
        label: "Prior Bankruptcy - No",
        pdfFieldName: "Check Box8",
        pdfFieldNames: ["Check Box8", "No prior", "No"],
        canonicalPath: "filing.hasPriorBankruptcies",
        type: "checkbox",
        condition: (v) => v === false,
        question: "9",
        required: true
    },
    {
        label: "Prior Bankruptcy - Yes",
        pdfFieldName: "Check Box8",
        pdfFieldNames: ["Check Box8", "Yes prior", "Yes"],
        canonicalPath: "filing.hasPriorBankruptcies",
        type: "checkbox",
        condition: (v) => v === true,
        question: "9",
        required: true
    },
    // Prior Details (canonical uses dateFiled)
    { label: "Prior District", pdfFieldName: "District_2", canonicalPath: "filing.priorBankruptcies.0.district", type: "text", question: "9", required: false },
    { label: "Prior Date", pdfFieldName: "When_2", canonicalPath: "filing.priorBankruptcies.0.dateFiled", type: "text", question: "9", required: false },
    { label: "Prior Case No", pdfFieldName: "Case_2", canonicalPath: "filing.priorBankruptcies.0.caseNumber", type: "text", question: "9", required: false },

    // Q10: Pending Cases (canonical: filing.hasRelatedCases)
    {
        label: "Pending Cases - No",
        pdfFieldName: "Check Box9",
        pdfFieldNames: ["Check Box9", "No related", "No"],
        canonicalPath: "filing.hasRelatedCases",
        type: "checkbox",
        condition: (v) => !v,
        question: "10",
        required: true
    },

    // Q11: Rent / Eviction (canonical: filing.isRenter, filing.hasEvictionJudgment)
    {
        label: "Rent Residence - Yes",
        pdfFieldName: "Check Box10",
        pdfFieldNames: ["Check Box10", "Yes renter", "Yes"],
        canonicalPath: "filing.isRenter",
        type: "checkbox",
        condition: (v) => v === true,
        question: "11",
        required: true
    },
    {
        label: "Rent Residence - No",
        pdfFieldName: "Check Box10",
        pdfFieldNames: ["Check Box10", "No renter", "No. Go to line 12"],
        canonicalPath: "filing.isRenter",
        type: "checkbox",
        condition: (v) => v === false,
        question: "11",
        required: true
    },
    {
        label: "Eviction Judgment - No",
        pdfFieldName: "Check Box11",
        pdfFieldNames: ["Check Box11", "No eviction", "No. Go to line 12"],
        canonicalPath: "filing.hasEvictionJudgment",
        type: "checkbox",
        condition: (v) => v === false,
        question: "11",
        required: false
    },

    // Q12: Sole Proprietor (canonical: business.isSoleProprietor)
    {
        label: "Sole Proprietor - Yes",
        pdfFieldName: "Check Box12",
        pdfFieldNames: ["Check Box12", "Yes sole prop", "Yes"],
        canonicalPath: "business.isSoleProprietor",
        type: "checkbox",
        condition: (v) => v === true,
        question: "12",
        required: true
    },
    {
        label: "Sole Proprietor - No",
        pdfFieldName: "Check Box12",
        pdfFieldNames: ["Check Box12", "No sole prop", "No"],
        canonicalPath: "business.isSoleProprietor",
        type: "checkbox",
        condition: (v) => v === false,
        question: "12",
        required: true
    },

    // Q13: Small business debtor — set via multi-kid spec on Check Box14 in b101.ts (Not filing under Ch11 / etc.)

    // Q14: Hazardous Property (canonical: hazardousProperty.hasHazardousProperty)
    {
        label: "Hazardous Property - No",
        pdfFieldName: "Check Box15",
        pdfFieldNames: ["Check Box15", "No hazardous", "No"],
        canonicalPath: "hazardousProperty.hasHazardousProperty",
        type: "checkbox",
        condition: (v) => v === false,
        question: "14",
        required: true
    },

    // Q15: Credit Counseling (canonical status: completed_with_cert | completed_no_cert)
    {
        label: "Debtor 1 Counseling Received",
        pdfFieldName: "Check Box16",
        pdfFieldNames: ["Check Box16", "Debtor 1 counseling", "Yes"],
        canonicalPath: "creditCounseling.debtor1.status",
        type: "checkbox",
        condition: (v) => v === "completed_with_cert" || v === "completed_no_cert",
        question: "15",
        required: true
    },
    {
        label: "Debtor 2 Counseling Received",
        pdfFieldName: "Check Box17",
        pdfFieldNames: ["Check Box17", "Debtor 2 counseling", "Yes"],
        canonicalPath: "creditCounseling.debtor2.status",
        type: "checkbox",
        condition: (v) => v === "completed_with_cert" || v === "completed_no_cert",
        question: "15",
        required: false
    },

    // -------------------------------------------------------------------------
    // PART 6: STATS (canonical: reporting.*)
    // -------------------------------------------------------------------------
    // Q16a: Consumer debt — Check Box18 stores /Yes or /No; only check when consumer, uncheck when explicitly not consumer
    {
        label: "Debts primarily consumer — Yes",
        pdfFieldName: "Check Box18",
        pdfFieldNames: ["Check Box18"],
        canonicalPath: "reporting.debtType",
        type: "checkbox",
        condition: (v) => v === "consumer",
        question: "16",
        required: true
    },
    {
        label: "Debts primarily consumer — No (uncheck)",
        pdfFieldName: "Check Box18",
        pdfFieldNames: ["Check Box18"],
        canonicalPath: "reporting.debtType",
        type: "checkbox",
        condition: (v) => v !== "consumer" && v != null && v !== "",
        uncheckWhen: (v) => v !== "consumer" && v != null && v !== "",
        question: "16",
        required: true
    },
    {
        label: "Debts primarily business — No",
        pdfFieldName: "Check Box19",
        pdfFieldNames: ["Check Box19", "16b No", "Business No", "No"],
        canonicalPath: "reporting.debtType",
        type: "checkbox",
        condition: (v) => v === "consumer" || v === "other",
        question: "16",
        required: true
    },

    // Q17: Chapter 7 Asset Distribution (canonical: reporting.ch7FundsAvailable, false = no funds)
    {
        label: "Chapter 7 Filing - Yes",
        pdfFieldName: "Check Box20",
        pdfFieldNames: ["Check Box20", "Chapter 7", "Yes"],
        canonicalPath: "filing.chapter",
        type: "checkbox",
        condition: (v) => v === "7" || v === "Chapter 7",
        question: "17",
        required: true
    },
    {
        label: "Funds Available - No",
        pdfFieldName: "Check Box20A",
        pdfFieldNames: ["Check Box20A", "No funds", "No"],
        canonicalPath: "reporting.ch7FundsAvailable",
        type: "checkbox",
        condition: (v) => v === false,
        question: "17",
        required: true
    },

    // Q18: Creditor count
    {
        label: "Creditor Count",
        pdfFieldName: "Check Box21",
        pdfFieldNames: ["Check Box21", "1-49", "Creditor count"],
        canonicalPath: "reporting.estimatedCreditors",
        type: "checkbox",
        condition: (v) => !!v,
        question: "18",
        required: true
    },
    // Q19: Estimated assets — court form may use Check Box20 or Check Box22; value e.g. /500001-1000000
    {
        label: "Assets Range",
        pdfFieldName: "Check Box20",
        pdfFieldNames: ["Check Box20", "Check Box22"],
        canonicalPath: "reporting.estimatedAssets",
        type: "checkboxValue",
        condition: (v) => !!v && typeof v === "string",
        question: "19",
        required: true
    },
    // Q20: Estimated liabilities — court form may use Check Box22 or Check Box23
    {
        label: "Liabilities Range",
        pdfFieldName: "Check Box22",
        pdfFieldNames: ["Check Box22", "Check Box23"],
        canonicalPath: "reporting.estimatedLiabilities",
        type: "checkboxValue",
        condition: (v) => !!v && typeof v === "string",
        question: "20",
        required: true
    },

    // -------------------------------------------------------------------------
    // SIGNATURES (canonical: debtor1.name for printed name, debtor1SignatureDate)
    // -------------------------------------------------------------------------
    // Debtor 1 signature block — /s/ name and date (try Attorney-style and Debtor1-style names)
    {
        label: "Debtor 1 Signature",
        pdfFieldName: "Debtor1.signature",
        pdfFieldNames: ["Debtor1.signature", "signature"],
        canonicalPath: "debtor1.name",
        type: "text",
        transform: "signature",
        question: "Sign",
        required: true,
    },
    {
        label: "Debtor 1 Date Signed",
        pdfFieldName: "Debtor1.Date signed",
        pdfFieldNames: ["Debtor1.Date signed", "Date signed"],
        canonicalPath: "debtor1SignatureDate",
        type: "text",
        transform: "formatDate",
        question: "Sign",
        required: false,
    },
    {
        label: "Debtor 1 Executed on (Part 7)",
        pdfFieldName: "Executed on",
        pdfFieldNames: ["Executed on"],
        canonicalPath: "debtor1SignatureDate",
        type: "text",
        transform: "formatDate",
        question: "Sign",
        required: false,
    },
    // Debtor 2 signature (joint)
    {
        label: "Debtor 2 Signature",
        pdfFieldName: "Debtor2.signature",
        pdfFieldNames: ["Debtor2.signature", "signature_2"],
        canonicalPath: "debtor2.name",
        type: "text",
        transform: "signature",
        question: "Sign",
        required: false,
    },
    {
        label: "Debtor 2 Date Signed (Executed on)",
        pdfFieldName: "Debtor2.Executed on",
        pdfFieldNames: ["Debtor2.Executed on", "Executed on_2"],
        canonicalPath: "debtor2SignatureDate",
        type: "text",
        transform: "formatDate",
        question: "Sign",
        required: false,
    },
    {
        label: "Debtor 2 Date signed",
        pdfFieldName: "Debtor2.Date signed",
        pdfFieldNames: ["Debtor2.Date signed"],
        canonicalPath: "debtor2SignatureDate",
        type: "text",
        transform: "formatDate",
        question: "Sign",
        required: false,
    },
    // Debtor contact (Part 7)
    { label: "Debtor 1 Contact phone", pdfFieldName: "Debtor1.Contact phone_2", pdfFieldNames: ["Debtor1.Contact phone_2", "Contact phone"], canonicalPath: "debtor1.phone", type: "text", question: "Sign", required: false },
    { label: "Debtor 1 Cell phone", pdfFieldName: "Debtor1.Cell phone", canonicalPath: "debtor1.phone", type: "text", question: "Sign", required: false },
    { label: "Debtor 1 Email address", pdfFieldName: "Debtor1.Email address_2", pdfFieldNames: ["Debtor1.Email address_2", "Email address"], canonicalPath: "debtor1.email", type: "text", question: "Sign", required: false },
    { label: "Debtor 2 Contact phone", pdfFieldName: "Debtor2.Contact phone", canonicalPath: "debtor2.phone", type: "text", question: "Sign", required: false },
    { label: "Debtor 2 Cell phone", pdfFieldName: "Debtor2.Cell phone", canonicalPath: "debtor2.phone", type: "text", question: "Sign", required: false },
    { label: "Debtor 2 Email address", pdfFieldName: "Debtor2.Email address", canonicalPath: "debtor2.email", type: "text", question: "Sign", required: false },

    // Attorney section — try Attorney.* first (court-filed template), then Debtor1.* / doc-style
    {
        label: "Attorney Signature",
        pdfFieldName: "Attorney.Sig",
        pdfFieldNames: ["Attorney.Sig", "Attorney.signature", "Debtor1.Attorney"],
        canonicalPath: "attorney.name",
        type: "text",
        transform: "signature",
        question: "Sign",
        required: false,
    },
    {
        label: "Attorney Date Signed",
        pdfFieldName: "Attorney.Date signed",
        pdfFieldNames: ["Attorney.Date signed", "Date signed"],
        canonicalPath: "attorney.signatureDate",
        type: "text",
        transform: "formatDate",
        question: "Sign",
        required: false,
    },
    {
        label: "Attorney Printed Name",
        pdfFieldName: "Attorney.Printed name",
        pdfFieldNames: ["Attorney.Printed name", "Debtor1.Attorney", "Printed name"],
        canonicalPath: "attorney.name",
        type: "text",
        question: "Sign",
        required: true,
    },
    {
        label: "Attorney Firm",
        pdfFieldName: "Attorney.Firm name",
        pdfFieldNames: ["Attorney.Firm name", "Debtor1.Firm name", "Firm name"],
        canonicalPath: "attorney.firmName",
        type: "text",
        question: "Sign",
        required: false,
    },
    {
        label: "Attorney Street",
        pdfFieldName: "Attorney.Street address_2",
        pdfFieldNames: ["Attorney.Street address_2", "Street address_2", "Debtor1.Street"],
        canonicalPath: "attorney.address.street1",
        type: "text",
        question: "Sign",
        required: false,
    },
    {
        label: "Attorney City",
        pdfFieldName: "Attorney.City",
        pdfFieldNames: ["Attorney.City", "City"],
        canonicalPath: "attorney.address.city",
        type: "text",
        question: "Sign",
        required: false,
    },
    {
        label: "Attorney State",
        pdfFieldName: "Attorney.State",
        pdfFieldNames: ["Attorney.State", "State"],
        canonicalPath: "attorney.address.state",
        type: "text",
        question: "Sign",
        required: false,
    },
    {
        label: "Attorney ZIP",
        pdfFieldName: "Attorney.Zip",
        pdfFieldNames: ["Attorney.Zip", "Zip"],
        canonicalPath: "attorney.address.zip",
        type: "text",
        question: "Sign",
        required: false,
    },
    {
        label: "Attorney Phone",
        pdfFieldName: "Attorney.phone",
        pdfFieldNames: ["Attorney.phone", "Debtor1.Contact phone", "phone"],
        canonicalPath: "attorney.phone",
        type: "text",
        question: "Sign",
        required: true,
    },
    {
        label: "Attorney Email",
        pdfFieldName: "Attorney.Email address",
        pdfFieldNames: ["Attorney.Email address", "Debtor1.Email address", "Email address"],
        canonicalPath: "attorney.email",
        type: "text",
        question: "Sign",
        required: true,
    },
    {
        label: "Attorney Bar Number",
        pdfFieldName: "Attorney.Bar number",
        pdfFieldNames: ["Attorney.Bar number", "Debtor1.State Bar number forindividual attorney", "Bar number"],
        canonicalPath: "attorney.barNumber",
        type: "text",
        question: "Sign",
        required: true,
    },
    {
        label: "Attorney Bar State",
        pdfFieldName: "Attorney.Bar State",
        pdfFieldNames: ["Attorney.Bar State", "Bar State"],
        canonicalPath: "attorney.barState",
        type: "text",
        question: "Sign",
        required: false,
    },
];
