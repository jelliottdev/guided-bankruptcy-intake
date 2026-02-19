import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPropertyReport } from './attom';

// Mock fetch
global.fetch = vi.fn();

describe('attom API', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        import.meta.env.VITE_ATTOM_API_KEY = 'test-key';
    });

    it('getPropertyReport aggregates data correctly', async () => {
        // Mock property detail response
        const mockProperty = {
            status: { code: 0 },
            property: [{
                identifier: { attomId: 12345 },
                address: { oneLine: '123 Main St' },
                summary: { propClass: 'Residential', yearBuilt: 2000 },
                building: { size: { universalSize: 2000 }, rooms: { beds: 3, bathsTotal: 2 } },
                lot: { lotSize2: 5000, zoningType: 'R1' }
            }]
        };

        // Mock AVM response
        const mockAvm = {
            status: { code: 0 },
            property: [{
                amount: { value: 500000, high: 550000, low: 450000 },
                avm: { confidenceScore: 90, fsd: 10 }
            }]
        };

        // Mock Assessment response
        const mockAssessment = {
            status: { code: 0 },
            property: [{
                assessed: { assdTtlValue: 400000, taxAmt: 5000, taxYear: 2023 },
                market: { mktTtlValue: 480000 }
            }]
        };

        // Mock Sales History response
        const mockSales = {
            status: { code: 0 },
            property: [{
                sale: [
                    { saleTransDate: '2020-01-01', saleAmt: 450000 },
                    { saleTransDate: '2015-05-01', saleAmt: 300000 }
                ]
            }]
        };

        (global.fetch as any)
            .mockResolvedValueOnce({ ok: true, json: async () => mockProperty }) // fetchProperty
            .mockResolvedValueOnce({ ok: true, json: async () => mockAvm }) // fetchAvm
            .mockResolvedValueOnce({ ok: true, json: async () => mockAssessment }) // fetchAssessment
            .mockResolvedValueOnce({ ok: true, json: async () => mockSales }); // fetchSales

        const report = await getPropertyReport('123 Main St');

        expect(report.address).toBe('123 Main St');
        expect(report.attom_id).toBe(12345);

        // Validation of aggregated fields
        expect(report.valuation?.value).toBe(500000);
        expect(report.assessment?.total_assessed_value).toBe(400000);
        expect(report.assessment?.market_value).toBe(480000);
        expect(report.assessment?.tax_amount).toBe(5000);

        expect(report.sales_history).toHaveLength(2);
        expect(report.sales_history?.[0].last_sale_amount).toBe(450000);
    });
});
