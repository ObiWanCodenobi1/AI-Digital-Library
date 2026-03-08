# Testing Guide - AI-Enabled Digital Library

This guide explains how to run and test all components of the AI-Enabled Digital Library.

## Prerequisites

Before running tests, ensure you have:
- Node.js (v18 or higher)
- npm installed
- AWS credentials configured (for integration tests)

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Install Root Dependencies (for tests)

```bash
npm install
```

## Running Tests

### Backend Unit Tests

Run all unit tests:
```bash
cd backend
npm test
```

Run specific test files:
```bash
# Chat handler tests
npm test -- tests/unit/chat-handler.test.ts

# Quiz handler tests
npm test -- tests/unit/quiz-handler.test.ts

# Bedrock service tests
npm test -- tests/unit/bedrock-service.test.ts

# Search service tests
npm test -- tests/unit/search-service.test.ts
```

### Property-Based Tests

Run property-based tests (these validate correctness properties):

```bash
cd backend

# Chat with Book properties (Properties 26-29)
npm test -- tests/properties/chat-properties.test.ts --forceExit

# Quiz Generator properties (Properties 30-35)
npm test -- tests/properties/quiz-properties.test.ts --forceExit

# Search properties (Properties 1-2)
npm test -- tests/properties/search-properties.test.ts
```

**Note:** Use `--forceExit` flag for property tests to prevent hanging due to async operations.

### Integration Tests

Run end-to-end integration tests:

```bash
cd backend
npm test -- tests/integration/search-flow.test.ts
```

### Run All Tests

```bash
cd backend
npm test -- --forceExit
```

### Test Coverage

Generate test coverage report:

```bash
cd backend
npm run test:coverage
```

View coverage report at `backend/coverage/index.html`

## Running the Application

### Backend (Lambda Functions)

The backend consists of AWS Lambda functions. For local development:

1. **Set up environment variables:**

```bash
cd backend
cp .env.example .env
# Edit .env with your AWS credentials and configuration
```

2. **Build TypeScript:**

```bash
npm run build
```

3. **Deploy to AWS (requires AWS CDK):**

```bash
cd ../infrastructure
npm install
cdk deploy
```

### Frontend (React Application)

1. **Set up environment variables:**

```bash
cd frontend
cp .env.example .env
# Edit .env with your API Gateway endpoint
```

2. **Start development server:**

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

3. **Build for production:**

```bash
npm run build
```

## Testing Individual Features

### 1. Chat with Book (RAG)

**Backend Tests:**
```bash
cd backend
npm test -- tests/unit/chat-handler.test.ts
npm test -- tests/properties/chat-properties.test.ts --forceExit
```

**Manual Testing:**
1. Start the frontend: `cd frontend && npm run dev`
2. Navigate to a book reader page
3. Click "Chat with Book" button
4. Ask questions about the book content
5. Verify citations are displayed
6. Test follow-up questions

**What to verify:**
- ✓ Chat session starts successfully
- ✓ Questions receive answers within 3 seconds
- ✓ Citations include chapter, section, and page numbers
- ✓ Follow-up questions maintain context
- ✓ "Not covered" message appears for out-of-scope questions

### 2. Quiz Generator

**Backend Tests:**
```bash
cd backend
npm test -- tests/unit/quiz-handler.test.ts
npm test -- tests/properties/quiz-properties.test.ts --forceExit
```

**Manual Testing:**
1. Start the frontend: `cd frontend && npm run dev`
2. Navigate to a book reader page
3. Click "Test Me" button after reading a chapter
4. Complete the quiz
5. Submit and review results

**What to verify:**
- ✓ Quiz generates within 5 seconds
- ✓ Exactly 5 questions with 4 options each (A, B, C, D)
- ✓ Mix of question types (conceptual, code, scenario, etc.)
- ✓ Score calculated correctly
- ✓ Weak areas identified
- ✓ Recommendations provided
- ✓ Retake generates different questions

### 3. Search Service

**Backend Tests:**
```bash
cd backend
npm test -- tests/unit/search-service.test.ts
npm test -- tests/properties/search-properties.test.ts
```

**Manual Testing:**
1. Start the frontend
2. Use the search bar
3. Enter natural language queries
4. Verify results appear within 2 seconds
5. Check AI-generated explanations

### 4. Bedrock Integration

**Backend Tests:**
```bash
cd backend
npm test -- tests/unit/bedrock-service.test.ts
```

**What to verify:**
- ✓ Embeddings generated successfully
- ✓ LLM responses received
- ✓ Caching works (Redis)
- ✓ Error handling and retries

## Test Results Summary

### Expected Test Counts

- **Unit Tests:** ~75+ tests
  - Chat handler: 18 tests
  - Quiz handler: 29 tests
  - Bedrock service: 10+ tests
  - Search service: 15+ tests

- **Property-Based Tests:** ~20+ properties
  - Chat properties: 8 properties (100 runs each)
  - Quiz properties: 10 properties (100 runs each)
  - Search properties: 4 properties (100 runs each)

- **Integration Tests:** 5+ tests

### Test Execution Time

- Unit tests: ~5-10 seconds
- Property-based tests: ~30-60 seconds (due to 100 iterations)
- Integration tests: ~10-20 seconds

## Troubleshooting

### Tests Hanging

If property-based tests hang:
```bash
npm test -- <test-file> --forceExit --detectOpenHandles
```

### AWS Credentials Issues

Ensure AWS credentials are configured:
```bash
aws configure
# Or set environment variables:
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1
```

### Module Not Found Errors

Install dependencies:
```bash
# Root
npm install

# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### TypeScript Compilation Errors

Rebuild TypeScript:
```bash
cd backend
npm run build
```

## Continuous Integration

For CI/CD pipelines, run:

```bash
# Install all dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Run all tests
cd ../backend
npm test -- --forceExit --coverage

# Build
npm run build
```

## Performance Testing

To test performance:

```bash
# Run property tests with more iterations
cd backend
npm test -- tests/properties/chat-properties.test.ts --forceExit

# Monitor response times in test output
```

## Next Steps

1. **Run all tests** to ensure everything works
2. **Deploy to AWS** using CDK
3. **Test in production** environment
4. **Monitor** CloudWatch logs for errors
5. **Iterate** based on test results

## Quick Start Commands

```bash
# Complete test run
cd backend && npm test -- --forceExit

# Start development
cd frontend && npm run dev

# Deploy to AWS
cd infrastructure && cdk deploy
```

## Support

For issues or questions:
1. Check test output for specific errors
2. Review CloudWatch logs (for deployed functions)
3. Verify AWS credentials and permissions
4. Ensure all dependencies are installed
