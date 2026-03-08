import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const BOOKS_TABLE = process.env.BOOKS_TABLE || 'Books';
const SAVED_REFERENCES_TABLE = process.env.SAVED_REFERENCES_TABLE || 'SavedReferences';
const BOOKS_BUCKET = process.env.BOOKS_BUCKET || 'ai-library-books';

interface SearchResult {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  section: string;
  content: string;
  context: string;
  relevanceScore: number;
}

interface SavedReference {
  referenceId: string;
  userId: string;
  bookId: string;
  chapterId: string;
  section: string;
  title: string;
  content: string;
  createdAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
  };

  try {
    const path = event.path;
    const method = event.httpMethod;
    const userId = event.requestContext.authorizer?.claims?.sub || 'anonymous';

    // Search within a book
    if (method === 'GET' && path.match(/\/books\/[^/]+\/search$/)) {
      const bookId = path.split('/')[path.split('/').length - 2];
      const query = event.queryStringParameters?.q || '';
      return await searchInBook(bookId, query, headers);
    }

    // Cross-book search
    if (method === 'GET' && path === '/reference/search') {
      const query = event.queryStringParameters?.q || '';
      const bookIds = event.queryStringParameters?.bookIds?.split(',');
      return await crossBookSearch(query, bookIds, headers);
    }

    // Get AI answer with citations
    if (method === 'POST' && path === '/reference/answer') {
      const body = JSON.parse(event.body || '{}');
      return await getAIAnswer(body, headers);
    }

    // Save reference
    if (method === 'POST' && path === '/reference/saved') {
      const body = JSON.parse(event.body || '{}');
      return await saveReference(userId, body, headers);
    }

    // Get saved references
    if (method === 'GET' && path === '/reference/saved') {
      return await getSavedReferences(userId, headers);
    }

    // Delete saved reference
    if (method === 'DELETE' && path.match(/\/reference\/saved\/[^/]+$/)) {
      const referenceId = path.split('/').pop()!;
      return await deleteSavedReference(referenceId, userId, headers);
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

async function searchInBook(bookId: string, query: string, headers: any): Promise<APIGatewayProxyResult> {
  if (!query) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Query parameter required' })
    };
  }

  // Get book metadata
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

  const book = bookResult.Item;
  const results: SearchResult[] = [];

  // Search through chapters
  for (const chapter of book.chapters) {
    try {
      const s3Result = await s3Client.send(new GetObjectCommand({
        Bucket: BOOKS_BUCKET,
        Key: chapter.s3Key
      }));

      const content = await s3Result.Body?.transformToString() || '';
      
      // Simple text search with context
      const lowerContent = content.toLowerCase();
      const lowerQuery = query.toLowerCase();
      let index = lowerContent.indexOf(lowerQuery);

      while (index !== -1) {
        const contextStart = Math.max(0, index - 150);
        const contextEnd = Math.min(content.length, index + query.length + 150);
        const context = content.substring(contextStart, contextEnd);

        // Extract section title (simplified)
        const sectionMatch = content.substring(Math.max(0, index - 500), index).match(/##\s+(.+)/);
        const section = sectionMatch ? sectionMatch[1] : 'Content';

        results.push({
          bookId,
          bookTitle: book.title,
          chapterId: chapter.chapterId,
          chapterTitle: chapter.title,
          section,
          content: content.substring(index, Math.min(content.length, index + 500)),
          context: '...' + context + '...',
          relevanceScore: 0.8
        });

        index = lowerContent.indexOf(lowerQuery, index + 1);
        
        // Limit results per chapter
        if (results.length >= 10) break;
      }
    } catch (err) {
      console.error(`Error searching chapter ${chapter.chapterId}:`, err);
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      results: results.slice(0, 20),
      total: results.length
    })
  };
}

async function crossBookSearch(query: string, bookIds: string[] | undefined, headers: any): Promise<APIGatewayProxyResult> {
  if (!query) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Query parameter required' })
    };
  }

  const allResults: SearchResult[] = [];

  // If no specific books, search all (in production, this would be limited)
  const booksToSearch = bookIds || [];

  for (const bookId of booksToSearch) {
    const bookResults = await searchInBook(bookId, query, headers);
    const parsed = JSON.parse(bookResults.body);
    if (parsed.results) {
      allResults.push(...parsed.results);
    }
  }

  // Sort by relevance
  allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      results: allResults.slice(0, 30),
      total: allResults.length
    })
  };
}

async function getAIAnswer(data: any, headers: any): Promise<APIGatewayProxyResult> {
  const { question, bookId, context } = data;

  if (!question) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Question required' })
    };
  }

  // Search for relevant content
  const searchResults = await searchInBook(bookId, question, headers);
  const parsed = JSON.parse(searchResults.body);
  const relevantSections = parsed.results?.slice(0, 3) || [];

  const contextText = relevantSections
    .map((r: SearchResult) => `[${r.chapterTitle} - ${r.section}]\n${r.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are a technical reference assistant. Answer the following question using ONLY the provided context from the book.

Question: ${question}

Context from the book:
${contextText}

${context ? `Additional context: ${context}` : ''}

Provide a clear, accurate answer with specific citations (chapter and section). If the answer requires code examples, include them. If the information is not in the provided context, say so.`;

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  }));

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const answer = responseBody.content[0].text;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      answer,
      citations: relevantSections.map((r: SearchResult) => ({
        bookTitle: r.bookTitle,
        chapterTitle: r.chapterTitle,
        section: r.section
      })),
      relatedSections: relevantSections
    })
  };
}

async function saveReference(userId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const referenceId = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const reference: SavedReference = {
    referenceId,
    userId,
    bookId: data.bookId,
    chapterId: data.chapterId,
    section: data.section,
    title: data.title,
    content: data.content,
    createdAt: now
  };

  await docClient.send(new PutCommand({
    TableName: SAVED_REFERENCES_TABLE,
    Item: reference
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ reference })
  };
}

async function getSavedReferences(userId: string, headers: any): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new QueryCommand({
    TableName: SAVED_REFERENCES_TABLE,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ references: result.Items || [] })
  };
}

async function deleteSavedReference(referenceId: string, userId: string, headers: any): Promise<APIGatewayProxyResult> {
  await docClient.send(new DeleteCommand({
    TableName: SAVED_REFERENCES_TABLE,
    Key: { referenceId },
    ConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Reference deleted' })
  };
}
