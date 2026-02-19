/**
 * Property API Client for ATTOM Data integration
 */

// OCR/Backend API base URL from environment
// OCR/Backend API base URL from environment
const API_URL = import.meta.env.VITE_OCR_API_URL || 'http://localhost:8000';

import { getPropertyReport, type PropertyReport as AttomReport } from './attom';

export interface PropertyReportResponse {
    success: boolean;
    report?: AttomReport;
    error?: string;
}

/**
 * Generate a property report for a given address
 * Tries client-side Attom integration first, falls back to backend if needed (or backend deprecated).
 */
export async function generatePropertyReport(address: string): Promise<PropertyReportResponse> {
    // Try Client-Side Attom Key first
    const apiKey = import.meta.env.VITE_ATTOM_API_KEY || import.meta.env.ATTOM_API_KEY;

    if (apiKey) {
        try {
            console.log('Fetching property report via client-side Attom API...');
            const report = await getPropertyReport(address);
            return {
                success: true,
                report
            };
        } catch (error) {
            console.error('Client-side Attom fetch failed:', error);
            // Fallthrough to backend? Or just return error?
            // If specific API key error, maybe fallback.
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    // Fallback to Backend
    console.log('No client-side API key found, falling back to backend...');
    try {
        const response = await fetch(`${API_URL}/api/property/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API Error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Property report generation failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
