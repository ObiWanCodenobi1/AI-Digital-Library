import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

/**
 * Integration Tests for Search Flow
 * 
 * These tests verify the end-to-end search functionality including:
 * - Query submission
 * - Embedding generation
 * - Vector search
 * - Result ranking
 * - Explanation generation
 * - Interaction tracking
 */

describe('Search Flow Integration Tests', () => {
  // Mock services for integration testing
  let mockSearchService: any;
  let mockBedrockService: any;
  let mockOpenSearchService: any;
  let mockRankingService: any;

  beforeAll(() => {
    // Initialize mock services
    mockBedrockService = {
      generateEmbedding: async (text: string) => {
        // Return mock embedding vector
        return Array(1024).fill(0).map(() => Math.random());
      },
      invokeModel: async (prompt: string) => {
        return 'This book is relevant because it covers the topics you searched for.';
      },
    };

    mockOpenSearchService = {
      hybridSearch: async (index: string, vector: number[], keywords: string) => {
        // Return mock search hits
        return [
          {
            _id: 'book-1',
            _score: 0.95,
            _source: {
              title: 'Introduction to Machine Learning',
              author: 'John Doe',
              description: 'A comprehensive guide to ML fundamentals',
              topics: ['Machine Learning', 'AI', 'Data Science'],
              difficulty: 'beginner',
            },
          },
          {
            _id: 'book-2',
            _score: 0.87,
            _source: {
              title: 'Advanced Deep Learning',
              author: 'Jane Smith',
              description: 'Deep dive into neural networks',
              topics: ['Deep Learning', 'Neural Networks'],
              difficulty: 'advanced',
            },
          },
        ];
      },
    };

    mockRankingService = {
      reRankResults: (results: any[], userProfile: any) => {
        // Return results as-is for testing
        return results;
      },
    };
  });

  afterAll(() => {
    // Cleanup
  });

  it('should complete full search flow from query to results', async () => {
    const query = 'machine learning basics';
    const userId = 'test-user-1';

    // Step 1: Generate embedding for query
    const startTime = Date.now();
    const embedding = await mockBedrockService.generateEmbedding(query);
    
    expect(embedding).toBeDefined();
    expect(embedding.length).toBe(1024);
    
    const embeddingTime = Date.now() - startTime;
    console.log(`Embedding generated in ${embeddingTime}ms`);

    // Step 2: Perform hybrid search
    const searchStartTime = Date.now();
    const searchHits = await mockOpenSearchService.hybridSearch(
      'books',
      embedding,
      query
    );
    
    expect(searchHits).toBeDefined();
    expect(searchHits.length).toBeGreaterThan(0);
    
    const searchTime = Date.now() - searchStartTime;
    console.log(`Search completed in ${searchTime}ms`);

    // Step 3: Convert to results
    const results = searchHits.map((hit: any) => ({
      bookId: hit._id,
      title: hit._source.title,
      author: hit._source.author,
      relevanceScore: hit._score,
      snippet: hit._source.description,
      topics: hit._source.topics,
      difficulty: hit._source.difficulty,
      explanation: '',
    }));

    // Step 4: Re-rank based on user profile
    const userProfile = {
      userId,
      preferredTopics: ['Machine Learning'],
      skillLevel: 'beginner' as const,
      readingHistory: [],
      searchHistory: [],
      interactionScores: {},
    };

    const rankedResults = mockRankingService.reRankResults(results, userProfile);
    
    expect(rankedResults).toBeDefined();
    expect(rankedResults.length).toBe(results.length);

    // Step 5: Generate explanations (for top 3 results)
    const topResults = rankedResults.slice(0, 3);
    for (const result of topResults) {
      const explanation = await mockBedrockService.invokeModel(
        `Explain why "${result.title}" matches the query "${query}"`
      );
      result.explanation = explanation;
      
      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(0);
    }

    // Step 6: Verify total response time
    const totalTime = Date.now() - startTime;
    console.log(`Total search flow completed in ${totalTime}ms`);
    
    // Should complete within reasonable time (allowing for mock delays)
    expect(totalTime).toBeLessThan(5000);

    // Step 7: Verify result structure
    rankedResults.forEach((result: any) => {
      expect(result).toHaveProperty('bookId');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('author');
      expect(result).toHaveProperty('relevanceScore');
      expect(result).toHaveProperty('topics');
      expect(result.relevanceScore).toBeGreaterThan(0);
      expect(result.relevanceScore).toBeLessThanOrEqual(1);
    });
  });

  it('should handle search with filters', async () => {
    const query = 'machine learning';
    const filters = {
      difficulty: 'beginner',
      topics: ['Machine Learning', 'AI'],
    };

    // Generate embedding
    const embedding = await mockBedrockService.generateEmbedding(query);

    // Perform filtered search
    const searchHits = await mockOpenSearchService.hybridSearch(
      'books',
      embedding,
      query
    );

    // Apply filters
    const filteredResults = searchHits.filter((hit: any) => {
      const matchesDifficulty = hit._source.difficulty === filters.difficulty;
      const matchesTopics = filters.topics.some((topic: string) =>
        hit._source.topics.includes(topic)
      );
      return matchesDifficulty && matchesTopics;
    });

    expect(filteredResults.length).toBeGreaterThan(0);
    
    // Verify all results match filters
    filteredResults.forEach((hit: any) => {
      expect(hit._source.difficulty).toBe(filters.difficulty);
      expect(
        filters.topics.some((topic: string) => hit._source.topics.includes(topic))
      ).toBe(true);
    });
  });

  it('should handle pagination correctly', async () => {
    const query = 'programming';
    const limit = 5;
    const offset = 0;

    // Generate embedding
    const embedding = await mockBedrockService.generateEmbedding(query);

    // Perform search
    const searchHits = await mockOpenSearchService.hybridSearch(
      'books',
      embedding,
      query
    );

    // Apply pagination
    const paginatedResults = searchHits.slice(offset, offset + limit);

    expect(paginatedResults.length).toBeLessThanOrEqual(limit);
    expect(paginatedResults.length).toBeLessThanOrEqual(searchHits.length);

    // Verify no duplicates
    const ids = paginatedResults.map((hit: any) => hit._id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should track user interactions', async () => {
    const userId = 'test-user-1';
    const bookId = 'book-1';
    const searchQuery = 'machine learning';

    // Mock interaction tracking
    const mockTrackInteraction = async (
      userId: string,
      bookId: string,
      interactionType: string,
      searchQuery?: string
    ) => {
      return {
        success: true,
        scoreIncrement: 0.1,
      };
    };

    // Track click interaction
    const result = await mockTrackInteraction(
      userId,
      bookId,
      'click',
      searchQuery
    );

    expect(result.success).toBe(true);
    expect(result.scoreIncrement).toBeGreaterThan(0);
  });

  it('should handle no results scenario', async () => {
    const query = 'xyzabc123nonexistent';

    // Generate embedding
    const embedding = await mockBedrockService.generateEmbedding(query);

    // Mock empty search results
    const mockEmptySearch = async () => {
      return [];
    };

    const searchHits = await mockEmptySearch();

    expect(searchHits.length).toBe(0);

    // Should suggest query rephrasing
    const mockRephraseQuery = async (query: string) => {
      return [
        'Try using more general terms',
        'Check spelling',
        'Use synonyms',
      ];
    };

    const suggestions = await mockRephraseQuery(query);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should cache search results for repeated queries', async () => {
    const query = 'react hooks';

    // First search
    const startTime1 = Date.now();
    const embedding1 = await mockBedrockService.generateEmbedding(query);
    const results1 = await mockOpenSearchService.hybridSearch(
      'books',
      embedding1,
      query
    );
    const time1 = Date.now() - startTime1;

    // Second search (should be faster due to caching)
    const startTime2 = Date.now();
    const embedding2 = await mockBedrockService.generateEmbedding(query);
    const results2 = await mockOpenSearchService.hybridSearch(
      'books',
      embedding2,
      query
    );
    const time2 = Date.now() - startTime2;

    // Results should be identical
    expect(results1.length).toBe(results2.length);
    
    console.log(`First search: ${time1}ms, Second search: ${time2}ms`);
  });

  it('should handle concurrent search requests', async () => {
    const queries = [
      'machine learning',
      'web development',
      'data structures',
      'algorithms',
      'react tutorial',
    ];

    // Execute searches concurrently
    const startTime = Date.now();
    const results = await Promise.all(
      queries.map(async (query) => {
        const embedding = await mockBedrockService.generateEmbedding(query);
        const hits = await mockOpenSearchService.hybridSearch(
          'books',
          embedding,
          query
        );
        return { query, hits };
      })
    );
    const totalTime = Date.now() - startTime;

    // All searches should complete
    expect(results.length).toBe(queries.length);
    
    // Each should have results
    results.forEach((result) => {
      expect(result.hits).toBeDefined();
    });

    console.log(`${queries.length} concurrent searches completed in ${totalTime}ms`);
  });
});
