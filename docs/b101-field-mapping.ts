// =============================================================================
// FORM B101 FIELD MAPPING — Canonical Schema → PDF AcroForm Fields
// =============================================================================
// This mapping is derived directly from the fillable PDF field extraction.
// Each entry maps a canonical schema path to an actual PDF field name.
//
// HOW THIS WAS BUILT:
//   1. Extracted all 246 fields from form_b_101_0624_fillable_clean.pdf
//   2. Mapped named fields to canonical schema paths
//   3. Mapped unnamed checkbox fields by page/position to their meaning
//
// HOW TO USE:
//   To fill B101, iterate this mapping and pull values from CaseCanonical.
//   For checkboxes (/Btn), set the value based on the `condition` function.
//   For text fields (/Tx), pull the value from the canonical path.
// =============================================================================

import { CaseCanonicalType } from "./canonical-schema";

export type FieldType = "text" | "checkbox" | "dropdown";

export interface FieldMapping {
  // What this field means (human-readable)
  label: string;

  // The PDF AcroForm field name (as extracted from the PDF)
  pdfFieldName: string;

  // The canonical schema path to pull the value from
  canonicalPath: string;

  // Field type in the PDF
  type: FieldType;

  // For checkboxes: a function that takes the canonical value and returns
  // whether this checkbox should be checked
  condition?: (value: unknown) => boolean;

  // For text fields: optional transform before writing
  transform?: "uppercase" | "ssnLast4" | "formatDate" | "einFormat";

  // Which B101 question number this belongs to
  question: string;

  // Is this field required for filing readiness?
  required: boolean;

  // Statutory reference, if applicable
  statutoryRef?: string;
}

// =============================================================================
// THE MAPPING
// =============================================================================

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
  {
    label: "Case Number",
    pdfFieldName: "Case number", // Page 1 header — unnamed but positional
    canonicalPath: "filing.caseNumber",
    type: "text",
    question: "header",
    required: false, // assigned by court
  },
  {
    label: "Chapter 7 (header checkbox)",
    pdfFieldName: "chapter_7_header", // unnamed /Btn on page 1
    canonicalPath: "filing.chapter",
    type: "checkbox",
    condition: (v) => v === "7",
    question: "header",
    required: true,
  },
  {
    label: "Chapter 11 (header checkbox)",
    pdfFieldName: "chapter_11_header",
    canonicalPath: "filing.chapter",
    type: "checkbox",
    condition: (v) => v === "11",
    question: "header",
    required: true,
  },
  {
    label: "Chapter 12 (header checkbox)",
    pdfFieldName: "chapter_12_header",
    canonicalPath: "filing.chapter",
    type: "checkbox",
    condition: (v) => v === "12",
    question: "header",
    required: true,
  },
  {
    label: "Chapter 13 (header checkbox)",
    pdfFieldName: "chapter_13_header",
    canonicalPath: "filing.chapter",
    type: "checkbox",
    condition: (v) => v === "13",
    question: "header",
    required: true,
  },
  {
    label: "Amended filing",
    pdfFieldName: "Check Box2",
    canonicalPath: "filing.isAmended",
    type: "checkbox",
    condition: (v) => v === true,
    question: "header",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 1, Q1: DEBTOR 1 — Full Legal Name
  // -------------------------------------------------------------------------
  {
    label: "Debtor 1 First Name",
    pdfFieldName: "First name",
    canonicalPath: "debtor1.name.first",
    type: "text",
    question: "1",
    required: true,
  },
  {
    label: "Debtor 1 Middle Name",
    pdfFieldName: "Middle name",
    canonicalPath: "debtor1.name.middle",
    type: "text",
    question: "1",
    required: false,
  },
  {
    label: "Debtor 1 Last Name",
    pdfFieldName: "Last name",
    canonicalPath: "debtor1.name.last",
    type: "text",
    question: "1",
    required: true,
  },
  {
    label: "Debtor 1 Suffix",
    pdfFieldName: "Suffix Sr Jr II III",
    canonicalPath: "debtor1.name.suffix",
    type: "text",
    question: "1",
    required: false,
  },

  // PART 1, Q1: DEBTOR 2 — Full Legal Name
  {
    label: "Debtor 2 First Name",
    pdfFieldName: "First name", // second instance — disambiguation needed
    canonicalPath: "debtor2.name.first",
    type: "text",
    question: "1",
    required: false, // only in joint
  },
  {
    label: "Debtor 2 Middle Name",
    pdfFieldName: "Middle name_2",
    canonicalPath: "debtor2.name.middle",
    type: "text",
    question: "1",
    required: false,
  },
  {
    label: "Debtor 2 Last Name",
    pdfFieldName: "Last name", // second instance
    canonicalPath: "debtor2.name.last",
    type: "text",
    question: "1",
    required: false,
  },
  {
    label: "Debtor 2 Suffix",
    pdfFieldName: "Suffix Sr Jr II III_2",
    canonicalPath: "debtor2.name.suffix",
    type: "text",
    question: "1",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 1, Q2: Other Names (last 8 years)
  // -------------------------------------------------------------------------
  {
    label: "Debtor 1 Alias 1 First",
    pdfFieldName: "First name_3",
    canonicalPath: "debtor1.aliases[0].first",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 1 Alias 1 Middle",
    pdfFieldName: "Middle name_3",
    canonicalPath: "debtor1.aliases[0].middle",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 1 Alias 1 Last",
    pdfFieldName: "Last name_3",
    canonicalPath: "debtor1.aliases[0].last",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 1 Alias 2 First",
    pdfFieldName: "First name_5",
    canonicalPath: "debtor1.aliases[1].first",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 1 Alias 2 Middle",
    pdfFieldName: "Middle name_5",
    canonicalPath: "debtor1.aliases[1].middle",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 1 Alias 2 Last",
    pdfFieldName: "Last name_5",
    canonicalPath: "debtor1.aliases[1].last",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 1 Business Name 1",
    pdfFieldName: "Business name",
    canonicalPath: "debtor1.businessNames[0]",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 1 Business Name 2",
    pdfFieldName: "Business name_3",
    canonicalPath: "debtor1.businessNames[1]",
    type: "text",
    question: "2",
    required: false,
  },
  // Debtor 2 aliases
  {
    label: "Debtor 2 Alias 1 First",
    pdfFieldName: "First name_4",
    canonicalPath: "debtor2.aliases[0].first",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 2 Alias 1 Middle",
    pdfFieldName: "Middle name_4",
    canonicalPath: "debtor2.aliases[0].middle",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 2 Alias 1 Last",
    pdfFieldName: "Last name_4",
    canonicalPath: "debtor2.aliases[0].last",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 2 Alias 2 First",
    pdfFieldName: "First name_6",
    canonicalPath: "debtor2.aliases[1].first",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 2 Alias 2 Middle",
    pdfFieldName: "Middle name_6",
    canonicalPath: "debtor2.aliases[1].middle",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 2 Alias 2 Last",
    pdfFieldName: "Last name_6",
    canonicalPath: "debtor2.aliases[1].last",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 2 Business Name 1",
    pdfFieldName: "Business name", // second instance
    canonicalPath: "debtor2.businessNames[0]",
    type: "text",
    question: "2",
    required: false,
  },
  {
    label: "Debtor 2 Business Name 2",
    pdfFieldName: "Business name_4",
    canonicalPath: "debtor2.businessNames[1]",
    type: "text",
    question: "2",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 1, Q3: SSN / ITIN
  // -------------------------------------------------------------------------
  {
    label: "Debtor 1 SSN Last 4",
    pdfFieldName: "SSNum",
    canonicalPath: "debtor1.ssnLast4",
    type: "text",
    question: "3",
    required: true,
  },
  {
    label: "Debtor 1 ITIN",
    pdfFieldName: "Debtor1 Tax Payer IDNum",
    canonicalPath: "debtor1.itin",
    type: "text",
    question: "3",
    required: false, // SSN or ITIN, not both
  },
  {
    label: "Debtor 2 SSN Last 4",
    pdfFieldName: "Debtor2 SSNum",
    canonicalPath: "debtor2.ssnLast4",
    type: "text",
    question: "3",
    required: false, // only in joint
  },
  {
    label: "Debtor 2 ITIN",
    pdfFieldName: "Tax Payer IDNum",
    canonicalPath: "debtor2.itin",
    type: "text",
    question: "3",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 1, Q4: EIN
  // -------------------------------------------------------------------------
  {
    label: "Debtor 1 EIN 1",
    pdfFieldName: "Employer Identification Number1",
    canonicalPath: "debtor1.eins[0]",
    type: "text",
    transform: "einFormat",
    question: "4",
    required: false,
  },
  {
    label: "Debtor 1 EIN 2",
    pdfFieldName: "Employer Identification Number2",
    canonicalPath: "debtor1.eins[1]",
    type: "text",
    transform: "einFormat",
    question: "4",
    required: false,
  },
  {
    label: "Debtor 2 EIN 1",
    pdfFieldName: "Employer Identification Number1", // second instance
    canonicalPath: "debtor2.eins[0]",
    type: "text",
    transform: "einFormat",
    question: "4",
    required: false,
  },
  {
    label: "Debtor 2 EIN 2",
    pdfFieldName: "Debtor2 Employer Identification Number2",
    canonicalPath: "debtor2.eins[1]",
    type: "text",
    transform: "einFormat",
    question: "4",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 1, Q5: Address
  // -------------------------------------------------------------------------
  {
    label: "Debtor 1 Street",
    pdfFieldName: "Street",
    canonicalPath: "debtor1.address.street1",
    type: "text",
    question: "5",
    required: true,
  },
  {
    label: "Debtor 1 Street 2",
    pdfFieldName: "Street1",
    canonicalPath: "debtor1.address.street2",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 1 City",
    pdfFieldName: "City",
    canonicalPath: "debtor1.address.city",
    type: "text",
    question: "5",
    required: true,
  },
  {
    label: "Debtor 1 State",
    pdfFieldName: "State",
    canonicalPath: "debtor1.address.state",
    type: "text",
    question: "5",
    required: true,
  },
  {
    label: "Debtor 1 ZIP",
    pdfFieldName: "ZIP Code",
    canonicalPath: "debtor1.address.zip",
    type: "text",
    question: "5",
    required: true,
  },
  {
    label: "Debtor 1 County",
    pdfFieldName: "County",
    canonicalPath: "debtor1.address.county",
    type: "text",
    question: "5",
    required: false,
  },
  // Debtor 1 mailing address (if different)
  {
    label: "Debtor 1 Mailing Street",
    pdfFieldName: "Street_2",
    canonicalPath: "debtor1.mailingAddress.street1",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 1 Mailing PO Box",
    pdfFieldName: "PO Box",
    canonicalPath: "debtor1.mailingAddress.poBox",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 1 Mailing City",
    pdfFieldName: "City_2",
    canonicalPath: "debtor1.mailingAddress.city",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 1 Mailing State",
    pdfFieldName: "State_2",
    canonicalPath: "debtor1.mailingAddress.state",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 1 Mailing ZIP",
    pdfFieldName: "ZIP Code_2",
    canonicalPath: "debtor1.mailingAddress.zip",
    type: "text",
    question: "5",
    required: false,
  },
  // Debtor 2 address
  {
    label: "Debtor 2 Street",
    pdfFieldName: "Street", // page 2, debtor 2 column
    canonicalPath: "debtor2.address.street1",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 2 Street 2",
    pdfFieldName: "Street2",
    canonicalPath: "debtor2.address.street2",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 2 City",
    pdfFieldName: "City", // page 2 debtor 2
    canonicalPath: "debtor2.address.city",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 2 State",
    pdfFieldName: "State", // page 2 debtor 2
    canonicalPath: "debtor2.address.state",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 2 ZIP",
    pdfFieldName: "ZIP",
    canonicalPath: "debtor2.address.zip",
    type: "text",
    question: "5",
    required: false,
  },
  {
    label: "Debtor 2 County",
    pdfFieldName: "County_2",
    canonicalPath: "debtor2.address.county",
    type: "text",
    question: "5",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 1, Q6: Venue Basis
  // -------------------------------------------------------------------------
  // These are unnamed checkboxes on page 2 — mapped by position
  {
    label: "D1 Venue: 180-day residence",
    pdfFieldName: "venue_d1_180day", // unnamed, positional
    canonicalPath: "debtor1.venueBasis",
    type: "checkbox",
    condition: (v) => v === "180day_residence",
    question: "6",
    required: true,
    statutoryRef: "28 U.S.C. § 1408",
  },
  {
    label: "D1 Venue: Other reason",
    pdfFieldName: "venue_d1_other",
    canonicalPath: "debtor1.venueBasis",
    type: "checkbox",
    condition: (v) => v === "other",
    question: "6",
    required: true,
  },
  {
    label: "D1 Venue explanation line 1",
    pdfFieldName: "See 28 USC  1408 1",
    canonicalPath: "debtor1.venueExplanation",
    type: "text",
    question: "6",
    required: false,
  },
  {
    label: "D1 Venue explanation line 2",
    pdfFieldName: "See 28 USC  1408 2",
    canonicalPath: "debtor1.venueExplanation",
    type: "text",
    question: "6",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 2, Q9: Prior Bankruptcies
  // -------------------------------------------------------------------------
  {
    label: "Prior Bankruptcy 1 District",
    pdfFieldName: "District",
    canonicalPath: "filing.priorBankruptcies[0].district",
    type: "text",
    question: "9",
    required: false,
  },
  {
    label: "Prior Bankruptcy 1 Date",
    pdfFieldName: "When",
    canonicalPath: "filing.priorBankruptcies[0].dateFiled",
    type: "text",
    transform: "formatDate",
    question: "9",
    required: false,
  },
  {
    label: "Prior Bankruptcy 1 Case Number",
    pdfFieldName: "Case number",
    canonicalPath: "filing.priorBankruptcies[0].caseNumber",
    type: "text",
    question: "9",
    required: false,
  },
  {
    label: "Prior Bankruptcy 2 District",
    pdfFieldName: "District_2",
    canonicalPath: "filing.priorBankruptcies[1].district",
    type: "text",
    question: "9",
    required: false,
  },
  {
    label: "Prior Bankruptcy 2 Date",
    pdfFieldName: "When_2",
    canonicalPath: "filing.priorBankruptcies[1].dateFiled",
    type: "text",
    transform: "formatDate",
    question: "9",
    required: false,
  },
  {
    label: "Prior Bankruptcy 2 Case Number",
    pdfFieldName: "Case number_2",
    canonicalPath: "filing.priorBankruptcies[1].caseNumber",
    type: "text",
    question: "9",
    required: false,
  },
  {
    label: "Prior Bankruptcy 3 District",
    pdfFieldName: "District_3",
    canonicalPath: "filing.priorBankruptcies[2].district",
    type: "text",
    question: "9",
    required: false,
  },
  {
    label: "Prior Bankruptcy 3 Date",
    pdfFieldName: "When_3",
    canonicalPath: "filing.priorBankruptcies[2].dateFiled",
    type: "text",
    transform: "formatDate",
    question: "9",
    required: false,
  },
  {
    label: "Prior Bankruptcy 3 Case Number",
    pdfFieldName: "Case number_3",
    canonicalPath: "filing.priorBankruptcies[2].caseNumber",
    type: "text",
    question: "9",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 2, Q10: Related Cases
  // -------------------------------------------------------------------------
  {
    label: "Related Case 1 Debtor",
    pdfFieldName: "Debtor",
    canonicalPath: "filing.relatedCases[0].debtorName",
    type: "text",
    question: "10",
    required: false,
  },
  {
    label: "Related Case 1 Relationship",
    pdfFieldName: "Relationship to you",
    canonicalPath: "filing.relatedCases[0].relationship",
    type: "text",
    question: "10",
    required: false,
  },
  {
    label: "Related Case 1 District",
    pdfFieldName: "District_4",
    canonicalPath: "filing.relatedCases[0].district",
    type: "text",
    question: "10",
    required: false,
  },
  {
    label: "Related Case 1 Date",
    pdfFieldName: "When_4",
    canonicalPath: "filing.relatedCases[0].dateFiled",
    type: "text",
    transform: "formatDate",
    question: "10",
    required: false,
  },
  {
    label: "Related Case 1 Case Number",
    pdfFieldName: "Case number if known_3",
    canonicalPath: "filing.relatedCases[0].caseNumber",
    type: "text",
    question: "10",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 3, Q12: Sole Proprietorship
  // -------------------------------------------------------------------------
  {
    label: "Business Name",
    pdfFieldName: "Name of business if any",
    canonicalPath: "business.soleProprietorships[0].name",
    type: "text",
    question: "12",
    required: false,
  },
  {
    label: "Business Street",
    pdfFieldName: "Business Street address",
    canonicalPath: "business.soleProprietorships[0].address.street1",
    type: "text",
    question: "12",
    required: false,
  },
  {
    label: "Business Street 2",
    pdfFieldName: "Business Street address2",
    canonicalPath: "business.soleProprietorships[0].address.street2",
    type: "text",
    question: "12",
    required: false,
  },
  {
    label: "Business City",
    pdfFieldName: "Business City",
    canonicalPath: "business.soleProprietorships[0].address.city",
    type: "text",
    question: "12",
    required: false,
  },
  {
    label: "Business State",
    pdfFieldName: "Business State",
    canonicalPath: "business.soleProprietorships[0].address.state",
    type: "text",
    question: "12",
    required: false,
  },
  {
    label: "Business ZIP",
    pdfFieldName: "ZIP Code_5",
    canonicalPath: "business.soleProprietorships[0].address.zip",
    type: "text",
    question: "12",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 4, Q14: Hazardous Property
  // -------------------------------------------------------------------------
  {
    label: "Hazard Description Line 1",
    pdfFieldName: "What is the hazard1",
    canonicalPath: "hazardousProperty.hazardDescription",
    type: "text",
    question: "14",
    required: false,
  },
  {
    label: "Hazard Description Line 2",
    pdfFieldName: "What is the hazard2",
    canonicalPath: "hazardousProperty.hazardDescription",
    type: "text",
    question: "14",
    required: false,
  },
  {
    label: "Attention Reason Line 1",
    pdfFieldName: "If immediate attention is needed why is it needed1",
    canonicalPath: "hazardousProperty.attentionReason",
    type: "text",
    question: "14",
    required: false,
  },
  {
    label: "Attention Reason Line 2",
    pdfFieldName: "If immediate attention is needed why is it needed2",
    canonicalPath: "hazardousProperty.attentionReason",
    type: "text",
    question: "14",
    required: false,
  },
  {
    label: "Hazard Property Street",
    pdfFieldName: "Street_6",
    canonicalPath: "hazardousProperty.propertyAddress.street1",
    type: "text",
    question: "14",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 6, Q16c: Other Debt Description
  // -------------------------------------------------------------------------
  {
    label: "Other Debt Type Description",
    pdfFieldName: "16c State the type of debts you owe that are not consumer debts or business debts",
    canonicalPath: "reporting.otherDebtDescription",
    type: "text",
    question: "16c",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 7: Signatures — Debtor
  // -------------------------------------------------------------------------
  {
    label: "Debtor 1 Signature Date",
    pdfFieldName: "Executed on",
    canonicalPath: "debtor1SignatureDate",
    type: "text",
    transform: "formatDate",
    question: "signature",
    required: true,
  },
  {
    label: "Debtor 2 Signature Date",
    pdfFieldName: "Executed on", // second instance
    canonicalPath: "debtor2SignatureDate",
    type: "text",
    transform: "formatDate",
    question: "signature",
    required: false,
  },

  // -------------------------------------------------------------------------
  // PART 7: Attorney Section (Page 8)
  // -------------------------------------------------------------------------
  {
    label: "Attorney Signature Date",
    pdfFieldName: "Date signed",
    canonicalPath: "attorney.signatureDate",
    type: "text",
    transform: "formatDate",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney Printed Name",
    pdfFieldName: "Printed name",
    canonicalPath: "attorney.name",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney Firm Name",
    pdfFieldName: "Firm name",
    canonicalPath: "attorney.firmName",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney Street",
    pdfFieldName: "Street address_2",
    canonicalPath: "attorney.address.street1",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney Street 2",
    pdfFieldName: "Street address_3",
    canonicalPath: "attorney.address.street2",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney City",
    pdfFieldName: "City", // page 8
    canonicalPath: "attorney.address.city",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney State",
    pdfFieldName: "State", // page 8
    canonicalPath: "attorney.address.state",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney ZIP",
    pdfFieldName: "Zip",
    canonicalPath: "attorney.address.zip",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney Phone",
    pdfFieldName: "phone",
    canonicalPath: "attorney.phone",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney Email",
    pdfFieldName: "Email address",
    canonicalPath: "attorney.email",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney Bar Number",
    pdfFieldName: "Bar number",
    canonicalPath: "attorney.barNumber",
    type: "text",
    question: "attorney",
    required: false,
  },
  {
    label: "Attorney Bar State",
    pdfFieldName: "Bar State",
    canonicalPath: "attorney.barState",
    type: "text",
    question: "attorney",
    required: false,
  },

  // -------------------------------------------------------------------------
  // Pro Se Section (Page 9)
  // -------------------------------------------------------------------------
  {
    label: "Pro Se Preparer Name",
    pdfFieldName: "Name of person payed to help file",
    canonicalPath: "proSe.debtor1.preparerName",
    type: "text",
    question: "proSe",
    required: false,
  },
  {
    label: "Pro Se D1 Contact Phone",
    pdfFieldName: "Contact phone",
    canonicalPath: "proSe.debtor1.phone",
    type: "text",
    question: "proSe",
    required: false,
  },
  {
    label: "Pro Se D1 Cell Phone",
    pdfFieldName: "Cell phone",
    canonicalPath: "proSe.debtor1.cellPhone",
    type: "text",
    question: "proSe",
    required: false,
  },
  {
    label: "Pro Se D1 Email",
    pdfFieldName: "Email address", // page 9
    canonicalPath: "proSe.debtor1.email",
    type: "text",
    question: "proSe",
    required: false,
  },
  {
    label: "Pro Se D2 Contact Phone",
    pdfFieldName: "Contact phone_2",
    canonicalPath: "proSe.debtor2.phone",
    type: "text",
    question: "proSe",
    required: false,
  },
  {
    label: "Pro Se D2 Cell Phone",
    pdfFieldName: "Cell phone", // page 9 second instance
    canonicalPath: "proSe.debtor2.cellPhone",
    type: "text",
    question: "proSe",
    required: false,
  },
  {
    label: "Pro Se D2 Email",
    pdfFieldName: "Email address_2",
    canonicalPath: "proSe.debtor2.email",
    type: "text",
    question: "proSe",
    required: false,
  },
];

// =============================================================================
// CHECKBOX MAPPING — Unnamed buttons mapped by page + position
// =============================================================================
// B101 has ~100 unnamed /Btn fields. These need positional resolution.
// This table maps them by page number and ordinal position on that page.
// In production, you'd resolve these via annotation rectangle coordinates.
// =============================================================================

export interface CheckboxMapping {
  page: number;
  ordinal: number; // 0-indexed position among unnamed /Btn on this page
  label: string;
  canonicalPath: string;
  condition: (canonicalData: CaseCanonicalType) => boolean;
  question: string;
  statutoryRef?: string;
}

export const B101_CHECKBOX_MAP: CheckboxMapping[] = [
  // Page 3 — Q7: Chapter selection (radio group)
  { page: 3, ordinal: 0, label: "Chapter 7", canonicalPath: "filing.chapter", condition: (d) => d.filing.chapter === "7", question: "7" },
  { page: 3, ordinal: 1, label: "Chapter 11", canonicalPath: "filing.chapter", condition: (d) => d.filing.chapter === "11", question: "7" },
  { page: 3, ordinal: 2, label: "Chapter 12", canonicalPath: "filing.chapter", condition: (d) => d.filing.chapter === "12", question: "7" },
  { page: 3, ordinal: 3, label: "Chapter 13", canonicalPath: "filing.chapter", condition: (d) => d.filing.chapter === "13", question: "7" },

  // Page 3 — Q8: Fee payment
  { page: 3, ordinal: 4, label: "Pay full fee", canonicalPath: "filing.feePayment", condition: (d) => d.filing.feePayment === "full", question: "8" },
  { page: 3, ordinal: 5, label: "Pay in installments", canonicalPath: "filing.feePayment", condition: (d) => d.filing.feePayment === "installments", question: "8" },
  { page: 3, ordinal: 6, label: "Request fee waiver", canonicalPath: "filing.feePayment", condition: (d) => d.filing.feePayment === "waiver_request", question: "8" },

  // Page 3 — Q9: Prior bankruptcies
  { page: 3, ordinal: 7, label: "No prior bankruptcies", canonicalPath: "filing.hasPriorBankruptcies", condition: (d) => !d.filing.hasPriorBankruptcies, question: "9" },
  { page: 3, ordinal: 8, label: "Yes prior bankruptcies", canonicalPath: "filing.hasPriorBankruptcies", condition: (d) => d.filing.hasPriorBankruptcies, question: "9" },

  // Page 3 — Q10: Related cases
  { page: 3, ordinal: 9, label: "No related cases", canonicalPath: "filing.hasRelatedCases", condition: (d) => !d.filing.hasRelatedCases, question: "10" },
  { page: 3, ordinal: 10, label: "Yes related cases", canonicalPath: "filing.hasRelatedCases", condition: (d) => d.filing.hasRelatedCases, question: "10" },

  // Page 3 — Q11: Rental/eviction
  { page: 3, ordinal: 11, label: "Not a renter", canonicalPath: "filing.isRenter", condition: (d) => !d.filing.isRenter, question: "11" },
  { page: 3, ordinal: 12, label: "Is a renter", canonicalPath: "filing.isRenter", condition: (d) => d.filing.isRenter, question: "11" },
  { page: 3, ordinal: 13, label: "No eviction judgment", canonicalPath: "filing.hasEvictionJudgment", condition: (d) => d.filing.isRenter && !d.filing.hasEvictionJudgment, question: "11" },
  { page: 3, ordinal: 14, label: "Yes eviction judgment", canonicalPath: "filing.hasEvictionJudgment", condition: (d) => d.filing.isRenter && d.filing.hasEvictionJudgment, question: "11" },

  // Page 4 — Q12: Sole proprietor
  { page: 4, ordinal: 0, label: "Not sole proprietor", canonicalPath: "business.isSoleProprietor", condition: (d) => !d.business.isSoleProprietor, question: "12" },
  { page: 4, ordinal: 1, label: "Is sole proprietor", canonicalPath: "business.isSoleProprietor", condition: (d) => d.business.isSoleProprietor, question: "12" },

  // Page 4 — Q12: Business type (within sole proprietor)
  { page: 4, ordinal: 2, label: "Health care business", canonicalPath: "business.soleProprietorships[0].businessType", condition: (d) => d.business.soleProprietorships?.[0]?.businessType === "health_care", question: "12", statutoryRef: "11 U.S.C. § 101(27A)" },
  { page: 4, ordinal: 3, label: "Single asset real estate", canonicalPath: "business.soleProprietorships[0].businessType", condition: (d) => d.business.soleProprietorships?.[0]?.businessType === "single_asset_real_estate", question: "12", statutoryRef: "11 U.S.C. § 101(51B)" },
  { page: 4, ordinal: 4, label: "Stockbroker", canonicalPath: "business.soleProprietorships[0].businessType", condition: (d) => d.business.soleProprietorships?.[0]?.businessType === "stockbroker", question: "12", statutoryRef: "11 U.S.C. § 101(53A)" },
  { page: 4, ordinal: 5, label: "Commodity broker", canonicalPath: "business.soleProprietorships[0].businessType", condition: (d) => d.business.soleProprietorships?.[0]?.businessType === "commodity_broker", question: "12", statutoryRef: "11 U.S.C. § 101(6)" },
  { page: 4, ordinal: 6, label: "None of the above", canonicalPath: "business.soleProprietorships[0].businessType", condition: (d) => d.business.soleProprietorships?.[0]?.businessType === "none", question: "12" },

  // Page 4 — Q13: Chapter 11 small business
  { page: 4, ordinal: 7, label: "Not filing Ch11", canonicalPath: "filing.chapter", condition: (d) => d.filing.chapter !== "11", question: "13" },
  { page: 4, ordinal: 8, label: "Ch11 not small biz", canonicalPath: "business.isSmallBusinessDebtor", condition: (d) => d.filing.chapter === "11" && !d.business.isSmallBusinessDebtor, question: "13" },

  // Page 5 — Q14: Hazardous property
  { page: 5, ordinal: 0, label: "No hazardous property", canonicalPath: "hazardousProperty.hasHazardousProperty", condition: (d) => !d.hazardousProperty.hasHazardousProperty, question: "14" },
  { page: 5, ordinal: 1, label: "Yes hazardous property", canonicalPath: "hazardousProperty.hasHazardousProperty", condition: (d) => d.hazardousProperty.hasHazardousProperty, question: "14" },

  // Page 7 — Q16: Debt type
  { page: 7, ordinal: 0, label: "Debts not primarily consumer", canonicalPath: "reporting.debtType", condition: (d) => d.reporting.debtType !== "consumer", question: "16a" },
  { page: 7, ordinal: 1, label: "Debts primarily consumer", canonicalPath: "reporting.debtType", condition: (d) => d.reporting.debtType === "consumer", question: "16a" },
  { page: 7, ordinal: 2, label: "Debts not primarily business", canonicalPath: "reporting.debtType", condition: (d) => d.reporting.debtType !== "business", question: "16b" },
  { page: 7, ordinal: 3, label: "Debts primarily business", canonicalPath: "reporting.debtType", condition: (d) => d.reporting.debtType === "business", question: "16b" },

  // Q17: Chapter 7 funds
  { page: 7, ordinal: 4, label: "Not filing Ch7", canonicalPath: "filing.chapter", condition: (d) => d.filing.chapter !== "7", question: "17" },
  { page: 7, ordinal: 5, label: "Filing Ch7", canonicalPath: "filing.chapter", condition: (d) => d.filing.chapter === "7", question: "17" },
  { page: 7, ordinal: 6, label: "No Ch7 funds available", canonicalPath: "reporting.ch7FundsAvailable", condition: (d) => d.filing.chapter === "7" && !d.reporting.ch7FundsAvailable, question: "17" },
  { page: 7, ordinal: 7, label: "Yes Ch7 funds available", canonicalPath: "reporting.ch7FundsAvailable", condition: (d) => d.filing.chapter === "7" && d.reporting.ch7FundsAvailable, question: "17" },

  // Q18-20: Estimates — these are radio-like ranges, many unnamed checkboxes
  // In production, map these by bbox coordinates from the PDF
  // Omitted here for brevity — pattern is identical

  // Page 9 — Pro Se acknowledgments
  { page: 9, ordinal: 0, label: "Not aware of consequences", canonicalPath: "proSe.debtor1.awareOfConsequences", condition: (d) => d.proSe?.debtor1 && !d.proSe.debtor1.awareOfConsequences, question: "proSe" },
  { page: 9, ordinal: 1, label: "Aware of consequences", canonicalPath: "proSe.debtor1.awareOfConsequences", condition: (d) => d.proSe?.debtor1?.awareOfConsequences, question: "proSe" },
  { page: 9, ordinal: 2, label: "Not aware of fraud risks", canonicalPath: "proSe.debtor1.awareOfFraudRisks", condition: (d) => d.proSe?.debtor1 && !d.proSe.debtor1.awareOfFraudRisks, question: "proSe" },
  { page: 9, ordinal: 3, label: "Aware of fraud risks", canonicalPath: "proSe.debtor1.awareOfFraudRisks", condition: (d) => d.proSe?.debtor1?.awareOfFraudRisks, question: "proSe" },
  { page: 9, ordinal: 4, label: "Did not pay non-attorney", canonicalPath: "proSe.debtor1.paidNonAttorneyPreparer", condition: (d) => d.proSe?.debtor1 && !d.proSe.debtor1.paidNonAttorneyPreparer, question: "proSe" },
  { page: 9, ordinal: 5, label: "Paid non-attorney", canonicalPath: "proSe.debtor1.paidNonAttorneyPreparer", condition: (d) => d.proSe?.debtor1?.paidNonAttorneyPreparer, question: "proSe" },
];

// =============================================================================
// READINESS VALIDATORS — B101-specific
// =============================================================================

export interface ReadinessIssue {
  code: string;
  severity: "blocking" | "warning";
  message: string;
  question: string;
  statutoryRef?: string;
  fix: {
    kind: "openField" | "openIntake" | "uploadDocument" | "attorneyInput";
    fieldPath: string;
  };
}

/**
 * Run all B101 readiness checks against a canonical case.
 * Returns an array of issues. Empty array = ready to generate.
 */
export function validateB101Readiness(
  caseData: CaseCanonicalType
): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];

  // --- BLOCKING: Required identity fields ---
  if (!caseData.debtor1?.name?.first) {
    issues.push({
      code: "B101.D1_FIRST_NAME",
      severity: "blocking",
      message: "Debtor 1 first name is required",
      question: "1",
      fix: { kind: "openField", fieldPath: "debtor1.name.first" },
    });
  }
  if (!caseData.debtor1?.name?.last) {
    issues.push({
      code: "B101.D1_LAST_NAME",
      severity: "blocking",
      message: "Debtor 1 last name is required",
      question: "1",
      fix: { kind: "openField", fieldPath: "debtor1.name.last" },
    });
  }
  if (!caseData.debtor1?.ssnLast4 && !caseData.debtor1?.itin) {
    issues.push({
      code: "B101.D1_SSN_OR_ITIN",
      severity: "blocking",
      message: "Debtor 1 SSN (last 4) or ITIN is required",
      question: "3",
      fix: { kind: "openField", fieldPath: "debtor1.ssnLast4" },
    });
  }

  // --- BLOCKING: Address ---
  if (!caseData.debtor1?.address?.street1) {
    issues.push({
      code: "B101.D1_ADDRESS",
      severity: "blocking",
      message: "Debtor 1 street address is required",
      question: "5",
      fix: { kind: "openField", fieldPath: "debtor1.address.street1" },
    });
  }
  if (!caseData.debtor1?.address?.city) {
    issues.push({
      code: "B101.D1_CITY",
      severity: "blocking",
      message: "Debtor 1 city is required",
      question: "5",
      fix: { kind: "openField", fieldPath: "debtor1.address.city" },
    });
  }
  if (!caseData.debtor1?.address?.state) {
    issues.push({
      code: "B101.D1_STATE",
      severity: "blocking",
      message: "Debtor 1 state is required",
      question: "5",
      fix: { kind: "openField", fieldPath: "debtor1.address.state" },
    });
  }
  if (!caseData.debtor1?.address?.zip) {
    issues.push({
      code: "B101.D1_ZIP",
      severity: "blocking",
      message: "Debtor 1 ZIP code is required",
      question: "5",
      fix: { kind: "openField", fieldPath: "debtor1.address.zip" },
    });
  }

  // --- BLOCKING: Filing metadata ---
  if (!caseData.filing?.district) {
    issues.push({
      code: "B101.DISTRICT",
      severity: "blocking",
      message: "Bankruptcy district is required",
      question: "header",
      fix: { kind: "attorneyInput", fieldPath: "filing.district" },
    });
  }
  if (!caseData.filing?.chapter) {
    issues.push({
      code: "B101.CHAPTER",
      severity: "blocking",
      message: "Chapter selection is required",
      question: "7",
      fix: { kind: "attorneyInput", fieldPath: "filing.chapter" },
    });
  }

  // --- BLOCKING: Venue basis ---
  if (!caseData.debtor1?.venueBasis) {
    issues.push({
      code: "B101.VENUE",
      severity: "blocking",
      message: "Venue basis is required",
      question: "6",
      statutoryRef: "28 U.S.C. § 1408",
      fix: { kind: "openField", fieldPath: "debtor1.venueBasis" },
    });
  }
  if (caseData.debtor1?.venueBasis === "other" && !caseData.debtor1?.venueExplanation) {
    issues.push({
      code: "B101.VENUE_EXPLANATION",
      severity: "blocking",
      message: "Venue explanation is required when not based on 180-day residence",
      question: "6",
      statutoryRef: "28 U.S.C. § 1408",
      fix: { kind: "openField", fieldPath: "debtor1.venueExplanation" },
    });
  }

  // --- BLOCKING: Credit counseling ---
  if (!caseData.creditCounseling?.debtor1?.status) {
    issues.push({
      code: "B101.CREDIT_COUNSELING",
      severity: "blocking",
      message: "Credit counseling status is required — case may be dismissed without it",
      question: "15",
      statutoryRef: "11 U.S.C. § 109(h)",
      fix: { kind: "uploadDocument", fieldPath: "creditCounseling.debtor1.status" },
    });
  }

  // --- BLOCKING: Debt type ---
  if (!caseData.reporting?.debtType) {
    issues.push({
      code: "B101.DEBT_TYPE",
      severity: "blocking",
      message: "Debt classification (consumer/business/other) is required",
      question: "16",
      fix: { kind: "openField", fieldPath: "reporting.debtType" },
    });
  }

  // --- BLOCKING: Estimates ---
  if (!caseData.reporting?.estimatedCreditors) {
    issues.push({
      code: "B101.EST_CREDITORS",
      severity: "blocking",
      message: "Estimated number of creditors is required",
      question: "18",
      fix: { kind: "openField", fieldPath: "reporting.estimatedCreditors" },
    });
  }
  if (!caseData.reporting?.estimatedAssets) {
    issues.push({
      code: "B101.EST_ASSETS",
      severity: "blocking",
      message: "Estimated asset value is required",
      question: "19",
      fix: { kind: "openField", fieldPath: "reporting.estimatedAssets" },
    });
  }
  if (!caseData.reporting?.estimatedLiabilities) {
    issues.push({
      code: "B101.EST_LIABILITIES",
      severity: "blocking",
      message: "Estimated liability value is required",
      question: "20",
      fix: { kind: "openField", fieldPath: "reporting.estimatedLiabilities" },
    });
  }

  // --- BLOCKING: Fee payment ---
  if (!caseData.filing?.feePayment) {
    issues.push({
      code: "B101.FEE_PAYMENT",
      severity: "blocking",
      message: "Fee payment method is required",
      question: "8",
      fix: { kind: "attorneyInput", fieldPath: "filing.feePayment" },
    });
  }
  if (caseData.filing?.feePayment === "waiver_request" && caseData.filing?.chapter !== "7") {
    issues.push({
      code: "B101.FEE_WAIVER_CH7_ONLY",
      severity: "blocking",
      message: "Fee waiver is only available for Chapter 7 filings",
      question: "8",
      fix: { kind: "attorneyInput", fieldPath: "filing.feePayment" },
    });
  }

  // --- WARNINGS ---
  if (caseData.filing?.isJointFiling && !caseData.debtor2?.name?.first) {
    issues.push({
      code: "B101.D2_NAME_MISSING",
      severity: "warning",
      message: "Joint filing indicated but Debtor 2 name is missing",
      question: "1",
      fix: { kind: "openField", fieldPath: "debtor2.name.first" },
    });
  }

  if (caseData.filing?.isJointFiling && !caseData.creditCounseling?.debtor2?.status) {
    issues.push({
      code: "B101.D2_CREDIT_COUNSELING",
      severity: "warning",
      message: "Debtor 2 credit counseling status not set — required for joint filing",
      question: "15",
      statutoryRef: "11 U.S.C. § 109(h)",
      fix: { kind: "uploadDocument", fieldPath: "creditCounseling.debtor2.status" },
    });
  }

  if (caseData.filing?.chapter === "7" && caseData.reporting?.ch7FundsAvailable === undefined) {
    issues.push({
      code: "B101.CH7_FUNDS",
      severity: "warning",
      message: "Chapter 7 fund availability estimate not set",
      question: "17",
      fix: { kind: "attorneyInput", fieldPath: "reporting.ch7FundsAvailable" },
    });
  }

  return issues;
}

// =============================================================================
// FORM PACK INTERFACE — reusable for all forms
// =============================================================================

export interface FormPack {
  formId: string;           // e.g. "B101"
  formName: string;         // "Voluntary Petition for Individuals"
  version: string;          // "06/24"
  fieldMappings: FieldMapping[];
  checkboxMappings: CheckboxMapping[];
  validate: (caseData: CaseCanonicalType) => ReadinessIssue[];
}

export const B101_PACK: FormPack = {
  formId: "B101",
  formName: "Voluntary Petition for Individuals Filing for Bankruptcy",
  version: "06/24",
  fieldMappings: B101_FIELD_MAP,
  checkboxMappings: B101_CHECKBOX_MAP,
  validate: validateB101Readiness,
};
