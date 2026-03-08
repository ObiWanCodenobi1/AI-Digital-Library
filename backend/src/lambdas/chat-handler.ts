import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3Client = new S3Client({});

const CHAT_SESSIONS_TABLE = process.env.CHAT_SESSIONS_TABLE || 'ChatSessions';
const CHAT_MESSAGES_TABLE = process.env.CHAT_MESSAGES_TABLE || 'ChatMessages';
const BOOKS_TABLE = process.env.BOOKS_TABLE || 'Books';
const BOOKS_BUCKET = process.env.BOOKS_BUCKET || 'ai-library-books';

interface ChatSession {
  sessionId: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  startedAt: string;
  messageCount: number;
  language: string;
}

interface ChatMessage {
  messageId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: string;
}

interface Citation {
  chapterNumber: number;
  chapterTitle: string;
  sectionTitle: string;
  pageNumber: number;
  excerpt: string;
  relevanceScore: number;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };

  try {
    const path = event.path;
    const method = event.httpMethod;
    const userId = event.requestContext.authorizer?.claims?.sub || 'anonymous';

    // Start chat session
    if (method === 'POST' && path === '/chat/sessions') {
      const body = JSON.parse(event.body || '{}');
      return await startChatSession(userId, body, headers);
    }

    // Get chat session
    if (method === 'GET' && path.match(/\/chat\/sessions\/[^/]+$/)) {
      const sessionId = path.split('/').pop()!;
      return await getChatSession(sessionId, headers);
    }

    // Ask question
    if (method === 'POST' && path.match(/\/chat\/sessions\/[^/]+\/ask$/)) {
      const sessionId = path.split('/')[path.split('/').length - 2];
      const body = JSON.parse(event.body || '{}');
      return await askQuestion(sessionId, body, headers);
    }

    // Get chat history
    if (method === 'GET' && path.match(/\/chat\/sessions\/[^/]+\/history$/)) {
      const sessionId = path.split('/')[path.split('/').length - 2];
      return await getChatHistory(sessionId, headers);
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

async function startChatSession(userId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  // Get book info
  const bookResult = await docClient.send(new GetCommand({
    TableName: BOOKS_TABLE,
    Key: { bookId: data.bookId }
  }));

  if (!bookResult.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Book not found' })
    };
  }

  const session: ChatSession = {
    sessionId,
    userId,
    bookId: data.bookId,
    bookTitle: bookResult.Item.title,
    startedAt: now,
    messageCount: 0,
    language: data.language || 'en'
  };

  await docClient.send(new PutCommand({
    TableName: CHAT_SESSIONS_TABLE,
    Item: session
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ session })
  };
}

async function getChatSession(sessionId: string, headers: any): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new GetCommand({
    TableName: CHAT_SESSIONS_TABLE,
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

async function askQuestion(sessionId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const { question } = data;

  if (!question) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Question required' })
    };
  }

  // Get session
  const sessionResult = await docClient.send(new GetCommand({
    TableName: CHAT_SESSIONS_TABLE,
    Key: { sessionId }
  }));

  if (!sessionResult.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Session not found' })
    };
  }

  const session = sessionResult.Item as ChatSession;

  // Get chat history (last 10 messages)
  const historyResult = await docClient.send(new QueryCommand({
    TableName: CHAT_MESSAGES_TABLE,
    IndexName: 'SessionIdIndex',
    KeyConditionExpression: 'sessionId = :sessionId',
    ExpressionAttributeValues: {
      ':sessionId': sessionId
    },
    ScanIndexForward: false,
    Limit: 10
  }));

  const history = (historyResult.Items || []).reverse();

  // Get book content
  const bookResult = await docClient.send(new GetCommand({
    TableName: BOOKS_TABLE,
    Key: { bookId: session.bookId }
  }));

  if (!bookResult.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Book not found' })
    };
  }

  const book = bookResult.Item;

  // Retrieve relevant sections (simplified RAG - in production, use OpenSearch with embeddings)
  const relevantSections = await retrieveRelevantSections(book, question);

  // Build context from retrieved sections
  const context = relevantSections
    .map(section => `[Chapter ${section.chapterNumber}: ${section.chapterTitle}]
[Section: ${section.sectionTitle}]
[Page ${section.pageNumber}]

${section.content}`)
    .join('\n\n---\n\n');

  // Build conversation history
  const conversationHistory = history
    .map((msg: any) => `${msg.role}: ${msg.content}`)
    .join('\n');

  // Generate answer using Claude 3 with RAG
  const prompt = `You are a helpful assistant answering questions about the book "${session.bookTitle}".

CRITICAL RULES:
1. Use ONLY the provided context from the book to answer
2. If the answer is not in the context, say "This information is not covered in this book"
3. Include specific citations (chapter, section, page) in your answer
4. If code examples are relevant, include them in your answer
5. Be concise and accurate

Context from the book:
${context}

${conversationHistory ? `Conversation history:\n${conversationHistory}\n` : ''}

User question: ${question}

Provide a clear, accurate answer with citations.`;

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

  // Extract citations
  const citations: Citation[] = relevantSections.map(section => ({
    chapterNumber: section.chapterNumber,
    chapterTitle: section.chapterTitle,
    sectionTitle: section.sectionTitle,
    pageNumber: section.pageNumber,
    excerpt: section.content.substring(0, 200) + '...',
    relevanceScore: section.relevanceScore
  }));

  // Save messages
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await docClient.send(new PutCommand({
    TableName: CHAT_MESSAGES_TABLE,
    Item: {
      messageId: `${messageId}-user`,
      sessionId,
      role: 'user',
      content: question,
      timestamp: now
    }
  }));

  await docClient.send(new PutCommand({
    TableName: CHAT_MESSAGES_TABLE,
    Item: {
      messageId: `${messageId}-assistant`,
      sessionId,
      role: 'assistant',
      content: answer,
      citations,
      timestamp: now
    }
  }));

  // Update session message count
  await docClient.send(new UpdateCommand({
    TableName: CHAT_SESSIONS_TABLE,
    Key: { sessionId },
    UpdateExpression: 'SET messageCount = messageCount + :inc',
    ExpressionAttributeValues: {
      ':inc': 2
    }
  }));

  const processingTime = Date.now() - startTime;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      messageId,
      answer,
      citations,
      relevantSections: relevantSections.map(s => ({
        chapterTitle: s.chapterTitle,
        sectionTitle: s.sectionTitle,
        pageNumber: s.pageNumber
      })),
      confidence: calculateConfidence(relevantSections),
      processingTime
    })
  };
}

async function getChatHistory(sessionId: string, headers: any): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new QueryCommand({
    TableName: CHAT_MESSAGES_TABLE,
    IndexName: 'SessionIdIndex',
    KeyConditionExpression: 'sessionId = :sessionId',
    ExpressionAttributeValues: {
      ':sessionId': sessionId
    },
    ScanIndexForward: true
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ messages: result.Items || [] })
  };
}

async function retrieveRelevantSections(book: any, question: string): Promise<any[]> {
  // Simplified retrieval - in production, use OpenSearch with k-NN vector search
  const sections: any[] = [];
  const lowerQuestion = question.toLowerCase();

  for (const chapter of book.chapters.slice(0, 5)) {
    try {
      const s3Result = await s3Client.send(new GetObjectCommand({
        Bucket: BOOKS_BUCKET,
        Key: chapter.s3Key
      }));

      const content = await s3Result.Body?.transformToString() || '';
      
      // Simple keyword matching (in production, use embeddings)
      if (content.toLowerCase().includes(lowerQuestion.split(' ')[0])) {
        sections.push({
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.title,
          sectionTitle: 'Content',
          pageNumber: 1,
          content: content.substring(0, 1500),
          relevanceScore: 0.8
        });
      }

      if (sections.length >= 3) break;
    } catch (err) {
      console.error(`Error reading chapter ${chapter.chapterId}:`, err);
    }
  }

  return sections;
}

function calculateConfidence(sections: any[]): number {
  if (sections.length === 0) return 0;
  const avgScore = sections.reduce((sum, s) => sum + s.relevanceScore, 0) / sections.length;
  return Math.min(avgScore, 1);
}
