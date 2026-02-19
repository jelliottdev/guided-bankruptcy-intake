# Python OCR Backend - Installation & Testing

## Phase 1: Installation

```bash
cd backend/ocr-service

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Note**: PaddleOCR will download model files (~100MB) on first run. This may take a few minutes.

## Phase 2: Start Service

```bash
# Development mode (auto-reload on code changes)
uvicorn main:app --reload --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

Service will be available at: **http://localhost:8000**

## Phase 3: Test Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "service": "paddleocr-backend"}
```

### Test OCR Extraction (Paystub)
```bash
# Replace with actual paystub file path
curl -X POST http://localhost:8000/api/ocr/extract \
  -F "file=@/path/to/paystub.pdf" \
  -F "document_type=paystub"
```

Expected response:
```json
{
  "extracted_data": {
    "employer": "Acme Corp",
    "gross_pay": 3500.00,
    "net_pay": 2800.00,
    "ytd_gross": 42000.00
  },
  "confidence": 0.8,
  "raw_ocr": [...],
  "suggestions": [],
  "warnings": []
}
```

### API Documentation
Once running, visit **http://localhost:8000/docs** for interactive Swagger UI docs.

## Phase 4: Integration with React Frontend

Update React .env file:
```
VITE_OCR_API_URL=http://localhost:8000
```

The FastAPI service is already configured with CORS to accept requests from:
- http://localhost:5173 (Vite)
- http://localhost:3000 (Create React App)

## Troubleshooting

### "ModuleNotFoundError: No module named 'paddle'"
- Ensure you're in the virtual environment
- Re-run `pip install -r requirements.txt`

### "CORS error" in browser
- Check that FastAPI service is running on port 8000
- Verify CORS origins in main.py match your frontend URL

### Slow first request
- PaddleOCR downloads models on first use (~100MB)
- Subsequent requests will be much faster

### PDF extraction fails
- Ensure PyMuPDF is installed: `pip install PyMuPDF`
- Check PDF is not encrypted/password-protected
