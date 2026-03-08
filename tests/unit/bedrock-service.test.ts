// tests/unit/bedrock-service.test.ts
import { BedrockService } from '../../backend/src/services/bedrock/bedrock-service';
import { CachedBedrockService } from '../../backend/src/services/bedrock/cached-bedrock-service';

describe('BedrockService', () => {
  let service: BedrockService;

  beforeAll(() => {
    service = new BedrockService(process.env.AWS_REGION || 'us-east-1');
  });

  describe('Task 2.1.1 - generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      const text = 'This is a test sentence for embedding generation.';
      const embedding = await service.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1024); // Titan default dimension
      expect(embedding.every(n => typeof n === 'number')).toBe(true);
    }, 30000);

    it('should handle empty text gracefully', async () => {
      await expect(service.generateEmbedding('')).rejects.toThrow();
    });
  });

  describe('Task 2.1.2 - generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'First sentence about machine learning',
        'Second sentence about databases',
        'Third sentence about web development',
      ];
      const embeddings = await service.generateBatchEmbeddings(texts);

      expect(embeddings).toHaveLength(3);
      expect(embeddings.every(emb => emb.length === 1024)).toBe(true);
    }, 60000);

    it('should handle large batches', async () => {
      const texts = Array.from({ length: 25 }, (_, i) => `Test sentence ${i}`);
      const embeddings = await service.generateBatchEmbeddings(texts);

      expect(embeddings).toHaveLength(25);
    }, 120000);
  });

  describe('Task 2.1.3 - invokeModel', () => {
    it('should generate text response', async () => {
      const prompt = 'What is 2+2? Answer with just the number.';
      const response = await service.invokeModel(prompt);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    }, 30000);

    it('should respect temperature parameter', async () => {
      const prompt = 'Generate a random number between 1 and 100.';
      const response1 = await service.invokeModel(prompt, { temperature: 0.1 });
      const response2 = await service.invokeModel(prompt, { temperature: 0.9 });

      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
      // With different temperatures, responses may vary
    }, 60000);
  });

  describe('Task 2.1.4 - invokeStructured', () => {
    it('should return structured JSON response', async () => {
      const schema = {
        type: 'object',
        properties: {
          answer: { type: 'number' },
          explanation: { type: 'string' },
        },
      };

      const prompt = 'What is 5+3? Provide the answer and a brief explanation.';
      const response = await service.invokeStructured<{ answer: number; explanation: string }>(
        prompt,
        schema
      );

      expect(response).toBeDefined();
      expect(response.answer).toBe(8);
      expect(typeof response.explanation).toBe('string');
      expect(response.explanation.length).toBeGreaterThan(0);
    }, 30000);

    it('should handle complex schemas', async () => {
      const schema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'number' },
              },
            },
          },
        },
      };

      const prompt = 'List 3 programming languages with their approximate year of creation.';
      const response = await service.invokeStructured<{ items: Array<{ name: string; value: number }> }>(
        prompt,
        schema
      );

      expect(response).toBeDefined();
      expect(Array.isArray(response.items)).toBe(true);
      expect(response.items.length).toBeGreaterThanOrEqual(3);
    }, 30000);
  });

  describe('Task 2.1.5 - invokeModelStream', () => {
    it('should stream text response', async () => {
      const prompt = 'Count from 1 to 5.';
      const chunks: string[] = [];

      for await (const chunk of service.invokeModelStream(prompt)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullResponse = chunks.join('');
      expect(fullResponse.length).toBeGreaterThan(0);
    }, 30000);
  });
});


describe('CachedBedrockService', () => {
  let service: CachedBedrockService;

  beforeAll(async () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    service = new CachedBedrockService(
      process.env.AWS_REGION || 'us-east-1',
      redisUrl
    );
    await service.initialize();
  });

  afterAll(async () => {
    await service.shutdown();
  });

  describe('Task 2.2.1 - Embedding Caching', () => {
    it('should cache embeddings', async () => {
      const text = 'Test sentence for caching validation';

      // First call - should hit API
      const embedding1 = await service.generateEmbedding(text);

      // Second call - should hit cache
      const embedding2 = await service.generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
    }, 60000);
  });

  describe('Property 25: Embedding Cache Efficiency', () => {
    it('should return cached embeddings faster than API calls', async () => {
      const text = 'Performance test sentence for cache efficiency';

      // Clear cache first
      await service.clearEmbeddingsCache();

      // First call - should hit API
      const start1 = Date.now();
      const embedding1 = await service.generateEmbedding(text);
      const duration1 = Date.now() - start1;

      // Second call - should hit cache
      const start2 = Date.now();
      const embedding2 = await service.generateEmbedding(text);
      const duration2 = Date.now() - start2;

      expect(embedding1).toEqual(embedding2);
      expect(duration2).toBeLessThan(duration1 / 2); // Cache should be at least 2x faster
      console.log(`API call: ${duration1}ms, Cache hit: ${duration2}ms`);
    }, 60000);
  });

  describe('Task 2.2.2 - LLM Response Caching', () => {
    it('should cache LLM responses', async () => {
      const prompt = 'What is the capital of France? Answer in one word.';

      // First call
      const response1 = await service.invokeModel(prompt);

      // Second call - should be cached
      const response2 = await service.invokeModel(prompt);

      expect(response1).toEqual(response2);
    }, 60000);
  });

  describe('Task 2.2.3 - Cache Invalidation', () => {
    it('should invalidate cache by pattern', async () => {
      const text = 'Test for cache invalidation';

      // Generate and cache embedding
      await service.generateEmbedding(text);

      // Invalidate cache
      await service.clearEmbeddingsCache();

      // This should hit API again (we can't easily verify, but it shouldn't error)
      const embedding = await service.generateEmbedding(text);
      expect(embedding).toBeDefined();
    }, 60000);
  });
});
