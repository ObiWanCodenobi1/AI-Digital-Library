import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockService } from '../services/bedrock/bedrock-service';
import { CachedBedrockService } from '../services/bedrock/cached-bedrock-service';
import { RedisCache } from '../services/cache/redis-cache';

// Initialize services
const redisUrl = `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
const region = process.env.AWS_REGION || 'us-east-1';

const cachedBedrock = new CachedBedrockService(region, redisUrl);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const partialQuery = event.queryStringParameters?.q || '';

    if (partialQuery.length < 2) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          suggestions: [],
        }),
      };
    }

    console.log('Generating suggestions for:', partialQuery);

    // Check cache first
    const cacheKey = `suggestions:${partialQuery.toLowerCase()}`;
    const cached = await cachedBedrock['cache']?.get(cacheKey);
    
    if (cached) {
      console.log('Suggestions cache hit');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: cached as string,
      };
    }

    // Generate suggestions using Claude 3
    const prompt = `Given this partial search query from a developer searching a technical library, suggest 5 complete search queries they might be looking for.

Partial query: "${partialQuery}"

Provide suggestions that are:
1. Relevant to technical/programming topics
2. Complete, natural search queries
3. Progressively more specific
4. Diverse in scope

Return only the suggestions as a JSON array of strings, nothing else.`;

    const response = await cachedBedrock.invokeStructured<string[]>(prompt, {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 5,
    });

    const result = {
      suggestions: response,
      query: partialQuery,
    };

    // Cache for 1 hour (if cache is available)
    try {
      await cachedBedrock['cache']?.set(cacheKey, JSON.stringify(result), 3600);
    } catch (error) {
      console.error('Cache set error:', error);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Suggestions error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to generate suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
