
/**
 * Attom Data Solutions API Client
 * 
 * Handles interaction with Attom's Property and AVM endpoints.
 * Requires VITE_ATTOM_API_KEY in environment variables.
 */

const API_BASE_URL = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
const getApiKey = () => import.meta.env.VITE_ATTOM_API_KEY || import.meta.env.ATTOM_API_KEY;

export interface AttomPropertyDetail {
    identifier: {
        attomId: number;
        fips: string;
        apn: string;
    };
    address: {
        country: string;
        countrySubd: string; // State
        line1: string; // Street
        line2: string; // City, State Zip
        locality: string; // City
        matchCode: string;
        oneLine: string;
        postal1: string; // Zip
        postal2: string; // Zip+4
        postal3: string;
    };
    location: {
        accuracy: string;
        elevation: number;
        latitude: string;
        longitude: string;
        distance: number;
        geoid: string;
    };
    summary: {
        absenteeInd: string;
        propclass: string;
        propsubtype: string;
        proptype: string;
        yearbuilt: number;
        propLandUse: string;
        propIndicator: string;
        legal1: string;
    };
    utilities: {
        heatingfuel: string;
        heatingtype: string;
        sewertype: string;
        watertype: string;
    };
    building: {
        size: {
            bldgsize: number;
            grosssize: number;
            grosssizeadjusted: number;
            groundfloorsize: number;
            livingsize: number;
            sizeInd: string;
            universalsize: number;
        };
        rooms: {
            bathfixtures: number;
            baths1qtr: number;
            baths3qtr: number;
            bathscalc: number;
            bathsfull: number;
            bathshalf: number;
            bathstotal: number;
            beds: number;
            roomstotal: number;
        };
        interior: {
            bsmtSize: number;
            bsmtType: string;
            bsmtFinishedPercent: number;
            floors: number;
            fireplaceInd: string;
            fireplaceNumber: number;
        };
        construction: {
            condition: string;
            constructionType: string;
            foundationType: string;
            frameType: string;
            roofCover: string;
            roofShape: string;
            wallType: string;
        };
        parking: {
            garageType: string;
            prkgSize: number;
            prkgSpaces: number;
            prkgType: string;
        };
        summary: {
            levels: number;
            mobileHomeInd: string;
            quality: string;
            storyDesc: string;
            unitsCount: number;
            view: string;
            viewCode: string;
            yearBuilt: number;
            yearBuiltEffective: number;
        };
    };
    lot: {
        depth: number;
        frontage: number;
        lotnum: string;
        lotsize1: number; // Acres
        lotsize2: number; // Sq Ft
        pools: number;
        pooltype: string;
        shape: string;
        width: number;
        zoningType?: string; // Often missing in example, marking optional
    };
    vintage: {
        lastModified: string;
        pubDate: string;
    };
}

export interface AttomAvmDetail {
    avm: {
        eventDate: string;
        amount: {
            value: number;
            high: number;
            low: number;
            scr?: number; // Confidence score
        };
    };
}

export interface AttomResponse<T> {
    status: {
        version: string;
        code: number;
        msg: string;
        total: number;
        page: number;
        pageSize: number;
    };
    property: T[];
}

// --- Assessment Types ---
export interface AttomAssessmentDetail {
    assessment: {
        assessed: {
            assdttlvalue: number;
        };
        market: {
            mktttlvalue: number;
        };
        tax: {
            taxamt: number;
            taxyear: number;
        };
    };
}

// --- Sales History Types ---
export interface AttomSaleEvent {
    saleTransDate: string;
    amount: {
        saleamt: number;
    };
}

export interface AttomSalesHistory {
    salehistory: AttomSaleEvent[];
}

// --- Foreclosure Types ---
export interface AttomForeclosureDetail {
    foreclosure: {
        documentType?: string;
        recordingDate?: string;
        originalLoanAmount?: number;
        estimatedValue?: number;
    }[];
}


// Normalized report interface for UI
export interface PropertyReport {
    address: string;
    attom_id: number;
    profile: {
        type: string;
        year_built: number;
        sqft: number;
        beds: number;
        baths: number;
        lot_sqft: number;
        zoning: string;
    };
    valuation?: {
        value: number;
        low: number;
        high: number;
        confidence_score?: number;
        fsd?: number;
        date?: string;
    };
    assessment?: {
        total_assessed_value: number;
        tax_amount: number;
        tax_year: number;
        market_value: number;
    };
    sales_history?: {
        last_sale_date: string;
        last_sale_amount: number;
    }[];
    foreclosure?: {
        status: 'Active' | 'None';
        details?: string;
        recording_date?: string;
    };
    // Derived/Simulated fields for UI compatibility
    mortgage?: {
        amount: number;
        date: string;
        lender: { name: string };
    };
    equity?: {
        estimated_value: number;
    };
    owner?: {
        formatted_string: string;
        mailing_address?: string;
    };
}

/**
 * Fetch property details from Attom API
 */
export async function fetchAttomProperty(address: string): Promise<AttomPropertyDetail | null> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('ATTOM_API_KEY is not configured in environment variables');
    }

    // Split address for better search results if needed, but 'address=' param usually works well for single line
    const params = new URLSearchParams({ address });

    const response = await fetch(`${API_BASE_URL}/property/detail?${params}`, {
        headers: {
            'apikey': apiKey,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        // Handle 404/No records found separately if needed
        if (response.status === 404 || response.status === 400) return null;
        throw new Error(`Attom API Error: ${response.status} ${response.statusText}`);
    }

    const data: AttomResponse<AttomPropertyDetail> = await response.json();

    // Attom returns 'property' array
    if (data.status.code !== 0 || !data.property || data.property.length === 0) {
        return null; // or throw "Property not found"
    }

    return data.property[0];
}

/**
 * Fetch AVM (Automated Valuation Model) from Attom API
 */
export async function fetchAttomAvm(attomId: number): Promise<AttomAvmDetail | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const params = new URLSearchParams({ attomid: attomId.toString() });

    try {
        const response = await fetch(`${API_BASE_URL}/avm/detail?${params}`, {
            headers: {
                'apikey': apiKey,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Attom AVM Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Attom AVM Body:', text);
            return null;
        }

        const data: AttomResponse<AttomAvmDetail> = await response.json();

        if (data.status.code !== 0 || !data.property || data.property.length === 0) {
            console.warn('Attom AVM Data Missing:', data);
            return null;
        }

        return data.property[0];
    } catch (e) {
        console.error('Failed to fetch AVM:', e);
        return null;
    }
}

export async function fetchAttomAssessment(attomId: number): Promise<AttomAssessmentDetail | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const params = new URLSearchParams({ attomid: attomId.toString() });
    try {
        const response = await fetch(`${API_BASE_URL}/assessment/detail?${params}`, {
            headers: { 'apikey': apiKey, 'Accept': 'application/json' }
        });
        if (!response.ok) {
            console.error(`Attom Assessment Error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data: AttomResponse<AttomAssessmentDetail> = await response.json();
        if (!data.property || data.property.length === 0) {
            console.warn('Attom Assessment Data Missing:', data);
        }
        return data.property?.[0] ?? null;
    } catch (e) {
        console.error('Failed to fetch Assessment:', e);
        return null;
    }
}

export async function fetchAttomSalesHistory(attomId: number): Promise<AttomSalesHistory | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const params = new URLSearchParams({ attomid: attomId.toString() });
    try {
        const response = await fetch(`${API_BASE_URL}/saleshistory/detail?${params}`, {
            headers: { 'apikey': apiKey, 'Accept': 'application/json' }
        });
        if (!response.ok) {
            console.error(`Attom Sales History Error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data: AttomResponse<AttomSalesHistory> = await response.json();
        if (!data.property || data.property.length === 0) {
            console.warn('Attom Sales Data Missing:', data);
        }
        return data.property?.[0] ?? null;
    } catch (e) {
        console.error('Failed to fetch Sales History:', e);
        return null;
    }
}


/**
 * Main entry point: Get standardized property report
 */
export async function getPropertyReport(addressInput: string): Promise<PropertyReport> {
    const property = await fetchAttomProperty(addressInput);

    if (!property) {
        throw new Error('Property not found');
    }

    const attomId = property.identifier.attomId;

    // Fetch related data in parallel if we have a valid ID
    let avm: AttomAvmDetail | null = null;
    let assessment: AttomAssessmentDetail | null = null;
    let sales: AttomSalesHistory | null = null;
    // let foreclosure: AttomForeclosureDetail | null = null; // Future: add foreclosure endpoint if package available

    if (attomId) {
        [avm, assessment, sales] = await Promise.all([
            fetchAttomAvm(attomId),
            fetchAttomAssessment(attomId),
            fetchAttomSalesHistory(attomId)
        ]);
    }

    // Map to standardized format
    const report: PropertyReport = {
        address: property.address.oneLine,
        attom_id: property.identifier.attomId,
        profile: {
            type: property.summary.propclass || 'Unknown',
            year_built: property.summary.yearbuilt,
            sqft: property.building.size.universalsize,
            beds: property.building.rooms.beds,
            baths: property.building.rooms.bathstotal,
            lot_sqft: property.lot.lotsize2,
            zoning: property.lot.zoningType || 'N/A'
        },
        owner: {
            // If assessment data has owner name, we could use it here, but interface currently empty for it
            // using generic fallback for now
            formatted_string: "Owner data requires premium access",
        }
    };

    if (avm && avm.avm && avm.avm.amount) {
        report.valuation = {
            value: avm.avm.amount.value,
            high: avm.avm.amount.high,
            low: avm.avm.amount.low,
            confidence_score: avm.avm.amount.scr,
            date: avm.avm.eventDate
        };
        // Estimate equity (naive)
        report.equity = {
            estimated_value: avm.avm.amount.value
        };
    }

    if (assessment && assessment.assessment) {
        report.assessment = {
            total_assessed_value: assessment.assessment.assessed?.assdttlvalue,
            tax_amount: assessment.assessment.tax?.taxamt,
            tax_year: assessment.assessment.tax?.taxyear,
            market_value: assessment.assessment.market?.mktttlvalue
        };
    }

    if (sales && sales.salehistory && sales.salehistory.length > 0) {
        // Sort by date desc
        const sortedSales = [...sales.salehistory].sort((a, b) => (b.saleTransDate || '').localeCompare(a.saleTransDate || ''));
        report.sales_history = sortedSales.slice(0, 3).map(s => ({
            last_sale_date: s.saleTransDate,
            last_sale_amount: s.amount?.saleamt
        }));
    }

    return report;
}
