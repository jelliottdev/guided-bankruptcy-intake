"""
Paystub Parser

Extracts structured financial data from paystub images/PDFs.
"""
import re
from typing import Dict, List, Any, Optional

class PaystubParser:
    """Extract employer, income, deductions from paystubs"""
    
    def parse(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse OCR result for paystub-specific fields.
        
        Returns:
            Dict with extracted_data, confidence, suggestions, warnings
        """
        text = ocr_result.get("full_text", "")
        blocks = ocr_result.get("text_blocks", [])
        
        if not text:
            return {
                "extracted_data": {},
                "confidence": 0.0,
                "suggestions": [],
                "warnings": ["No text extracted from document"]
            }
        
        extracted = {}
        warnings = []
        
        # Extract employee name (for ownership detection)
        employee_name = self._find_employee_name(blocks, text)
        if employee_name:
            extracted["employeeName"] = employee_name["value"]
        else:
            warnings.append("Could not identify employee name")
        
        # Extract employer name (usually at top of document)
        employer = self._find_employer(blocks)
        if employer:
            extracted["employer"] = employer["value"]
        else:
            warnings.append("Could not identify employer name")
        
        # Extract gross pay
        gross_pay = self._find_currency(text, ["gross pay", "total gross", "gross earnings"])
        if gross_pay:
            extracted["gross_pay"] = gross_pay["value"]
        else:
            warnings.append("Could not find gross pay amount")
        
        # Extract net pay
        net_pay = self._find_currency(text, ["net pay", "take home", "net amount"])
        if net_pay:
            extracted["net_pay"] = net_pay["value"]
        else:
            warnings.append("Could not find net pay amount")
        
        # Extract YTD gross
        ytd_gross = self._find_currency(text, ["ytd gross", "year to date gross", "ytd earnings"])
        if ytd_gross:
            extracted["ytd_gross"] = ytd_gross["value"]
        
        # Extract pay period dates
        pay_period = self._find_pay_period(text)
        if pay_period:
            extracted.update(pay_period)
        
        # Calculate confidence
        fields_found = len(extracted)
        total_fields = 5  # employer, gross, net, ytd, pay_period
        confidence = fields_found / total_fields
        
        return {
            "extracted_data": extracted,
            "confidence": confidence,
            "suggestions": [],
            "warnings": warnings
        }
    
    def _find_employer(self, blocks: List[Dict]) -> Optional[Dict]:
        """Find employer name (usually in first few text blocks)"""
        # Take first substantial text block as company name
        for block in blocks[:5]:  # Check first 5 blocks
            text = block.get("text", "").strip()
            if len(text) > 3 and not re.match(r'^[\d\s\$\.,]+$', text):  # Not just numbers
                return {"value": text, "confidence": 0.8}
        return None
    
    def _find_employee_name(self, blocks: List[Dict], full_text: str) -> Optional[Dict]:
        """Find employee name on paystub"""
        # Strategy 1: Look for "Employee:" or "Name:" label
        patterns = [
            r'(?:employee|emp)(?:\s+name)?:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'(?:name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Validate: should have at least first and last name
                if len(name.split()) >= 2:
                    return {"value": name, "confidence": 0.9}
        
        # Strategy 2: Look for capitalized multi-word text that looks like a name
        # Search in first 10 blocks
        for block in blocks[:10]:
            text = block.get("text", "").strip()
            # Check if it matches name pattern (Title Case, 2-4 words, no numbers)
            if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$', text):
                # Further validation: not a company name or common header
                if not any(word.lower() in ['inc', 'llc', 'corp', 'company', 'paystub', 'statement'] 
                          for word in text.split()):
                    return {"value": text, "confidence": 0.7}
        
        return None
    
    def _find_currency(self, text: str, keywords: List[str]) -> Optional[Dict]:
        """Find currency amount near specified keywords"""
        text_lower = text.lower()
        
        for keyword in keywords:
            # Look for keyword followed by currency pattern
            pattern = rf'{keyword}[^$\d]{{0,20}}\$?\s?([\d,]+\.?\d{{0,2}})'
            match = re.search(pattern, text_lower, re.IGNORECASE)
            
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    amount = float(amount_str)
                    return {"value": amount, "confidence": 0.85}
                except ValueError:
                    continue
        
        return None
    
    def _find_pay_period(self, text: str) -> Optional[Dict]:
        """Extract pay period start/end dates"""
        # Common patterns: "Pay Period: 01/01/2024 - 01/15/2024"
        pattern = r'pay\s+period[:\s]+([\d/]+)\s*[-–]\s*([\d/]+)'
        match = re.search(pattern, text, re.IGNORECASE)
        
        if match:
            return {
                "pay_period_start": match.group(1),
                "pay_period_end": match.group(2)
            }
        
        return None
