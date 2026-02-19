#!/bin/bash
# Quick test to verify backend installation and basic functionality

set -e

echo "================================================"
echo "🧪 PaddleOCR Backend Quick Test"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: Please run from backend/ocr-service directory"
    exit 1
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Running installation..."
    ./install.sh
fi

# Activate venv
echo "🔓 Activating virtual environment..."
source venv/bin/activate

# Test 1: Check if all dependencies are installed
echo ""
echo "📦 Test 1: Checking dependencies..."
python -c "import fastapi, paddleocr, pydantic" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ All Python dependencies installed"
else
    echo "   ❌ Missing dependencies. Run: pip install -r requirements.txt"
    exit 1
fi

# Test 2: Start backend in background
echo ""
echo "🚀 Test 2: Starting backend service..."
uvicorn main:app --port 8000 > /tmp/ocr_backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Test 3: Health check
echo ""
echo "🏥 Test 3: Health check..."
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "   ✅ Backend is healthy!"
    echo "   Response: $HEALTH"
else
    echo "   ❌ Health check failed"
    echo "   Response: $HEALTH"
    kill $BACKEND_PID
    exit 1
fi

# Test 4: Check if API docs are available
echo ""
echo "📚 Test 4: API documentation..."
DOCS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs)
if [ "$DOCS" = "200" ]; then
    echo "   ✅ API docs available at http://localhost:8000/docs"
else
    echo "   ❌ API docs not accessible"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $BACKEND_PID
sleep 1

echo ""
echo "================================================"
echo "✅ All tests passed!"
echo "================================================"
echo ""
echo "To start the service for development:"
echo "  cd backend/ocr-service"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --reload --port 8000"
echo ""
echo "Then visit: http://localhost:8000/docs"
