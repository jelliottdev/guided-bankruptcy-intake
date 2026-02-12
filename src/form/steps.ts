import type { Answers } from './types';
import type { Step } from './types';
import {
  getBankAccountCount,
  getRealEstateCount,
  getVehicleCount,
  hasAnySelectedExceptNone,
  hasBankAccounts,
  hasRealEstate,
  hasSecurityDeposits,
  hasVehicles,
  isJointFiling,
} from '../utils/logic';

function always(): boolean {
  return true;
}

// Step 1 — Filing Setup
const stepFilingSetup: Step = {
  id: 'filing_setup',
  title: 'Filing Setup',
  description: 'Choose whether you are filing alone or with your spouse.',
  showIf: always,
  fields: [
    {
      id: 'filing_setup',
      type: 'radio',
      label: 'How are you filing your bankruptcy case?',
      required: true,
      helper: 'Joint filing means both spouses are included in the same bankruptcy case.',
      options: [
        { value: 'Filing alone', label: 'Filing by myself' },
        { value: 'Filing with spouse', label: 'Filing jointly with my spouse' },
      ],
    },
  ],
};

// Step 2a — Debtor Identity (name, other names, SSN last 4, DOB)
const stepDebtorIdentity: Step = {
  id: 'debtor_identity',
  title: 'Your identity',
  description: 'We need your legal name and a few details to match court and credit records.',
  reassurance: 'If you\'re unsure, enter your best estimate. Your attorney will confirm details with you.',
  showIf: always,
  fields: [
    {
      id: 'debtor_full_name',
      type: 'text',
      label: 'Full legal name (exactly as shown on your ID)',
      required: true,
      helper: 'Use your current legal name — not nicknames. Example: Jane Marie Smith.',
    },
    {
      id: 'debtor_other_names',
      type: 'text',
      label: 'Other names you used in the last 6 years',
      helper: 'Include maiden names, prior married names, or legal name changes. Leave blank if none.',
    },
    {
      id: 'debtor_ssn_last4',
      type: 'text',
      label: 'Social Security Number — last 4 digits only',
      required: true,
      placeholder: '1234',
      helper: 'Only the last 4 digits are needed here for security.',
      whyWeAsk: 'Used to match credit reports and court forms.',
      groupStart: true,
    },
    {
      id: 'debtor_dob',
      type: 'date',
      label: 'Date of Birth',
      required: true,
      whyWeAsk: 'Required on bankruptcy paperwork.',
    },
  ],
};

// Step 2b — Debtor Contact (phone, email, address, mailing, county, history)
const stepDebtorContact: Step = {
  id: 'debtor_contact',
  title: 'Contact & address',
  description: 'How we can reach you and where you live (required for court filings).',
  reassurance: 'If you\'re unsure, enter your best estimate. Your attorney will confirm details with you.',
  showIf: always,
  fields: [
    {
      id: 'debtor_phone',
      type: 'text',
      label: 'Phone Number',
      required: true,
      placeholder: '(555) 555-5555',
      helper: 'Best number to reach you. We\'ll use it only for your case.',
    },
    {
      id: 'debtor_email',
      type: 'email',
      label: 'Email Address',
      required: true,
      placeholder: 'name@email.com',
      helper: 'We\'ll send important updates and documents here.',
    },
    {
      id: 'debtor_address',
      type: 'textarea',
      label: 'Current Street Address',
      required: true,
      helper: 'Street, apartment/unit if any, city, state, and ZIP.',
      groupStart: true,
    },
    {
      id: 'mailing_different',
      type: 'radio',
      label: 'Is your mailing address different from your current street address?',
      required: true,
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'mailing_address',
      type: 'textarea',
      label: 'Mailing Address (if different)',
      required: false,
      showIf: (a) => a['mailing_different'] === 'Yes',
    },
    {
      id: 'county',
      type: 'text',
      label: 'County of Residence',
      required: true,
      helper: 'The county where you live (e.g. Cook County, Los Angeles County).',
      groupStart: true,
    },
    {
      id: 'addresses_6_years',
      type: 'textarea',
      label: 'All addresses where you lived in the last 6 years',
      helper: 'List cities and states if you don\'t remember full street addresses.',
    },
    {
      id: 'business_names',
      type: 'textarea',
      label: 'Business names you have used in the last 6 years',
      helper: 'Leave blank if none. Include side businesses or DBA names.',
    },
    {
      id: 'prior_bankruptcy',
      type: 'radio',
      label: 'Have you filed bankruptcy before?',
      required: true,
      groupStart: true,
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'prior_bankruptcy_details',
      type: 'textarea',
      label: 'Prior Bankruptcy Details (If Yes)',
      helper: 'Include chapter type, year filed, and whether you received a discharge (if known).',
      showIf: (a) => a['prior_bankruptcy'] === 'Yes',
    },
  ],
};

// Step 3 — Spouse (only if joint)
const stepSpouse: Step = {
  id: 'spouse',
  title: 'Spouse Information',
  description: 'Only complete this section if you are filing jointly with your spouse.',
  showIf: isJointFiling,
  fields: [
    { id: 'spouse_full_name', type: 'text', label: 'Spouse full legal name (exactly as shown on ID)', required: true },
    { id: 'spouse_other_names', type: 'text', label: 'Spouse other names used in the last 6 years' },
    {
      id: 'spouse_ssn_last4',
      type: 'text',
      label: 'Spouse Social Security Number — Last 4 Digits Only',
      required: true,
      placeholder: '1234',
      whyWeAsk: 'Used to match credit reports and court forms.',
    },
    {
      id: 'spouse_dob',
      type: 'date',
      label: 'Spouse Date of Birth',
      required: true,
      whyWeAsk: 'Required on bankruptcy paperwork.',
    },
    {
      id: 'spouse_phone',
      type: 'text',
      label: 'Spouse Phone Number',
      required: true,
      placeholder: '(555) 555-5555',
    },
    {
      id: 'spouse_email',
      type: 'email',
      label: 'Spouse Email Address',
      required: true,
      placeholder: 'name@email.com',
    },
  ],
};

// Step 4 — Urgency & Business Flags
const URGENCY_NONE = 'None of these apply';
const stepUrgency: Step = {
  id: 'urgency',
  title: 'Immediate Collection or Legal Actions',
  description: 'Tell us if anything urgent is happening. This helps your attorney act quickly.',
  showIf: always,
  fields: [
    {
      id: 'urgency_flags',
      type: 'checkbox',
      label: 'Which of these apply?',
      options: [
        { value: 'Wage garnishment is currently active or pending', label: 'Active wage garnishment' },
        { value: 'Bank account levy is pending', label: 'Bank account frozen or levy pending' },
        { value: 'Foreclosure on your home is pending (date:)', label: 'Foreclosure sale scheduled' },
        { value: 'Risk of vehicle repossession (date:)', label: 'Vehicle repossession risk' },
        { value: 'Utility shutoff notice received (date:)', label: 'Utility shutoff notice received' },
        { value: URGENCY_NONE, label: URGENCY_NONE, noneOfAbove: true },
      ],
    },
    {
      id: 'foreclosure_date',
      type: 'text',
      label: 'Foreclosure date (if known)',
      helper: 'Enter the date if you know it — estimate if needed.',
      showIf: (a) => {
        const v = a['urgency_flags'];
        return Array.isArray(v) && v.includes('Foreclosure on your home is pending (date:)');
      },
    },
    {
      id: 'repossession_date',
      type: 'text',
      label: 'Repossession date (if known)',
      helper: 'Enter the date if you know it — estimate if needed.',
      showIf: (a) => {
        const v = a['urgency_flags'];
        return Array.isArray(v) && v.includes('Risk of vehicle repossession (date:)');
      },
    },
    {
      id: 'shutoff_date',
      type: 'text',
      label: 'Shutoff date (if known)',
      helper: 'Enter the date if you know it — estimate if needed.',
      showIf: (a) => {
        const v = a['urgency_flags'];
        return Array.isArray(v) && v.includes('Utility shutoff notice received (date:)');
      },
    },
    {
      id: 'self_employed',
      type: 'radio',
      label: 'Are you currently self-employed or running a business?',
      required: true,
      helper: 'Includes side businesses, contract work, and sole proprietorships.',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'business_name_type',
      type: 'textarea',
      label: 'Business Name and Type',
      showIf: (a) => a['self_employed'] === 'Yes',
    },
    {
      id: 'cosigner_debts',
      type: 'radio',
      label: 'Do any of your debts have a co-signer or co-borrower?',
      required: true,
      helper: 'A co-signer is someone else legally responsible for the same debt.',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'cosigner_details',
      type: 'textarea',
      label: 'Co-signer Name(s) and which debt(s)',
      showIf: (a) => a['cosigner_debts'] === 'Yes',
    },
  ],
};

// Step 5 — Real Estate (only if owns)
function buildRealEstateFields(): Step['fields'] {
  const base: Step['fields'] = [
    {
      id: 'real_estate_ownership',
      type: 'radio',
      label: 'Do you own real estate or have a legal interest in any property?',
      required: true,
      options: [
        { value: 'Yes, I own real estate', label: 'Yes, I own real estate' },
        { value: 'No, I do not own real estate', label: 'No, I do not own real estate' },
      ],
    },
    {
      id: 'real_estate_count',
      type: 'select',
      label: 'If Yes, how many properties? (Maximum 3)',
      required: true,
      showIf: hasRealEstate,
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ],
    },
  ];
  for (let n = 1; n <= 3; n++) {
    const prefix = `property_${n}_`;
    base.push(
      {
        id: `${prefix}address`,
        type: 'text',
        label: `Property ${n} Address`,
        required: true,
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
      },
      {
        id: `${prefix}type`,
        type: 'select',
        label: `Property ${n} Type`,
        required: true,
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
        options: [
          { value: 'Primary Residence', label: 'Primary Residence' },
          { value: 'Rental Property', label: 'Rental Property' },
          { value: 'Land', label: 'Land' },
          { value: 'Timeshare', label: 'Timeshare' },
          { value: 'Other', label: 'Other' },
        ],
      },
      {
        id: `${prefix}value`,
        type: 'text',
        label: `Property ${n} — Estimated property value (what it could sell for today)`,
        helper: 'Use a rough market estimate — not your purchase price.',
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
      },
      {
        id: `${prefix}mortgage`,
        type: 'radio',
        label: `Does Property ${n} have a mortgage or lien?`,
        required: true,
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
        options: [
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ],
      },
      {
        id: `${prefix}mortgage_details`,
        type: 'textarea',
        label: `Property ${n} Mortgage Details`,
        helper: 'Copy from your latest mortgage statement if available.',
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n && a[`${prefix}mortgage`] === 'Yes',
      },
      {
        id: `${prefix}plan`,
        type: 'radio',
        label: `What do you want to do with this property?`,
        required: true,
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
        options: [
          { value: 'Keep the property', label: 'Keep and continue paying' },
          { value: 'Surrender the property (let it go)', label: 'Surrender (give up the property)' },
          { value: 'Not Sure', label: 'Not sure yet' },
        ],
      },
      {
        id: `${prefix}hoa`,
        type: 'radio',
        label: `Does Property ${n} have an HOA (Homeowners Association)?`,
        required: true,
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
        options: [
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ],
      },
      {
        id: `${prefix}hoa_details`,
        type: 'textarea',
        label: `Property ${n} HOA Details`,
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n && a[`${prefix}hoa`] === 'Yes',
      },
      {
        id: `${prefix}uploads`,
        type: 'file',
        label: 'Upload Property Documents — This Property Only',
        uploadForTag: `Property ${n}`,
        helper: 'Upload documents for this specific property only. Please upload the official statement document — not screenshots or summaries.',
        requestedDocsList: ['Most recent mortgage statement', 'Deed (if available)', 'Property tax bill (optional)'],
        doNotUpload: 'Do not upload documents for other properties here.',
        dontHaveYetCheckbox: true,
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
      }
    );
  }
  return base;
}

const stepRealEstate: Step = {
  id: 'real_estate',
  title: 'Real Estate',
  description: 'Include any property you own or have a legal interest in — even if someone else lives there.',
  showIf: always,
  fields: buildRealEstateFields(),
};

// Step 6 — Bank Accounts
function buildBankAccountFields(): Step['fields'] {
  const base: Step['fields'] = [
    {
      id: 'bank_accounts',
      type: 'radio',
      label: 'Do you have bank accounts?',
      required: true,
      options: [
        { value: 'Yes, I have bank accounts', label: 'Yes, I have bank accounts' },
        { value: 'No, I do not have bank accounts', label: 'No, I do not have bank accounts' },
      ],
    },
    {
      id: 'bank_account_count',
      type: 'select',
      label: 'How many accounts? (Maximum 3)',
      required: true,
      showIf: hasBankAccounts,
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ],
    },
  ];
  for (let n = 1; n <= 3; n++) {
    const prefix = `account_${n}_`;
    base.push(
      {
        id: `${prefix}name`,
        type: 'text',
        label: `Account ${n}: Bank Name and Type`,
        helper: 'e.g. Chase Checking',
        showIf: (a) => hasBankAccounts(a) && getBankAccountCount(a) >= n,
      },
      {
        id: `${prefix}last4`,
        type: 'text',
        label: `Account ${n}: Last 4 Digits`,
        showIf: (a) => hasBankAccounts(a) && getBankAccountCount(a) >= n,
      },
      {
        id: `${prefix}balance`,
        type: 'text',
        label: `Account ${n}: Current Balance`,
        helper: 'Today\'s approximate balance is fine.',
        showIf: (a) => hasBankAccounts(a) && getBankAccountCount(a) >= n,
      }
    );
  }
  base.push({
    id: 'bank_statements_upload',
    type: 'file',
    label: 'Upload Bank Statements (for each account listed)',
    uploadForTag: 'Bank Accounts',
    helper: 'Upload the most recent statements for each bank or credit union account. Preferred: last 2–6 months. Include all pages. Please upload the official statement document — not screenshots or summaries.',
    examples: 'Examples: Monthly statement PDFs, bank-generated statement downloads.',
    doNotUpload: 'Do not upload: transaction screenshots, balance widgets, or partial page captures.',
    dateRangeRequested: 'Last 2–6 months',
    uploadAppliesTo: 'Applies to: Checking, Savings, Credit Union, Online banks',
    dontHaveYetCheckbox: true,
    showIf: hasBankAccounts,
  });
  return base;
}

const stepBankAccounts: Step = {
  id: 'bank_accounts',
  title: 'Bank Accounts',
  description: 'Include checking, savings, credit union, and online bank accounts.',
  showIf: always,
  fields: buildBankAccountFields(),
};

// Step 7 — Security Deposits
const stepSecurityDeposits: Step = {
  id: 'security_deposits',
  title: 'Security Deposits',
  showIf: always,
  fields: [
    {
      id: 'security_deposits',
      type: 'radio',
      label: 'Do you have any security deposits?',
      required: true,
      options: [
        { value: 'Yes, I have security deposits (e.g., rent, utilities)', label: 'Yes, I have security deposits' },
        { value: 'No, I do not have security deposits', label: 'No, I do not have security deposits' },
      ],
    },
    {
      id: 'security_deposit_details',
      type: 'textarea',
      label: 'Security Deposit Details',
      helper: 'Examples: apartment deposit, utility deposit, phone deposit.',
      showIf: hasSecurityDeposits,
    },
  ],
};

// Step 8 — Household Property (grid)
const HOUSEHOLD_COLUMNS = [
  { id: '0_500', label: '$0 - $500' },
  { id: '501_2500', label: '$501 - $2,500' },
  { id: '2501_5000', label: '$2,501 - $5,000' },
  { id: 'over_5000', label: 'Over $5,000' },
  { id: 'not_sure', label: 'Not Sure' },
];
const stepHouseholdProperty: Step = {
  id: 'household_property',
  title: 'Household Property',
  description: 'Estimate what these items would sell for used — not what you paid.',
  showIf: always,
  fields: [
    {
      id: 'household_property',
      type: 'grid',
      label: 'Household Property',
      rows: [
        { id: 'furniture', label: 'Furniture (sofas, tables, beds)' },
        { id: 'electronics', label: 'Electronics (TVs, computers, phones)' },
        { id: 'appliances', label: 'Appliances (washer, dryer, fridge)' },
        { id: 'clothing', label: 'Clothing and accessories' },
        { id: 'tools', label: 'Tools and yard equipment' },
        { id: 'collectibles', label: 'Collectibles (stamps, coins, etc.)' },
      ],
      columns: HOUSEHOLD_COLUMNS,
    },
  ],
};

// Step 9 — Valuables (details only if any selected)
const VALUABLES_NONE = 'None of the above';
const stepValuables: Step = {
  id: 'valuables',
  title: 'Higher-Value Personal Property',
  showIf: always,
  fields: [
    {
      id: 'valuables',
      type: 'checkbox',
      label: 'Do you have any of the following?',
      options: [
        { value: 'Jewelry valued over $500 (per item)', label: 'Jewelry valued over $500 (per item)' },
        { value: 'Firearms', label: 'Firearms' },
        { value: 'Art or special collections', label: 'Art or special collections' },
        { value: 'Business equipment or machinery', label: 'Business equipment or machinery' },
        { value: 'Farm equipment or livestock', label: 'Farm equipment or livestock' },
        { value: VALUABLES_NONE, label: VALUABLES_NONE, noneOfAbove: true },
      ],
    },
    {
      id: 'valuables_details',
      type: 'textarea',
      label: 'Details (for each selected)',
      helper: 'List items worth more than about $500 each.',
      showIf: (a) => hasAnySelectedExceptNone(a, 'valuables', VALUABLES_NONE),
    },
  ],
};

// Step 10 — Financial Assets
const FINANCIAL_NONE = 'None of the above';
const stepFinancialAssets: Step = {
  id: 'financial_assets',
  title: 'Financial Assets',
  description: 'Include accounts or rights that could have monetary value.',
  showIf: always,
  fields: [
    {
      id: 'financial_assets',
      type: 'checkbox',
      label: 'Do you have any of the following?',
      options: [
        { value: 'Retirement accounts (401k, IRA, etc.)', label: 'Retirement accounts (401k, IRA, etc.)' },
        { value: 'Pension or Annuity plans', label: 'Pension or Annuity plans' },
        { value: 'Life Insurance with cash or loan value', label: 'Life Insurance with cash or loan value' },
        { value: 'Stocks, bonds, mutual funds, or cryptocurrency', label: 'Stocks, bonds, mutual funds, or cryptocurrency' },
        { value: 'Ownership interest in a business (not self-employment listed above)', label: 'Ownership interest in a business (not self-employment listed above)' },
        { value: 'Interest in a Trust', label: 'Interest in a Trust' },
        { value: 'Tax refund currently owed to you', label: 'Tax refund currently owed to you' },
        { value: 'Lawsuit claim or potential claim (not yet filed)', label: 'Lawsuit claim or potential claim (not yet filed)' },
        { value: 'Inheritance expected soon', label: 'Inheritance expected soon' },
        { value: FINANCIAL_NONE, label: FINANCIAL_NONE, noneOfAbove: true },
      ],
    },
    {
      id: 'financial_assets_details',
      type: 'textarea',
      label: 'Details (for each selected)',
      helper: 'For each selected: institution, account # (if any), estimated value (or Not sure). Tax refund: include expected refunds you have not received yet. Lawsuit: include claims you could file, even if you haven\'t filed yet.',
      showIf: (a) => hasAnySelectedExceptNone(a, 'financial_assets', FINANCIAL_NONE),
    },
  ],
};

// Step 11 — Vehicles
function buildVehicleFields(): Step['fields'] {
  const base: Step['fields'] = [
    {
      id: 'vehicles',
      type: 'radio',
      label: 'Vehicles',
      required: true,
      options: [
        { value: 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)', label: 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)' },
        { value: 'No, I do not own any vehicles', label: 'No, I do not own any vehicles' },
      ],
    },
    {
      id: 'vehicle_count',
      type: 'select',
      label: 'How many vehicles do you own? (Maximum 3)',
      required: true,
      showIf: hasVehicles,
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ],
    },
  ];
  for (let n = 1; n <= 3; n++) {
    const prefix = `vehicle_${n}_`;
    base.push(
      {
        id: `${prefix}details`,
        type: 'text',
        label: `Vehicle ${n} — Make, model, year, mileage`,
        helper: 'Estimate private-party resale value today.',
        showIf: (a) => hasVehicles(a) && getVehicleCount(a) >= n,
      },
      {
        id: `${prefix}loan`,
        type: 'radio',
        label: `Does Vehicle ${n} have a loan or lien?`,
        showIf: (a) => hasVehicles(a) && getVehicleCount(a) >= n,
        options: [
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ],
      },
      {
        id: `${prefix}loan_details`,
        type: 'textarea',
        label: `Vehicle ${n} Loan Details`,
        helper: 'Copy from your latest loan statement if available.',
        showIf: (a) => hasVehicles(a) && getVehicleCount(a) >= n && a[`${prefix}loan`] === 'Yes',
      },
      {
        id: `${prefix}plan`,
        type: 'radio',
        label: `What do you want to do with Vehicle ${n}?`,
        helper: 'You can change this decision later with your attorney.',
        showIf: (a) => hasVehicles(a) && getVehicleCount(a) >= n,
        options: [
          { value: 'Keep', label: 'Keep' },
          { value: 'Surrender', label: 'Surrender' },
          { value: 'Not Sure', label: 'Not Sure' },
        ],
      },
      {
        id: `${prefix}uploads`,
        type: 'file',
        label: 'Upload Vehicle Documents — This Vehicle Only',
        uploadForTag: `Vehicle ${n}`,
        helper: 'Upload documents for this vehicle only. Please upload the official statement document — not screenshots or summaries.',
        requestedDocsList: ['Most recent auto loan statement', 'Title (if you have it)', 'Lease agreement (if leased)'],
        doNotUpload: 'Do not upload insurance cards or registration unless requested.',
        dontHaveYetCheckbox: true,
        showIf: (a) => hasVehicles(a) && getVehicleCount(a) >= n,
      }
    );
  }
  return base;
}

const stepVehicles: Step = {
  id: 'vehicles',
  title: 'Vehicles',
  showIf: always,
  fields: buildVehicleFields(),
};

// Step 12 — Other Secured Debts
const SECURED_NONE = 'None of the above';
const stepOtherSecured: Step = {
  id: 'other_secured_debts',
  title: 'Other Secured Debts',
  description: 'These are debts tied to specific property that can be taken if unpaid.',
  showIf: always,
  fields: [
    {
      id: 'other_secured_debts',
      type: 'checkbox',
      label: 'Do you have any of the following?',
      options: [
        { value: 'Furniture or electronics financing (not part of mortgage)', label: 'Furniture or electronics financing (not part of mortgage)' },
        { value: 'Pawn shop loans', label: 'Pawn shop loans' },
        { value: 'Tax lien (IRS or State)', label: 'Tax lien (IRS or State)' },
        { value: 'Rent-to-Own agreements', label: 'Rent-to-Own agreements' },
        { value: SECURED_NONE, label: SECURED_NONE, noneOfAbove: true },
      ],
    },
    {
      id: 'other_secured_details',
      type: 'textarea',
      label: 'Details',
      helper: 'Creditor, collateral, balance.',
      showIf: (a) => hasAnySelectedExceptNone(a, 'other_secured_debts', SECURED_NONE),
    },
    {
      id: 'other_secured_uploads',
      type: 'file',
      label: 'Upload Statements for These Secured Debts',
      uploadForTag: 'Other Secured Debts',
      helper: 'Upload the latest statement for each secured debt listed here. Examples: pawn loan ticket, furniture financing statement, tax lien notice.',
      doNotUpload: 'Do not upload unrelated documents.',
      dontHaveYetCheckbox: true,
      showIf: (a) => hasAnySelectedExceptNone(a, 'other_secured_debts', SECURED_NONE),
    },
  ],
};

// Step 13 — Priority Debts
const PRIORITY_NONE = 'None of the above';
const stepPriorityDebts: Step = {
  id: 'priority_debts',
  title: 'Priority Debts',
  description: 'These debts receive special treatment in bankruptcy.',
  showIf: always,
  fields: [
    {
      id: 'priority_debts',
      type: 'checkbox',
      label: 'Do you owe any of the following?',
      options: [
        { value: 'Back taxes (Federal, State, or Local)', label: 'Back taxes (Federal, State, or Local)' },
        { value: 'Child support arrears', label: 'Child support arrears' },
        { value: 'Alimony arrears', label: 'Alimony arrears' },
        { value: 'Government fines or penalties', label: 'Government fines or penalties' },
        { value: PRIORITY_NONE, label: PRIORITY_NONE, noneOfAbove: true },
      ],
    },
    {
      id: 'priority_debts_details',
      type: 'textarea',
      label: 'Details',
      helper: 'Agency/recipient, type, amount owed.',
      showIf: (a) => hasAnySelectedExceptNone(a, 'priority_debts', PRIORITY_NONE),
    },
  ],
};

// Step 14 — Unsecured Debts
const stepUnsecured: Step = {
  id: 'unsecured_debts',
  title: 'Unsecured Debts',
  description: 'Credit cards, medical bills, personal loans, and similar debts.',
  showIf: always,
  fields: [
    {
      id: 'credit_report_upload',
      type: 'file',
      label: 'Upload Credit Report (Recommended)',
      uploadForTag: 'Unsecured Debts',
      helper: 'Upload a recent credit report to automatically capture most unsecured debts. Please upload the official statement document — not screenshots or summaries.',
      examples: 'Examples: Experian, Equifax, TransUnion, AnnualCreditReport.com PDF.',
      doNotUpload: 'Do not upload credit score screenshots.',
      dontHaveYetCheckbox: true,
    },
    {
      id: 'unsecured_creditors',
      type: 'textarea',
      label: 'Or list your largest unsecured creditors and balances',
      helper: 'List your largest balances first if you don\'t enter all.',
    },
  ],
};

// Step 15 — Leases & Contracts
const LEASES_NONE = 'None of the above';
const stepLeases: Step = {
  id: 'leases_contracts',
  title: 'Leases & Contracts',
  description: 'Include agreements where you are still required to make payments.',
  showIf: always,
  fields: [
    {
      id: 'leases_contracts',
      type: 'checkbox',
      label: 'Do you have any of the following?',
      options: [
        { value: 'Home lease or rental agreement (if you don\'t own)', label: 'Home lease or rental agreement (if you don\'t own)' },
        { value: 'Vehicle lease', label: 'Vehicle lease' },
        { value: 'Equipment lease (business or personal)', label: 'Equipment lease (business or personal)' },
        { value: 'Timeshare contract', label: 'Timeshare contract' },
        { value: 'Service contracts (e.g., security system, gym membership)', label: 'Service contracts (e.g., security system, gym membership)' },
        { value: LEASES_NONE, label: LEASES_NONE, noneOfAbove: true },
      ],
    },
    {
      id: 'leases_contracts_details',
      type: 'textarea',
      label: 'Details',
      helper: 'Type, company, monthly payment, remaining term.',
      showIf: (a) => hasAnySelectedExceptNone(a, 'leases_contracts', LEASES_NONE),
    },
    {
      id: 'leases_contracts_uploads',
      type: 'file',
      label: 'Upload Lease or Contract Documents',
      uploadForTag: 'Leases & Contracts',
      helper: 'Upload the signed agreement or most recent billing statement. Please upload the official document — not screenshots or summaries.',
      dontHaveYetCheckbox: true,
      showIf: (a) => hasAnySelectedExceptNone(a, 'leases_contracts', LEASES_NONE),
    },
  ],
};

// Step 16 — Employment & Income
function buildEmploymentFields(): Step['fields'] {
  const base: Step['fields'] = [
    { id: 'debtor_employer', type: 'text', label: 'Employer name' },
    { id: 'debtor_job_title', type: 'text', label: 'Job title' },
    { id: 'debtor_how_long', type: 'text', label: 'How long employed' },
    {
      id: 'debtor_pay_frequency',
      type: 'select',
      label: 'Pay frequency',
      helper: 'Choose how often you are paid.',
      options: [
        { value: 'Weekly', label: 'Weekly' },
        { value: 'Bi-weekly', label: 'Bi-weekly' },
        { value: 'Semi-monthly', label: 'Semi-monthly' },
        { value: 'Monthly', label: 'Monthly' },
        { value: 'Other', label: 'Other' },
      ],
    },
    { id: 'debtor_gross_pay', type: 'text', label: 'Gross pay per check', helper: 'Estimates are OK. Enter "Not sure" if needed.' },
  ];
  base.push(
    { id: 'spouse_employer', type: 'text', label: 'Spouse: Employer name', showIf: isJointFiling },
    { id: 'spouse_job_title', type: 'text', label: 'Spouse: Job title', showIf: isJointFiling },
    { id: 'spouse_how_long', type: 'text', label: 'Spouse: How long employed', showIf: isJointFiling },
    {
      id: 'spouse_pay_frequency',
      type: 'select',
      label: 'Spouse: Pay frequency',
      helper: 'Choose how often you are paid.',
      showIf: isJointFiling,
      options: [
        { value: 'Weekly', label: 'Weekly' },
        { value: 'Bi-weekly', label: 'Bi-weekly' },
        { value: 'Semi-monthly', label: 'Semi-monthly' },
        { value: 'Monthly', label: 'Monthly' },
        { value: 'Other', label: 'Other' },
      ],
    },
    { id: 'spouse_gross_pay', type: 'text', label: 'Spouse: Gross pay per check', showIf: isJointFiling }
  );
  base.push(
    {
      id: 'other_income_types',
      type: 'checkbox',
      label: 'Other income (include any regular money you receive)',
      options: [
        { value: 'Social Security', label: 'Social Security' },
        { value: 'Disability or Worker\'s Comp', label: 'Disability or Worker\'s Comp' },
        { value: 'Unemployment', label: 'Unemployment' },
        { value: 'Pension/Retirement Income', label: 'Pension/Retirement Income' },
        { value: 'Child Support or Alimony Received', label: 'Child Support or Alimony Received' },
        { value: 'Rental Income', label: 'Rental Income' },
        { value: 'Other (specify)', label: 'Other (specify)' },
        { value: 'None of the above', label: 'None of the above', noneOfAbove: true },
      ],
    },
    {
      id: 'other_income_details',
      type: 'textarea',
      label: 'Other income details (source and monthly amount)',
      showIf: (a) => hasAnySelectedExceptNone(a, 'other_income_types', 'None of the above'),
    },
    {
      id: 'income_uploads',
      type: 'file',
      label: 'Upload Paystubs — Last 6 Months',
      uploadForTag: 'Income',
      helper: 'Upload your paystubs covering the last 6 months. If paid electronically, download the paystub PDFs from your payroll portal. Please upload the official statement document — not screenshots or summaries.',
      examples: 'Examples: ADP, Paychex, Workday paystub PDFs.',
      doNotUpload: 'Do not upload: offer letters, timesheets, or bank deposits.',
      dateRangeRequested: 'Last 6 months',
      dontHaveYetCheckbox: true,
    }
  );
  return base;
}

const stepEmployment: Step = {
  id: 'employment',
  title: 'Employment & Income',
  description: 'Enter current income information. Use estimates if needed.',
  showIf: always,
  fields: buildEmploymentFields(),
};

// Step 17 — Monthly Expenses (grid)
const EXPENSE_COLUMNS = [
  { id: 'under_500', label: '<$500' },
  { id: '500_1500', label: '$500 - $1,500' },
  { id: '1501_3000', label: '$1,501 - $3,000' },
  { id: '3000', label: '$3,000' },
  { id: 'not_sure', label: 'Not Sure' },
];
const stepMonthlyExpenses: Step = {
  id: 'monthly_expenses',
  title: 'Monthly Expenses',
  description: 'Estimate your typical monthly spending. Round numbers are fine.',
  showIf: always,
  fields: [
    {
      id: 'monthly_expenses',
      type: 'grid',
      label: 'Monthly Expenses',
      rows: [
        { id: 'housing', label: 'Housing (Rent or Mortgage PITI)' },
        { id: 'utilities', label: 'Utilities (Electric, Gas, Water, Trash)' },
        { id: 'food', label: 'Food/Groceries' },
        { id: 'transportation', label: 'Transportation (Gas, Maintenance, Public Transit)' },
        { id: 'insurance', label: 'Insurance (Health, Life, Car, Home)' },
        { id: 'medical', label: 'Medical/Dental Expenses (out-of-pocket)' },
        { id: 'childcare', label: 'Childcare/Schooling' },
        { id: 'child_support_paid', label: 'Child Support/Alimony Paid' },
        { id: 'other_expenses', label: 'Other necessary expenses' },
      ],
      columns: EXPENSE_COLUMNS,
    },
  ],
};

// Step 18 — Income History
const stepIncomeHistory: Step = {
  id: 'income_history',
  title: 'Income History',
  description: 'Gross income before deductions.',
  showIf: always,
  fields: [
    { id: 'income_current_ytd', type: 'text', label: 'Total Gross Income — Current Year (Year-to-Date)' },
    { id: 'income_last_year', type: 'text', label: 'Total Gross Income — Last Full Year' },
    { id: 'income_two_years_ago', type: 'text', label: 'Total Gross Income — Two Years Ago', helper: 'Use tax returns or estimates if exact numbers are not available.' },
  ],
};

// Step 19 — Recent Financial Activity
const stepRecentActivity: Step = {
  id: 'recent_activity',
  title: 'Recent Financial Activity',
  description: 'These questions are required by bankruptcy law. Answering "yes" does not automatically create a problem. Your attorney will review the details with you.',
  showIf: always,
  fields: [
    {
      id: 'paid_creditor_600',
      type: 'radio',
      label: 'Paid any one creditor more than $600 in the last 90 days?',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'paid_creditor_600_details',
      type: 'textarea',
      label: 'Details (Creditor, amount, date(s))',
      showIf: (a) => a['paid_creditor_600'] === 'Yes',
    },
    {
      id: 'repaid_loans_gifts',
      type: 'radio',
      label: 'Repaid or gave money or property to friends or family in the last year?',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'repaid_loans_gifts_details',
      type: 'textarea',
      label: 'Details',
      showIf: (a) => a['repaid_loans_gifts'] === 'Yes',
    },
    {
      id: 'lawsuits_garnishments',
      type: 'radio',
      label: 'Any lawsuits or garnishments involving you?',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'lawsuits_garnishments_details',
      type: 'textarea',
      label: 'Details',
      showIf: (a) => a['lawsuits_garnishments'] === 'Yes',
    },
    {
      id: 'repossession_foreclosure',
      type: 'radio',
      label: 'Any property repossessed or foreclosed recently?',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'repossession_foreclosure_details',
      type: 'textarea',
      label: 'Details',
      showIf: (a) => a['repossession_foreclosure'] === 'Yes',
    },
    {
      id: 'transferred_property',
      type: 'radio',
      label: 'Sold or transferred property in the last 2 years?',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'transferred_property_details',
      type: 'textarea',
      label: 'Details',
      showIf: (a) => a['transferred_property'] === 'Yes',
    },
    {
      id: 'closed_accounts',
      type: 'radio',
      label: 'Closed financial accounts in the last year?',
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'closed_accounts_details',
      type: 'textarea',
      label: 'Details',
      showIf: (a) => a['closed_accounts'] === 'Yes',
    },
  ],
};

// Step 20 — Upload Checklist (with global upload instructions)
const UPLOAD_INSTRUCTIONS = `Document Upload Instructions
Each section below has its own upload area. Please upload documents in the correct section.
Phone photos and PDFs are OK. If you don't have a document yet, you can skip and add it later.
Do not upload unrelated documents (ads, screenshots, or old statements outside the requested dates).`;

const stepUploadChecklist: Step = {
  id: 'upload_checklist',
  title: 'Upload Checklist',
  description: 'Upload any documents you have available now. You can add more later.',
  uploadInstructions: UPLOAD_INSTRUCTIONS,
  showIf: always,
  fields: [
    {
      id: 'upload_paystubs',
      type: 'file',
      label: 'Upload Paystubs — Last 6 Months',
      uploadForTag: 'Income',
      helper: 'Upload your paystubs covering the last 6 months. If paid electronically, download the paystub PDFs from your payroll portal. Please upload the official statement document — not screenshots or summaries.',
      examples: 'Examples: ADP, Paychex, Workday paystub PDFs.',
      doNotUpload: 'Do not upload: offer letters, timesheets, or bank deposits.',
      dateRangeRequested: 'Last 6 months',
      dontHaveYetCheckbox: true,
    },
    {
      id: 'upload_bank_statements',
      type: 'file',
      label: 'Upload Bank Statements (for each account listed)',
      uploadForTag: 'Bank Accounts',
      helper: 'Upload the most recent statements for each bank or credit union account. Preferred: last 2–6 months. Include all pages. Please upload the official statement document — not screenshots or summaries.',
      examples: 'Examples: Monthly statement PDFs, bank-generated statement downloads.',
      doNotUpload: 'Do not upload: transaction screenshots, balance widgets, or partial page captures.',
      dateRangeRequested: 'Last 2–6 months',
      uploadAppliesTo: 'Applies to: Checking, Savings, Credit Union, Online banks',
      dontHaveYetCheckbox: true,
    },
    {
      id: 'upload_tax_returns',
      type: 'file',
      label: 'Upload Tax Returns — Last 2 Years',
      uploadForTag: 'Tax Returns',
      helper: 'Upload your complete federal tax returns for the last 2 years. Include all schedules if available. Please upload the official document — not screenshots or summaries.',
      examples: 'Examples: Form 1040 with schedules.',
      doNotUpload: 'Do not upload: W-2s alone (unless returns are unavailable).',
      dateRangeRequested: 'Last 2 years',
      dontHaveYetCheckbox: true,
    },
    {
      id: 'upload_vehicle_docs',
      type: 'file',
      label: 'Upload Vehicle Documents — This Vehicle Only',
      uploadForTag: 'Vehicles',
      helper: 'Upload documents for each vehicle. Please upload the official statement document — not screenshots or summaries.',
      requestedDocsList: ['Most recent auto loan statement', 'Title (if you have it)', 'Lease agreement (if leased)'],
      doNotUpload: 'Do not upload insurance cards or registration unless requested.',
      dontHaveYetCheckbox: true,
    },
    {
      id: 'upload_mortgage_docs',
      type: 'file',
      label: 'Upload Property Documents — This Property Only',
      uploadForTag: 'Real Estate',
      helper: 'Upload documents for each property. Please upload the official statement document — not screenshots or summaries.',
      requestedDocsList: ['Most recent mortgage statement', 'Deed (if available)', 'Property tax bill (optional)'],
      doNotUpload: 'Do not upload documents for other properties in the wrong section.',
      dontHaveYetCheckbox: true,
    },
    {
      id: 'upload_credit_report',
      type: 'file',
      label: 'Upload Credit Report (Recommended)',
      uploadForTag: 'Credit Report',
      helper: 'Upload a recent credit report to automatically capture most unsecured debts. Please upload the official statement document — not screenshots or summaries.',
      examples: 'Examples: Experian, Equifax, TransUnion, AnnualCreditReport.com PDF.',
      doNotUpload: 'Do not upload credit score screenshots.',
      dontHaveYetCheckbox: true,
    },
  ],
};

// Step 21 — Final Review (no form fields; special UI)
const stepFinalReview: Step = {
  id: 'final_review',
  title: 'Final Review',
  showIf: always,
  fields: [
    {
      id: 'confidence',
      type: 'radio',
      label: 'How confident are you that your answers are complete and accurate?',
      required: true,
      options: [
        { value: 'Very confident (feel I answered everything accurately)', label: 'Very confident' },
        { value: 'Mostly confident (a few guesses/estimates)', label: 'Mostly confident' },
        { value: 'Not sure (need significant help from the attorney)', label: 'Need help reviewing' },
      ],
    },
  ],
};

/** All steps in order; visibility is computed via showIf when filtering by answers */
export const ALL_STEPS: Step[] = [
  stepFilingSetup,
  stepDebtorIdentity,
  stepDebtorContact,
  stepSpouse,
  stepUrgency,
  stepRealEstate,
  stepBankAccounts,
  stepSecurityDeposits,
  stepHouseholdProperty,
  stepValuables,
  stepFinancialAssets,
  stepVehicles,
  stepOtherSecured,
  stepPriorityDebts,
  stepUnsecured,
  stepLeases,
  stepEmployment,
  stepMonthlyExpenses,
  stepIncomeHistory,
  stepRecentActivity,
  stepUploadChecklist,
  stepFinalReview,
];

export function getVisibleSteps(answers: Answers): Step[] {
  return ALL_STEPS.filter((step) => step.showIf(answers));
}
