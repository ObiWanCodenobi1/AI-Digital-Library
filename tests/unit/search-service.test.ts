import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RankingService } from '../../backend/src/services/search/ranking-service';
import { QueryService } from '../../backend/src/services/search/query-service';

describe('RankingService', () => {
  let rankingService: RankingService;

  beforeEach(() => {
    rankingService = new RankingService();
  });

  describe('reRankResults', () => {
    it('should return original results when no user profile provided', () => {
      const results = [
        {
          bookId: '1',
          title: 'Test Book',
          author: 'Author',
          relevanceScore: 0.8,
          topics: ['JavaScript'],
          difficulty: 'beginner',
        },
      ];

      const ranked = rankingService.reRankResults(results, null);
      expect(ranked).toEqual(results);
    });

    it('should boost results matching user preferred topics', () => {
      const results = [
        {
          bookId: '1',
          title: 'JavaScript Basics',
          author: 'Author 1',
          relevanceScore: 0.7,
          topics: ['JavaScript', 'Web Development'],
          difficulty: 'beginner',
        },
        {
          bookId: '2',
          title: 'Python Guide',
          author: 'Author 2',
          relevanceScore: 0.8,
          topics: ['Python'],
          difficulty: 'beginner',
        },
      ];

      const userProfile = {
        userId: 'user1',
        preferredTopics: ['JavaScript', 'Web Development'],
        skillLevel: 'beginner' as const,
        readingHistory: [],
        searchHistory: [],
        interactionScores: {},
      };

      const ranked = rankingService.reRankResults(results, userProfile);
      
      // JavaScript book should be ranked higher due to topic match
      expect(ranked[0].bookId).toBe('1');
    });

    it('should boost results matching user skill level', () => {
      const results = [
        {
          bookId: '1',
          title: 'Advanced Patterns',
          author: 'Author 1',
          relevanceScore: 0.8,
          topics: ['JavaScript'],
          difficulty: 'advanced',
        },
        {
          bookId: '2',
          title: 'Beginner Guide',
          author: 'Author 2',
          relevanceScore: 0.7,
          topics: ['JavaScript'],
          difficulty: 'beginner',
        },
      ];

      const userProfile = {
        userId: 'user1',
        preferredTopics: [],
        skillLevel: 'beginner' as const,
        readingHistory: [],
        searchHistory: [],
        interactionScores: {},
      };

      const ranked = rankingService.reRankResults(results, userProfile);
      
      // Beginner book should be ranked higher for beginner user
      expect(ranked[0].bookId).toBe('2');
    });

    it('should penalize already read books', () => {
      const results = [
        {
          bookId: '1',
          title: 'Book 1',
          author: 'Author 1',
          relevanceScore: 0.9,
          topics: ['JavaScript'],
          difficulty: 'beginner',
        },
        {
          bookId: '2',
          title: 'Book 2',
          author: 'Author 2',
          relevanceScore: 0.8,
          topics: ['JavaScript'],
          difficulty: 'beginner',
        },
      ];

      const userProfile = {
        userId: 'user1',
        preferredTopics: [],
        skillLevel: 'beginner' as const,
        readingHistory: ['1'], // Already read book 1
        searchHistory: [],
        interactionScores: {},
      };

      const ranked = rankingService.reRankResults(results, userProfile);
      
      // Book 2 should be ranked higher despite lower original score
      expect(ranked[0].bookId).toBe('2');
    });
  });

  describe('updateInteractionScore', () => {
    it('should increment score based on interaction type', () => {
      const userProfile = {
        userId: 'user1',
        preferredTopics: [],
        skillLevel: 'beginner' as const,
        readingHistory: [],
        searchHistory: [],
        interactionScores: {},
      };

      const score = rankingService.updateInteractionScore(
        userProfile,
        'book1',
        'click'
      );

      expect(score).toBe(0.1);
      expect(userProfile.interactionScores['book1']).toBe(0.1);
    });

    it('should add time-based boost', () => {
      const userProfile = {
        userId: 'user1',
        preferredTopics: [],
        skillLevel: 'beginner' as const,
        readingHistory: [],
        searchHistory: [],
        interactionScores: {},
      };

      const score = rankingService.updateInteractionScore(
        userProfile,
        'book1',
        'view',
        1800 // 30 minutes
      );

      expect(score).toBeGreaterThan(0.2);
      expect(score).toBeLessThanOrEqual(0.4);
    });

    it('should cap score at 1.0', () => {
      const userProfile = {
        userId: 'user1',
        preferredTopics: [],
        skillLevel: 'beginner' as const,
        readingHistory: [],
        searchHistory: [],
        interactionScores: { book1: 0.9 },
      };

      const score = rankingService.updateInteractionScore(
        userProfile,
        'book1',
        'complete'
      );

      expect(score).toBe(1.0);
    });
  });

  describe('extractPreferredTopics', () => {
    it('should extract most common topics from reading history', () => {
      const readingHistory = [
        { bookId: '1', topics: ['JavaScript', 'Web Development'] },
        { bookId: '2', topics: ['JavaScript', 'React'] },
        { bookId: '3', topics: ['Python', 'Data Science'] },
        { bookId: '4', topics: ['JavaScript', 'Node.js'] },
      ];

      const topics = rankingService.extractPreferredTopics(readingHistory, 3);

      expect(topics).toContain('JavaScript');
      expect(topics.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for empty history', () => {
      const topics = rankingService.extractPreferredTopics([], 5);
      expect(topics).toEqual([]);
    });
  });
});

describe('QueryService', () => {
  let queryService: QueryService;
  let mockBedrockService: any;

  beforeEach(() => {
    mockBedrockService = {
      invokeStructured: jest.fn(),
    };
    queryService = new QueryService(mockBedrockService);
  });

  describe('disambiguateQuery', () => {
    it('should detect ambiguous queries', async () => {
      mockBedrockService.invokeStructured.mockResolvedValue({
        isAmbiguous: true,
        interpretations: [
          'Java programming language',
          'JavaScript programming language',
        ],
        clarificationQuestion: 'Are you looking for Java or JavaScript?',
      });

      const result = await queryService.disambiguateQuery('java');

      expect(result.isAmbiguous).toBe(true);
      expect(result.interpretations.length).toBeGreaterThan(0);
    });

    it('should handle clear queries', async () => {
      mockBedrockService.invokeStructured.mockResolvedValue({
        isAmbiguous: false,
        interpretations: [],
      });

      const result = await queryService.disambiguateQuery('react hooks tutorial');

      expect(result.isAmbiguous).toBe(false);
    });
  });

  describe('rephraseQuery', () => {
    it('should provide alternative phrasings', async () => {
      mockBedrockService.invokeStructured.mockResolvedValue([
        'guide to machine learning',
        'machine learning patterns',
        'machine learning',
      ]);

      const alternatives = await queryService.rephraseQuery(
        'how to machine learning'
      );

      expect(alternatives.length).toBe(3);
      expect(alternatives).toContain('guide to machine learning');
    });
  });

  describe('extractIntent', () => {
    it('should extract learning intent', async () => {
      mockBedrockService.invokeStructured.mockResolvedValue({
        intent: 'learn',
        entities: ['React', 'hooks'],
        difficulty: 'beginner',
      });

      const result = await queryService.extractIntent('learn react hooks');

      expect(result.intent).toBe('learn');
      expect(result.entities).toContain('React');
      expect(result.difficulty).toBe('beginner');
    });

    it('should extract troubleshooting intent', async () => {
      mockBedrockService.invokeStructured.mockResolvedValue({
        intent: 'troubleshoot',
        entities: ['memory leak', 'Node.js'],
        difficulty: 'advanced',
      });

      const result = await queryService.extractIntent('fix memory leak in nodejs');

      expect(result.intent).toBe('troubleshoot');
    });
  });
});
