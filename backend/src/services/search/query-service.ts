import { BedrockService } from '../bedrock/bedrock-service';

interface QueryDisambiguation {
  isAmbiguous: boolean;
  interpretations: string[];
  clarificationQuestion?: string;
}

interface QueryExpansion {
  originalQuery: string;
  expandedQueries: string[];
  synonyms: Record<string, string[]>;
}

export class QueryService {
  constructor(private bedrockService: BedrockService) {}

  /**
   * Detect if a query is ambiguous and provide interpretations
   */
  async disambiguateQuery(query: string): Promise<QueryDisambiguation> {
    const prompt = `Analyze this search query from a developer searching a technical library and determine if it's ambiguous.

Query: "${query}"

If the query has multiple possible interpretations in a technical context, provide:
1. A list of possible interpretations
2. A clarification question to ask the user

Return your response in JSON format:
{
  "isAmbiguous": boolean,
  "interpretations": ["interpretation 1", "interpretation 2", ...],
  "clarificationQuestion": "What specifically are you looking for?"
}

If the query is clear and unambiguous, set isAmbiguous to false and provide an empty interpretations array.`;

    try {
      const response = await this.bedrockService.invokeStructured<QueryDisambiguation>(
        prompt,
        {
          type: 'object',
          properties: {
            isAmbiguous: { type: 'boolean' },
            interpretations: {
              type: 'array',
              items: { type: 'string' },
            },
            clarificationQuestion: { type: 'string' },
          },
          required: ['isAmbiguous', 'interpretations'],
        }
      );

      return response;
    } catch (error) {
      console.error('Query disambiguation error:', error);
      return {
        isAmbiguous: false,
        interpretations: [],
      };
    }
  }

  /**
   * Expand query with synonyms and related terms
   */
  async expandQuery(query: string): Promise<QueryExpansion> {
    const prompt = `Given this technical search query, expand it with synonyms and related terms that would help find relevant books.

Query: "${query}"

Provide:
1. 3-5 expanded versions of the query using synonyms and related terms
2. A map of key terms to their synonyms

Return your response in JSON format:
{
  "originalQuery": "${query}",
  "expandedQueries": ["expanded query 1", "expanded query 2", ...],
  "synonyms": {
    "term1": ["synonym1", "synonym2"],
    "term2": ["synonym1", "synonym2"]
  }
}`;

    try {
      const response = await this.bedrockService.invokeStructured<QueryExpansion>(
        prompt,
        {
          type: 'object',
          properties: {
            originalQuery: { type: 'string' },
            expandedQueries: {
              type: 'array',
              items: { type: 'string' },
            },
            synonyms: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          required: ['originalQuery', 'expandedQueries', 'synonyms'],
        }
      );

      return response;
    } catch (error) {
      console.error('Query expansion error:', error);
      return {
        originalQuery: query,
        expandedQueries: [query],
        synonyms: {},
      };
    }
  }

  /**
   * Rephrase query for better results when no results found
   */
  async rephraseQuery(query: string): Promise<string[]> {
    const prompt = `The search query "${query}" returned no results in our technical library. 

Suggest 3 alternative ways to phrase this query that might yield better results. Consider:
1. Using more general terms
2. Using technical synonyms
3. Breaking down complex queries
4. Using different terminology

Return only a JSON array of alternative queries, nothing else.`;

    try {
      const alternatives = await this.bedrockService.invokeStructured<string[]>(
        prompt,
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 3,
        }
      );

      return alternatives;
    } catch (error) {
      console.error('Query rephrasing error:', error);
      // Fallback: simple word variations
      return [
        query.replace(/how to/i, 'guide to'),
        query.replace(/best practices/i, 'patterns'),
        query.split(' ').slice(0, 3).join(' '), // Simplify to first 3 words
      ];
    }
  }

  /**
   * Extract intent from natural language query
   */
  async extractIntent(query: string): Promise<{
    intent: 'learn' | 'reference' | 'implement' | 'compare' | 'troubleshoot';
    entities: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'any';
  }> {
    const prompt = `Analyze this search query and extract the user's intent and key entities.

Query: "${query}"

Determine:
1. Primary intent: learn (learning a new topic), reference (looking up specific info), implement (building something), compare (comparing options), or troubleshoot (fixing a problem)
2. Key technical entities mentioned (technologies, concepts, tools)
3. Implied difficulty level based on query complexity

Return JSON:
{
  "intent": "learn" | "reference" | "implement" | "compare" | "troubleshoot",
  "entities": ["entity1", "entity2", ...],
  "difficulty": "beginner" | "intermediate" | "advanced" | "any"
}`;

    try {
      const response = await this.bedrockService.invokeStructured<{
        intent: 'learn' | 'reference' | 'implement' | 'compare' | 'troubleshoot';
        entities: string[];
        difficulty: 'beginner' | 'intermediate' | 'advanced' | 'any';
      }>(prompt, {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            enum: ['learn', 'reference', 'implement', 'compare', 'troubleshoot'],
          },
          entities: {
            type: 'array',
            items: { type: 'string' },
          },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced', 'any'],
          },
        },
        required: ['intent', 'entities', 'difficulty'],
      });

      return response;
    } catch (error) {
      console.error('Intent extraction error:', error);
      return {
        intent: 'learn',
        entities: query.split(' ').filter((w) => w.length > 3),
        difficulty: 'any',
      };
    }
  }
}
