"""
PaddleOCR Backend Service for Document Intelligence

FastAPI application providing OCR extraction and validation endpoints.
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import logging

from services.paddleocr_service import PaddleOCRService
from services.document_parsers.paystub_parser import PaystubParser
from services.document_parsers.bank_statement_parser import BankStatementParser
from services.document_parsers.tax_return_parser import TaxReturnParser
from services.document_parsers.generic_parser import GenericParser
from models.schemas import OcrResponse, ValidationResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PaddleOCR Document Intelligence Service",
    description="Extract structured data from bankruptcy-related documents",
    version="1.0.0"
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite/React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OCR service (singleton, loaded once)
ocr_service = PaddleOCRService()

# Initialize document parsers
parsers = {
    "paystub": PaystubParser(),
    "bank_statement": BankStatementParser(),
    "tax_return": TaxReturnParser(),
    "generic": GenericParser(),
}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "paddleocr-backend"}

@app.post("/api/ocr/extract", response_model=OcrResponse)
async def extract_document_data(
    file: UploadFile = File(...),
    document_type: str = Form("unknown")
):
    """
    Extract structured data from uploaded document.
    
    Args:
        file: Uploaded document (PDF, JPG, PNG)
        document_type: Type of document (paystub, bank_ statement, tax_return, generic)
    
    Returns:
        OcrResponse with extracted data, confidence, and warnings
    """
    try:
        logger.info(f"Processing document: {file.filename}, type: {document_type}")
        
        # Read file bytes
        file_bytes = await file.read()
        
        # Run OCR using PaddleOCR
        ocr_result = ocr_service.extract_text(file_bytes, file.filename)
        
        # Select appropriate parser
        parser = parsers.get(document_type, parsers["generic"])
        
        # Parse extracted text into structured data
        parsed_data = parser.parse(ocr_result)
        
        logger.info(f"Extraction complete: {len(parsed_data.get('extracted_data', {}))} fields extracted")
        
        return OcrResponse(
            extracted_data=parsed_data.get("extracted_data", {}),
            confidence=parsed_data.get("confidence", 0.0),
            raw_ocr=ocr_result.get("text_blocks", []),
            suggestions=parsed_data.get("suggestions", []),
            warnings=parsed_data.get("warnings", []),
            document_type=document_type
        )
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")

@app.post("/api/ocr/validate", response_model=ValidationResponse)
async def validate_field_against_document(
    file: UploadFile = File(...),
    field_value: str = Form(...),
    field_type: str = Form("text")
):
    """
    Validate user-entered field value against document.
    
    Args:
        file: Uploaded document to validate against
        field_value: Value entered by user
        field_type: Type of field (currency, date, text, etc.)
    
    Returns:
        ValidationResponse with match status and extracted value
    """
    try:
        logger.info(f"Validating field: {field_type} = {field_value}")
        
        # Read file bytes
        file_bytes = await file.read()
        
        # Run OCR
        ocr_result = ocr_service.extract_text(file_bytes, file.filename)
        
        # Extract raw text
        raw_text = " ".join([block.get("text", "") for block in ocr_result.get("text_blocks", [])])
        
        # Simple validation: check if value appears in document
        # TODO: Implement more sophisticated validation logic
        normalized_text = raw_text.lower().replace(",", "").replace("$", "")
        normalized_value = field_value.lower().replace(",", "").replace("$", "")
        
        matches = normalized_value in normalized_text
        
        return ValidationResponse(
            matches=matches,
            extracted_value=field_value if matches else "",
            confidence=0.9 if matches else 0.0,
            message="Value found in document" if matches else "Value not found in document"
        )
        
    except Exception as e:
        logger.error(f"Error validating field: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
