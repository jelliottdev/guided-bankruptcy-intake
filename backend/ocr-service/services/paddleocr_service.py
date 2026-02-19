"""
PaddleOCR Service Wrapper

Provides unified interface for OCR operations using PaddleOCR engine.
"""
import logging
from paddleocr import PaddleOCR
from PIL import Image
import io
import fitz  # PyMuPDF for PDF handling
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class PaddleOCRService:
    """Wrapper around PaddleOCR for document text extraction"""
    
    def __init__(self):
        """Initialize PaddleOCR engine (loads models once)"""
        logger.info("Initializing PaddleOCR engine...")
        
        # Initialize PaddleOCR with English language support
        # use_angle_cls=True: Detect and correct text orientation
        # use_gpu=False: Use CPU (set to True if GPU available)
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=False,
            show_log=False
        )
        
        logger.info("PaddleOCR engine initialized successfully")
    
    def extract_text(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract text from document using PaddleOCR.
        
        Args:
            file_bytes: Raw file bytes
            filename: Original filename (used to determine file type)
        
        Returns:
            Dict with text_blocks, full_text, and metadata
        """
        try:
            # Determine file type
            is_pdf = filename.lower().endswith('.pdf')
            
            if is_pdf:
                return self._extract_from_pdf(file_bytes)
            else:
                return self._extract_from_image(file_bytes)
                
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}", exc_info=True)
            return {
                "text_blocks": [],
                "full_text": "",
                "error": str(e)
            }
    
    def _extract_from_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """Extract text from image file (JPG, PNG)"""
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Run OCR
        result = self.ocr.ocr(image, cls=True)
        
        # Parse results
        text_blocks = []
        full_text_parts = []
        
        if result and result[0]:
            for line in result[0]:
                if line:
                    bbox = line[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                    text_info = line[1]  # (text, confidence)
                    text = text_info[0]
                    confidence = float(text_info[1])
                    
                    text_blocks.append({
                        "text": text,
                        "confidence": confidence,
                        "bbox": [int(coord) for point in bbox for coord in point]
                    })
                    
                    full_text_parts.append(text)
        
        return {
            "text_blocks": text_blocks,
            "full_text": " ".join(full_text_parts),
            "pages": 1
        }
    
    def _extract_from_pdf(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract text from PDF file (handles multi-page)"""
        # Open PDF with PyMuPDF
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        all_text_blocks = []
        full_text_parts = []
        
        # Process each page
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            
            # Convert page to image
            pix = page.get_pixmap(dpi=200)  # Higher DPI for better OCR
            img_bytes = pix.tobytes("png")
            
            # Load image for OCR
            image = Image.open(io.BytesIO(img_bytes))
            
            # Run OCR on this page
            result = self.ocr.ocr(image, cls=True)
            
            if result and result[0]:
                for line in result[0]:
                    if line:
                        bbox = line[0]
                        text_info = line[1]
                        text = text_info[0]
                        confidence = float(text_info[1])
                        
                        all_text_blocks.append({
                            "text": text,
                            "confidence": confidence,
                            "bbox": [int(coord) for point in bbox for coord in point],
                            "page": page_num + 1
                        })
                        
                        full_text_parts.append(text)
        
        pdf_document.close()
        
        return {
            "text_blocks": all_text_blocks,
            "full_text": " ".join(full_text_parts),
            "pages": len(pdf_document)
        }
