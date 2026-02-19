/**
 * Attorney Profile type definitions
 * Replaces hardcoded "Saul Goodman" with validated attorney data
 */

export type USState =
    | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
    | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
    | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
    | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
    | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY'
    | 'DC';

export type BankruptcyDistrict =
    | 'almd' | 'alnd' | 'alsd'  // Alabama
    | 'akd'                     // Alaska
    | 'azd'                     // Arizona
    | 'ared' | 'arwd'           // Arkansas
    | 'cacd' | 'caed' | 'cand' | 'casd'  // California
    | 'cod'                     // Colorado
    | 'ctd'                     // Connecticut
    | 'ded'                     // Delaware
    | 'flmd' | 'flnd' | 'flsd'  // Florida
    | 'gamd' | 'gand' | 'gasd'  // Georgia
    | 'nyed' | 'nynd' | 'nysd' | 'nywd'  // New York
    | 'txnd' | 'txed' | 'txsd' | 'txwd'  // Texas
    // Add more as needed
    ;

export interface AttorneyProfile {
    /** Attorney full name */
    name: string;

    /** Law firm or practice name */
    firmName: string;

    /** State bar number */
    barNumber: string;

    /** State where attorney is licensed */
    barState: USState;

    /** Professional email (verified domain) */
    email: string;

    /** Office phone */
    phone: string;

    /** Office address (full) */
    address: string;

    /** City */
    city: string;

    /** State */
    state: USState;

    /** ZIP code */
    zip: string;

    /** Optional fax */
    fax?: string;

    /** Bankruptcy districts where attorney is admitted */
    admittedDistricts: BankruptcyDistrict[];

    /** Last updated timestamp */
    updatedAt?: string;
}

export interface AttorneyProfileValidation {
    isValid: boolean;
    errors: {
        field: keyof AttorneyProfile;
        message: string;
    }[];
}

/**
 * Validate attorney profile for court filing
 */
export function validateAttorneyProfile(profile: Partial<AttorneyProfile>): AttorneyProfileValidation {
    const errors: AttorneyProfileValidation['errors'] = [];

    // Required fields
    if (!profile.name?.trim()) {
        errors.push({ field: 'name', message: 'Attorney name is required' });
    }

    if (!profile.firmName?.trim()) {
        errors.push({ field: 'firmName', message: 'Firm name is required' });
    }

    if (!profile.barNumber?.trim()) {
        errors.push({ field: 'barNumber', message: 'Bar number is required' });
    }

    if (!profile.barState) {
        errors.push({ field: 'barState', message: 'Bar state is required' });
    }

    // Email validation
    if (!profile.email?.trim()) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!isValidEmail(profile.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
    } else if (profile.email.toLowerCase().includes('example.com')) {
        errors.push({ field: 'email', message: 'Cannot use example.com domain - use real business email' });
    }

    // Phone validation
    if (!profile.phone?.trim()) {
        errors.push({ field: 'phone', message: 'Phone number is required' });
    } else if (!isValidPhone(profile.phone)) {
        errors.push({ field: 'phone', message: 'Invalid phone format' });
    }

    // Address validation
    if (!profile.address?.trim()) {
        errors.push({ field: 'address', message: 'Office address is required' });
    }

    if (!profile.city?.trim()) {
        errors.push({ field: 'city', message: 'City is required' });
    }

    if (!profile.state) {
        errors.push({ field: 'state', message: 'State is required' });
    }

    if (!profile.zip?.trim()) {
        errors.push({ field: 'zip', message: 'ZIP code is required' });
    } else if (!/^\d{5}(-\d{4})?$/.test(profile.zip)) {
        errors.push({ field: 'zip', message: 'Invalid ZIP code format' });
    }

    // Admitted districts
    if (!profile.admittedDistricts || profile.admittedDistricts.length === 0) {
        errors.push({ field: 'admittedDistricts', message: 'Must specify at least one admitted district' });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Check if attorney can file in specified district
 */
export function canFileInDistrict(profile: AttorneyProfile, district: BankruptcyDistrict): boolean {
    return profile.admittedDistricts.includes(district);
}

/**
 * Get default filing district based on attorney's state
 */
export function getDefaultDistrict(state: USState): BankruptcyDistrict | null {
    const stateToDistrict: Partial<Record<USState, BankruptcyDistrict>> = {
        FL: 'flmd',  // Default to Middle District of Florida
        NY: 'nyed',
        CA: 'cacd',
        TX: 'txnd',
        // Add more mappings as needed
    };
    return stateToDistrict[state] ?? null;
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
    // Accept various formats: (123) 456-7890, 123-456-7890, 1234567890
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
}
