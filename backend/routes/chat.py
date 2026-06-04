from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.aws_service import aws_service

router = APIRouter()

class ChatRequest(BaseModel):
    document_id: str
    query: str

@router.post("/")
async def chat_with_document(request: ChatRequest):
    try:
        # Retrieve context from mock vector store
        context_pages = aws_service.retrieve_context_mock(request.document_id, request.query, top_k=3)
        
        if not context_pages:
            return {"response": "I couldn't find relevant context in the document.", "citations": []}

        # Build prompt
        context_text = "\n\n".join([f"[Page {page['page_number']}]\n{page['content']}" for page in context_pages])
        citations = [page['page_number'] for page in context_pages]

        prompt = f"""You are a helpful AI assistant answering questions based on a provided document.
Use the following extracted text to answer the user's question. 
Always include citations to the pages you used in the format [Page X].
If you cannot find the answer in the text, say so clearly.

Context:
{context_text}

Question: {request.query}
"""
        
        ai_response = aws_service.invoke_bedrock_chat(prompt)
        
        return {
            "response": ai_response,
            "citations": citations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
