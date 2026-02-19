# PaddleOCR Backend Service

Fast API service for intelligent document extraction using PaddleOCR.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --port 8000

# Test endpoint
curl http://localhost:8000/health
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/ocr/extract` - Extract structured data from document
- `POST /api/ocr/validate` - Validate field against document

## Architecture

- **FastAPI** - Async web framework
- **PaddleOCR** - OCR engine (supports 111 languages)
- **Document Parsers** - Type-specific extraction logic (paystub, bank statement, tax return)
- **Validation** - Confidence scoring and data quality checks
