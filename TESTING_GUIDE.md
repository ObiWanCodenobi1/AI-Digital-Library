# Testing Guide - AI-Enabled Digital Library

This guide explains how to test all the components that have been built so far.

## What's Been Built

### ✅ Frontend (Phase 3 Complete)
- React + TypeScript + Vite setup
- TailwindCSS styling
- React Router navigation
- Authentication UI (Login/Signup pages)
- Protected routes
- Core layout components (Header, Footer, Sidebar)
- Error boundaries and loading states
- API client with Axios
- React Query setup

### ✅ Backend (Task 4 Complete)
- Bedrock integration service (with caching)
- Search service with OpenSearch k-NN
- Ranking service for personalized results
- Query service (disambiguation, expansion)
- Explanation service (AI-generated)
- Lambda handlers for search, suggestions, interactions
- Comprehensive test suite

---

## Testing the Frontend

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The frontend will start at `http://localhost:5173` (or another port if 5173 is busy).

### 3. Test Frontend Features

#### Authentication Flow
1. **Visit the app**: Open `http://localhost:5173`
2. **Test Login Page**: 
   - Click "Login" button in header
   - Try entering email and password
   - Note: Currently uses mock authentication (no real backend)
   - Should redirect to home page after "login"

3. **Test Signup Page**:
   - Click "Sign Up" button
   - Fill in name, email, password, confirm password
   - Test validation (password mismatch, short password)
   - Should redirect to home after signup

4. **Test Protected Routes**:
   - Try accessing `/library` without logging in → should redirect to login
   - Try accessing `/book/123` without logging in → should redirect to login
   - Login first, then access these routes → should work

#### Navigation
1. **Test Header Navigation**:
   - Click Home, Search, Browse, My Library links
   - Verify active state highlighting
   - Test logout button (appears when logged in)

2. **Test Responsive Layout**:
   - Resize browser window
   - Check mobile responsiveness

#### Error Handling
1. **Test Error Boundary**:
   - The error boundary will catch any React errors
   - Check browser console for any errors

### 4. Build for Production

```bash
npm run build
```

Should create optimized build in `dist/` folder.

### 5. Preview Production Build

```bash
npm run preview
```

---

## Testing the Backend

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Run Unit Tests

```bash
npm test
```

This runs all unit tests including:
- Ranking service tests
- Query service tests
- Search logic tests

### 3. Run Specific Test Suites

```bash
# Run only unit tests
npm test -- tests/unit

# Run only property tests
npm test -- tests/properties

# Run only integration tests
npm test -- tests/integration

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### 4. Run Property-Based Tests

Property-based tests run 100 iterations with random inputs:

```bash
npm test -- tests/properties/search-properties.test.ts
```

Tests include:
- **Property 1**: Search response time <2s
- **Property 2**: Search result completeness
- Result ordering by relevance
- Pagination integrity
- Filter correctness

### 5. Build Backend

```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/` folder.

### 6. Check for Type Errors

```bash
npx tsc --noEmit
```

---

## Testing Individual Services (Without AWS)

Since the backend services require AWS infrastructure (OpenSearch, DynamoDB, Redis), here's how to test them locally:

### Option 1: Mock Testing (Current Approach)

The tests use mocks to simulate AWS services. Run:

```bash
cd backend
npm test
```

### Option 2: Local AWS Services (Advanced)

If you want to test with real services locally:

#### 1. Start Local Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or install Redis locally
# macOS: brew install redis && redis-server
# Linux: sudo apt-get install redis-server && redis-server
```

#### 2. Start LocalStack (for AWS services)

```bash
# Install LocalStack
pip install localstack

# Start LocalStack with required services
localstack start -d

# Create local DynamoDB tables
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:4566
```

#### 3. Set Environment Variables

```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
export AWS_REGION=us-east-1
export OPENSEARCH_ENDPOINT=http://localhost:9200
export AWS_ENDPOINT=http://localhost:4566  # For LocalStack
```

---

## Testing the Complete Flow (Frontend + Backend)

### Prerequisites

You'll need AWS credentials and deployed infrastructure for full integration testing.

### 1. Deploy Backend to AWS

```bash
cd infrastructure
npm install
cdk deploy
```

This deploys:
- Lambda functions
- API Gateway
- DynamoDB tables
- OpenSearch cluster
- Redis cluster

### 2. Update Frontend API URL

Edit `frontend/.env`:

```env
VITE_API_URL=https://your-api-gateway-url.amazonaws.com/api
```

### 3. Test End-to-End

1. Start frontend: `cd frontend && npm run dev`
2. Test search flow:
   - Enter search query
   - View results with AI explanations
   - Click on a result (tracks interaction)
3. Test user profile:
   - View personalized recommendations
   - Check reading history

---

## Quick Test Checklist

### Frontend ✓
- [ ] App builds without errors: `cd frontend && npm run build`
- [ ] Dev server starts: `npm run dev`
- [ ] Can navigate between pages
- [ ] Login/Signup forms work
- [ ] Protected routes redirect to login
- [ ] Logout functionality works
- [ ] No console errors

### Backend ✓
- [ ] Code compiles: `cd backend && npm run build`
- [ ] Unit tests pass: `npm test -- tests/unit`
- [ ] Property tests pass: `npm test -- tests/properties`
- [ ] Integration tests pass: `npm test -- tests/integration`
- [ ] No TypeScript errors: `npx tsc --noEmit`

---

## Common Issues & Solutions

### Frontend Issues

**Issue**: `Module not found` errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Port already in use
```bash
# Vite will automatically try the next available port
# Or specify a port: npm run dev -- --port 3000
```

**Issue**: Build fails
```bash
# Check for TypeScript errors
npx tsc --noEmit
```

### Backend Issues

**Issue**: Tests fail with "Cannot find module"
```bash
cd backend
npm install
```

**Issue**: Redis connection errors in tests
- Tests use mocks by default, so Redis isn't required
- If you see Redis errors, check that mocks are properly set up

**Issue**: AWS SDK errors
- For local testing, AWS credentials aren't required (tests use mocks)
- For real AWS testing, configure: `aws configure`

---

## Performance Testing

### Frontend Performance

```bash
cd frontend
npm run build
npm run preview

# Use Lighthouse in Chrome DevTools
# Or use: npx lighthouse http://localhost:4173
```

### Backend Performance

Property tests include performance checks:
- Search response time must be <2s
- Run with: `npm test -- tests/properties`

---

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Test

on: [push, pull_request]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm run build
      
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd backend && npm run build
```

---

## Next Steps

Once you've tested the current implementation:

1. **Deploy to AWS**: Set up infrastructure (Task 1)
2. **Implement Frontend Search UI**: Task 6
3. **Add Book Reader**: Task 7
4. **Implement RAG Chat**: Task 10
5. **Add Quiz Generator**: Task 11

---

## Getting Help

If you encounter issues:

1. Check the console for error messages
2. Verify all dependencies are installed
3. Ensure you're using Node.js 18+ and npm 9+
4. Check that ports 5173 (frontend) and 6379 (Redis) are available
5. Review the error logs in the terminal

For AWS-related issues:
- Verify AWS credentials: `aws sts get-caller-identity`
- Check AWS region is set: `echo $AWS_REGION`
- Ensure required AWS services are enabled in your account
