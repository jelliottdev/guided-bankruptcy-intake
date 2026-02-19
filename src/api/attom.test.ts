import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPropertyReport } from './attom';

// Mock fetch
globalThis.fetch = vi.fn();

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
                address: { oneLine: '123 Main St', postal1: '12345' },
                summary: { propclass: 'Residential', yearbuilt: 2000 },
                building: { size: { universalsize: 2000 }, rooms: { beds: 3, bathstotal: 2 } },
                lot: { lotsize2: 5000, zoningType: 'R1' }
            }]
        };

        // Mock AVM response
        const mockAvm = {
            status: { code: 0 },
            property: [{
                avm: {
                    eventDate: '2023-01-01',
                    amount: { value: 500000, high: 550000, low: 450000, scr: 90 }
                }
            }]
        };

        // Mock Assessment response
        const mockAssessment = {
            status: { code: 0 },
            property: [{
                assessment: {
                    assessed: { assdttlvalue: 400000 },
                    market: { mktttlvalue: 480000 },
                    tax: { taxamt: 5000, taxyear: 2023 }
                }
            }]
        };

        // Mock Sales History response
        const mockSales = {
            status: { code: 0 },
            property: [{
                salehistory: [
                    { saleTransDate: '2020-01-01', amount: { saleamt: 450000 } },
                    { saleTransDate: '2015-05-01', amount: { saleamt: 300000 } }
                ]
            }]
        };

        // Mock Demographics response
        const mockDemographics = {
            status: { code: 0 },
            property: [{
                community: {
                    demographics: {
                        median_household_income: 60000,
                        family_median_income: 70000
                    }
                }
            }]
        };

        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce({ ok: true, json: async () => mockProperty } as unknown as Response) // fetchProperty
            .mockResolvedValueOnce({ ok: true, json: async () => mockAvm } as unknown as Response) // fetchAvm
            .mockResolvedValueOnce({ ok: true, json: async () => mockAssessment } as unknown as Response) // fetchAssessment
            .mockResolvedValueOnce({ ok: true, json: async () => mockSales } as unknown as Response) // fetchSales
            .mockResolvedValueOnce({ ok: true, json: async () => ({ status: { code: 0 }, property: [] }) } as unknown as Response) // fetchEquity (empty)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ status: { code: 0 }, property: [] }) } as unknown as Response) // fetchMortgage (empty)
            .mockResolvedValueOnce({ ok: true, json: async () => mockDemographics } as unknown as Response); // fetchDemographics

        const report = await getPropertyReport('123 Main St');

        expect(report.address).toBe('123 Main St');
        expect(report.attom_id).toBe(12345);

        expect(report.profile.type).toBe('Residential');
        expect(report.profile.year_built).toBe(2000);
        expect(report.profile.sqft).toBe(2000);
        expect(report.profile.beds).toBe(3);
        expect(report.profile.baths).toBe(2);
        expect(report.profile.lot_sqft).toBe(5000);
        expect(report.profile.zoning).toBe('R1');

        // Validation of aggregated fields
        expect(report.valuation?.value).toBe(500000);
        expect(report.assessment?.total_assessed_value).toBe(400000);
        expect(report.assessment?.market_value).toBe(480000);
        expect(report.assessment?.tax_amount).toBe(5000);
        expect(report.equity).toBeUndefined();


        expect(report.sales_history).toHaveLength(2);
        expect(report.sales_history?.[0].last_sale_amount).toBe(450000);

        expect(report.demographics?.median_household_income).toBe(60000);
        expect(report.demographics?.median_family_income).toBe(70000);

        // Verify correct endpoint was called for demographics
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('communityapi/v2.0.0/neighborhood/community'),
            expect.anything()
        );
    });

    it('calculates equity from valuation and mortgage when equity endpoint is missing', async () => {
        const mockProperty = { status: { code: 0 }, property: [{ identifier: { attomId: 1 }, address: { oneLine: 'Test' }, summary: {}, building: { size: {}, rooms: {} }, lot: {} }] };
        const mockAvm = { status: { code: 0 }, property: [{ avm: { eventDate: '2023-01-01', amount: { value: 500000 } } }] };
        const mockMortgage = {
            status: { code: 0 },
            property: [{
                mortgage: [{
                    amount: { amount: 300000 },
                    date: { recordingDate: '2020-01-01' },
                    lender: { companyName: 'Test Bank' }
                }]
            }]
        };

        vi.mocked(globalThis.fetch)
            .mockResolvedValueOnce({ ok: true, json: async () => mockProperty } as unknown as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => mockAvm } as unknown as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ status: { code: 0 }, property: [] }) } as unknown as Response) // assessment
            .mockResolvedValueOnce({ ok: true, json: async () => ({ status: { code: 0 }, property: [] }) } as unknown as Response) // sales
            .mockResolvedValueOnce({ ok: true, json: async () => ({ status: { code: 0 }, property: [] }) } as unknown as Response) // equity
            .mockResolvedValueOnce({ ok: true, json: async () => mockMortgage } as unknown as Response); // mortgage

        const report = await getPropertyReport('Test');

        expect(report.mortgage?.amount).toBe(300000);
        expect(report.equity?.estimated_value).toBe(200000); // 500k - 300k
    });
});
