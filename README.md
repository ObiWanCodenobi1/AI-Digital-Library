# AI Digital Library

A modern monorepo application containing a React frontend (Vite + TypeScript + Tailwind CSS) and a FastAPI backend (Python 3.11). This application functions as an AI-powered digital library with contextual RAG (Retrieval-Augmented Generation) capabilities and automated Quiz generation powered by AWS Bedrock.

## Project Structure

- `/frontend`: Vite React App with Tailwind CSS and Lucide React.
- `/backend`: FastAPI Python App handling PDF extraction, mock Vector/S3 storage, and AWS Bedrock integration.

## Getting Started

Start both the frontend and backend using Docker Compose:

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:5173
- **Backend (API Docs):** http://localhost:8000/docs
