import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3Client = new S3Client({});

const QUIZZES_TABLE = process.env.QUIZZES_TABLE || 'Quizzes';
const QUIZ_ATTEMPTS_TABLE = process.env.QUIZ_ATTEMPTS_TABLE || 'QuizAttempts';
const BOOKS_TABLE = process.env.BOOKS_TABLE || 'Books';
const BOOKS_BUCKET = process.env.BOOKS_BUCKET || 'ai-library-books';

interface Quiz {
  quizId: string;
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  questions: Question[];
  timeLimit: number;
  passingScore: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: string;
}

interface Question {
  questionId: string;
  questionText: string;
  questionType: 'conceptual' | 'code' | 'scenario' | 'best_practice' | 'comparison';
  codeSnippet?: string;
  options: QuestionOption[];
  correctAnswer: string;
  topic: string;
  difficulty: number;
  explanation: string;
}

interface QuestionOption {
  optionId: string;
  text: string;
}

interface QuizAttempt {
  attemptId: string;
  quizId: string;
  userId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  answers: any[];
  weakAreas: string[];
  recommendation: string;
  passed: boolean;
  completedAt: string;
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

    // Generate quiz
    if (method === 'POST' && path === '/quiz/generate') {
      const body = JSON.parse(event.body || '{}');
      return await generateQuiz(userId, body, headers);
    }

    // Get quiz
    if (method === 'GET' && path.match(/\/quiz\/[^/]+$/)) {
      const quizId = path.split('/').pop()!;
      return await getQuiz(quizId, headers);
    }

    // Submit quiz
    if (method === 'POST' && path.match(/\/quiz\/[^/]+\/submit$/)) {
      const quizId = path.split('/')[path.split('/').length - 2];
      const body = JSON.parse(event.body || '{}');
      return await submitQuiz(quizId, userId, body, headers);
    }

    // Get quiz history
    if (method === 'GET' && path === '/quiz/history') {
      const bookId = event.queryStringParameters?.bookId;
      return await getQuizHistory(userId, bookId, headers);
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

async function generateQuiz(userId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const { bookId, chapterId, difficulty = 'intermediate' } = data;

  // Get book and chapter
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
  const chapter = book.chapters.find((c: any) => c.chapterId === chapterId);

  if (!chapter) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Chapter not found' })
    };
  }

  // Get chapter content
  const s3Result = await s3Client.send(new GetObjectCommand({
    Bucket: BOOKS_BUCKET,
    Key: chapter.s3Key
  }));

  const chapterContent = await s3Result.Body?.transformToString() || '';

  // Generate quiz using Claude 3
  const prompt = `Generate a 5-question multiple-choice quiz for this technical chapter.

Chapter: ${chapter.title}
Content: ${chapterContent.substring(0, 3000)}

User skill level: ${difficulty}

Requirements:
1. Generate exactly 5 questions
2. Mix question types: 2 conceptual, 1 code comprehension, 1 scenario-based, 1 best practice
3. Each question must have exactly 4 options (A, B, C, D)
4. Only one correct answer per question
5. Generate plausible distractors based on common misconceptions
6. Include explanations for correct answers
7. Identify the topic for each question

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "questionText": "string",
      "questionType": "conceptual|code|scenario|best_practice|comparison",
      "codeSnippet": "string or null",
      "options": [
        {"optionId": "A", "text": "string"},
        {"optionId": "B", "text": "string"},
        {"optionId": "C", "text": "string"},
        {"optionId": "D", "text": "string"}
      ],
      "correctAnswer": "A|B|C|D",
      "explanation": "string",
      "topic": "string",
      "difficulty": 1-5
    }
  ]
}`;

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  }));

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const generatedText = responseBody.content[0].text;

  // Extract JSON from response
  const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse quiz JSON from AI response');
  }

  const quizData = JSON.parse(jsonMatch[0]);

  // Create quiz
  const quizId = `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const questions: Question[] = quizData.questions.map((q: any, index: number) => ({
    questionId: `q${index + 1}`,
    questionText: q.questionText,
    questionType: q.questionType,
    codeSnippet: q.codeSnippet,
    options: q.options,
    correctAnswer: q.correctAnswer,
    topic: q.topic,
    difficulty: q.difficulty || 3,
    explanation: q.explanation
  }));

  const quiz: Quiz = {
    quizId,
    bookId,
    chapterId,
    chapterTitle: chapter.title,
    questions,
    timeLimit: 600, // 10 minutes
    passingScore: 60,
    difficulty: difficulty as any,
    createdAt: now
  };

  await docClient.send(new PutCommand({
    TableName: QUIZZES_TABLE,
    Item: quiz
  }));

  // Return quiz without correct answers
  const quizForUser = {
    ...quiz,
    questions: quiz.questions.map(q => ({
      questionId: q.questionId,
      questionText: q.questionText,
      questionType: q.questionType,
      codeSnippet: q.codeSnippet,
      options: q.options,
      topic: q.topic
    }))
  };

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ quiz: quizForUser })
  };
}

async function getQuiz(quizId: string, headers: any): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new GetCommand({
    TableName: QUIZZES_TABLE,
    Key: { quizId }
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Quiz not found' })
    };
  }

  const quiz = result.Item;

  // Return quiz without correct answers
  const quizForUser = {
    ...quiz,
    questions: quiz.questions.map((q: Question) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      questionType: q.questionType,
      codeSnippet: q.codeSnippet,
      options: q.options,
      topic: q.topic
    }))
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ quiz: quizForUser })
  };
}

async function submitQuiz(quizId: string, userId: string, data: any, headers: any): Promise<APIGatewayProxyResult> {
  const { answers, timeSpent } = data;

  // Get quiz
  const quizResult = await docClient.send(new GetCommand({
    TableName: QUIZZES_TABLE,
    Key: { quizId }
  }));

  if (!quizResult.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Quiz not found' })
    };
  }

  const quiz = quizResult.Item as Quiz;

  // Grade quiz
  let correctAnswers = 0;
  const results: any[] = [];
  const weakTopics: Set<string> = new Set();

  quiz.questions.forEach((question) => {
    const userAnswer = answers[question.questionId];
    const isCorrect = userAnswer === question.correctAnswer;

    if (isCorrect) {
      correctAnswers++;
    } else {
      weakTopics.add(question.topic);
    }

    results.push({
      questionId: question.questionId,
      isCorrect,
      selectedAnswer: userAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topic: question.topic
    });
  });

  const score = (correctAnswers / quiz.questions.length) * 100;
  const passed = score >= quiz.passingScore;
  const weakAreas = Array.from(weakTopics);

  // Generate recommendation
  let recommendation = '';
  if (passed) {
    recommendation = score >= 90 
      ? 'Excellent work! You have a strong understanding of this chapter.'
      : 'Good job! Consider reviewing the topics you missed to strengthen your knowledge.';
  } else {
    recommendation = `You should review the following topics: ${weakAreas.join(', ')}. Try re-reading those sections and take the quiz again.`;
  }

  // Save attempt
  const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const attempt: QuizAttempt = {
    attemptId,
    quizId,
    userId,
    score,
    correctAnswers,
    totalQuestions: quiz.questions.length,
    timeSpent: timeSpent || 0,
    answers: results,
    weakAreas,
    recommendation,
    passed,
    completedAt: now
  };

  await docClient.send(new PutCommand({
    TableName: QUIZ_ATTEMPTS_TABLE,
    Item: attempt
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      result: {
        score,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        passed,
        results,
        weakAreas,
        recommendation,
        timeSpent
      }
    })
  };
}

async function getQuizHistory(userId: string, bookId: string | undefined, headers: any): Promise<APIGatewayProxyResult> {
  const params: any = {
    TableName: QUIZ_ATTEMPTS_TABLE,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false
  };

  const result = await docClient.send(new QueryCommand(params));
  let attempts = result.Items || [];

  // Filter by bookId if provided
  if (bookId) {
    const quizIds = new Set<string>();
    
    // Get all quizzes for this book
    const quizzesResult = await docClient.send(new QueryCommand({
      TableName: QUIZZES_TABLE,
      IndexName: 'BookIdIndex',
      KeyConditionExpression: 'bookId = :bookId',
      ExpressionAttributeValues: {
        ':bookId': bookId
      }
    }));

    (quizzesResult.Items || []).forEach((quiz: any) => quizIds.add(quiz.quizId));
    
    attempts = attempts.filter((attempt: any) => quizIds.has(attempt.quizId));
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ attempts })
  };
}
