import { BedrockService } from '../bedrock/bedrock-service';
import { RedisCache } from '../cache/redis-cache';

interface SearchResult {
  bookId: string;
  title: string;
  author: string;
  relevanceScore: number;
  snippet: string;
  topics: string[];
}

export class ExplanationService {
  constructor(
    private bedrockService: BedrockService,
    private cache?: RedisCache
  ) {}

  /**
   * Generate AI explanation for why a book matches the search query
   */
  async generateExplanation(
    query: string,
    result: SearchResult
  ): Promise<string> {
    // Check cache first
    if (this.cache) {
      const cacheKey = `explanation:${query}:${result.bookId}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        console.log('Explanation cache hit');
        return cached as string;
      }
    }

    const prompt = `You are a helpful librarian assistant. Explain in 1-2 sentences why this book matches the user's search query.

User Query: "${query}"

Book Information:
- Title: ${result.title}
- Author: ${result.author}
- Topics: ${result.topics.join(', ')}
- Description: ${result.snippet}

Provide a concise, natural explanation of why this book is relevant to the query. Focus on the connection between the query and the book's content.`;

    try {
      const explanation = await this.bedrockService.invokeModel(prompt, {
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        temperature: 0.3,
        maxTokens: 150,
      });

      const trimmedExplanation = explanation.trim();

      // Cache the explanation (24 hour TTL)
      if (this.cache) {
        const cacheKey = `explanation:${query}:${result.bookId}`;
        await this.cache.set(cacheKey, trimmedExplanation, 86400);
      }

      return trimmedExplanation;
    } catch (error) {
      console.error('Failed to generate explanation:', error);
      // Fallback to simple explanation
      return `This book covers ${result.topics.slice(0, 2).join(' and ')} which relates to your search for "${query}".`;
    }
  }

  /**
   * Generate explanations for multiple results in batch
   */
  async generateBatchExplanations(
    query: string,
    results: SearchResult[]
  ): Promise<Map<string, string>> {
    const explanations = new Map<string, string>();

    // Generate explanations in parallel (with concurrency limit)
    const batchSize = 5;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      const promises = batch.map(async (result) => {
        const explanation = await this.generateExplanation(query, result);
        return { bookId: result.bookId, explanation };
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ bookId, explanation }) => {
        explanations.set(bookId, explanation);
      });
    }

    return explanations;
  }

  /**
   * Generate a structured explanation with key points
   */
  async generateStructuredExplanation(
    query: string,
    result: SearchResult
  ): Promise<{
    summary: string;
    keyPoints: string[];
    relevantTopics: string[];
  }> {
    const prompt = `Analyze why this book matches the user's search query and provide a structured explanation.

User Query: "${query}"

Book Information:
- Title: ${result.title}
- Author: ${result.author}
- Topics: ${result.topics.join(', ')}
- Description: ${result.snippet}

Provide your response in the following JSON format:
{
  "summary": "One sentence summary of relevance",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "relevantTopics": ["Topic 1", "Topic 2"]
}`;

    try {
      const response = await this.bedrockService.invokeStructured<{
        summary: string;
        keyPoints: string[];
        relevantTopics: string[];
      }>(prompt, {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          keyPoints: {
            type: 'array',
            items: { type: 'string' },
          },
          relevantTopics: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['summary', 'keyPoints', 'relevantTopics'],
      });

      return response;
    } catch (error) {
      console.error('Failed to generate structured explanation:', error);
      return {
        summary: `This book is relevant to your search for "${query}".`,
        keyPoints: result.topics.slice(0, 3),
        relevantTopics: result.topics,
      };
    }
  }
}
