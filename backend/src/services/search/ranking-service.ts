interface UserProfile {
  userId: string;
  preferredTopics: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  readingHistory: string[]; // Book IDs
  searchHistory: string[]; // Past queries
  interactionScores: Record<string, number>; // bookId -> score
}

interface SearchResult {
  bookId: string;
  title: string;
  author: string;
  relevanceScore: number;
  topics: string[];
  difficulty: string;
  [key: string]: any;
}

export class RankingService {
  /**
   * Re-rank search results based on user profile and preferences
   */
  reRankResults(
    results: any[],
    userProfile: UserProfile | null
  ): any[] {
    if (!userProfile) {
      return results;
    }

    const rankedResults = results.map((result) => {
      let personalizedScore = result.relevanceScore;

      // Boost based on topic preferences
      const topicBoost = this.calculateTopicBoost(
        result.topics,
        userProfile.preferredTopics
      );
      personalizedScore += topicBoost * 0.2;

      // Boost based on skill level match
      const skillBoost = this.calculateSkillBoost(
        result.difficulty,
        userProfile.skillLevel
      );
      personalizedScore += skillBoost * 0.15;

      // Boost based on past interactions
      const interactionBoost = this.calculateInteractionBoost(
        result.bookId,
        userProfile.interactionScores
      );
      personalizedScore += interactionBoost * 0.1;

      // Penalize if already read
      if (userProfile.readingHistory.includes(result.bookId)) {
        personalizedScore *= 0.8;
      }

      return {
        ...result,
        relevanceScore: Math.min(personalizedScore, 1.0),
        personalizedScore,
      };
    });

    // Sort by personalized score
    return rankedResults.sort(
      (a, b) => b.personalizedScore - a.personalizedScore
    );
  }

  /**
   * Calculate boost based on topic overlap
   */
  private calculateTopicBoost(
    resultTopics: string[],
    preferredTopics: string[]
  ): number {
    if (preferredTopics.length === 0) return 0;

    const matchingTopics = resultTopics.filter((topic) =>
      preferredTopics.includes(topic)
    );

    return matchingTopics.length / preferredTopics.length;
  }

  /**
   * Calculate boost based on skill level match
   */
  private calculateSkillBoost(
    resultDifficulty: string,
    userSkillLevel: string
  ): number {
    const difficultyMap: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
    };

    const resultLevel = difficultyMap[resultDifficulty] || 2;
    const userLevel = difficultyMap[userSkillLevel] || 2;

    // Perfect match gets full boost
    if (resultLevel === userLevel) return 1.0;

    // One level difference gets partial boost
    if (Math.abs(resultLevel - userLevel) === 1) return 0.5;

    // Two levels difference gets no boost
    return 0;
  }

  /**
   * Calculate boost based on past interactions
   */
  private calculateInteractionBoost(
    bookId: string,
    interactionScores: Record<string, number>
  ): number {
    return interactionScores[bookId] || 0;
  }

  /**
   * Update user interaction score for a book
   */
  updateInteractionScore(
    userProfile: UserProfile,
    bookId: string,
    interactionType: 'click' | 'view' | 'save' | 'complete',
    timeSpent?: number
  ): number {
    const currentScore = userProfile.interactionScores[bookId] || 0;

    let scoreIncrement = 0;
    switch (interactionType) {
      case 'click':
        scoreIncrement = 0.1;
        break;
      case 'view':
        scoreIncrement = 0.2;
        break;
      case 'save':
        scoreIncrement = 0.3;
        break;
      case 'complete':
        scoreIncrement = 0.5;
        break;
    }

    // Add time-based boost (up to 0.2 for 30+ minutes)
    if (timeSpent) {
      const timeBoost = Math.min(timeSpent / 1800, 0.2); // 1800 seconds = 30 minutes
      scoreIncrement += timeBoost;
    }

    const newScore = Math.min(currentScore + scoreIncrement, 1.0);
    userProfile.interactionScores[bookId] = newScore;

    return newScore;
  }

  /**
   * Extract preferred topics from user's reading history
   */
  extractPreferredTopics(
    readingHistory: Array<{ bookId: string; topics: string[] }>,
    topN: number = 5
  ): string[] {
    const topicCounts: Record<string, number> = {};

    readingHistory.forEach(({ topics }) => {
      topics.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([topic]) => topic);
  }
}
