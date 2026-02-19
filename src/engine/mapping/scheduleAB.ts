
import { FieldType } from "./b101";

export interface ScheduleABFieldMapping {
    label: string;
    pdfFieldName: string;
    canonicalPath: string; // dot-notation path
    type: FieldType;
    condition?: (value: any) => boolean;
    transform?: "currency" | "date";
    question: string;
    section: "RealProperty" | "Vehicles" | "PersonalProperty" | "FinancialAssets";
    index?: number; // For array items
}

// NOTE: This is a simplified mapping for the demo.
// A full implementation would need dynamic mapping for array items.
// For now, we will map the first few items of each category.

export const SCHEDULE_AB_FIELD_MAP: ScheduleABFieldMapping[] = [
    // --- REAL PROPERTY (Part 1) ---
    {
        label: "Real Prop 1 - Address",
        pdfFieldName: "RealProp_1_Address", // Placeholder name
        canonicalPath: "assets.realProperty.0.address.street1",
        type: "text",
        question: "1.1",
        section: "RealProperty",
        index: 0
    },
    {
        label: "Real Prop 1 - Value",
        pdfFieldName: "RealProp_1_Value",
        canonicalPath: "assets.realProperty.0.value",
        type: "text",
        transform: "currency",
        question: "1.1",
        section: "RealProperty",
        index: 0
    },

    // --- VEHICLES (Part 2) ---
    {
        label: "Vehicle 1 - Make/Model",
        pdfFieldName: "Vehicle_1_Desc",
        canonicalPath: "assets.vehicles.0.make", // Construct full description in generator
        type: "text",
        question: "3.1",
        section: "Vehicles",
        index: 0
    },
    {
        label: "Vehicle 1 - Value",
        pdfFieldName: "Vehicle_1_Value",
        canonicalPath: "assets.vehicles.0.value",
        type: "text",
        transform: "currency",
        question: "3.1",
        section: "Vehicles",
        index: 0
    },

    // --- FINANCIAL ASSETS (Part 4) ---
    // Cash
    {
        label: "Cash on Hand",
        pdfFieldName: "Cash_Value",
        canonicalPath: "assets.financial.cash.value",
        type: "text",
        transform: "currency",
        question: "16",
        section: "FinancialAssets"
    },
    // Banks
    {
        label: "Bank Acct 1 - Type",
        pdfFieldName: "Bank_1_Type",
        canonicalPath: "assets.financial.bankAccounts.0.type",
        type: "text",
        question: "17",
        section: "FinancialAssets",
        index: 0
    },
    {
        label: "Bank Acct 1 - Balance",
        pdfFieldName: "Bank_1_Balance",
        canonicalPath: "assets.financial.bankAccounts.0.balance",
        type: "text",
        transform: "currency",
        question: "17",
        section: "FinancialAssets",
        index: 0
    }
];
