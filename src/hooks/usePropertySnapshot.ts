
import { useState, useCallback } from 'react';
import { generatePropertyReport } from '../api/property';
import type { PropertyReport } from '../api/attom';

export interface UsePropertySnapshotResult {
    loading: boolean;
    error: string | null;
    report: PropertyReport | null;
    fetchReport: (address: string) => Promise<void>;
    reset: () => void;
}

export function usePropertySnapshot(): UsePropertySnapshotResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<PropertyReport | null>(null);

    const fetchReport = useCallback(async (address: string) => {
        if (!address) return;

        setLoading(true);
        setError(null);
        setReport(null);

        try {
            const result = await generatePropertyReport(address);
            if (result.success && result.report) {
                setReport(result.report);
            } else {
                setError(result.error || 'Failed to generate report');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setReport(null);
        setError(null);
        setLoading(false);
    }, []);

    return {
        loading,
        error,
        report,
        fetchReport,
        reset
    };
}
