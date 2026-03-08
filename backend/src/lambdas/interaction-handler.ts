import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface InteractionEvent {
  userId: string;
  bookId: string;
  interactionType: 'click' | 'view' | 'save' | 'complete';
  searchQuery?: string;
  timestamp: string;
  timeSpent?: number; // seconds
  metadata?: Record<string, any>;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body: InteractionEvent = JSON.parse(event.body || '{}');
    const { userId, bookId, interactionType, searchQuery, timeSpent, metadata } = body;

    if (!userId || !bookId || !interactionType) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing required fields: userId, bookId, interactionType',
        }),
      };
    }

    const timestamp = new Date().toISOString();

    // Record interaction in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: process.env.INTERACTIONS_TABLE || 'Interactions',
        Item: {
          userId,
          timestamp,
          bookId,
          interactionType,
          searchQuery,
          timeSpent,
          metadata,
        },
      })
    );

    // Update user profile interaction scores
    const scoreIncrement = calculateScoreIncrement(interactionType, timeSpent);
    
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.USERS_TABLE || 'Users',
        Key: { userId },
        UpdateExpression: 'ADD #scores.#bookId :increment',
        ExpressionAttributeNames: {
          '#scores': 'interactionScores',
          '#bookId': bookId,
        },
        ExpressionAttributeValues: {
          ':increment': scoreIncrement,
        },
      })
    );

    // Update book popularity metrics
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.BOOKS_TABLE || 'Books',
        Key: { bookId },
        UpdateExpression: 'ADD #clicks :one, #views :views',
        ExpressionAttributeNames: {
          '#clicks': 'totalClicks',
          '#views': 'totalViews',
        },
        ExpressionAttributeValues: {
          ':one': 1,
          ':views': interactionType === 'view' ? 1 : 0,
        },
      })
    );

    console.log('Interaction recorded:', { userId, bookId, interactionType });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        scoreIncrement,
      }),
    };
  } catch (error) {
    console.error('Interaction tracking error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to record interaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

function calculateScoreIncrement(
  interactionType: string,
  timeSpent?: number
): number {
  let score = 0;

  switch (interactionType) {
    case 'click':
      score = 0.1;
      break;
    case 'view':
      score = 0.2;
      break;
    case 'save':
      score = 0.3;
      break;
    case 'complete':
      score = 0.5;
      break;
  }

  // Add time-based boost (up to 0.2 for 30+ minutes)
  if (timeSpent) {
    const timeBoost = Math.min(timeSpent / 1800, 0.2);
    score += timeBoost;
  }

  return Math.min(score, 1.0);
}
