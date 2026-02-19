/**
 * Gold fixture for B101 backend validation loop.
 * Uses buildCanonical (single merge point) with seed + WALLACE_DEMO_ATTORNEY.
 * Seed is Wallace-derived; reference: docs/wallace-b101-values.json.
 * No localStorage — safe to use in Node (tests/scripts).
 */
import type { CaseCanonical } from '../types';
import { getSeededAnswers } from '../../form/seedData';
import { buildCanonical } from '../transform';
import { WALLACE_DEMO_ATTORNEY } from '../../attorney/attorneyProfile';

const SIGNATURE_DATE_ISO = '2025-11-26T00:00:00.000Z';

/** Gold canonical + attorney for Form 101 validation. Signature dates = 2025-11-26. */
export function getB101GoldInput(): CaseCanonical {
  const answers = getSeededAnswers();
  const attorney = {
    name: WALLACE_DEMO_ATTORNEY.name,
    firmName: WALLACE_DEMO_ATTORNEY.firmName,
    address: {
      street1: WALLACE_DEMO_ATTORNEY.street,
      city: WALLACE_DEMO_ATTORNEY.city,
      state: WALLACE_DEMO_ATTORNEY.state,
      zip: WALLACE_DEMO_ATTORNEY.zip,
    },
    phone: WALLACE_DEMO_ATTORNEY.phone,
    email: WALLACE_DEMO_ATTORNEY.email,
    barNumber: WALLACE_DEMO_ATTORNEY.barNumber,
    barState: WALLACE_DEMO_ATTORNEY.barState,
    signatureDate: SIGNATURE_DATE_ISO,
  };
  return buildCanonical(answers, attorney, null);
}
