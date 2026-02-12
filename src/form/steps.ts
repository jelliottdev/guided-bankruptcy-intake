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
  description: 'Choose whether you are filing alone or with your spouse. This determines which sections you\'ll see.',
  showIf: always,
  fields: [
    {
      id: 'filing_setup',
      type: 'radio',
      label: 'How are you filing your bankruptcy case?',
      required: true,
      helper: 'Joint filing means both you and your spouse are in the same case and we\'ll ask for both of your information.',
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
      placeholder: 'e.g. Jane Smith (maiden), Jane Doe (prior marriage)',
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
      placeholder: '123 Main St, Apt 4B\nChicago, IL 60601',
      helper: 'Street, apartment/unit if any, city, state, and ZIP. One or two lines is fine.',
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
      placeholder: 'P.O. Box 100 or street address\nCity, State ZIP',
      helper: 'Where you receive mail if different from where you live.',
      showIf: (a) => a['mailing_different'] === 'Yes',
    },
    {
      id: 'county',
      type: 'text',
      label: 'County of Residence',
      required: true,
      placeholder: 'e.g. Cook County, Los Angeles County',
      helper: 'The county where you currently live. Required for court filings.',
      groupStart: true,
    },
    {
      id: 'addresses_6_years',
      type: 'textarea',
      label: 'All addresses where you lived in the last 6 years',
      placeholder: 'Jan 2020 – Dec 2022: 456 Oak Ave, Chicago IL\nJan 2023 – present: 123 Main St, Chicago IL',
      helper: 'List each address and approximate dates. Cities and states are OK if you don\'t remember full street addresses.',
    },
    {
      id: 'business_names',
      type: 'textarea',
      label: 'Business names you have used in the last 6 years',
      placeholder: 'e.g. Smith Cleaning LLC, DBA Quick Fix',
      helper: 'Leave blank if none. Include side businesses, DBA names, or any name you used for work.',
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
      placeholder: 'e.g. Chapter 7, filed 2018, received discharge',
      helper: 'Include chapter type (7 or 13), year filed, and whether you received a discharge (if known).',
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
    {
      id: 'spouse_full_name',
      type: 'text',
      label: 'Spouse full legal name (exactly as shown on ID)',
      required: true,
      placeholder: 'e.g. John Robert Smith',
      helper: 'Use current legal name — not nicknames.',
    },
    {
      id: 'spouse_other_names',
      type: 'text',
      label: 'Spouse other names used in the last 6 years',
      placeholder: 'e.g. maiden name, prior married name',
      helper: 'Leave blank if none.',
    },
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
      helper: 'Select any that describe your situation. This helps your attorney prioritize.',
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
      placeholder: 'e.g. 03/15/2025 or March 2025',
      helper: 'Sale date or scheduled date if you know it. Estimate if needed.',
      showIf: (a) => {
        const v = a['urgency_flags'];
        return Array.isArray(v) && v.includes('Foreclosure on your home is pending (date:)');
      },
    },
    {
      id: 'repossession_date',
      type: 'text',
      label: 'Repossession date (if known)',
      placeholder: 'e.g. 02/01/2025 or Soon',
      helper: 'When the vehicle or item may be repossessed. Estimate if needed.',
      showIf: (a) => {
        const v = a['urgency_flags'];
        return Array.isArray(v) && v.includes('Risk of vehicle repossession (date:)');
      },
    },
    {
      id: 'shutoff_date',
      type: 'text',
      label: 'Shutoff date (if known)',
      placeholder: 'e.g. 04/01/2025',
      helper: 'Date on the notice or when service may be cut. Estimate if needed.',
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
      placeholder: 'e.g. ABC Cleaning LLC — sole proprietor, house cleaning',
      helper: 'Legal business name (if any) and what the business does.',
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
      placeholder: 'e.g. Jane Doe — Chase auto loan; John Smith — furniture financing',
      helper: 'List each co-signer and the debt they co-signed for. Your attorney will explain how this affects your case.',
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
      helper: 'Include your home, rental property, land, or timeshares — even if someone else lives there.',
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
        placeholder: 'e.g. 100 Oak Lane, Springfield IL 62701',
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
        placeholder: 'e.g. $250,000 or Not sure',
        helper: 'What the property could sell for today — not what you paid. Zillow/Redfin estimates or "Not sure" are OK.',
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
        placeholder: 'e.g. Lender: ABC Mortgage, balance ~$180,000, monthly $1,200',
        helper: 'Lender name, approximate balance, and monthly payment. Copy from your latest mortgage statement if available.',
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
        placeholder: 'e.g. HOA name, monthly dues $150, any special assessments',
        helper: 'HOA or condo association name, monthly dues, and any past-due amounts if known.',
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
      helper: 'Include checking, savings, credit union, and online-only accounts.',
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
        placeholder: 'e.g. Chase Checking, Wells Fargo Savings',
        helper: 'Bank or credit union name and account type.',
        showIf: (a) => hasBankAccounts(a) && getBankAccountCount(a) >= n,
      },
      {
        id: `${prefix}last4`,
        type: 'text',
        label: `Account ${n}: Last 4 Digits`,
        placeholder: '1234',
        helper: 'Last 4 digits of the account number only (for identification).',
        showIf: (a) => hasBankAccounts(a) && getBankAccountCount(a) >= n,
      },
      {
        id: `${prefix}balance`,
        type: 'text',
        label: `Account ${n}: Current Balance`,
        placeholder: 'e.g. $1,250 or Not sure',
        helper: 'Today\'s approximate balance. Estimates are fine.',
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
      helper: 'Money held by a landlord, utility, or other party that you expect back.',
      options: [
        { value: 'Yes, I have security deposits (e.g., rent, utilities)', label: 'Yes, I have security deposits' },
        { value: 'No, I do not have security deposits', label: 'No, I do not have security deposits' },
      ],
    },
    {
      id: 'security_deposit_details',
      type: 'textarea',
      label: 'Security Deposit Details',
      placeholder: 'e.g. Apartment: $1,200 with ABC Rentals; Electric: $200 deposit with City Power',
      helper: 'Who holds the deposit, amount, and what it\'s for (rent, utility, phone, etc.).',
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
  description: 'Estimate what these categories would sell for today (used/garage sale value), not what you paid. "Not sure" is OK.',
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
  description: 'Items that may be worth more than typical household goods. Estimates are OK.',
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
      placeholder: 'e.g. Wedding ring, appraised $800; 2 firearms, estimated $600 total',
      helper: 'List each item and estimated value (or "Not sure"). Items over about $500 each should be listed.',
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
      placeholder: 'e.g. 401k at Fidelity, ~$12,000; Expected tax refund $1,500; Life insurance with $2k cash value',
      helper: 'For each: institution or source, account # (if any), estimated value (or Not sure). Tax refund: amount you expect. Lawsuit: describe the claim even if not filed yet.',
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
        placeholder: 'e.g. 2018 Honda Civic, 75,000 miles',
        helper: 'Make, model, year, and approximate mileage. We\'ll use this to estimate value.',
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
        placeholder: 'e.g. Chase Auto, balance ~$8,500, monthly $320',
        helper: 'Lender name, approximate balance, and monthly payment. Copy from your latest loan statement if available.',
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
  description: 'Cars, trucks, motorcycles, boats, RVs, or trailers you own. Include any with a loan or lien.',
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
      placeholder: 'e.g. ABC Furniture — couch & table, $800 left; Pawn shop — tools, $200',
      helper: 'For each: creditor name, what they can take (collateral), and approximate balance.',
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
      placeholder: 'e.g. IRS — 2022 taxes, ~$3,000; State — child support arrears, ~$1,200',
      helper: 'Who you owe, type of debt, and approximate amount. Priority debts get special treatment in bankruptcy.',
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
      placeholder: 'e.g. Chase Card $4,200; Medical Center $1,800; Personal loan from Credit Union $2,100',
      helper: 'Creditor name and approximate balance. List largest first. You don\'t have to list every debt — a credit report upload can capture most.',
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
      placeholder: 'e.g. Apartment lease — ABC Rentals, $1,100/mo, ends Aug 2025; Gym — Planet Fitness, $15/mo',
      helper: 'Type of agreement, company name, monthly payment, and when it ends (if known).',
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
    {
      id: 'debtor_employer',
      type: 'text',
      label: 'Employer name',
      placeholder: 'e.g. Acme Corp, City of Springfield',
      helper: 'Current employer or "Unemployed" / "Retired" if applicable.',
    },
    {
      id: 'debtor_job_title',
      type: 'text',
      label: 'Job title',
      placeholder: 'e.g. Customer Service Rep, Nurse',
      helper: 'Your current job title or role.',
    },
    {
      id: 'debtor_how_long',
      type: 'text',
      label: 'How long employed',
      placeholder: 'e.g. 2 years, 6 months, Since Jan 2023',
      helper: 'How long you have worked at this job. Approximate is fine.',
    },
    {
      id: 'debtor_pay_frequency',
      type: 'select',
      label: 'Pay frequency',
      helper: 'How often you receive a paycheck.',
      options: [
        { value: 'Weekly', label: 'Weekly' },
        { value: 'Bi-weekly', label: 'Bi-weekly' },
        { value: 'Semi-monthly', label: 'Semi-monthly' },
        { value: 'Monthly', label: 'Monthly' },
        { value: 'Other', label: 'Other' },
      ],
    },
    {
      id: 'debtor_gross_pay',
      type: 'text',
      label: 'Gross pay per check',
      placeholder: 'e.g. $2,400 or Not sure',
      helper: 'Amount before taxes and deductions. Estimates are OK. Enter "Not sure" if needed.',
    },
  ];
  base.push(
    {
      id: 'spouse_employer',
      type: 'text',
      label: 'Spouse: Employer name',
      placeholder: 'e.g. Acme Corp',
      showIf: isJointFiling,
    },
    {
      id: 'spouse_job_title',
      type: 'text',
      label: 'Spouse: Job title',
      placeholder: 'e.g. Teacher, Manager',
      showIf: isJointFiling,
    },
    {
      id: 'spouse_how_long',
      type: 'text',
      label: 'Spouse: How long employed',
      placeholder: 'e.g. 3 years',
      showIf: isJointFiling,
    },
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
    {
      id: 'spouse_gross_pay',
      type: 'text',
      label: 'Spouse: Gross pay per check',
      placeholder: 'e.g. $2,100 or Not sure',
      helper: 'Gross amount per paycheck before deductions.',
      showIf: isJointFiling,
    },
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
      placeholder: 'e.g. Social Security $1,800/mo; Part-time gig $400/mo',
      helper: 'For each source selected above: name of source and approximate monthly amount.',
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
  description: 'Estimate your typical monthly spending in each category. Round numbers are fine — we use this to compare income and expenses.',
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
    {
      id: 'income_current_ytd',
      type: 'text',
      label: 'Total Gross Income — Current Year (Year-to-Date)',
      placeholder: 'e.g. $28,000 or Not sure',
      helper: 'All gross income so far this year, before taxes. Paystub YTD or estimate.',
    },
    {
      id: 'income_last_year',
      type: 'text',
      label: 'Total Gross Income — Last Full Year',
      placeholder: 'e.g. $45,000',
      helper: 'Total gross income for last calendar year. Tax return or W-2 total if available.',
    },
    {
      id: 'income_two_years_ago',
      type: 'text',
      label: 'Total Gross Income — Two Years Ago',
      placeholder: 'e.g. $42,000 or Not sure',
      helper: 'Total gross income from two years ago. Tax returns or estimates are fine.',
    },
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
      placeholder: 'e.g. Paid Chase $800 on 1/15/25; Paid medical bill $650 in Dec 2024',
      helper: 'List each payment over $600: creditor name, amount, and approximate date. Your attorney will review.',
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
      placeholder: 'e.g. Repaid sister $500 in March 2024; Gave $200 to nephew for graduation',
      helper: 'Who you paid or gave money/property to, amount, and when. Required by law — your attorney will explain.',
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
      placeholder: 'e.g. Credit card lawsuit in County Court; Wage garnishment from ABC Collections',
      helper: 'Case name, court (if any), and current status. Your attorney will review.',
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
      placeholder: 'e.g. Car repossessed Jan 2025; Foreclosure sale scheduled for March 2025',
      helper: 'What was repossessed or foreclosed, and when (or when scheduled).',
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
      placeholder: 'e.g. Sold car to neighbor in June 2024 for $3,000; Gave furniture to brother',
      helper: 'What you sold or transferred, to whom, when, and for how much (if any). Required by law.',
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
      placeholder: 'e.g. Closed Chase checking in Aug 2024; Closed credit union savings in Jan 2025',
      helper: 'Which accounts you closed and when. Bank, credit union, or investment accounts.',
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
