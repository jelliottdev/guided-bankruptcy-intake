import { Answers } from '../form/types';
import { buildCanonical } from '../engine/transform';
import { generateScheduleAB } from '../engine/export/scheduleAB';
import { getSeededAnswers } from '../form/seedData';

const SCHEDULE_AB_TEMPLATE = 'form_b106ab.pdf';

/**
 * Generate Schedule A/B PDF from answers only (e.g. scripts).
 * Merges with seed defaults so output has data when intake is incomplete.
 * Uses the same engine path as the UI for consistent output.
 */
export async function generateScheduleABPDF(answers: Answers): Promise<Uint8Array | null> {
    try {
        const seed = getSeededAnswers();
        const merged: Answers = { ...answers };
        const scheduleABKeys = [
            'real_estate_ownership', 'real_estate_count',
            'property_1_address', 'property_1_city', 'property_1_state', 'property_1_zip', 'property_1_county',
            'property_1_ownership', 'property_1_type', 'property_1_value',
            'property_2_address', 'property_2_city', 'property_2_state', 'property_2_zip', 'property_2_county', 'property_2_type', 'property_2_value',
            'bank_accounts', 'bank_account_count',
            'account_1_institution', 'account_1_type', 'account_1_balance', 'account_2_institution', 'account_2_type', 'account_2_balance',
            'account_3_institution', 'account_3_type', 'account_3_balance',
            'security_deposits', 'security_deposit_details', 'household_property', 'cash_on_hand',
            'retirement_details', 'tax_refunds_details', 'life_insurance_details', 'financial_assets_details',
            'vehicles', 'vehicle_count',
            'vehicle_1_year', 'vehicle_1_make', 'vehicle_1_model', 'vehicle_1_value', 'vehicle_1_ownership',
            'vehicle_2_year', 'vehicle_2_make', 'vehicle_2_model', 'vehicle_2_value', 'vehicle_2_ownership',
            'business_or_farm', 'business_farm_description', 'business_farm_value',
        ] as const;
        for (const key of scheduleABKeys) {
            const current = merged[key];
            const isEmpty = current === undefined || current === null ||
                (typeof current === 'string' && String(current).trim() === '') ||
                (typeof current === 'object' && current !== null && Object.keys(current as object).length === 0);
            if (isEmpty && seed[key] !== undefined) merged[key] = seed[key] as Answers[string];
        }

        const canonical = buildCanonical(merged, null, null);
        const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '';
        const templateUrl = base.endsWith('/') ? `${base}forms/${SCHEDULE_AB_TEMPLATE}` : `${base}/forms/${SCHEDULE_AB_TEMPLATE}`;
        const res = await fetch(templateUrl, { cache: 'force-cache' });
        if (!res.ok) return null;
        const templateBuffer = await res.arrayBuffer();
        return await generateScheduleAB(canonical, templateBuffer);
    } catch (e) {
        console.error('Error generating Schedule A/B:', e);
        return null;
    }
}
