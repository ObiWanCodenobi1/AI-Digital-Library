import boto3
import json
import os
import uuid
from typing import List, Dict

# In-memory mock for vector storage
_mock_vector_store: Dict[str, List[Dict]] = {}
_mock_s3_storage: Dict[str, str] = {}

class AWSService:
    def __init__(self):
        # Local or mocked bedrock client
        # In a real environment, region should be specified. For testing without credentials,
        # we might catch NoCredentialsError and return mock responses if necessary, 
        # but prompt specifies integrating Bedrock directly if possible.
        try:
            self.bedrock_client = boto3.client(
                service_name='bedrock-runtime',
                region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
            )
            self.has_credentials = True
        except Exception as e:
            print(f"Warning: Failed to initialize Bedrock client: {e}")
            self.has_credentials = False

    def upload_to_s3_mock(self, file_content: bytes, filename: str) -> str:
        document_id = str(uuid.uuid4())
        file_path = f"storage/uploads/{document_id}_{filename}"
        with open(file_path, "wb") as f:
            f.write(file_content)
        _mock_s3_storage[document_id] = file_path
        return document_id

    def store_document_vectors_mock(self, document_id: str, pages: List[Dict]):
        # Mock vector store: simply save the pages in memory for exact text matching or simple search
        _mock_vector_store[document_id] = pages

    def retrieve_context_mock(self, document_id: str, query: str, top_k: int = 3) -> List[Dict]:
        pages = _mock_vector_store.get(document_id, [])
        if not pages:
            return []
        
        # Simple simulation: just return the first few pages or pages containing query words
        # For a better mock, we sort by simple term frequency
        query_terms = query.lower().split()
        
        def score(page):
            text = page["content"].lower()
            return sum(1 for term in query_terms if term in text)

        scored_pages = sorted(pages, key=score, reverse=True)
        return scored_pages[:top_k]

    def invoke_bedrock_chat(self, prompt: str) -> str:
        if not self.has_credentials:
            return "Mocked Response: I am unable to connect to AWS Bedrock due to missing credentials. However, here is a mock response based on the context provided."

        try:
            # Using Anthropic Claude 3 Sonnet
            model_id = 'anthropic.claude-3-sonnet-20240229-v1:0'
            
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }

            response = self.bedrock_client.invoke_model(
                modelId=model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json"
            )

            response_body = json.loads(response.get('body').read())
            return response_body['content'][0]['text']
        except Exception as e:
            print(f"Bedrock invocation error: {e}")
            return f"Error communicating with AI model: {str(e)}"

aws_service = AWSService()
