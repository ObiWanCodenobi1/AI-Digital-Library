import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const BOOKS_TABLE = process.env.BOOKS_TABLE || 'Books';
const READING_PROGRESS_TABLE = process.env.READING_PROGRESS_TABLE || 'ReadingProgress';
const USER_PREFERENCES_TABLE = process.env.USER_PREFERENCES_TABLE || 'UserPreferences';
const BOOKS_BUCKET = process.env.BOOKS_BUCKET || 'ai-library-books';

interface Book {
  bookId: string;
  title: string;
  author: string;
  description: string;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  publicationYear?: number;
  coverImage?: string;
  s3Key: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

interface Chapter {
  chapterId: string;
  chapterNumber: number;
  title: string;
  s3Key: string;
  pageCount: number;
}

interface ReadingProgress {
  userId: string;
  bookId: string;
  chapterId: string;
  position: number;
  percentage: number;
  lastReadAt: string;
}

interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily?: string;
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

    // Get book by ID
    if (method === 'GET' && path.match(/\/books\/[^/]+$/)) {
      const bookId = path.split('/').pop()!;
      return await getBook(bookId, headers);
    }

    // Get chapter content
    if (method === 'GET' && path.match(/\/books\/[^/]+\/chapters\/[^/]+$/)) {
      const parts = path.split('/');
      const bookId = parts[parts.length - 3];
      const chapterId = parts[parts.length - 1];
      return await getChapterContent(bookId, chapterId, headers);
    }

    // Get reading progress
    if (method === 'GET' && path.match(/\/books\/[^/]+\/progress$/)) {
      const bookId = path.split('/')[path.split('/').length - 2];
      return await getReadingProgress(userId, bookId, headers);
    }

    // Update reading progress
    if (method === 'PUT' && path.match(/\/books\/[^/]+\/progress$/)) {
      const bookId = path.split('/')[path.split('/').length - 2];
      const body = JSON.parse(event.body || '{}');
      return await updateReadingProgress(userId, bookId, body, headers);
    }

    // Get user preferences
    if (method === 'GET' && path === '/preferences') {
      return await getUserPreferences(userId, headers);
    }

    // Update user preferences
    if (method === 'PUT' && path === '/preferences') {
      const body = JSON.parse(event.body || '{}');
      return await updateUserPreferences(userId, body, headers);
    }

    // Upload book (admin only)
    if (method === 'POST' && path === '/books') {
      const body = JSON.parse(event.body || '{}');
      return await uploadBook(body, headers);
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

async function getBook(bookId: string, headers: any): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new GetCommand({
    TableName: BOOKS_TABLE,
    Key: { bookId }
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Book not found' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ book: result.Item })
  };
}

async function getChapterContent(bookId: string, chapterId: string, headers: any): Promise<APIGatewayProxyResult> {
  // Get book metadata to find chapter S3 key
  const bookResult = await docClient.send(new GetCommand({
    TableName: BOOKS_TABLE,
    Key: { bookId }
  }));

  if (!bookResult.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Book not found' })
    };
  }

  const book = bookResult.Item as Book;
  const chapter = book.chapters.find(c => c.chapterId === chapterId);

  if (!chapter) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Chapter not found' })
    };
  }

  // Get chapter content from S3
  const s3Result = await s3Client.send(new GetObjectCommand({
    Bucket: BOOKS_BUCKET,
    Key: chapter.s3Key
  }));

  const content = await s3Result.Body?.transformToString();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      chapter: {
        ...chapter,
        content
      }
    })
  };
}

async function getReadingProgress(userId: string, bookId: string, headers: any): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new GetCommand({
    TableName: READING_PROGRESS_TABLE,
    Key: { userId, bookId }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      progress: result.Item || {
        userId,
        bookId,
        chapterId: null,
        position: 0,
        percentage: 0
      }
    })
  };
}

async function updateReadingProgress(
  userId: string, 
  bookId: string, 
  data: Partial<ReadingProgress>,
  headers: any
): Promise<APIGatewayProxyResult> {
  const now = new Date().toISOString();

  await docClient.send(new PutCommand({
    TableName: READING_PROGRESS_TABLE,
    Item: {
      userId,
      bookId,
      chapterId: data.chapterId,
      position: data.position || 0,
      percentage: data.percentage || 0,
      lastReadAt: now
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      message: 'Progress updated',
      progress: {
        userId,
        bookId,
        chapterId: data.chapterId,
        position: data.position,
        percentage: data.percentage,
        lastReadAt: now
      }
    })
  };
}

async function getUserPreferences(userId: string, headers: any): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new GetCommand({
    TableName: USER_PREFERENCES_TABLE,
    Key: { userId }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      preferences: result.Item || {
        userId,
        theme: 'light',
        fontSize: 'medium'
      }
    })
  };
}

async function updateUserPreferences(
  userId: string,
  data: Partial<UserPreferences>,
  headers: any
): Promise<APIGatewayProxyResult> {
  await docClient.send(new PutCommand({
    TableName: USER_PREFERENCES_TABLE,
    Item: {
      userId,
      theme: data.theme || 'light',
      fontSize: data.fontSize || 'medium',
      fontFamily: data.fontFamily
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      message: 'Preferences updated',
      preferences: {
        userId,
        theme: data.theme,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily
      }
    })
  };
}

async function uploadBook(data: any, headers: any): Promise<APIGatewayProxyResult> {
  const bookId = `book-${Date.now()}`;
  const now = new Date().toISOString();

  const book: Book = {
    bookId,
    title: data.title,
    author: data.author,
    description: data.description,
    topics: data.topics || [],
    difficulty: data.difficulty || 'intermediate',
    publicationYear: data.publicationYear,
    coverImage: data.coverImage,
    s3Key: `books/${bookId}/content.json`,
    chapters: data.chapters || [],
    createdAt: now,
    updatedAt: now
  };

  await docClient.send(new PutCommand({
    TableName: BOOKS_TABLE,
    Item: book
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ 
      message: 'Book uploaded successfully',
      book
    })
  };
}
