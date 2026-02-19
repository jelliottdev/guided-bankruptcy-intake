import { scopedStorageKey } from '../state/clientScope';

export type AttorneyProfile = {
    name: string;
    firmName: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    barNumber: string;
    barState: string;
};

export const DEFAULT_ATTORNEY_PROFILE: AttorneyProfile = {
    name: '',
    firmName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    barNumber: '',
    barState: '',
};

/** Attorney from filed Wallace Form 101 (Doc 1) — used when loading demo so Form 101 matches filed doc. */
export const WALLACE_DEMO_ATTORNEY: AttorneyProfile = {
    name: 'James W. Elliott',
    firmName: 'McIntyre Thanasides Bringgold Elliott, et al.',
    street: '1228 E. 7th Ave Suite 100',
    city: 'Tampa',
    state: 'FL',
    zip: '33605',
    phone: '813-223-0000',
    email: 'James@mcintyrefirm.com',
    barNumber: '0040961',
    barState: 'FL',
};

const STORAGE_KEY = scopedStorageKey('gbi:attorney-profile:v1');

export function loadAttorneyProfile(): AttorneyProfile {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return DEFAULT_ATTORNEY_PROFILE;
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_ATTORNEY_PROFILE, ...parsed };
    } catch (err) {
        console.warn('Failed to load attorney profile', err);
        return DEFAULT_ATTORNEY_PROFILE;
    }
}

export function saveAttorneyProfile(profile: AttorneyProfile): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (err) {
        console.error('Failed to save attorney profile', err);
    }
}
