"""Tax Return Parser - Extract AGI and filing info"""
from typing import Dict, Any
import re

class TaxReturnParser:
    def parse(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        text = ocr_result.get("full_text", "")
        
        extracted = {}
        warnings = []
        
        # Extract AGI (Adjusted Gross Income)
        agi_match = re.search(r'adjusted\s*gross\s*income[:.\s]*\$?\s?([\d,]+)', text, re.IGNORECASE)
        if agi_match:
            extracted["agi"] = float(agi_match.group(1).replace(',', ''))
        else:
            warnings.append("Could not find Adjusted Gross Income (AGI)")
        
        # Extract tax year
        year_match = re.search(r'(20\d{2})', text)
        if year_match:
            extracted["tax_year"] = year_match.group(1)
        
        confidence = len(extracted) / 2
        
        return {
            "extracted_data": extracted,
            "confidence": confidence,
            "suggestions": [],
            "warnings": warnings
        }
