/**
 * Intake steps and fields. Filtered by showIf to get visible steps.
 */
import type { Answers, Field, FieldOption, GridRow, GridColumn, Step } from '../types';
import {
  isJointFiling,
  hasRealEstate,
  getRealEstateCount,
  hasBankAccounts,
  getBankAccountCount,
  hasSecurityDeposits,
  hasVehicles,
  getVehicleCount,
} from '../../utils/logic';

const alwaysShow = (_answers: Answers) => true;

// ---------- Filing ----------
const STEP_FILING: Step = {
  id: 'filing',
  title: 'Filing setup',
  description: 'Are you filing alone or with a spouse?',
  fields: [
    {
      id: 'filing_setup',
      type: 'radio',
      label: 'Filing type',
      required: true,
      options: [
        { value: 'Filing alone', label: 'Filing alone' },
        { value: 'Filing with spouse', label: 'Filing with spouse' },
      ],
    },
  ],
  showIf: alwaysShow,
};

// ---------- Filing choices (petition / B101-critical) ----------
const STEP_FILING_CHOICES: Step = {
  id: 'filing_choices',
  title: 'Filing choices',
  description: 'Chapter, fee, and petition estimates. Your attorney can confirm or change these.',
  reassurance: 'These go on the Voluntary Petition (Form 101).',
  fields: [
    {
      id: 'filing_chapter',
      type: 'radio',
      label: 'Chapter you are filing under',
      required: true,
      options: [
        { value: '7', label: 'Chapter 7' },
        { value: '11', label: 'Chapter 11' },
        { value: '12', label: 'Chapter 12' },
        { value: '13', label: 'Chapter 13' },
      ],
      helper: 'Your attorney will confirm eligibility.',
    },
    {
      id: 'filing_fee_method',
      type: 'radio',
      label: 'Filing fee',
      required: true,
      options: [
        { value: 'full', label: 'Pay in full now' },
        { value: 'installments', label: 'Pay in installments' },
        { value: 'waiver', label: 'Request fee waiver' },
      ],
    },
    {
      id: 'debt_nature',
      type: 'radio',
      label: 'Primary nature of your debts',
      required: true,
      options: [
        { value: 'consumer', label: 'Consumer (personal, household)' },
        { value: 'business', label: 'Business' },
        { value: 'both', label: 'Both' },
      ],
    },
    {
      id: 'creditor_count_range',
      type: 'select',
      label: 'Estimated number of creditors',
      required: true,
      options: [
        { value: '1-49', label: '1–49' },
        { value: '50-99', label: '50–99' },
        { value: '100-199', label: '100–199' },
        { value: '200-999', label: '200–999' },
        { value: '1000-5000', label: '1,000–5,000' },
        { value: '5001-10000', label: '5,001–10,000' },
        { value: '10001-25000', label: '10,001–25,000' },
        { value: '25001-50000', label: '25,001–50,000' },
        { value: '50001-100000', label: '50,001–100,000' },
        { value: '100000+', label: '100,000+' },
      ],
    },
    {
      id: 'asset_range',
      type: 'select',
      label: 'Estimated total value of assets',
      required: true,
      options: [
        { value: '0-50000', label: '$0–$50,000' },
        { value: '50001-100000', label: '$50,001–$100,000' },
        { value: '100001-500000', label: '$100,001–$500,000' },
        { value: '500001-1000000', label: '$500,001–$1 million' },
        { value: '1000001-10000000', label: '$1M–$10M' },
        { value: '10000001-50000000', label: '$10M–$50M' },
        { value: '50000001-100000000', label: '$50M–$100M' },
        { value: '100000001-500000000', label: '$100M–$500M' },
        { value: '500000001-1000000000', label: '$500M–$1B' },
        { value: '1000000001-10000000000', label: '$1B–$10B' },
        { value: '10000000001-50000000000', label: '$10B–$50B' },
        { value: '50000000000+', label: '$50B+' },
      ],
    },
    {
      id: 'liability_range',
      type: 'select',
      label: 'Estimated total liabilities',
      required: true,
      options: [
        { value: '0-50000', label: '$0–$50,000' },
        { value: '50001-100000', label: '$50,001–$100,000' },
        { value: '100001-500000', label: '$100,001–$500,000' },
        { value: '500001-1000000', label: '$500,001–$1 million' },
        { value: '1000001-10000000', label: '$1M–$10M' },
        { value: '10000001-50000000', label: '$10M–$50M' },
        { value: '50000001-100000000', label: '$50M–$100M' },
        { value: '100000001-500000000', label: '$100M–$500M' },
        { value: '500000001-1000000000', label: '$500M–$1B' },
        { value: '1000000001-10000000000', label: '$1B–$10B' },
        { value: '10000000001-50000000000', label: '$10B–$50B' },
        { value: '50000000000+', label: '$50B+' },
      ],
    },
    {
      id: 'filing_date',
      type: 'date',
      label: 'Filing / signature date',
      required: false,
      placeholder: 'YYYY-MM-DD',
      helper: 'Date you (and attorney) will sign the petition. Leave blank to use today.',
    },
  ],
  showIf: alwaysShow,
};

// ---------- Identity ----------
const STEP_IDENTITY: Step = {
  id: 'identity',
  title: 'Your identity',
  description: 'Information required for court filings.',
  reassurance: 'If you\'re unsure, enter your best estimate.',
  fields: [
    { id: 'debtor_full_name', type: 'text', label: 'First and Last Name', required: true, placeholder: 'As on your ID' },
    { id: 'debtor_middle_name', type: 'text', label: 'Middle Name', required: false, placeholder: 'Leave blank if none' },
    { id: 'debtor_other_names', type: 'text', label: 'Other names used (maiden, prior)', required: false, placeholder: 'Leave blank if none' },
    { id: 'debtor_ssn_last4', type: 'text', label: 'Last 4 of SSN', required: true, placeholder: '1234', whyWeAsk: 'Court and trustee use this to identify you.' },
    { id: 'debtor_dob', type: 'date', label: 'Date of birth', required: true, placeholder: 'YYYY-MM-DD' },
  ],
  showIf: alwaysShow,
};

// ---------- Contact & address ----------
const STEP_CONTACT: Step = {
  id: 'contact',
  title: 'Contact & address',
  description: 'Where you live and how we can reach you. Required for court filings.',
  reassurance: 'Best estimates are OK if you don\'t know exact dates.',
  fields: [
    { id: 'debtor_phone', type: 'text', label: 'Phone number', required: true, placeholder: '(555) 555-5555', helper: 'Best number to reach you.' },
    { id: 'debtor_email', type: 'email', label: 'Email address', required: true, placeholder: 'name@email.com', helper: 'We\'ll send important updates here.' },
    { id: 'debtor_address', type: 'textarea', label: 'Current street address', required: true, placeholder: 'Street, city, state, ZIP', helper: 'Street, apartment/unit if any, city, state, and ZIP.' },
    {
      id: 'mailing_different',
      type: 'radio',
      label: 'Is your mailing address different from your current street address?',
      required: true,
      options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }],
    },
    { id: 'mailing_address', type: 'textarea', label: 'Mailing address', required: false, showIf: (a) => a['mailing_different'] === 'Yes' },
    { id: 'county', type: 'text', label: 'County of residence', required: true, placeholder: 'Cook County', helper: 'Required for court filings.' },
    { id: 'addresses_6_years', type: 'textarea', label: 'All addresses where you lived in the last 6 years', required: false, helper: 'List each address and approximate dates.' },
    { id: 'business_names', type: 'text', label: 'Business names used in the last 6 years', required: false, placeholder: 'e.g. Smith Cleaning LLC' },
    {
      id: 'prior_bankruptcy',
      type: 'radio',
      label: 'Have you filed bankruptcy before?',
      required: true,
      options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }],
    },
    { id: 'prior_bankruptcy_district', type: 'text', label: 'District where you filed', required: true, showIf: (a) => a['prior_bankruptcy'] === 'Yes', placeholder: 'e.g. Northern District of Illinois' },
    { id: 'prior_bankruptcy_date', type: 'date', label: 'When did you file?', required: true, showIf: (a) => a['prior_bankruptcy'] === 'Yes' },
    { id: 'prior_bankruptcy_case_number', type: 'text', label: 'Case number', required: true, showIf: (a) => a['prior_bankruptcy'] === 'Yes', placeholder: 'e.g. 12-34567' },
  ],
  showIf: alwaysShow,
};

// ---------- Spouse (joint only) ----------
const STEP_SPOUSE: Step = {
  id: 'spouse',
  title: 'Spouse information',
  description: 'Required for joint filing.',
  fields: [
    { id: 'spouse_full_name', type: 'text', label: 'Spouse First and Last Name', required: true },
    { id: 'spouse_middle_name', type: 'text', label: 'Spouse Middle Name', required: false, placeholder: 'Leave blank if none' },
    { id: 'spouse_other_names', type: 'text', label: 'Spouse other names used', required: false },
    { id: 'spouse_ssn_last4', type: 'text', label: 'Spouse last 4 of SSN', required: true, placeholder: '1234' },
    { id: 'spouse_dob', type: 'date', label: 'Spouse date of birth', required: true },
    { id: 'spouse_phone', type: 'text', label: 'Spouse phone', required: true },
    { id: 'spouse_email', type: 'email', label: 'Spouse email', required: true },
    { id: 'spouse_address', type: 'textarea', label: 'Spouse street address', required: true },
    {
      id: 'spouse_mailing_different',
      type: 'radio',
      label: 'Spouse mailing address different?',
      required: false,
      options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }],
    },
    { id: 'spouse_mailing_address', type: 'textarea', label: 'Spouse mailing address', required: false, showIf: (a) => a['spouse_mailing_different'] === 'Yes' },
    { id: 'spouse_county', type: 'text', label: 'Spouse county of residence', required: true },
  ],
  showIf: isJointFiling,
};

// ---------- Urgency ----------
const URGENCY_OPTIONS: FieldOption[] = [
  { value: 'Foreclosure on your home is pending (date:)', label: 'Foreclosure on your home is pending (date:)' },
  { value: 'Wage garnishment is currently active or pending', label: 'Wage garnishment is currently active or pending' },
  { value: 'Bank account levy is pending', label: 'Bank account frozen or levy pending' },
  { value: 'Risk of vehicle repossession (date:)', label: 'Risk of vehicle repossession (date:)' },
  { value: 'Utility shutoff notice received (date:)', label: 'Utility shutoff notice received (date:)' },
];

const STEP_URGENCY: Step = {
  id: 'urgency',
  title: 'Urgent matters',
  description: 'Tell us about any deadlines or active collection actions.',
  fields: [
    { id: 'urgency_flags', type: 'checkbox', label: 'Which of these apply?', required: false, options: URGENCY_OPTIONS },
    { id: 'foreclosure_date', type: 'text', label: 'Foreclosure date (if any)', required: false, placeholder: 'MM/DD/YYYY' },
    { id: 'repossession_date', type: 'text', label: 'Repossession date (if any)', required: false },
    { id: 'shutoff_date', type: 'text', label: 'Utility shutoff date (if any)', required: false },
    {
      id: 'self_employed',
      type: 'radio',
      label: 'Are you self-employed?',
      required: true,
      options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }],
    },
    { id: 'business_name_type', type: 'text', label: 'Business name / type', required: false, showIf: (a) => a['self_employed'] === 'Yes' },
    {
      id: 'cosigner_debts',
      type: 'radio',
      label: 'Do you have debts that someone else co-signed (or you co-signed for someone)?',
      required: true,
      options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }],
    },
    { id: 'cosigner_details', type: 'textarea', label: 'Co-signer details', required: false, showIf: (a) => a['cosigner_debts'] === 'Yes' },
  ],
  showIf: alwaysShow,
};

// ---------- Real estate ----------
function propertyFields(n: 1 | 2 | 3): Field[] {
  const base: Field[] = [
    {
      id: `property_${n}_doc`,
      type: 'file',
      label: `Upload Mortgage Statement or Deed (Optional)`,
      required: false,
      helper: 'Upload to auto-fill details',
      uploadForTag: `Property ${n}`
    },
    { id: `property_${n}_address`, type: 'text', label: `Property ${n} address`, required: true, placeholder: 'Street address' },
    { id: `property_${n}_city`, type: 'text', label: `City`, required: true },
    { id: `property_${n}_state`, type: 'text', label: `State`, required: true },
    { id: `property_${n}_zip`, type: 'text', label: `ZIP Code`, required: true },
    { id: `property_${n}_county`, type: 'text', label: `County`, required: true },
    {
      id: `property_${n}_ownership`,
      type: 'radio',
      label: 'Who owns this property?',
      required: true,
      options: [
        { value: 'Debtor', label: 'Me (Debtor)' },
        { value: 'Spouse', label: 'Spouse' },
        { value: 'Joint', label: 'Both' },
        { value: 'Community', label: 'Community Property' },
      ],
      showIf: isJointFiling,
    },
    {
      id: `property_${n}_type`,
      type: 'select',
      label: `Property type`,
      required: true,
      options: [
        { value: 'Single Family', label: 'Single Family Home' },
        { value: 'Condo/Townhome', label: 'Condo or Townhome' },
        { value: 'Multi-Family', label: 'Multi-Family (2-4 units)' },
        { value: 'Land', label: 'Land / Lot' },
        { value: 'Commercial', label: 'Commercial Property' },
        { value: 'Manufactured Home', label: 'Manufactured / Mobile Home' },
        { value: 'Timeshare', label: 'Timeshare' },
        { value: 'Other', label: 'Other' },
      ],
    },
    { id: `property_${n}_value`, type: 'text', label: `Estimated current market value`, required: true, placeholder: 'e.g. 250000' },
    {
      id: `property_${n}_mortgage`,
      type: 'radio',
      label: 'Is there a mortgage or lien?',
      required: true,
      options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }],
    },
    { id: `property_${n}_mortgage_balance`, type: 'text', label: 'Outstanding balance (payoff amount)', required: false, showIf: (a) => a[`property_${n}_mortgage`] === 'Yes', placeholder: 'e.g. 180000' },
    { id: `property_${n}_mortgage_details`, type: 'textarea', label: 'Lender name and loan number', required: false, showIf: (a) => a[`property_${n}_mortgage`] === 'Yes' },
    {
      id: `property_${n}_plan`,
      type: 'select',
      label: 'Intention for this property',
      required: true,
      options: [
        { value: 'Keep the property', label: 'Keep the property' },
        { value: 'Surrender', label: 'Surrender (give back to lender)' },
        { value: 'Reaffirm', label: 'Reaffirm (sign new agreement)' },
      ],
    },
    { id: `property_${n}_hoa`, type: 'radio', label: 'Is there an HOA?', required: true, options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
    { id: `property_${n}_hoa_details`, type: 'textarea', label: 'HOA details (Name, Fees)', required: false, showIf: (a) => a[`property_${n}_hoa`] === 'Yes' },
  ];
  return base.map((f) => ({
    ...f,
    showIf: (a) => (n === 1 ? hasRealEstate(a) : getRealEstateCount(a) >= n) && (!f.showIf || f.showIf(a)),
  }));
}

const STEP_REAL_ESTATE: Step = {
  id: 'real_estate',
  title: 'Real estate',
  description: 'Any property you own or have an interest in.',
  fields: [
    {
      id: 'real_estate_ownership',
      type: 'radio',
      label: 'Do you own real estate?',
      required: true,
      options: [
        { value: 'Yes, I own real estate', label: 'Yes, I own real estate' },
        { value: 'No, I do not own real estate', label: 'No, I do not own real estate' },
      ],
    },
    {
      id: 'real_estate_count',
      type: 'select',
      label: 'How many properties?',
      required: true,
      showIf: hasRealEstate,
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ],
    },
    ...propertyFields(1),
    ...propertyFields(2),
    ...propertyFields(3),
  ],
  showIf: alwaysShow,
};

// ---------- Bank accounts ----------
function accountFields(n: 1 | 2 | 3): Field[] {
  const showIfBase = n === 1
    ? hasBankAccounts
    : (a: Answers) => getBankAccountCount(a) >= n;

  // We need to carry the base visibility check into the per-field checks
  return [
    {
      id: `account_${n}_doc`,
      type: 'file',
      label: `Upload Bank Statement (Optional)`,
      required: false,
      helper: 'Upload to auto-fill details',
      showIf: showIfBase
    },
    { id: `account_${n}_institution`, type: 'text', label: `Institution Name`, required: true, showIf: showIfBase, placeholder: 'e.g. Chase Bank' },
    {
      id: `account_${n}_type`,
      type: 'select',
      label: `Account Type`,
      required: true,
      showIf: showIfBase,
      options: [
        { value: 'Checking', label: 'Checking' },
        { value: 'Savings', label: 'Savings' },
        { value: 'Money Market', label: 'Money Market' },
        { value: 'CD', label: 'CD' },
        { value: 'Brokerage', label: 'Brokerage / Investment' },
        { value: 'Other', label: 'Other' },
      ]
    },
    { id: `account_${n}_ownership`, type: 'radio', label: 'Ownership', required: true, showIf: (a) => showIfBase(a) && isJointFiling(a), options: [{ value: 'Debtor', label: 'Me' }, { value: 'Spouse', label: 'Spouse' }, { value: 'Joint', label: 'Joint' }] },
    { id: `account_${n}_last4`, type: 'text', label: `Last 4 digits`, required: false, showIf: showIfBase, placeholder: '1234' },
    { id: `account_${n}_balance`, type: 'text', label: `Current Balance`, required: true, placeholder: 'e.g. 1,500', showIf: showIfBase },
  ];
}

const STEP_BANK_ACCOUNTS: Step = {
  id: 'bank_accounts',
  title: 'Bank accounts',
  description: 'Checking, savings, and other accounts.',
  fields: [
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
      label: 'How many accounts?',
      required: true,
      showIf: hasBankAccounts,
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ],
    },
    ...accountFields(1),
    ...accountFields(2),
    ...accountFields(3),
  ],
  showIf: alwaysShow,
};

// ---------- Security deposits ----------
const STEP_SECURITY_DEPOSITS: Step = {
  id: 'security_deposits',
  title: 'Security deposits',
  description: 'Money held by landlords or utilities.',
  fields: [
    {
      id: 'security_deposits',
      type: 'radio',
      label: 'Do you have security deposits?',
      required: true,
      options: [
        { value: 'Yes, I have security deposits (e.g., rent, utilities)', label: 'Yes' },
        { value: 'No, I do not have security deposits', label: 'No' },
      ],
    },
    { id: 'security_deposit_details', type: 'textarea', label: 'Details', required: false, showIf: hasSecurityDeposits },
  ],
  showIf: alwaysShow,
};

// ---------- Household property (grid) ----------
const HOUSEHOLD_ROWS: GridRow[] = [
  { id: 'furniture', label: 'Furniture' },
  { id: 'electronics', label: 'Electronics (TV, Computer, etc)' },
  { id: 'appliances', label: 'Appliances (Washer, Dryer, etc)' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'tools', label: 'Tools & Equipment' },
  { id: 'books_media', label: 'Books, Media, & Hobby Equipment' },
  { id: 'sports', label: 'Sports & Exercise Equipment' },
  { id: 'firearms', label: 'Firearms' },
  { id: 'animals', label: 'Animals / Pets' },
  { id: 'collectibles', label: 'Collectibles / Antiques' },
  { id: 'other', label: 'Other Household Items' },
];
const HOUSEHOLD_COLUMNS: GridColumn[] = [
  { id: '0_500', label: '$0 – $500' },
  { id: '501_2500', label: '$501 – $2,500' },
  { id: '2501_5000', label: '$2,501 – $5,000' },
  { id: 'over_5000', label: 'Over $5,000' },
];

const STEP_HOUSEHOLD: Step = {
  id: 'household_property',
  title: 'Household property',
  description: 'Estimate value of personal property by category.',
  fields: [
    { id: 'household_property', type: 'grid', label: 'Estimated value ranges', required: false, rows: HOUSEHOLD_ROWS, columns: HOUSEHOLD_COLUMNS },
  ],
  showIf: alwaysShow,
};

// ---------- Valuables ----------
const VALUABLES_OPTIONS: FieldOption[] = [
  { value: 'Jewelry valued over $500 (per item)', label: 'Jewelry valued over $500 (per item)' },
  { value: 'Art or special collections', label: 'Art or special collections' },
  { value: 'None of the above', label: 'None of the above', noneOfAbove: true },
];

const STEP_VALUABLES: Step = {
  id: 'valuables',
  title: 'Valuables',
  description: 'Jewelry, art, or collections.',
  fields: [
    { id: 'valuables', type: 'checkbox', label: 'Which apply?', required: false, options: VALUABLES_OPTIONS },
    { id: 'valuables_details', type: 'textarea', label: 'Details and estimated values', required: false },
  ],
  showIf: alwaysShow,
};

// ---------- Financial assets ----------
const FINANCIAL_ASSETS_OPTIONS: FieldOption[] = [
  { value: 'Retirement accounts (401k, IRA, etc.)', label: 'Retirement accounts (401k, IRA, etc.)' },
  { value: 'Life Insurance with cash or loan value', label: 'Life Insurance with cash or loan value' },
  { value: 'Tax refund currently owed to you', label: 'Tax refund currently owed to you' },
  { value: 'None of the above', label: 'None of the above', noneOfAbove: true },
];

const STEP_FINANCIAL_ASSETS: Step = {
  id: 'financial_assets',
  title: 'Financial assets',
  description: 'Retirement, insurance, tax refunds.',
  fields: [
    { id: 'cash_on_hand', type: 'text', label: 'Cash on hand (approximate)', required: true, placeholder: 'e.g. 50', helper: 'Total cash not in a bank account.' },
    { id: 'financial_assets', type: 'checkbox', label: 'Which apply?', required: false, options: FINANCIAL_ASSETS_OPTIONS },

    // Retirement
    { id: 'retirement_details', type: 'textarea', label: 'Retirement Accounts Details', required: false, helper: 'List specific accounts: "Fidelity 401k: $34,000", "Vanguard IRA: $12,000"', showIf: (a) => (a['financial_assets'] as string[] || []).includes('Retirement accounts (401k, IRA, etc.)') },

    // Tax Refunds
    { id: 'tax_refunds_details', type: 'textarea', label: 'Tax Refunds Details', required: false, helper: 'e.g. "Federal 2024: $2,100", "State 2024: $500"', showIf: (a) => (a['financial_assets'] as string[] || []).includes('Tax refund currently owed to you') },

    // Life Insurance
    { id: 'life_insurance_details', type: 'textarea', label: 'Life Insurance Details', required: false, helper: 'Carrier, Face Value, Cash Surrender Value.', showIf: (a) => (a['financial_assets'] as string[] || []).includes('Life Insurance with cash or loan value') },

    // Catch-all for others
    {
      id: 'financial_assets_details', type: 'textarea', label: 'Other Asset Details', required: false, showIf: (a) => {
        const selected = (a['financial_assets'] as string[] || []);
        const specific = ['Retirement accounts (401k, IRA, etc.)', 'Tax refund currently owed to you', 'Life Insurance with cash or loan value', 'None of the above'];
        // Show if they selected something NOT in the specific list
        return selected.some(s => !specific.includes(s));
      }
    },
  ],
  showIf: alwaysShow,
};

// ---------- Vehicles ----------
function vehicleFields(n: 1 | 2 | 3): Field[] {
  const showIf = n === 1 ? hasVehicles : (a: Answers) => getVehicleCount(a) >= n;

  return [
    {
      id: `vehicle_${n}_doc`,
      type: 'file',
      label: `Upload Title or Registration (Optional)`,
      required: false,
      helper: 'Upload to auto-fill details',
      showIf
    },
    { id: `vehicle_${n}_year`, type: 'text', label: `Year`, required: true, showIf, placeholder: 'e.g. 2018' },
    { id: `vehicle_${n}_make`, type: 'text', label: `Make`, required: true, showIf, placeholder: 'e.g. Toyota' },
    { id: `vehicle_${n}_model`, type: 'text', label: `Model`, required: true, showIf, placeholder: 'e.g. Camry' },
    { id: `vehicle_${n}_mileage`, type: 'text', label: `Mileage (approx)`, required: false, showIf, placeholder: 'e.g. 85,000' },
    { id: `vehicle_${n}_vin`, type: 'text', label: `VIN (optional)`, required: false, showIf },
    { id: `vehicle_${n}_ownership`, type: 'radio', label: 'Ownership', required: true, showIf: (a) => showIf(a) && isJointFiling(a), options: [{ value: 'Debtor', label: 'Me' }, { value: 'Spouse', label: 'Spouse' }, { value: 'Joint', label: 'Joint' }] },
    { id: `vehicle_${n}_value`, type: 'text', label: `Estimated value`, required: true, placeholder: 'e.g. 15000', showIf },
    { id: `vehicle_${n}_loan`, type: 'radio', label: 'Loan or lien?', required: true, showIf, options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
    { id: `vehicle_${n}_loan_details`, type: 'textarea', label: 'Lender name and balance', required: false, showIf: (a) => showIf(a) && a[`vehicle_${n}_loan`] === 'Yes' },
    { id: `vehicle_${n}_plan`, type: 'select', label: 'Plan', required: true, showIf, options: [{ value: 'Keep', label: 'Keep' }, { value: 'Surrender', label: 'Surrender' }, { value: 'Reaffirm', label: 'Reaffirm' }] },
  ];
}

const STEP_VEHICLES: Step = {
  id: 'vehicles',
  title: 'Vehicles',
  description: 'Cars, trucks, motorcycles, boats, trailers.',
  fields: [
    {
      id: 'vehicles',
      type: 'radio',
      label: 'Do you own vehicles?',
      required: true,
      options: [
        { value: 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)', label: 'Yes' },
        { value: 'No, I do not own vehicles', label: 'No' },
      ],
    },
    {
      id: 'vehicle_count',
      type: 'select',
      label: 'How many?',
      required: true,
      showIf: hasVehicles,
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ],
    },
    ...vehicleFields(1),
    ...vehicleFields(2),
    ...vehicleFields(3),
  ],
  showIf: alwaysShow,
};

// ---------- Business and farm assets (Schedule A/B Parts 5–6) ----------
const STEP_BUSINESS_FARM: Step = {
  id: 'business_farm',
  title: 'Business and farm assets',
  description: 'Do you own a business or have farm or commercial fishing assets?',
  fields: [
    {
      id: 'business_or_farm',
      type: 'radio',
      label: 'Do you own a business or have farm/fishing assets?',
      required: true,
      options: [
        { value: 'No', label: 'No' },
        { value: 'Yes', label: 'Yes' },
      ],
    },
    {
      id: 'business_farm_description',
      type: 'textarea',
      label: 'Brief description (e.g. business name, type, or farm/fishing assets)',
      required: false,
      showIf: (a) => a['business_or_farm'] === 'Yes',
    },
    {
      id: 'business_farm_value',
      type: 'text',
      label: 'Estimated total value',
      required: false,
      placeholder: 'e.g. 5000',
      showIf: (a) => a['business_or_farm'] === 'Yes',
    },
  ],
  showIf: alwaysShow,
};

// ---------- Other secured debts ----------
const OTHER_SECURED_OPTIONS: FieldOption[] = [
  { value: 'Furniture or electronics financing (not part of mortgage)', label: 'Furniture or electronics financing' },
  { value: 'None of the above', label: 'None of the above', noneOfAbove: true },
];

const STEP_OTHER_SECURED: Step = {
  id: 'other_secured',
  title: 'Other secured debts',
  description: 'Secured debts not already listed (e.g. furniture financing).',
  fields: [
    { id: 'other_secured_debts', type: 'checkbox', label: 'Which apply?', required: false, options: OTHER_SECURED_OPTIONS },
    { id: 'other_secured_details', type: 'textarea', label: 'Details', required: false },
  ],
  showIf: alwaysShow,
};

// ---------- Priority debts ----------
const PRIORITY_OPTIONS: FieldOption[] = [
  { value: 'Back taxes (Federal, State, or Local)', label: 'Back taxes (Federal, State, or Local)' },
  { value: 'Child support or alimony', label: 'Child support or alimony' },
  { value: 'None of the above', label: 'None of the above', noneOfAbove: true },
];

const STEP_PRIORITY_DEBTS: Step = {
  id: 'priority_debts',
  title: 'Priority debts',
  description: 'Taxes, support, and other priority claims.',
  fields: [
    { id: 'priority_debts', type: 'checkbox', label: 'Which apply?', required: false, options: PRIORITY_OPTIONS },
    { id: 'priority_debts_details', type: 'textarea', label: 'Creditor names and amounts', required: false },
  ],
  showIf: alwaysShow,
};

// ---------- Unsecured debts ----------
const STEP_UNSECURED: Step = {
  id: 'unsecured',
  title: 'Unsecured debts',
  description: 'Credit cards, medical bills, personal loans, etc.',
  fields: [
    { id: 'unsecured_creditors', type: 'textarea', label: 'List creditors and approximate balances', required: false, placeholder: 'e.g. Chase $8,400; Medical – Northwestern $1,850' },
  ],
  showIf: alwaysShow,
};

// ---------- Leases & contracts ----------
const LEASES_OPTIONS: FieldOption[] = [
  { value: 'Home lease or rental agreement (if you don\'t own)', label: 'Home lease or rental agreement' },
  { value: 'Service contracts (e.g., security system, gym membership)', label: 'Service contracts' },
  { value: 'None of the above', label: 'None of the above', noneOfAbove: true },
];

const STEP_LEASES: Step = {
  id: 'leases',
  title: 'Leases & contracts',
  description: 'Ongoing lease or service agreements.',
  fields: [
    { id: 'leases_contracts', type: 'checkbox', label: 'Which apply?', required: false, options: LEASES_OPTIONS },
    { id: 'leases_contracts_details', type: 'textarea', label: 'Details', required: false },
  ],
  showIf: alwaysShow,
};

// ---------- Employment & income ----------
const STEP_INCOME: Step = {
  id: 'income',
  title: 'Employment & income',
  description: 'Current employment and other income.',
  reassurance: 'Estimates are OK.',
  fields: [
    { id: 'debtor_employer', type: 'text', label: 'Your employer', required: true },
    { id: 'debtor_job_title', type: 'text', label: 'Job title', required: true },
    { id: 'debtor_how_long', type: 'text', label: 'How long at this job?', required: true },
    { id: 'debtor_pay_frequency', type: 'select', label: 'Pay frequency', required: true, options: [{ value: 'Weekly', label: 'Weekly' }, { value: 'Bi-weekly', label: 'Bi-weekly' }, { value: 'Semi-monthly', label: 'Semi-monthly' }, { value: 'Monthly', label: 'Monthly' }] },
    { id: 'debtor_gross_pay', type: 'text', label: 'Gross pay per pay period', required: true, placeholder: 'e.g. 3,240' },
    { id: 'spouse_employer', type: 'text', label: 'Spouse employer', required: false, showIf: isJointFiling },
    { id: 'spouse_job_title', type: 'text', label: 'Spouse job title', required: false, showIf: isJointFiling },
    { id: 'spouse_how_long', type: 'text', label: 'Spouse how long', required: false, showIf: isJointFiling },
    { id: 'spouse_pay_frequency', type: 'select', label: 'Spouse pay frequency', required: false, showIf: isJointFiling, options: [{ value: 'Weekly', label: 'Weekly' }, { value: 'Bi-weekly', label: 'Bi-weekly' }, { value: 'Semi-monthly', label: 'Semi-monthly' }, { value: 'Monthly', label: 'Monthly' }] },
    { id: 'spouse_gross_pay', type: 'text', label: 'Spouse gross pay per pay period', required: false, showIf: isJointFiling },
    { id: 'other_income_types', type: 'checkbox', label: 'Other income', required: false, options: [{ value: 'Rental Income', label: 'Rental income' }, { value: 'Social Security', label: 'Social Security' }, { value: 'Other', label: 'Other' }] },
    { id: 'other_income_details', type: 'textarea', label: 'Other income details', required: false },
  ],
  showIf: alwaysShow,
};

// ---------- Monthly expenses (grid) ----------
const EXPENSE_ROWS: GridRow[] = [
  { id: 'housing', label: 'Housing (rent/mortgage, taxes, insurance)' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'food', label: 'Food' },
  { id: 'transportation', label: 'Transportation' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'medical', label: 'Medical' },
  { id: 'childcare', label: 'Childcare' },
  { id: 'child_support_paid', label: 'Child support paid' },
  { id: 'other_expenses', label: 'Other' },
];
const EXPENSE_COLUMNS: GridColumn[] = [
  { id: 'under_500', label: 'Under $500' },
  { id: '0_500', label: '$0 – $500' },
  { id: '500_1500', label: '$500 – $1,500' },
  { id: '1501_3000', label: '$1,501 – $3,000' },
  { id: 'over_3000', label: 'Over $3,000' },
];

const STEP_EXPENSES: Step = {
  id: 'expenses',
  title: 'Monthly expenses',
  description: 'Estimate your typical monthly expenses.',
  fields: [
    {
      id: 'monthly_expenses_total_estimate',
      type: 'text',
      label: 'Monthly expenses total estimate',
      required: false,
      placeholder: 'e.g. 3200',
      helper: 'Start with a single estimate. Use detailed breakdown below only if helpful.',
    },
    {
      id: 'monthly_expenses_not_sure',
      type: 'radio',
      label: 'Not sure of total yet?',
      required: false,
      options: [
        { value: 'Yes', label: 'Yes, I am not sure yet' },
        { value: 'No', label: 'No, I entered my best estimate' },
      ],
    },
    {
      id: 'monthly_expenses',
      type: 'grid',
      label: 'Optional detailed breakdown',
      required: false,
      rows: EXPENSE_ROWS,
      columns: EXPENSE_COLUMNS,
      helper: 'Optional: add ranges by category if you want a more detailed estimate.',
    },
  ],
  showIf: alwaysShow,
};

// ---------- Income history ----------
const STEP_INCOME_HISTORY: Step = {
  id: 'income_history',
  title: 'Income history',
  description: 'Income for means test and schedules.',
  fields: [
    { id: 'income_current_ytd', type: 'text', label: 'Year-to-date income (current year)', required: true, placeholder: 'e.g. 42,800' },
    { id: 'income_last_year', type: 'text', label: 'Total income last year', required: true, placeholder: 'e.g. 78,400' },
    { id: 'income_two_years_ago', type: 'text', label: 'Total income two years ago', required: true, placeholder: 'e.g. 74,200' },
  ],
  showIf: alwaysShow,
};

// ---------- Documents upload ----------
const STEP_DOCUMENTS: Step = {
  id: 'documents',
  title: 'Documents',
  description: 'Upload requested documents. You can add more later.',
  uploadInstructions: 'Upload what you have. Start with the bulk uploader, then add details below if needed.',
  fields: [
    {
      id: 'upload_documents_bulk',
      type: 'file',
      label: 'Upload documents (bulk)',
      required: false,
      helper: 'Use this first. You can choose multiple files at once.',
      uploadForTag: 'Primary upload',
      requestedDocsList: ['Paystubs', 'Bank statements', 'Tax returns', 'Any court or creditor notices'],
      dontHaveYetCheckbox: false,
    },
    {
      id: 'upload_paystubs',
      type: 'file',
      label: 'Paystubs',
      required: false,
      uploadForTag: 'Income',
      dateRangeRequested: 'Last 6 months',
      acceptedAlternatives: ['Payroll portal export', 'Employer income letter'],
      examplesMini: ['Last 60 days from all employers'],
      resolutionRequired: true,
    },
    {
      id: 'upload_bank_statements',
      type: 'file',
      label: 'Bank statements',
      required: false,
      uploadForTag: 'Bank accounts',
      acceptedAlternatives: ['Transaction history export (PDF/CSV)', 'Official account activity printout'],
      examplesMini: ['2–3 months for each active account'],
      resolutionRequired: true,
    },
    {
      id: 'upload_tax_returns',
      type: 'file',
      label: 'Tax returns',
      required: false,
      uploadForTag: 'Tax returns',
      acceptedAlternatives: ['IRS transcript', 'Tax preparer transcript'],
      examplesMini: ['Last 2 years'],
      resolutionRequired: true,
    },
    { id: 'upload_vehicle_docs', type: 'file', label: 'Vehicle docs', required: false, acceptedAlternatives: ['Registration and payoff statement'], resolutionRequired: true },
    { id: 'upload_mortgage_docs', type: 'file', label: 'Mortgage docs', required: false, acceptedAlternatives: ['Latest statement and payoff estimate'], resolutionRequired: true },
    { id: 'upload_credit_report', type: 'file', label: 'Credit report', required: false, acceptedAlternatives: ['Creditor list with balances'], resolutionRequired: true },
    { id: 'upload_debt_counseling', type: 'file', label: 'Debt counseling certificate', required: false, uploadForTag: 'Pre-filing requirement', acceptedAlternatives: ['Course completion confirmation'], resolutionRequired: true },
    { id: 'upload_business_docs', type: 'file', label: 'Business docs (if self-employed)', required: false, showIf: (a) => a['self_employed'] === 'Yes', acceptedAlternatives: ['Profit/loss report and bank activity'], resolutionRequired: true },
  ],
  showIf: alwaysShow,
};

// ---------- Recent activity ----------
const STEP_RECENT: Step = {
  id: 'recent_activity',
  title: 'Recent financial activity',
  description: 'Payments, garnishments, transfers, and closed accounts.',
  fields: [
    { id: 'paid_creditor_600', type: 'radio', label: 'Paid any single creditor $600+ in last 90 days?', required: true, options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
    { id: 'paid_creditor_600_details', type: 'textarea', label: 'Details', required: false, showIf: (a) => a['paid_creditor_600'] === 'Yes' },
    { id: 'repaid_loans_gifts', type: 'radio', label: 'Repaid loans or gifts to family/friends in last year?', required: true, options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
    { id: 'repaid_loans_gifts_details', type: 'textarea', label: 'Details', required: false, showIf: (a) => a['repaid_loans_gifts'] === 'Yes' },
    { id: 'lawsuits_garnishments', type: 'radio', label: 'Lawsuits or wage garnishment?', required: true, options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
    { id: 'lawsuits_garnishments_details', type: 'textarea', label: 'Details', required: false, showIf: (a) => a['lawsuits_garnishments'] === 'Yes' },
    { id: 'repossession_foreclosure', type: 'radio', label: 'Repossession or foreclosure in last 2 years?', required: true, options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
    { id: 'repossession_foreclosure_details', type: 'textarea', label: 'Details', required: false, showIf: (a) => a['repossession_foreclosure'] === 'Yes' },
    { id: 'transferred_property', type: 'radio', label: 'Transferred property or assets in last 2 years?', required: true, options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
    { id: 'transferred_property_details', type: 'textarea', label: 'Details', required: false, showIf: (a) => a['transferred_property'] === 'Yes' },
    { id: 'closed_accounts', type: 'radio', label: 'Closed any bank or credit accounts in last year?', required: true, options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
    { id: 'closed_accounts_details', type: 'textarea', label: 'Details', required: false, showIf: (a) => a['closed_accounts'] === 'Yes' },
  ],
  showIf: alwaysShow,
};

// ---------- Final review ----------
const STEP_FINAL_REVIEW: Step = {
  id: 'final_review',
  title: 'Final review',
  description: 'Review your answers before submitting.',
  fields: [
    {
      id: 'confidence',
      type: 'radio',
      label: 'How confident are you in your answers?',
      required: true,
      options: [
        { value: 'Very confident', label: 'Very confident' },
        { value: 'Mostly confident (a few guesses/estimates)', label: 'Mostly confident (a few guesses/estimates)' },
        { value: 'Many estimates — will confirm with attorney', label: 'Many estimates — will confirm with attorney' },
      ],
    },
  ],
  showIf: alwaysShow,
};

// ---------- Export ----------
export const ALL_STEPS: Step[] = [
  STEP_FILING,
  STEP_FILING_CHOICES,
  STEP_IDENTITY,
  STEP_CONTACT,
  STEP_SPOUSE,
  STEP_URGENCY,
  STEP_REAL_ESTATE,
  STEP_BANK_ACCOUNTS,
  STEP_SECURITY_DEPOSITS,
  STEP_HOUSEHOLD,
  STEP_VALUABLES,
  STEP_FINANCIAL_ASSETS,
  STEP_VEHICLES,
  STEP_BUSINESS_FARM,
  STEP_OTHER_SECURED,
  STEP_PRIORITY_DEBTS,
  STEP_UNSECURED,
  STEP_LEASES,
  STEP_INCOME,
  STEP_EXPENSES,
  STEP_INCOME_HISTORY,
  STEP_DOCUMENTS,
  STEP_RECENT,
  STEP_FINAL_REVIEW,
];

/**
 * Steps visible given current answers (e.g. joint-filer steps only when filing with spouse).
 */
export function getVisibleSteps(answers: Answers): Step[] {
  return ALL_STEPS.filter((step) => step.showIf(answers));
}

/** All fields that can be randomly seeded (non-file). Used by randomSeed. */
export function getSeedableFields(): Field[] {
  const out: Field[] = [];
  for (const step of ALL_STEPS) {
    for (const f of step.fields) {
      if (f.type !== 'file') out.push(f);
    }
  }
  return out;
}
