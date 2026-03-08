// backend/src/lambdas/bedrock-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CachedBedrockService } from '../services/bedrock/cached-bedrock-service';

const bedrockService = new CachedBedrockService(
  process.env.AWS_REGION || 'us-east-1',
  process.env.REDIS_URL || 'redis://localhost:6379'
);

let initialized = false;

/**
 * Lambda handler for Bedrock operations
 * Supports: generateEmbedding, invokeModel, invokeStructured
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Initialize on cold start
  if (!initialized) {
    try {
      await bedrockService.initialize();
      initialized = true;
    } catch (error: any) {
      console.error('Failed to initialize Bedrock service:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Service initialization failed' }),
      };
    }
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, text, prompt, schema, options } = body;

    let result;

    switch (action) {
      case 'generateEmbedding':
        if (!text) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required field: text' }),
          };
        }
        result = await bedrockService.generateEmbedding(text, options);
        break;

      case 'invokeModel':
        if (!prompt) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required field: prompt' }),
          };
        }
        result = await bedrockService.invokeModel(prompt, options);
        break;

      case 'invokeStructured':
        if (!prompt || !schema) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required fields: prompt, schema' }),
          };
        }
        result = await bedrockService.invokeStructured(prompt, schema);
        break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Invalid action',
            validActions: ['generateEmbedding', 'invokeModel', 'invokeStructured']
          }),
        };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ result }),
    };
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
    };
  }
};
