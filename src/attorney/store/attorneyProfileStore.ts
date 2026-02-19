/**
 * Storage and management for attorney profile
 */

import { scopedStorageKey } from '../../state/clientScope';
import type { AttorneyProfile } from '../types/AttorneyProfile';

const STORAGE_KEY = scopedStorageKey('gbi:attorney-profile:v1');

/**
 * Load attorney profile from localStorage
 */
export function loadAttorneyProfile(): AttorneyProfile | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored) as AttorneyProfile;
    } catch {
        return null;
    }
}

/**
 * Save attorney profile to localStorage
 */
export function saveAttorneyProfile(profile: AttorneyProfile): void {
    try {
        const toSave = {
            ...profile,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
        console.error('Failed to save attorney profile:', error);
        throw new Error('Failed to save attorney profile');
    }
}

/**
 * Clear attorney profile from localStorage
 */
export function clearAttorneyProfile(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore errors
    }
}

/**
 * Get demo attorney profile for testing
 */
export function getDemoAttorneyProfile(): AttorneyProfile {
    return {
        name: 'Jennifer Martinez',
        firmName: 'Martinez & Associates',
        barNumber: '12345678',
        barState: 'FL',
        email: 'jmartinez@martinezlawfl.com',
        phone: '(407) 555-0100',
        address: '123 Orange Avenue, Suite 500',
        city: 'Orlando',
        state: 'FL',
        zip: '32801',
        fax: '(407) 555-0101',
        admittedDistricts: ['flmd', 'flnd', 'flsd'],
        updatedAt: new Date().toISOString(),
    };
}
