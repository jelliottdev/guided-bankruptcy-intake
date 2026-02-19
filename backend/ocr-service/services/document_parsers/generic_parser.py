"""Generic Parser - Fallback for unknown document types"""
from typing import Dict, Any

class GenericParser:
    def parse(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        text = ocr_result.get("full_text", "")
        
        return {
            "extracted_data": {"raw_text": text},
            "confidence": 0.5,
            "suggestions": [],
            "warnings": ["Document type unknown - returning raw text only"]
        }
