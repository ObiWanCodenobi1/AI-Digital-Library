from fastapi import APIRouter, UploadFile, File, HTTPException
from services.pdf_processor import extract_text_from_pdf
from services.aws_service import aws_service

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        content = await file.read()
        
        # 1. Save to mock S3
        document_id = aws_service.upload_to_s3_mock(content, file.filename)
        
        # 2. Extract text page by page
        pages = extract_text_from_pdf(content)
        if not pages:
            raise HTTPException(status_code=500, detail="Failed to extract text from PDF")
            
        # 3. Store in mock vector db
        aws_service.store_document_vectors_mock(document_id, pages)
        
        return {
            "message": "Upload successful",
            "document_id": document_id,
            "filename": file.filename,
            "total_pages": len(pages)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
