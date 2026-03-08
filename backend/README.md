# AI Digital Library - Backend

Backend services for the AI-Enabled Digital Library platform.

## Phase 2: Bedrock Integration Service

This phase implements the core AI capabilities using AWS Bedrock.

### Features Implemented

- ✅ **BedrockService**: Core service for AI operations
  - Generate embeddings using Titan Embeddings
  - Invoke Claude 3 for text generation
  - Structured output with JSON schema validation
  - Streaming responses
  
- ✅ **CachedBedrockService**: Performance-optimized service with Redis caching
  - Permanent caching for embeddings
  - 24-hour caching for LLM responses
  - Cache invalidation support
  
- ✅ **Error Handling**: Exponential backoff retry logic
  - Automatic retry on rate limits and timeouts
  - Configurable retry parameters
  
- ✅ **Lambda Handler**: Ready-to-deploy Lambda function

### Installation

```bash
cd backend
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `AWS_REGION`: AWS region (default: us-east-1)
- `REDIS_URL`: Redis connection URL
- `AWS_ACCOUNT_ID`: Your AWS account ID

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test bedrock-service.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Prerequisites for Testing

1. **AWS Credentials**: Configure AWS CLI with credentials that have Bedrock access
2. **Redis**: Running Redis instance (local or remote)
3. **Bedrock Access**: Enable Claude 3 and Titan models in AWS Bedrock console

### Usage Example

```typescript
import { CachedBedrockService } from './services/bedrock/cached-bedrock-service';

// Initialize service
const service = new CachedBedrockService('us-east-1', 'redis://localhost:6379');
await service.initialize();

// Generate embedding
const embedding = await service.generateEmbedding('Hello world');

// Invoke Claude 3
const response = await service.invokeModel('What is AI?');

// Structured output
const quiz = await service.invokeStructured(
  'Generate a quiz question about JavaScript',
  quizSchema
);

// Cleanup
await service.shutdown();
```

### Task Completion

Phase 2 tasks completed:
- [x] 2.1.1 - Generate embeddings with Titan
- [x] 2.1.2 - Batch embedding generation
- [x] 2.1.3 - Invoke Claude 3 for text generation
- [x] 2.1.4 - Structured output with schema validation
- [x] 2.1.5 - Streaming responses
- [x] 2.2.1 - Redis caching for embeddings
- [x] 2.2.2 - Redis caching for LLM responses
- [x] 2.2.3 - Cache invalidation
- [x] 2.3.1 - Exponential backoff retry logic
- [x] 2.3.2 - Handle timeout and rate limit errors
- [x] 2.3.3 - Logging for monitoring
- [x] 2.4.1 - Unit tests for embedding generation
- [x] 2.4.2 - Unit tests for LLM invocation
- [x] 2.4.3 - Property test for cache efficiency (Property 25)

### Next Steps

Ready to move to Phase 3: Frontend Foundation
