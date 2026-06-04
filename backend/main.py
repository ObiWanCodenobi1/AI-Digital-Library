from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import documents, chat, quiz
import os

app = FastAPI(title="AI Digital Library API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Digital Library API"}

# Ensure local storage mock directory exists
os.makedirs("storage/uploads", exist_ok=True)
