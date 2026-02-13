/**
 * Realistic demo/seed data for the intake questionnaire.
 * Covers all steps and fields so the form appears fully filled with plausible values.
 */
import type { Answers, Uploads } from './types';
import { getInitialAnswers } from './defaults';

/** Build seeded answers: start from initial (covers all field ids), then override with realistic values. */
export function getSeededAnswers(): Answers {
  const base = getInitialAnswers();

  const seed: Record<string, string | string[] | Record<string, string>> = {
    // ——— Filing ———
    filing_setup: 'Filing with spouse',

    // ——— Debtor identity ———
    debtor_full_name: 'Maria Elena Santos',
    debtor_other_names: 'Maria E. Rodriguez (maiden name)',
    debtor_ssn_last4: '4829',
    debtor_dob: '1985-06-14',

    // ——— Debtor contact ———
    debtor_phone: '(312) 555-0198',
    debtor_email: 'maria.santos@email.com',
    debtor_address: '1847 West Belmont Avenue, Apt 3B\nChicago, IL 60657',
    mailing_different: 'No',
    mailing_address: '',
    county: 'Cook County',
    state: 'Illinois',
    addresses_6_years:
      'Jan 2019 – Jun 2022: 920 N. Halsted St, Chicago IL 60642\nJul 2022 – present: 1847 W. Belmont Ave, Apt 3B, Chicago IL 60657',
    business_names: '',
    prior_bankruptcy: 'No',
    prior_bankruptcy_details: '',

    // ——— Spouse (joint) ———
    spouse_full_name: 'James Robert Santos',
    spouse_other_names: 'Jim Santos',
    spouse_ssn_last4: '7163',
    spouse_dob: '1983-11-22',
    spouse_phone: '(312) 555-0199',
    spouse_email: 'james.santos@email.com',
    spouse_address: '1847 West Belmont Avenue, Apt 3B\nChicago, IL 60657',
    spouse_mailing_different: 'No',
    spouse_mailing_address: '',
    spouse_county: 'Cook County',

    // ——— Urgency ———
    urgency_flags: [
      'Foreclosure on your home is pending (date:)',
      'Wage garnishment is currently active or pending',
    ],
    foreclosure_date: '04/15/2025',
    repossession_date: '',
    shutoff_date: '',
    self_employed: 'No',
    business_name_type: '',
    cosigner_debts: 'Yes',
    cosigner_details:
      'Rosa Martinez — co-signed for daughter\'s student loan, Discover, balance ~$12,400; David Santos — co-signed our auto loan with Chase, balance ~$9,200.',

    // ——— Real estate (2 properties) ———
    real_estate_ownership: 'Yes, I own real estate',
    real_estate_count: '2',
    property_1_address: '1847 West Belmont Avenue, Chicago, IL 60657',
    property_1_type: 'Primary Residence',
    property_1_value: '385000',
    property_1_mortgage: 'Yes',
    property_1_mortgage_details:
      'Lender: First Midwest Bank, balance ~$312,000, monthly P&I $1,840, escrow ~$420.',
    property_1_plan: 'Keep the property',
    property_1_hoa: 'No',
    property_1_hoa_details: '',
    property_2_address: '920 N. Halsted St, Unit 2, Chicago, IL 60642',
    property_2_type: 'Rental Property',
    property_2_value: '275000',
    property_2_mortgage: 'Yes',
    property_2_mortgage_details:
      'Lender: Chase Mortgage, balance ~$198,000, monthly $1,520. Tenant pays $1,950/mo.',
    property_2_plan: 'Keep the property',
    property_2_hoa: 'No',
    property_2_hoa_details: '',

    // ——— Bank accounts (2) ———
    bank_accounts: 'Yes, I have bank accounts',
    bank_account_count: '2',
    account_1_name: 'Chase Total Checking',
    account_1_last4: '4482',
    account_1_balance: '2,840',
    account_2_name: 'Discover Online Savings',
    account_2_last4: '9912',
    account_2_balance: '5,200',

    // ——— Security deposits ———
    security_deposits: 'No, I do not have security deposits',
    security_deposit_details: '',

    // ——— Household property (grid: row id -> column id) ———
    household_property: {
      furniture: '501_2500',
      electronics: '501_2500',
      appliances: '501_2500',
      clothing: '0_500',
      tools: '0_500',
      collectibles: '0_500',
    },

    // ——— Valuables ———
    valuables: ['Jewelry valued over $500 (per item)', 'Art or special collections'],
    valuables_details:
      'Wedding/engagement ring, appraised ~$1,200; oil painting by local artist, estimated $600.',

    // ——— Financial assets ———
    financial_assets: [
      'Retirement accounts (401k, IRA, etc.)',
      'Life Insurance with cash or loan value',
      'Tax refund currently owed to you',
    ],
    financial_assets_details:
      '401(k) at Fidelity through employer, balance ~$34,000; Term life policy with State Farm, $250k face, no cash value; Expected federal refund ~$2,100.',

    // ——— Vehicles (2) ———
    vehicles: 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)',
    vehicle_count: '2',
    vehicle_1_details: '2019 Honda CR-V EX, 62,000 miles',
    vehicle_1_value: '18500',
    vehicle_1_loan: 'Yes',
    vehicle_1_loan_details: 'Chase Auto, balance ~$9,800, monthly $320.',
    vehicle_1_plan: 'Keep',
    vehicle_2_details: '2014 Toyota Camry, 118,000 miles',
    vehicle_2_value: '8500',
    vehicle_2_loan: 'No',
    vehicle_2_loan_details: '',
    vehicle_2_plan: 'Keep',

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
    debtor_employer: 'Rush University Medical Center',
    debtor_job_title: 'Registered Nurse',
    debtor_how_long: '4 years',
    debtor_pay_frequency: 'Monthly',
    debtor_gross_pay: '4,500',
    spouse_employer: 'Chicago Public Schools',
    spouse_job_title: 'Teacher',
    spouse_how_long: '7 years',
    spouse_pay_frequency: 'Monthly',
    spouse_gross_pay: '3,500',
    other_income_types: ['Rental Income'],
    other_income_details: 'Rental property 920 N. Halsted: $1,950/mo gross, minus mortgage $1,520 and expenses.',

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
    income_current_ytd: '42,800',
    income_last_year: '78,400',
    income_two_years_ago: '74,200',

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
    upload_paystubs: ['Rush_Paystub_Jan2025.pdf', 'Rush_Paystub_Dec2024.pdf'],
    upload_bank_statements: ['Chase_Statement_Jan2025.pdf', 'Discover_Savings_Jan2025.pdf'],
    upload_tax_returns: ['2023_1040.pdf', '2022_1040.pdf'],
    upload_vehicle_docs: ['Chase_Auto_CRV_Statement_Jan2025.pdf', 'Toyota_Camry_Title.pdf'],
    upload_mortgage_docs: ['FirstMidwest_Mortgage_Statement_Jan2025.pdf', 'Chase_Rental_Statement_Jan2025.pdf'],
    upload_credit_report: ['Experian_Report_Jan2025.pdf'],
    credit_report_upload: ['Experian_Report_Jan2025.pdf'],
    bank_statements_upload: ['Chase_Statement_Jan2025.pdf', 'Discover_Savings_Jan2025.pdf'],
    income_uploads: ['Rush_Paystub_Jan2025.pdf', 'Rush_Paystub_Dec2024.pdf'],
    property_1_uploads: ['FirstMidwest_Mortgage_Statement_Jan2025.pdf'],
    property_2_uploads: ['Chase_Rental_Statement_Jan2025.pdf'],
    vehicle_1_uploads: ['Chase_Auto_CRV_Statement_Jan2025.pdf'],
    vehicle_2_uploads: ['Toyota_Camry_Title.pdf'],
    other_secured_uploads: ['RoomsToGo_Statement_Jan2025.pdf'],
    leases_contracts_uploads: ['Halsted_Lease_2024.pdf', 'PlanetFitness_Agreement.pdf'],
    upload_debt_counseling: ['DebtCounseling_Certificate_2025.pdf'],
    upload_business_docs: [],
  };
}
