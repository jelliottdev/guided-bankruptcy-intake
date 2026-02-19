/**
 * Engine public API: canonical case model and form generation.
 * For detailed types and mappings, import from './types', './mapping/b101', etc.
 */
export { intakeToCanonical } from './transform';
export type { CaseCanonical, CaseCanonicalType } from './types';
export { generateB101 } from './export/b101';
