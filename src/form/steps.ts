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
  showIf: always,
  fields: [
    {
      id: 'filing_setup',
      type: 'radio',
      label: 'Filing Setup*',
      required: true,
      options: [
        { value: 'Filing alone', label: 'Filing alone' },
        { value: 'Filing with spouse', label: 'Filing with spouse' },
      ],
    },
  ],
};

// Step 2 — Debtor Information
const stepDebtor: Step = {
  id: 'debtor',
  title: 'Debtor Information',
  showIf: always,
  fields: [
    { id: 'debtor_full_name', type: 'text', label: 'Full Legal Name (as it appears on ID) *', required: true },
    { id: 'debtor_other_names', type: 'text', label: 'Other names used in the last 6 years' },
    {
      id: 'debtor_ssn_last4',
      type: 'text',
      label: 'Social Security Number — Last 4 Digits Only *',
      required: true,
      helper: 'Only the last 4 digits are needed here for security.',
    },
    { id: 'debtor_dob', type: 'date', label: 'Date of Birth *', required: true },
    { id: 'debtor_phone', type: 'text', label: 'Phone Number *', required: true },
    { id: 'debtor_email', type: 'email', label: 'Email Address *', required: true },
    { id: 'debtor_address', type: 'textarea', label: 'Current Street Address *', required: true },
    {
      id: 'mailing_different',
      type: 'radio',
      label: 'Is your mailing address different from your current street address? *',
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
    { id: 'county', type: 'text', label: 'County of Residence *', required: true },
    {
      id: 'addresses_6_years',
      type: 'textarea',
      label: 'Addresses where you have lived in the last 6 years (list all)',
      helper: 'Include moving dates if known.',
    },
    { id: 'business_names', type: 'textarea', label: 'Business names you have used in the last 6 years' },
    {
      id: 'prior_bankruptcy',
      type: 'radio',
      label: 'Have you filed for bankruptcy before? *',
      required: true,
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      id: 'prior_bankruptcy_details',
      type: 'textarea',
      label: 'Prior Bankruptcy Details (If Yes)',
      helper: 'Include chapter, year, case number, and whether discharged.',
      showIf: (a) => a['prior_bankruptcy'] === 'Yes',
    },
  ],
};

// Step 3 — Spouse (only if joint)
const stepSpouse: Step = {
  id: 'spouse',
  title: 'Spouse Information (Only if Joint Filing)',
  showIf: isJointFiling,
  fields: [
    { id: 'spouse_full_name', type: 'text', label: 'Spouse Full Legal Name (as it appears on ID) *', required: true },
    { id: 'spouse_other_names', type: 'text', label: 'Spouse Other names used in the last 6 years' },
    {
      id: 'spouse_ssn_last4',
      type: 'text',
      label: 'Spouse Social Security Number — Last 4 Digits Only *',
      required: true,
    },
    { id: 'spouse_dob', type: 'date', label: 'Spouse Date of Birth *', required: true },
    { id: 'spouse_phone', type: 'text', label: 'Spouse Phone Number *', required: true },
    { id: 'spouse_email', type: 'email', label: 'Spouse Email Address *', required: true },
  ],
};

// Step 4 — Urgency & Business Flags
const URGENCY_NONE = 'None of the above';
const stepUrgency: Step = {
  id: 'urgency',
  title: 'Urgency & Business Flags',
  showIf: always,
  fields: [
    {
      id: 'urgency_flags',
      type: 'checkbox',
      label: 'Which of these apply?',
      options: [
        { value: 'Wage garnishment is currently active or pending', label: 'Wage garnishment is currently active or pending' },
        { value: 'Bank account levy is pending', label: 'Bank account levy is pending' },
        { value: 'Foreclosure on your home is pending (date:)', label: 'Foreclosure on your home is pending (date:)' },
        { value: 'Risk of vehicle repossession (date:)', label: 'Risk of vehicle repossession (date:)' },
        { value: 'Utility shutoff notice received (date:)', label: 'Utility shutoff notice received (date:)' },
        { value: URGENCY_NONE, label: URGENCY_NONE, noneOfAbove: true },
      ],
    },
    {
      id: 'foreclosure_date',
      type: 'text',
      label: 'Foreclosure date (if known)',
      showIf: (a) => {
        const v = a['urgency_flags'];
        return Array.isArray(v) && v.includes('Foreclosure on your home is pending (date:)');
      },
    },
    {
      id: 'repossession_date',
      type: 'text',
      label: 'Repossession date (if known)',
      showIf: (a) => {
        const v = a['urgency_flags'];
        return Array.isArray(v) && v.includes('Risk of vehicle repossession (date:)');
      },
    },
    {
      id: 'shutoff_date',
      type: 'text',
      label: 'Shutoff date (if known)',
      showIf: (a) => {
        const v = a['urgency_flags'];
        return Array.isArray(v) && v.includes('Utility shutoff notice received (date:)');
      },
    },
    {
      id: 'self_employed',
      type: 'radio',
      label: 'Are you self-employed or operating a business?*',
      required: true,
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
      label: 'Do you have any debts with a co-signer or co-borrower?*',
      required: true,
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
      label: 'Real Estate Ownership*',
      required: true,
      options: [
        { value: 'Yes, I own real estate', label: 'Yes, I own real estate' },
        { value: 'No, I do not own real estate', label: 'No, I do not own real estate' },
      ],
    },
    {
      id: 'real_estate_count',
      type: 'select',
      label: 'If Yes, how many properties do you own? (Maximum 3)*',
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
        label: `Property ${n} Address*`,
        required: true,
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
      },
      {
        id: `${prefix}type`,
        type: 'select',
        label: `Property ${n} Type*`,
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
        label: `Property ${n} Estimated Value`,
        helper: 'What could it sell for today?',
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
      },
      {
        id: `${prefix}mortgage`,
        type: 'radio',
        label: `Does Property ${n} have a mortgage or lien?*`,
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
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n && a[`${prefix}mortgage`] === 'Yes',
      },
      {
        id: `${prefix}plan`,
        type: 'radio',
        label: `Property ${n} Plan*`,
        required: true,
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
        options: [
          { value: 'Keep the property', label: 'Keep the property' },
          { value: 'Surrender the property (let it go)', label: 'Surrender the property (let it go)' },
          { value: 'Not Sure', label: 'Not Sure' },
        ],
      },
      {
        id: `${prefix}hoa`,
        type: 'radio',
        label: `Does Property ${n} have an HOA (Homeowners Association)?*`,
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
        label: `Upload Documents for Property ${n}`,
        helper: 'Deed and most recent mortgage statement. PDFs or phone photos are fine.',
        showIf: (a) => hasRealEstate(a) && getRealEstateCount(a) >= n,
      }
    );
  }
  return base;
}

const stepRealEstate: Step = {
  id: 'real_estate',
  title: 'Real Estate Ownership',
  showIf: always,
  fields: buildRealEstateFields(),
};

// Step 6 — Bank Accounts
function buildBankAccountFields(): Step['fields'] {
  const base: Step['fields'] = [
    {
      id: 'bank_accounts',
      type: 'radio',
      label: 'Bank Accounts*',
      required: true,
      options: [
        { value: 'Yes, I have bank accounts', label: 'Yes, I have bank accounts' },
        { value: 'No, I do not have bank accounts', label: 'No, I do not have bank accounts' },
      ],
    },
    {
      id: 'bank_account_count',
      type: 'select',
      label: 'How many accounts do you have? (Maximum 3)*',
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
        showIf: (a) => hasBankAccounts(a) && getBankAccountCount(a) >= n,
      }
    );
  }
  base.push({
    id: 'bank_statements_upload',
    type: 'file',
    label: 'Upload Bank Statements',
    helper: 'Most recent statements for all listed accounts (2–6 months if available).',
    showIf: hasBankAccounts,
  });
  return base;
}

const stepBankAccounts: Step = {
  id: 'bank_accounts',
  title: 'Bank Accounts',
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
      label: 'Security Deposits*',
      required: true,
      options: [
        { value: 'Yes, I have security deposits (e.g., rent, utilities)', label: 'Yes, I have security deposits (e.g., rent, utilities)' },
        { value: 'No, I do not have security deposits', label: 'No, I do not have security deposits' },
      ],
    },
    {
      id: 'security_deposit_details',
      type: 'textarea',
      label: 'Security Deposit Details',
      helper: 'Holder name and amount.',
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
  title: 'Household Property (Estimate total value)',
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
  title: 'Valuables (Non-household items)',
  showIf: always,
  fields: [
    {
      id: 'valuables',
      type: 'checkbox',
      label: 'Valuables',
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
      label: 'Valuables Details (Max 3 items)',
      helper: 'For each: description + estimated value (or Not sure).',
      showIf: (a) => hasAnySelectedExceptNone(a, 'valuables', VALUABLES_NONE),
    },
  ],
};

// Step 10 — Financial Assets
const FINANCIAL_NONE = 'None of the above';
const stepFinancialAssets: Step = {
  id: 'financial_assets',
  title: 'Financial Assets',
  showIf: always,
  fields: [
    {
      id: 'financial_assets',
      type: 'checkbox',
      label: 'Financial Assets',
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
      label: 'Financial Asset Details',
      helper: 'For each selected: institution, account # (if any), estimated value (or Not sure).',
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
      label: 'Vehicles*',
      required: true,
      options: [
        { value: 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)', label: 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)' },
        { value: 'No, I do not own any vehicles', label: 'No, I do not own any vehicles' },
      ],
    },
    {
      id: 'vehicle_count',
      type: 'select',
      label: 'How many vehicles do you own? (Maximum 3)*',
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
        label: `Vehicle ${n} Details`,
        helper: 'Make, Model, Year, Mileage, Estimated Value (or Not sure)',
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
        helper: 'Lender, balance, payment, arrears',
        showIf: (a) => hasVehicles(a) && getVehicleCount(a) >= n && a[`${prefix}loan`] === 'Yes',
      },
      {
        id: `${prefix}plan`,
        type: 'radio',
        label: `Vehicle ${n} Plan`,
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
        label: `Upload Documents for Vehicle ${n}`,
        helper: 'Loan statement and title if available',
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
  title: 'Other Secured Debts (Debts tied to collateral)',
  showIf: always,
  fields: [
    {
      id: 'other_secured_debts',
      type: 'checkbox',
      label: 'Other Secured Debts',
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
      label: 'Other Secured Debts Details',
      helper: 'Creditor, collateral, balance.',
      showIf: (a) => hasAnySelectedExceptNone(a, 'other_secured_debts', SECURED_NONE),
    },
  ],
};

// Step 13 — Priority Debts
const PRIORITY_NONE = 'None of the above';
const stepPriorityDebts: Step = {
  id: 'priority_debts',
  title: 'Priority Debts (Special legal status)',
  showIf: always,
  fields: [
    {
      id: 'priority_debts',
      type: 'checkbox',
      label: 'Priority Debts',
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
      label: 'Priority Debts Details',
      helper: 'Agency/recipient, type, amount owed.',
      showIf: (a) => hasAnySelectedExceptNone(a, 'priority_debts', PRIORITY_NONE),
    },
  ],
};

// Step 14 — Unsecured Debts
const stepUnsecured: Step = {
  id: 'unsecured_debts',
  title: 'Unsecured Debts (Credit cards, medical bills, personal loans)',
  showIf: always,
  fields: [
    {
      id: 'credit_report_upload',
      type: 'file',
      label: 'Upload Credit Report (Recommended)',
    },
    {
      id: 'unsecured_creditors',
      type: 'textarea',
      label: 'Optional: List your 5 largest unsecured creditors and balances',
      helper: 'Creditor name + approximate balance.',
    },
  ],
};

// Step 15 — Leases & Contracts
const LEASES_NONE = 'None of the above';
const stepLeases: Step = {
  id: 'leases_contracts',
  title: 'Leases & Contracts (Agreements you are currently obligated to)',
  showIf: always,
  fields: [
    {
      id: 'leases_contracts',
      type: 'checkbox',
      label: 'Leases & Contracts',
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
      label: 'Leases & Contracts Details',
      helper: 'Type, company, monthly payment, remaining term.',
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
      options: [
        { value: 'Weekly', label: 'Weekly' },
        { value: 'Bi-weekly', label: 'Bi-weekly' },
        { value: 'Semi-monthly', label: 'Semi-monthly' },
        { value: 'Monthly', label: 'Monthly' },
        { value: 'Other', label: 'Other' },
      ],
    },
    { id: 'debtor_gross_pay', type: 'text', label: 'Gross pay per check', helper: 'Allow Not sure' },
  ];
  base.push(
    { id: 'spouse_employer', type: 'text', label: 'Spouse: Employer name', showIf: isJointFiling },
    { id: 'spouse_job_title', type: 'text', label: 'Spouse: Job title', showIf: isJointFiling },
    { id: 'spouse_how_long', type: 'text', label: 'Spouse: How long employed', showIf: isJointFiling },
    {
      id: 'spouse_pay_frequency',
      type: 'select',
      label: 'Spouse: Pay frequency',
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
      label: 'Other Income Types',
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
      label: 'Other Income Details (Source and Monthly Amount)',
      showIf: (a) => hasAnySelectedExceptNone(a, 'other_income_types', 'None of the above'),
    },
    {
      id: 'income_uploads',
      type: 'file',
      label: 'Income Document Uploads',
      helper: 'Paystubs (last 6 months) and tax returns (last 2 years).',
    }
  );
  return base;
}

const stepEmployment: Step = {
  id: 'employment',
  title: 'Employment and Income — Debtor',
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
  title: 'Monthly Expenses (Estimate ranges)',
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
  title: 'Income History (Gross Income before deductions)',
  showIf: always,
  fields: [
    { id: 'income_current_ytd', type: 'text', label: 'Total Gross Income — Current Year (Year-to-Date)' },
    { id: 'income_last_year', type: 'text', label: 'Total Gross Income — Last Full Year' },
    { id: 'income_two_years_ago', type: 'text', label: 'Total Gross Income — Two Years Ago', helper: 'Estimates are ok.' },
  ],
};

// Step 19 — Recent Financial Activity
const stepRecentActivity: Step = {
  id: 'recent_activity',
  title: 'Recent Financial Activity',
  description: 'These questions are required by bankruptcy law. Answering "yes" does not automatically create a problem — your attorney will review.',
  showIf: always,
  fields: [
    {
      id: 'paid_creditor_600',
      type: 'radio',
      label: 'Paid any single creditor > $600 in last 90 days?',
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
      label: 'Repaid loans or gifted money/property to friends/family in last year?',
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
      label: 'Involved in lawsuits, garnishments, or levies?',
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
      label: 'Property repossessed or foreclosed in last year?',
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
      label: 'Transferred or sold property in last 2 years?',
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
      label: 'Closed accounts/investments/credit lines in last year?',
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

// Step 20 — Upload Checklist
const stepUploadChecklist: Step = {
  id: 'upload_checklist',
  title: 'Upload Checklist (Final Uploads)',
  showIf: always,
  fields: [
    { id: 'upload_paystubs', type: 'file', label: 'Paystubs (6 months)', helper: 'Paystubs (6 months)' },
    { id: 'upload_bank_statements', type: 'file', label: 'Bank Statements (most recent)', helper: 'Bank Statements (most recent)' },
    { id: 'upload_tax_returns', type: 'file', label: 'Tax Returns (last 2 years)', helper: 'Tax Returns (last 2 years)' },
    { id: 'upload_vehicle_docs', type: 'file', label: 'Vehicle Documents (loan statements, titles)', helper: 'Vehicle Documents (loan statements, titles)' },
    { id: 'upload_mortgage_docs', type: 'file', label: 'Mortgage Documents (statements, deeds)', helper: 'Mortgage Documents (statements, deeds)' },
    { id: 'upload_credit_report', type: 'file', label: 'Credit Report (recommended)', helper: 'Credit Report (recommended)' },
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
      label: 'How confident are you that you have completed all sections accurately?*',
      required: true,
      options: [
        { value: 'Very confident (feel I answered everything accurately)', label: 'Very confident (feel I answered everything accurately)' },
        { value: 'Mostly confident (a few guesses/estimates)', label: 'Mostly confident (a few guesses/estimates)' },
        { value: 'Not sure (need significant help from the attorney)', label: 'Not sure (need significant help from the attorney)' },
      ],
    },
  ],
};

/** All steps in order; visibility is computed via showIf when filtering by answers */
export const ALL_STEPS: Step[] = [
  stepFilingSetup,
  stepDebtor,
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
