
/**
 * Attom Data Solutions API Client
 * 
 * Handles interaction with Attom's Property and AVM endpoints.
 * Requires VITE_ATTOM_API_KEY in environment variables.
 */

const API_BASE_URL = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
const API_KEY = import.meta.env.VITE_ATTOM_API_KEY || import.meta.env.ATTOM_API_KEY;

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
        propClass: string;
        propSubType: string;
        propType: string;
        yearBuilt: number;
        propLandUse: string;
        propIndicator: string;
        legal1: string;
    };
    utilities: {
        heatingFuel: string;
        heatingType: string;
        sewerType: string;
        waterType: string;
    };
    building: {
        size: {
            bldgSize: number;
            grossSize: number;
            grossSizeAdjusted: number;
            groundFloorSize: number;
            livingSize: number;
            sizeInd: string;
            universalSize: number;
        };
        rooms: {
            bathFixtures: number;
            baths1qtr: number;
            baths3qtr: number;
            bathsCalc: number;
            bathsFull: number;
            bathsHalf: number;
            bathsTotal: number;
            beds: number;
            roomsTotal: number;
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
        lotNum: string;
        lotSize1: number; // Acres
        lotSize2: number; // Sq Ft
        pools: number;
        poolType: string;
        shape: string;
        width: number;
        zoningType: string;
    };
    vintage: {
        lastModified: string;
        pubDate: string;
    };
}

export interface AttomAvmDetail {
    amount: {
        value: number;
        high: number;
        low: number;
        currency: string;
    };
    avm: {
        eventDate: string;
        analysisDate: string;
        confidenceScore: number;
        fsd: number; // Forecast Standard Deviation
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
    if (!API_KEY) {
        throw new Error('ATTOM_API_KEY is not configured in environment variables');
    }

    // Split address for better search results if needed, but 'address=' param usually works well for single line
    const params = new URLSearchParams({ address });

    const response = await fetch(`${API_BASE_URL}/property/detail?${params}`, {
        headers: {
            'apikey': API_KEY,
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
    if (!API_KEY) return null;

    const params = new URLSearchParams({ attomid: attomId.toString() });

    try {
        const response = await fetch(`${API_BASE_URL}/avm/detail?${params}`, {
            headers: {
                'apikey': API_KEY,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) return null;

        const data: AttomResponse<AttomAvmDetail> = await response.json();

        if (data.status.code !== 0 || !data.property || data.property.length === 0) {
            return null;
        }

        return data.property[0];
    } catch (e) {
        console.warn('Failed to fetch AVM:', e);
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

    // Fetch AVM if we have a valid ID
    let avm: AttomAvmDetail | null = null;
    if (property.identifier.attomId) {
        avm = await fetchAttomAvm(property.identifier.attomId);
    }

    // Map to standardized format
    const report: PropertyReport = {
        address: property.address.oneLine,
        attom_id: property.identifier.attomId,
        profile: {
            type: property.summary.propClass || 'Unknown',
            year_built: property.summary.yearBuilt,
            sqft: property.building.size.universalSize,
            beds: property.building.rooms.beds,
            baths: property.building.rooms.bathsTotal,
            lot_sqft: property.lot.lotSize2,
            zoning: property.lot.zoningType
        },
        // Attom basic property detail doesn't include owner name usually (requires 'owner' endpoint), 
        // but let's see if we can use summary or if we need a separate call. 
        // For now, we'll placeholder/mock the owner info since the basic detail endpoint is mostly physical.
        // Actually, Attom 'property/detail' includes some owner info in 'assessment' or 'owner' block depending on package.
        // The interface above uses the Basic/Detail standard response. simpler to return 'Unknown' if not present.
        owner: {
            formatted_string: "Owner data requires premium access", // Placeholder
        }
    };

    if (avm && avm.amount) {
        report.valuation = {
            value: avm.amount.value,
            high: avm.amount.high,
            low: avm.amount.low,
            confidence_score: avm.avm?.confidenceScore,
            fsd: avm.avm?.fsd,
            date: avm.avm?.eventDate
        };

        // Estimate equity (naive)
        report.equity = {
            estimated_value: avm.amount.value // - mortgage
        };
    }

    return report;
}
