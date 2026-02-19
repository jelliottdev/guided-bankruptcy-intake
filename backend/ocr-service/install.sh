#!/bin/bash
# Production-ready installation script for PaddleOCR backend
# Includes error handling, dependency checks, and user feedback

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "📦 PaddleOCR Backend Installation"
echo "========================================"
echo ""

# Check Python version
echo "🐍 Checking Python version..."
python3 --version 2>&1 | grep -q "Python 3\.[89]\|Python 3\.1[0-9]" || {
    echo "❌ Error: Python 3.8+ required"
    echo "   Install Python 3.8 or higher and try again"
    exit 1
}
echo "   ✅ Python version OK"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "   ✅ Virtual environment created"
else
    echo ""
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo ""
echo "🔓 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo ""
echo "⬆️  Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
echo "   This may take 2-5 minutes (downloading PaddleOCR, OpenCV, etc.)"
echo ""

# Install with progress
pip install -r requirements.txt

echo ""
echo "========================================"
echo "✅ Installation Complete!"
echo "========================================"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Start the backend service:"
echo "   cd backend/ocr-service"
echo "   source venv/bin/activate"
echo "   uvicorn main:app --reload --port 8000"
echo ""
echo "2. Test the service:"
echo "   curl http://localhost:8000/health"
echo ""
echo "3. View API documentation:"
echo "   http://localhost:8000/docs"
echo ""
echo "4. Run automated tests:"
echo "   ./quick-test.sh"
echo ""
echo "💡 Note: PaddleOCR will download models (~100MB) on first OCR request."
echo "   This is normal and only happens once."
echo ""
