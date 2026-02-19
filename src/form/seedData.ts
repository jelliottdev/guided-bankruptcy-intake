/**
 * Realistic demo/seed data for the intake questionnaire.
 * Covers all steps and fields so the form appears fully filled with plausible values.
 * B101-critical values are Wallace-derived (see docs/wallace-b101-values.json).
 */
import type { Answers, Uploads } from './types';
import { getInitialAnswers } from './defaults';

/** Build seeded answers: start from initial (covers all field ids), then override with realistic values. */
export function getSeededAnswers(): Answers {
  const base = getInitialAnswers();

  const seed: Record<string, string | string[] | Record<string, string>> = {
    // ——— Filing ———
    filing_setup: 'Filing with spouse',

    // ——— Debtor identity (align with filed Form 101: Nicholas Alexander Wallace) ———
    debtor_full_name: 'Nicholas Alexander Wallace',
    debtor_other_names: '',
    debtor_ssn_last4: '1174',
    debtor_dob: '1986-12-29',

    // ——— Debtor contact (filed address: 10556 Bull Grass Drive; county: Orange) ———
    debtor_phone: '(407) 555-0184',
    debtor_email: 'nick.wallace@email.com',
    debtor_address: '10556 Bull Grass Dr\nOrlando, FL 32825',
    mailing_different: 'No',
    mailing_address: '',
    county: 'Orange',
    state: 'Florida',
    addresses_6_years:
      'Jan 2021 – Jun 2023: 901 E Colonial Dr, Orlando FL 32803\nJul 2023 – present: 10556 Bull Grass Dr, Orlando FL 32825',
    business_names: '',
    prior_bankruptcy: 'No',
    prior_bankruptcy_details: '',
    debtor_counseling_complete: 'Yes',
    spouse_counseling_complete: 'Yes',

    // ——— Spouse (joint) ———
    spouse_full_name: 'Katie Marie Wallace',
    spouse_other_names: '',
    spouse_ssn_last4: '9805',
    spouse_dob: '1986-08-16',
    spouse_phone: '(407) 555-0185',
    spouse_email: 'katie.wallace@email.com',
    spouse_address: '10556 Bull Grass Dr\nOrlando, FL 32825',
    spouse_mailing_different: 'No',
    spouse_mailing_address: '',
    spouse_county: 'Orange',

    // ——— Urgency ———
    urgency_flags: ['None of the above'],
    foreclosure_date: '04/15/2025',
    repossession_date: '',
    shutoff_date: '',
    self_employed: 'No',
    business_name_type: '',
    cosigner_debts: 'Yes',
    cosigner_details:
      'Rosa Martinez — co-signed for daughter\'s student loan, Discover, balance ~$12,400; David Santos — co-signed our auto loan with Chase, balance ~$9,200.',

    // ——— Real estate ———
    real_estate_ownership: 'Yes, I own real estate',
    real_estate_count: '1',
    property_1_address: '10556 Bull Grass Dr',
    property_1_city: 'Orlando',
    property_1_state: 'FL',
    property_1_zip: '32825',
    property_1_county: 'Orange County',
    property_1_ownership: 'Joint',
    property_1_type: 'Single Family',
    property_1_value: '450,000',
    property_1_mortgage: 'Yes',
    property_1_mortgage_balance: '385,000',
    property_1_mortgage_details: 'Wells Fargo Home Mortgage, Acct #123456789',
    property_1_plan: 'Keep the property',
    property_1_hoa: 'Yes',
    property_1_hoa_details: 'Avalon Park HOA, $120/mo',
    property_2_address: '',
    property_2_type: '',
    property_2_value: '',
    property_2_mortgage: '',
    property_2_mortgage_details: '',
    property_2_plan: '',
    property_2_hoa: '',
    property_2_hoa_details: '',

    // ——— Bank accounts (Bank of America statements in Wallace file set) ———
    bank_accounts: 'Yes, I have bank accounts',
    bank_account_count: '3',
    account_1_institution: 'Bank of America',
    account_1_type: 'Checking',
    account_1_ownership: 'Joint',
    account_1_last4: '0171',
    account_1_balance: '1,240',
    account_2_institution: 'Bank of America',
    account_2_type: 'Checking',
    account_2_ownership: 'Joint',
    account_2_last4: '6705',
    account_2_balance: '820',
    account_3_institution: 'Bank of America',
    account_3_type: 'Savings',
    account_3_ownership: 'Joint',
    account_3_last4: '8465',
    account_3_balance: '3,510',

    // ——— Security deposits ———
    // ——— Security deposits ———
    security_deposits: 'Yes, I have security deposits (e.g., rent, utilities)',
    security_deposit_details: 'Duke Energy ($250 deposit), Landlord ($1500 security deposit)',

    // ——— Household property (grid: row id -> column id) ———
    household_property: {
      furniture: '501_2500',
      electronics: '501_2500',
      appliances: '501_2500',
      clothing: '0_500',
      tools: '0_500',
      books_media: '0_500',
      sports: '0_500',
      firearms: '0_500',
      animals: '0_500',
      collectibles: '0_500',
      other: '0_500',
    },

    // ——— Valuables ———
    valuables: ['Jewelry valued over $500 (per item)', 'Art or special collections'],
    valuables_details:
      'Wedding/engagement ring, appraised ~$1,200; oil painting by local artist, estimated $600.',

    // ——— Financial assets ———
    cash_on_hand: '150',
    financial_assets: [
      'Retirement accounts (401k, IRA, etc.)',
      'Life Insurance with cash or loan value',
      'Tax refund currently owed to you',
    ],
    retirement_details: 'Fidelity 401k through employer: $34,000\nVanguard IRA: $12,000',
    tax_refunds_details: 'Federal 2024 Tax Refund: $2,100',
    life_insurance_details: 'State Farm Term Life (No cash value): $0',
    financial_assets_details: '',

    // ——— Vehicles (Wallace case docs: 2016 Dodge Ram, GMC Acadia) ———
    vehicles: 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)',
    vehicle_count: '2',
    vehicle_1_year: '2016',
    vehicle_1_make: 'Dodge',
    vehicle_1_model: 'Ram',
    vehicle_1_value: '22000',
    vehicle_1_ownership: 'Joint',
    vehicle_1_loan: 'Yes',
    vehicle_1_loan_details: 'Payoff statement on file (see uploads).',
    vehicle_1_plan: 'Keep',
    vehicle_2_year: '2017',
    vehicle_2_make: 'GMC',
    vehicle_2_model: 'Acadia',
    vehicle_2_value: '15000',
    vehicle_2_ownership: 'Joint',
    vehicle_2_loan: 'Yes',
    vehicle_2_loan_details: 'Payoff statement on file (see uploads).',
    vehicle_2_plan: 'Keep',

    // ——— Business and farm (Schedule A/B Parts 5–6) ———
    business_or_farm: 'No',
    business_farm_description: '',
    business_farm_value: '',

    // ——— Other secured debts ———
    other_secured_debts: ['Furniture or electronics financing (not part of mortgage)'],
    other_secured_details:
      'Rooms To Go — living room set, ~$1,100 balance, $89/mo.',

    // ——— Priority debts ———
    priority_debts: ['Back taxes (Federal, State, or Local)'],
    priority_debts_details: 'IRS — 2022 tax year, balance ~$3,200; Illinois state — 2023 estimate, ~$480.',

    // ——— Unsecured ———
    unsecured_creditors:
      'Chase Sapphire $8,400; Capital One $2,100; Citi Card $4,750; Medical — Northwestern Memorial $1,850; CareFirst medical $620; Personal loan — LendingClub $3,200.',

    // ——— Leases & contracts ———
    leases_contracts: [
      'Home lease or rental agreement (if you don\'t own)',
      'Service contracts (e.g., security system, gym membership)',
    ],
    leases_contracts_details:
      'Rental: 920 N. Halsted unit leased to tenant, lease through Aug 2025. Gym: Planet Fitness $24/mo; ADT security at rental $45/mo.',

    // ——— Employment & income ———
    debtor_employer: 'Employer (see paystubs)',
    debtor_job_title: 'Employee',
    debtor_how_long: '3 years',
    debtor_pay_frequency: 'Bi-weekly',
    debtor_gross_pay: '3,071',
    spouse_employer: 'Employer (see paystubs)',
    spouse_job_title: 'Employee',
    spouse_how_long: '2 years',
    spouse_pay_frequency: 'Bi-weekly',
    spouse_gross_pay: '1,850',
    other_income_types: [],
    other_income_details: '',

    // ——— Monthly expenses (grid: row id -> column id) ———
    monthly_expenses: {
      housing: '1501_3000',
      utilities: '500_1500',
      food: '500_1500',
      transportation: '500_1500',
      insurance: '500_1500',
      medical: 'under_500',
      childcare: 'under_500',
      child_support_paid: 'under_500',
      other_expenses: 'under_500',
    },

    // ——— Income history ———
    income_current_ytd: '30,476',
    income_last_year: '71,200',
    income_two_years_ago: '68,900',

    // ——— Recent activity ———
    paid_creditor_600: 'Yes',
    paid_creditor_600_details: 'Chase card payment $720 on 01/10/2025; Medical payment to Northwestern $650 in December 2024.',
    repaid_loans_gifts: 'No',
    repaid_loans_gifts_details: '',
    lawsuits_garnishments: 'Yes',
    lawsuits_garnishments_details: 'Wage garnishment from ABC Collections for old credit card debt; current order ~$340/mo.',
    repossession_foreclosure: 'No',
    repossession_foreclosure_details: '',
    transferred_property: 'No',
    transferred_property_details: '',
    closed_accounts: 'Yes',
    closed_accounts_details: 'Closed old Chase savings account in September 2024; closed store credit card (Synchrony) in Nov 2024.',

    // ——— Form 101: values from Voluntary Petition (Wallace) ———
    debt_nature: 'consumer',
    asset_distribution_expected: 'No',
    creditor_count_range: '1-49',
    asset_range: '500001-1000000',
    liability_range: '500001-1000000',
    filing_chapter: '13',
    filing_fee_method: 'installments',
    filing_date: '2025-11-26', // Petition signature/execution date (Nov 26, 2025)

    // ——— Final review ———
    confidence: 'Mostly confident (a few guesses/estimates)',
  };

  const merged: Answers = { ...base };
  for (const [key, value] of Object.entries(seed)) {
    merged[key] = value as Answers[string];
  }
  return merged;
}

/** Realistic filenames per upload field so document panel shows "received" for demo. */
export function getSeededUploads(): Uploads {
  return {
    // Bulk upload is how most clients will send files; OCR/classification makes this usable for attorneys.
    upload_documents_bulk: [
      'Bank of America Bank Statements - August 2025 - October - 8465 (1).pdf',
      '2022 Tax Return - Redacted (1).pdf',
      'DL and SSC - Nick-122360 (1).pdf',
      'ID and SSC - Katie.pdf',
    ],
    upload_paystubs: [
      'Nick paystubs - January 2025 - October 2025 (1) - Redacted.pdf',
      'Paystubs - December 2024 - October 2025 - Katie (1).pdf',
    ],
    upload_bank_statements: [
      'Bank of America Bank Statements - August 2025 - October 2025 - 0171 (1).pdf',
      'Bank of America Bank Statements - August 2025 - October 2025 - 6705 (1).pdf',
    ],
    upload_tax_returns: [
      '2024 tax return - redacted (1).pdf',
      '2023 Tax Return - Redacted (1).pdf',
    ],
    upload_vehicle_docs: [
      'Car registrations-122355.pdf',
      'KBB - 2016 Dodge.pdf',
      'KBB - GMC Arcadia.pdf',
      'Dodge Ram payoff statement-122354.pdf',
      'GMC Payoff statement-122362.pdf',
      'Insurance RAM-122466.pdf',
      'Insurance GMC-122465.pdf',
    ],
    // No mortgage statement in Documents - Wallace; use Bringback (hand-filled, good for OCR/seeding).
    upload_mortgage_docs: ['Bringback-122135.pdf'],
    upload_credit_report: ['Nick Credit Report-122464.pdf', 'Katie Credit Report-122463.pdf'],
    upload_debt_counseling: ['Nicholas CCC-122084 (1).pdf', 'Katie CCC-122083 (1).pdf'],
    upload_business_docs: [],
  };
}
