from pypdf import PdfReader
import io

def extract_text_from_pdf(file_content: bytes):
    """
    Extracts text from a PDF file page by page.
    Returns a list of dictionaries containing page text and metadata.
    """
    try:
        reader = PdfReader(io.BytesIO(file_content))
        extracted_pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                extracted_pages.append({
                    "page_number": i + 1,
                    "content": text.strip()
                })
        return extracted_pages
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return []
