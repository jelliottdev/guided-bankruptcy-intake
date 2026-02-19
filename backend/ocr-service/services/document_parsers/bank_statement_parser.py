"""Bank Statement Parser - Extract account info and balances"""
from typing import Dict, Any
import re

class BankStatementParser:
    def parse(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        text = ocr_result.get("full_text", "")
        
        extracted = {}
        warnings = []
        
        # Extract account number
        account_match = re.search(r'account\s*(?:number|#)?[:.\s]*(\d{4,16})', text, re.IGNORECASE)
        if account_match:
            extracted["account_number"] = account_match.group(1)
        
        # Extract ending balance
        balance_match = re.search(r'(?:ending|current)\s*balance[:.\s]*\$?\s?([\d,]+\.?\d{0,2})', text, re.IGNORECASE)
        if balance_match:
            extracted["ending_balance"] = float(balance_match.group(1).replace(',', ''))
        
        confidence = len(extracted) / 2  # 2 expected fields
        
        return {
            "extracted_data": extracted,
            "confidence": confidence,
            "suggestions": [],
            "warnings": warnings
        }
