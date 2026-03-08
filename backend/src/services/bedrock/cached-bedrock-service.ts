// backend/src/services/bedrock/cached-bedrock-service.ts
import { BedrockService, InvokeOptions, EmbeddingOptions } from './bedrock-service';
import { RedisCache } from '../cache/redis-cache';

export class CachedBedrockService extends BedrockService {
  private cache: RedisCache;
  private embeddingTTL = 0; // Permanent cache for embeddings
  private llmTTL = 86400; // 24 hours for LLM responses

  constructor(region: string, redisUrl: string) {
    super(region);
    this.cache = new RedisCache(redisUrl);
  }

  async initialize(): Promise<void> {
    await this.cache.connect();
  }

  async shutdown(): Promise<void> {
    await this.cache.disconnect();
  }

  /**
   * Generate embedding with caching
   * Task 2.2.1 - Validates: Property 25 (Embedding Cache Efficiency)
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const cacheKey = BedrockService.generateCacheKey(text, 'embedding');

    // Check cache first
    const cached = await this.cache.get<number[]>(cacheKey);
    if (cached) {
      console.log('Cache hit for embedding');
      return cached;
    }

    // Generate embedding
    const embedding = await super.generateEmbedding(text, options);

    // Cache permanently (TTL = 0 means no expiration)
    await this.cache.set(cacheKey, embedding, this.embeddingTTL);

    return embedding;
  }

  /**
   * Invoke model with caching
   * Task 2.2.2 - Cache LLM responses for 24 hours
   */
  async invokeModel(prompt: string, options?: InvokeOptions): Promise<string> {
    const cacheKey = BedrockService.generateCacheKey(
      JSON.stringify({ prompt, options }),
      'llm'
    );

    // Check cache first
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) {
      console.log('Cache hit for LLM response');
      return cached;
    }

    // Invoke model
    const response = await super.invokeModel(prompt, options);

    // Cache for 24 hours
    await this.cache.set(cacheKey, response, this.llmTTL);

    return response;
  }

  /**
   * Invalidate cache for a specific key pattern
   * Task 2.2.3 - Cache invalidation
   */
  async invalidateCache(pattern: string): Promise<void> {
    await this.cache.deletePattern(pattern);
  }

  /**
   * Clear all embeddings cache
   */
  async clearEmbeddingsCache(): Promise<void> {
    await this.cache.deletePattern('embedding:*');
  }

  /**
   * Clear all LLM response cache
   */
  async clearLLMCache(): Promise<void> {
    await this.cache.deletePattern('llm:*');
  }
}
