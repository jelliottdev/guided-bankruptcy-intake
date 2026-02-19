import { describe, it, expect } from 'vitest';
import { getSeededAnswers } from '../form/seedData';
import { mapRealEstateToScheduleA } from './scheduleA';
import { mapAssetsToScheduleB } from './scheduleB';
import { Answers } from '../form/types';

describe('Export Logic', () => {
    const mockAnswers: Answers = {
        // Real Estate
        'real_estate_ownership': 'Yes, I own real estate',
        'real_estate_count': '1',
        'property_1_address': '123 Main St',
        'property_1_city': 'Springfield',
        'property_1_state': 'IL',
        'property_1_zip': '62704',
        'property_1_county': 'Sangamon',
        'property_1_ownership': 'Debtor',
        'property_1_type': 'Single Family',
        'property_1_value': '250000',
        'property_1_mortgage': 'Yes',
        'property_1_mortgage_balance': '180000',

        // Vehicles
        'vehicles': 'Yes, I own vehicles (car, truck, motorcycle, boat, trailer)',
        'vehicle_count': '1',
        'vehicle_1_year': '2018',
        'vehicle_1_make': 'Toyota',
        'vehicle_1_model': 'Camry',
        'vehicle_1_vin': 'ABC123456',
        'vehicle_1_mileage': '45,000',
        'vehicle_1_value': '15,000',
        'vehicle_1_ownership': 'Debtor',

        // Bank Accounts
        'bank_accounts': 'Yes, I have bank accounts',
        'bank_account_count': '1',
        'account_1_institution': 'Chase',
        'account_1_type': 'Checking',
        'account_1_last4': '1234',
        'account_1_balance': '1,500.50',
        'account_1_ownership': 'Joint',

        // Household Grid
        'household_property': {
            'furniture': '501_2500', // 1500
            'electronics': '0_500'   // 250
        },

        // NEW: Cash & Deposits
        'cash_on_hand': '100',
        'security_deposits': 'Yes, I have security deposits (e.g., rent, utilities)',
        'security_deposit_details': 'Landlord $500',

        // NEW: Retirement, Tax, Other
        'financial_assets': ['Retirement accounts (401k, IRA, etc.)', 'Tax refund currently owed to you', 'None of the above'],
        'retirement_details': 'Fidelity 401k: $34,000\nVanguard IRA: $12,000',
        'tax_refunds_details': 'Federal 2024: $2,100',
        'financial_assets_details': 'Misc asset: $50',
    };

    it('correctly maps Schedule A data', () => {
        const result = mapRealEstateToScheduleA(mockAnswers);

        expect(result.properties).toHaveLength(1);
        expect(result.properties[0].address.street).toBe('123 Main St');
        expect(result.properties[0].value).toBe(250000);
        expect(result.properties[0].totalEncumbrance).toBe(180000);
        expect(result.totalValue).toBe(250000);
    });

    it('correctly maps Schedule B data', () => {
        const result = mapAssetsToScheduleB(mockAnswers);

        // Vehicle
        expect(result.vehicles).toHaveLength(1);
        expect(result.vehicles[0].make).toBe('Toyota');
        expect(result.vehicles[0].value).toBe(15000);

        // Financial
        expect(result.financialAccounts).toHaveLength(1);
        expect(result.financialAccounts[0].institutionName).toBe('Chase');
        expect(result.financialAccounts[0].value).toBe(1500.50);

        // Household
        expect(result.householdItems).toHaveLength(2);
        // 1500 + 250 = 1750
        const householdSum = result.householdItems.reduce((acc, item) => acc + item.value, 0);
        expect(householdSum).toBe(1750);

        expect(householdSum).toBe(1750);

        // Cash
        expect(result.cashOnHand).toBe(100);

        // Security Deposits
        expect(result.securityDeposits).toHaveLength(1);
        expect(result.securityDeposits[0].value).toBe(500);

        // Security Deposits
        expect(result.securityDeposits).toHaveLength(1);
        expect(result.securityDeposits[0].value).toBe(500);

        // Retirement
        expect(result.retirementAccounts).toHaveLength(2);
        expect(result.retirementAccounts[0].value).toBe(34000);
        expect(result.retirementAccounts[0].type).toBe('401k');
        expect(result.retirementAccounts[1].value).toBe(12000);

        // Tax Refunds
        expect(result.taxRefunds).toHaveLength(1);
        expect(result.taxRefunds[0].value).toBe(2100);
        expect(result.taxRefunds[0].type).toBe('Federal');

        // Other Assets
        expect(result.otherAssets).toHaveLength(1);
        expect(result.otherAssets[0].value).toBe(50);

        // Total
        // 15000 + 1500.50 + 1750 + 100 + 500 + 34000 + 12000 + 2100 + 50 = 67000.50
        expect(result.totalValue).toBe(15000 + 1500.50 + 1750 + 100 + 500 + 34000 + 12000 + 2100 + 50);
    });

    describe('seeded demo case', () => {
        it('maps Schedule A from getSeededAnswers without throwing', () => {
            const answers = getSeededAnswers();
            const result = mapRealEstateToScheduleA(answers);
            expect(result.properties).toHaveLength(1);
            expect(result.properties[0].address.street).toBe('10556 Bull Grass Dr');
            expect(result.properties[0].value).toBe(450000);
        });

        it('maps Schedule B from getSeededAnswers without throwing', () => {
            const answers = getSeededAnswers();
            const result = mapAssetsToScheduleB(answers);
            expect(result.vehicles).toHaveLength(2);
            expect(result.vehicles[0].make).toBe('Dodge');
            expect(result.vehicles[0].model).toBe('Ram');
            expect(result.vehicles[1].make).toBe('GMC');
            expect(result.financialAccounts.length).toBeGreaterThan(0);
            expect(result.cashOnHand).toBe(150);
        });
    });
});
