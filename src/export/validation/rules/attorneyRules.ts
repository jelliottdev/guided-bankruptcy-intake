/**
 * Attorney-specific validation rules
 */

import type { AttorneyProfile, BankruptcyDistrict } from '../../attorney/types/AttorneyProfile';
import { validateAttorneyProfile, canFileInDistrict } from '../../attorney/types/AttorneyProfile';
import type { ValidationIssue } from './ValidationEngine';

/**
 * Validate attorney profile for court filing
 */
export function validateAttorney(
    profile: AttorneyProfile | null,
    filingDistrict: BankruptcyDistrict
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // No profile configured
    if (!profile) {
        issues.push({
            id: 'attorney_profile_missing',
            severity: 'blocker',
            category: 'attorney',
            title: 'Attorney Profile Not Configured',
            message: 'No attorney profile has been set up. Courts require valid attorney information.',
            resolution: 'Configure attorney profile in Settings',
            legalRequirement: 'Federal Rule of Bankruptcy Procedure 9011',
        });
        return issues;
    }

    // Validate profile completeness
    const validation = validateAttorneyProfile(profile);
    if (!validation.isValid) {
        for (const error of validation.errors) {
            issues.push({
                id: `attorney_${error.field}_invalid`,
                severity: 'blocker',
                category: 'attorney',
                title: `Attorney ${error.field} Invalid`,
                message: error.message,
                resolution: 'Update attorney profile in Settings',
            });
        }
    }

    // Check jurisdiction
    if (!canFileInDistrict(profile, filingDistrict)) {
        issues.push({
            id: 'attorney_jurisdiction_mismatch',
            severity: 'blocker',
            category: 'jurisdiction',
            title: 'Attorney Not Admitted in Filing District',
            message: `Attorney ${profile.name} (${profile.barState} Bar #${profile.barNumber}) is not admitted to practice in ${filingDistrict.toUpperCase()}. Out-of-state attorneys must be admitted pro hac vice or associate local counsel.`,
            resolution: 'Either: (1) Update attorney profile to include this district, or (2) Change filing district to one where attorney is admitted',
            legalRequirement: 'Local bankruptcy court rules on attorney admission',
        });
    }

    // Fictional attorney check (anti-Saul Goodman)
    const suspiciousNames = ['saul goodman', 'jimmy mcgill', 'better call saul'];
    if (suspiciousNames.some(name => profile.name.toLowerCase().includes(name))) {
        issues.push({
            id: 'attorney_fictional_name',
            severity: 'blocker',
            category: 'attorney',
            title: 'Fictional Attorney Name Detected',
            message: 'Attorney name appears to be from fiction. Courts verify bar numbers against state bar databases.',
            resolution: 'Enter real attorney information',
            legalRequirement: '18 U.S.C. § 152 (bankruptcy fraud)',
        });
    }

    return issues;
}
