/**
 * Domain models for Schedule A/B (Assets)
 */

export type OwnershipType = 'Debtor' | 'Spouse' | 'Joint' | 'Community';

export interface AssetBase {
    id: string;
    ownership: OwnershipType;
    /** Estimated current market value */
    value: number;
    /** Whether the user intends to claim this asset as exempt */
    isExempt?: boolean;
    description?: string;
}

// ---------- Schedule A: Real Property ----------

export type RealPropertyType =
    | 'Single Family'
    | 'Condo/Townhome'
    | 'Land'
    | 'Multi-Family'
    | 'Commercial'
    | 'Manufactured Home'
    | 'Timeshare'
    | 'Other';

export interface RealPropertyAddress {
    street: string;
    unit?: string;
    city: string;
    state: string;
    zip: string;
    county: string;
}

export interface RealProperty extends AssetBase {
    assetType: 'RealProperty';
    propertyType: RealPropertyType;
    address: RealPropertyAddress;
    /** Total amount owed on all mortgages/liens */
    totalEncumbrance: number;
}

// ---------- Schedule B: Personal Property ----------

// Part 3: Cars, Vans, Trucks, Tractors, SUVs, Motorcycles, RVs, Watercraft, Aircraft
export interface Vehicle extends AssetBase {
    assetType: 'Vehicle';
    year: string;
    make: string;
    model: string;
    mileage?: number; // Approximate
    vin?: string; // Optional but helpful
    loanBalance?: number;
}

// Part 4: Financial Assets
export type BankAccountType =
    | 'Checking'
    | 'Savings'
    | 'Money Market'
    | 'CD'
    | 'Brokerage'
    | 'Retirement (401k/IRA)'
    | 'Crypto'
    | 'Other';

export interface FinancialAccount extends AssetBase {
    assetType: 'FinancialAccount';
    institutionName: string;
    accountType: BankAccountType;
    last4Digits?: string;
}

// Part 5: Household Goods & Personal Effects
export interface HouseholdItem extends AssetBase {
    assetType: 'HouseholdItem';
    category:
    | 'Household Goods' // Furniture, appliances, electronics
    | 'Clothing'
    | 'Jewelry'
    | 'Animals' // Pets
    | 'Collectibles'
    | 'Sports Equipment'
    | 'Firearms'
    | 'Firearms'
    | 'Other';
}

// Part 2: Security Deposits
export interface SecurityDeposit extends AssetBase {
    assetType: 'SecurityDeposit';
    holderName: string; // Landlord or Utility
    location?: string;
}

// Part 4: Investments & Retirement
export interface RetirementAccount extends AssetBase {
    assetType: 'RetirementAccount';
    type: '401k' | 'IRA' | 'Pension' | 'Keogh' | 'Other';
    institution: string;
}

export interface Investment extends AssetBase {
    assetType: 'Investment';
    type: 'Stock' | 'Bond' | 'Mutual Fund' | 'Crypto' | 'Other';
    institution: string;
}

export interface TaxRefund extends AssetBase {
    assetType: 'TaxRefund';
    year: string;
    type: 'Federal' | 'State' | 'Local';
}

export interface OtherAsset extends AssetBase {
    assetType: 'OtherAsset';
    type: string;
}

// Generic container for parsed asset state
export interface AssetManifest {
    realProperty: RealProperty[];
    vehicles: Vehicle[];
    financialAccounts: FinancialAccount[];
    securityDeposits: SecurityDeposit[];
    householdItems: HouseholdItem[];
    retirementAccounts: RetirementAccount[];
    investments: Investment[];
    taxRefunds: TaxRefund[];
    otherAssets: OtherAsset[];
    cashOnHand: number;
}
