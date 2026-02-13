/**
 * Seeded random data for intake form (all non-file questions).
 * Uses a deterministic RNG so the same seed produces the same answers.
 */
import type { Answers, FieldValue } from '../form/types';
import { getSeedableFields } from '../form/steps';
import type { Field } from '../form/types';

/** Mulberry32 seeded PRNG. Returns 0..1. */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'];
const STREETS = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Park Blvd', 'Washington St', 'Lake Rd', 'Hill St'];
const CITIES = ['Chicago', 'Springfield', 'Peoria', 'Rockford', 'Naperville', 'Bloomington', 'Decatur', 'Evanston'];
const STATES = ['IL', 'IN', 'WI', 'MI', 'OH'];
const EMPLOYERS = ['Acme Corp', 'City of Springfield', 'ABC Retail', 'Tech Solutions Inc', 'Metro Health', 'State University', 'General Manufacturing', 'Local School District'];
const JOB_TITLES = ['Customer Service Rep', 'Nurse', 'Teacher', 'Manager', 'Driver', 'Clerk', 'Technician', 'Assistant'];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function int(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function dateStr(rng: () => number, yearMin: number, yearMax: number): string {
  const y = int(rng, yearMin, yearMax);
  const m = int(rng, 1, 12);
  const d = int(rng, 1, 28);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function phone(rng: () => number): string {
  return `(${int(rng, 200, 999)}) ${int(rng, 200, 999)}-${int(rng, 1000, 9999)}`;
}

function ssn4(rng: () => number): string {
  return String(int(rng, 1000, 9999));
}

function dollar(rng: () => number, low: number, high: number): string {
  const v = Math.round(low + rng() * (high - low));
  return `$${v.toLocaleString()}`;
}

function seedValueForField(field: Pick<Field, 'id' | 'type' | 'options' | 'rows' | 'columns'>, rng: () => number): FieldValue {
  const id = field.id;
  switch (field.type) {
    case 'text':
      if (id.includes('name') && !id.includes('business')) {
        if (id.includes('spouse')) return `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`;
        return `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`;
      }
      if (id.includes('address') || id.includes('mailing')) return `${int(rng, 100, 9999)} ${pick(STREETS, rng)}, ${pick(CITIES, rng)} ${pick(STATES, rng)} ${int(rng, 60001, 62999)}`;
      if (id.includes('county')) return `${pick(CITIES, rng)} County`;
      if (id.includes('phone')) return phone(rng);
      if (id.includes('email')) return `client${int(rng, 1, 999)}@example.com`;
      if (id.includes('ssn')) return ssn4(rng);
      if (id.includes('employer') || id.includes('job_title')) return pick(EMPLOYERS, rng);
      if (id === 'debtor_job_title' || id === 'spouse_job_title') return pick(JOB_TITLES, rng);
      if (id.includes('value') || id.includes('balance') || id.includes('amount') || id.includes('gross') || id.includes('income') || id.includes('payment') || id.includes('owed')) return dollar(rng, 500, 150000);
      if (id.includes('how_long')) return `${int(rng, 1, 10)} years`;
      if (id.includes('date') || id.includes('dob')) return dateStr(rng, 1960, 1995);
      if (id.includes('account') && id.includes('last4')) return ssn4(rng);
      if (id.includes('cash_on_hand')) return dollar(rng, 0, 500);
      if (id.includes('total') || id.includes('expenses')) return dollar(rng, 2000, 5000);
      return `Sample ${id.slice(0, 12)} ${int(rng, 1, 999)}`;
    case 'textarea':
      if (id.includes('address') && !id.endsWith('_details')) return `${pick(STREETS, rng)}, ${pick(CITIES, rng)} ${pick(STATES, rng)}`;
      if (id.includes('mailing')) return `${pick(STREETS, rng)}, ${pick(CITIES, rng)} ${pick(STATES, rng)}`;
      if (id === 'priority_debts_details') return `IRS — ${int(rng, 2020, 2023)} taxes, ${dollar(rng, 1000, 8000)}`;
      if (id === 'other_secured_details') return `ABC Furniture — couch & table, ${dollar(rng, 200, 1500)} left`;
      if (id === 'cosigner_details') return `Jane Doe — Chase auto loan`;
      if (id.includes('creditors') || id === 'unsecured_creditors') return `Chase Card ${dollar(rng, 1000, 10000)}; Medical Center ${dollar(rng, 500, 5000)}`;
      if (id.includes('details') || id.includes('notes')) return `Seeded details for ${id.slice(0, 18)}.`;
      return `Seeded text for ${id.slice(0, 20)}.`;
    case 'email':
      return `user${int(rng, 1, 999)}@example.com`;
    case 'date':
      return dateStr(rng, 1980, 2000);
    case 'radio': {
      if (!field.options || field.options.length === 0) return 'Yes';
      const radioOpts = field.options.filter((o) => !o.noneOfAbove);
      if (radioOpts.length === 0) return (field.options[0]?.value) ?? 'Yes';
      // Demo-friendly: bias asset gates to "Yes" so the dashboard shows property, bank, vehicles
      const yesOpt = radioOpts.find((o) => o.value.toLowerCase().startsWith('yes') || o.value.includes('own') || o.value.includes('have'));
      if (yesOpt && (id === 'real_estate_ownership' || id === 'bank_accounts' || id === 'vehicles' || id === 'security_deposits')) return yesOpt.value;
      return pick(radioOpts, rng).value;
    }
    case 'select': {
      if (!field.options || field.options.length === 0) return '';
      const selOpts = field.options.filter((o) => o.value !== 'credit_report_only');
      if (selOpts.length === 0) return (field.options[0]?.value) ?? '';
      return pick(selOpts, rng).value;
    }
    case 'checkbox': {
      if (!field.options || field.options.length === 0) return [];
      const opts = field.options.filter((o) => !o.noneOfAbove);
      const minCount = (id === 'priority_debts' || id === 'other_secured_debts') ? 1 : 0;
      const count = int(rng, minCount, Math.max(minCount, Math.min(2, opts.length)));
      const shuffled = [...opts].sort(() => rng() - 0.5);
      return shuffled.slice(0, count).map((o) => o.value);
    }
    case 'grid': {
      if (!field.rows || !field.columns) return {};
      const grid: Record<string, string> = {};
      const colIds = field.columns!.map((c) => c.id);
      for (const row of field.rows!) {
        grid[row.id] = pick(colIds, rng);
      }
      return grid;
    }
    default:
      return '';
  }
}

/**
 * Generate answers for all seedable (non-file) questions using a numeric seed.
 * Same seed always produces the same answers. Merge with existing answers when calling setAnswersBatch.
 */
export function generateSeededAnswers(seed: number): Partial<Answers> {
  const rng = mulberry32(seed);
  const fields = getSeedableFields();
  const answers: Partial<Answers> = {};
  for (const field of fields) {
    answers[field.id] = seedValueForField(field, rng);
  }
  return answers;
}
