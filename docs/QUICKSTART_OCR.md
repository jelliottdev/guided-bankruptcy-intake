# Quick Start - Test OCR Integration

## 1. Install Backend (One-Time Setup)

```bash
cd backend/ocr-service
./install.sh
```

This will:
- Create Python virtual environment
- Install PaddleOCR and dependencies (~300MB download)
- Download OCR models (~100MB on first use)

## 2. Start Backend Service

```bash
cd backend/ocr-service
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Backend will be running at `http://localhost:8000`
API docs available at `http://localhost:8000/docs`

## 3. In Another Terminal: Start Frontend

```bash
npm run dev
```

Frontend will be at `http://localhost:5173`

## 4. Test OCR Extraction

### Option A: Test with Browser

1. Open http://localhost:5173
2. Go to document upload section (e.g., paystubs)
3. Upload a paystub PDF or image
4. Watch for "Extracting data..." message
5. Review extracted data in preview card
6. Click "Use This Data" to auto-fill form

### Option B: Test Backend Directly

```bash
# Health check
curl http://localhost:8000/health

# Test with sample paystub (replace with your file path)
cd backend/ocr-service
source venv/bin/activate
python test_ocr_service.py ~/path/to/paystub.pdf paystub
```

## 5. Quick Backend Test

Run automated tests:

```bash
cd backend/ocr-service
./quick-test.sh
```

This will:
- ✅ Check all dependencies installed
- ✅ Start backend temporarily
- ✅ Test health endpoint
- ✅ Verify API docs accessible
- ✅ Clean up automatically

## Troubleshooting

**Backend won't start:**
```bash
# Reinstall dependencies
cd backend/ocr-service
source venv/bin/activate
pip install -r requirements.txt
```

**Frontend can't connect to backend:**
- Check `.env` has `VITE_OCR_API_URL=http://localhost:8000`
- Verify backend is running: `curl http://localhost:8000/health`

**OCR extraction slow:**
- First request downloads models (~100MB) - normal, only happens once
- Subsequent requests should be <5 seconds

## Document Types Supported

- **Paystubs** → employer, gross pay, net pay, YTD gross
- **Bank Statements** → account number, ending balance
- **Tax Returns** → AGI, tax year

## Next Steps

See full documentation:
- **Setup Guide**: `backend/ocr-service/INSTALL.md`
- **Integration Guide**: [PADDLEOCR_INTEGRATION.md](PADDLEOCR_INTEGRATION.md)
- **Demo walkthrough**: [OCR_INTEGRATION_DEMO.md](OCR_INTEGRATION_DEMO.md)
