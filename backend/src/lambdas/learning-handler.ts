import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const LEARNING_SESSIONS_TABLE = process.env.LEARNING_SESSIONS_TABLE || 'LearningSessions';
const NOTES_TABLE = process.env.NOTES_TABLE || 'Notes';
const BOOKMARKS_TABLE = process.env.BOOKMARKS_TABLE || 'Bookmarks';
const BOOKS_TABLE = process.env.BOOKS_TABLE || 'Books';

interface LearningSession {
  sessionId: string;
  userId: string;
  bookId: string;
  startedAt: string;
  currentChapter: string;
  overallProgress: number;
  knowledgeLevel: 'beginner' | 'intermediate' | 'advanced';
  completedChapters: string[];
  timeSpent: number;
}

interface Note {
  noteId: string;
  userId: string;
  bookId: string;
  chapterId: string;
  location: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Bookmark {
  bookmarkId: string;
  userId: string;
  bookId: string;
  chapterId: string;
  location: string;
  title: string;
  createdAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  try {
    const path = event.path;
    const method = event.httpMethod;
    const userId = event.requestContext.authorizer?.claims?.sub || 'anonymous';

    // Start learning session
    if (method === 'POST' && path.match(/\/learning\/sessions$/)) {
      const body = JSON.parse(event.body || '{}');
      return await startLearningSession(userId, body, headers);
    }

    // Get learning session
    if (method === 'GET' && path.match(/\/learning\/sessions\/[^/]+$/)) {
      const sessionId = path.split('/').pop()!;
      return await getLearningSession(sessionId, headers);
    }

    // Update progress
    if (method === 'PUT' && path.match(/\/learning\/sessions\/[^/]+\/progress$/)) {
      const sessionId = path.split('/')[path.split('/').length - 2];
      const body = JSON.parse(event.body || '{}');
      return await updateProgress(sessionId, body, headers);
    }

    // Get AI assistance
    if (method === 'POST' && path.match(/\/learning\/sessions\/[^/]+\/assistance$/)) {
      const sessionId = path.split('/')[path.split('/').length - 2];
      const body = JSON.parse(event.body || '{}');
      return await getAssistance(sessionId, body, headers);
    }

    // Get summary
    if (method === 'POST' && path.match(/\/learning\/sessions\/[^/]+\/summary$/)) {
      const sessionId = path.split('/')[path.split('/').length - 2];
      const body = JSON.parse(event.body || '{}');
      return await getSummary(sessionId, body, headers);
    }

    // Notes CRUD
    if (method === 'POST' && path === '/notes') {
      const body = JSON.parse(event.body || '{}');
      return await createNote(userId, body, headers);
    }

    if (method === 'GET' && path.match(/\/notes$/)) {
      const bookId = event.queryStringParameters?.bookId;
      return await getNotes(userId, bookId, headers);
    }

    if (method === 'PUT' && path.match(/\/notes\/[^/]+$/)) {
      const noteId = path.split('/').pop()!;
      const body = JSON.parse(event.body || '{}');
      return await updateNote(noteId, userId, body, headers);
    }

    if (method === 'DELETE' && path.match(/\/notes\/[^/]+$/)) {
      const noteId = path.split('/').pop()!;
      return await deleteNote(noteId, userId, headers);
    }

    // Bookmarks CRUD
    if (method === 'POST' && path === '/bookmarks') {
      const body = JSON.parse(event.body || '{}');
      return await createBookmark(userId, body, headers);
    }

    if (method === 'GET' && path.match(/\/bookmarks$/)) {
      const bookId = event.queryStringParameters?.bookId;
      return await getBookmarks(userId, bookId, headers);
    }

    if (method === 'DELETE' && path.match(/\/bookmarks\/[^/]+$/)) {
      const bookmarkId = path.split('/').pop()!;
      return await deleteBookmark(bookmarkId, userId, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Not found' })
    };

  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message 
      })
    };
  }
};

async function startLearningSession(userId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const session: LearningSession = {
    sessionId,
    userId,
    bookId: data.bookId,
    startedAt: now,
    currentChapter: data.currentChapter || '',
    overallProgress: 0,
    knowledgeLevel: data.knowledgeLevel || 'intermediate',
    completedChapters: [],
    timeSpent: 0
  };

  await docClient.send(new PutCommand({
    TableName: LEARNING_SESSIONS_TABLE,
    Item: session
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ session })
  };
}

async function getLearningSession(sessionId: string, headers: any): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new GetCommand({
    TableName: LEARNING_SESSIONS_TABLE,
    Key: { sessionId }
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Session not found' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ session: result.Item })
  };
}

async function updateProgress(sessionId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const session = await docClient.send(new GetCommand({
    TableName: LEARNING_SESSIONS_TABLE,
    Key: { sessionId }
  }));

  if (!session.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Session not found' })
    };
  }

  const completedChapters = data.chapterCompleted 
    ? [...new Set([...session.Item.completedChapters, data.chapterId])]
    : session.Item.completedChapters;

  await docClient.send(new UpdateCommand({
    TableName: LEARNING_SESSIONS_TABLE,
    Key: { sessionId },
    UpdateExpression: 'SET currentChapter = :chapter, overallProgress = :progress, completedChapters = :completed, timeSpent = :time',
    ExpressionAttributeValues: {
      ':chapter': data.chapterId || session.Item.currentChapter,
      ':progress': data.progress || session.Item.overallProgress,
      ':completed': completedChapters,
      ':time': (session.Item.timeSpent || 0) + (data.timeSpent || 0)
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Progress updated' })
  };
}

async function getAssistance(sessionId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const session = await docClient.send(new GetCommand({
    TableName: LEARNING_SESSIONS_TABLE,
    Key: { sessionId }
  }));

  if (!session.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Session not found' })
    };
  }

  const prompt = `You are a helpful learning assistant. The user is reading a technical book and needs help understanding the following content.

User's knowledge level: ${session.Item.knowledgeLevel}
Context: ${data.context}

Provide a clear, simplified explanation that matches the user's knowledge level. Include examples if helpful.`;

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  }));

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const assistance = responseBody.content[0].text;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      assistance: {
        type: 'explanation',
        content: assistance,
        sources: []
      }
    })
  };
}

async function getSummary(sessionId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const session = await docClient.send(new GetCommand({
    TableName: LEARNING_SESSIONS_TABLE,
    Key: { sessionId }
  }));

  if (!session.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Session not found' })
    };
  }

  const prompt = `Create a personalized summary of the following chapter content for a ${session.Item.knowledgeLevel} level reader.

Chapter content: ${data.chapterContent}

Provide:
1. Key concepts (3-5 bullet points)
2. Important takeaways
3. Practical applications

Keep it concise and focused on what matters most.`;

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1500,
      temperature: 0.5,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  }));

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const summary = responseBody.content[0].text;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ summary })
  };
}

async function createNote(userId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const noteId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const note: Note = {
    noteId,
    userId,
    bookId: data.bookId,
    chapterId: data.chapterId,
    location: data.location,
    content: data.content,
    createdAt: now,
    updatedAt: now
  };

  await docClient.send(new PutCommand({
    TableName: NOTES_TABLE,
    Item: note
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ note })
  };
}

async function getNotes(userId: string, bookId: string | undefined, headers: any): Promise<APIGatewayProxyResult> {
  const params: any = {
    TableName: NOTES_TABLE,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  };

  if (bookId) {
    params.FilterExpression = 'bookId = :bookId';
    params.ExpressionAttributeValues[':bookId'] = bookId;
  }

  const result = await docClient.send(new QueryCommand(params));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ notes: result.Items || [] })
  };
}

async function updateNote(noteId: string, userId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: NOTES_TABLE,
    Key: { noteId },
    UpdateExpression: 'SET content = :content, updatedAt = :updated',
    ConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':content': data.content,
      ':updated': now,
      ':userId': userId
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Note updated' })
  };
}

async function deleteNote(noteId: string, userId: string, headers: any): Promise<APIGatewayProxyResult> {
  await docClient.send(new DeleteCommand({
    TableName: NOTES_TABLE,
    Key: { noteId },
    ConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Note deleted' })
  };
}

async function createBookmark(userId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const bookmarkId = `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const bookmark: Bookmark = {
    bookmarkId,
    userId,
    bookId: data.bookId,
    chapterId: data.chapterId,
    location: data.location,
    title: data.title,
    createdAt: now
  };

  await docClient.send(new PutCommand({
    TableName: BOOKMARKS_TABLE,
    Item: bookmark
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ bookmark })
  };
}

async function getBookmarks(userId: string, bookId: string | undefined, headers: any): Promise<APIGatewayProxyResult> {
  const params: any = {
    TableName: BOOKMARKS_TABLE,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  };

  if (bookId) {
    params.FilterExpression = 'bookId = :bookId';
    params.ExpressionAttributeValues[':bookId'] = bookId;
  }

  const result = await docClient.send(new QueryCommand(params));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ bookmarks: result.Items || [] })
  };
}

async function deleteBookmark(bookmarkId: string, userId: string, headers: any): Promise<APIGatewayProxyResult> {
  await docClient.send(new DeleteCommand({
    TableName: BOOKMARKS_TABLE,
    Key: { bookmarkId },
    ConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Bookmark deleted' })
  };
}
