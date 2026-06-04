from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from services.aws_service import aws_service

router = APIRouter()

class QuizRequest(BaseModel):
    document_id: str
    topic: str

@router.post("/generate")
async def generate_quiz(request: QuizRequest):
    try:
        # Retrieve context from mock vector store based on topic
        context_pages = aws_service.retrieve_context_mock(request.document_id, request.topic, top_k=5)
        
        if not context_pages:
            raise HTTPException(status_code=404, detail="Could not find sufficient context for this topic in the document.")

        context_text = "\n\n".join([f"[Page {page['page_number']}]\n{page['content']}" for page in context_pages])

        prompt = f"""You are an expert educator. Generate a 5-question multiple-choice quiz based ONLY on the following context.
Topic: {request.topic}

The output MUST be a pure JSON array containing 5 objects. Each object must have:
- "question": string (the question text)
- "options": array of 4 strings (the possible answers)
- "correct_answer": string (must exactly match one of the options)
- "explanation": string (brief explanation of why it is correct, citing the page number if possible)

Context:
{context_text}

Output ONLY valid JSON. No markdown formatting like ```json. Just the raw array.
"""
        
        ai_response = aws_service.invoke_bedrock_chat(prompt)
        
        # Clean up possible markdown code blocks if the model included them despite instructions
        if ai_response.startswith("```json"):
            ai_response = ai_response[7:]
        if ai_response.endswith("```"):
            ai_response = ai_response[:-3]
            
        try:
            quiz_data = json.loads(ai_response.strip())
        except json.JSONDecodeError:
            # Fallback if parsing fails (in case the mock response is returned or malformed JSON)
            if not aws_service.has_credentials:
                quiz_data = [
                    {
                        "question": "Mock Question 1 based on " + request.topic,
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": "A",
                        "explanation": "This is a mock explanation."
                    }
                ] * 5
            else:
                raise HTTPException(status_code=500, detail="Failed to parse quiz format from AI.")

        return {
            "quiz": quiz_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
