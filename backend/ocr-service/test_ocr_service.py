#!/usr/bin/env python3
"""
Quick test script for PaddleOCR backend service

Tests basic OCR extraction functionality with a sample document.
"""
import sys
import requests
import json

OCR_API_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{OCR_API_URL}/health")
        if response.ok:
            print(f"✅ Health check passed: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to OCR service. Is it running?")
        print("   Run: cd backend/ocr-service && uvicorn main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_extraction(file_path, doc_type="paystub"):
    """Test OCR extraction with sample file"""
    print(f"\n🔍 Testing extraction with {file_path} (type: {doc_type})...")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'document_type': doc_type}
            response = requests.post(f"{OCR_API_URL}/api/ocr/extract", files=files, data=data)
        
        if response.ok:
            result = response.json()
            print(f"✅ Extraction successful!")
            print(f"   Confidence: {result['confidence'] * 100:.1f}%")
            print(f"   Extracted fields: {len(result['extracted_data'])}")
            print(f"\n📊 Extracted Data:")
            print(json.dumps(result['extracted_data'], indent=2))
            
            if result.get('warnings'):
                print(f"\n⚠️  Warnings:")
                for warning in result['warnings']:
                    print(f"   - {warning}")
            
            return True
        else:
            print(f"❌ Extraction failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        print("   Please provide a valid file path")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("PaddleOCR Backend Service Test")
    print("=" * 60)
    
    # Test 1: Health check
    if not test_health():
        sys.exit(1)
    
    # Test 2: Extraction (if file provided)
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        doc_type = sys.argv[2] if len(sys.argv) > 2 else "paystub"
        test_extraction(file_path, doc_type)
    else:
        print("\n💡 To test extraction, provide a file path:")
        print("   python test_ocr_service.py /path/to/paystub.pdf paystub")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed successfully!")
    print("=" * 60)

if __name__ == "__main__":
    main()
