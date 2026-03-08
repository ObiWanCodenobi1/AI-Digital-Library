import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateBookId, generateUploadId, generatePdfS3Key } from '../utils/upload-utils';

const s3Client = new S3Client({});
const BOOKS_BUCKET = process.env.BOOKS_BUCKET || 'ai-library-books';
const PRESIGNED_URL_EXPIRATION = 3600; // 1 hour in seconds

interface BookMetadata {
  title: string;
  author: string;
  description: string;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  publicationYear?: number;
  coverImage?: string;
}

interface InitiateUploadRequest {
  filename: string;
  fileSize: number;
  metadata: BookMetadata;
}

interface InitiateUploadResponse {
  uploadId: string;
  bookId: string;
  presignedUrl: string;
  expiresIn: number;
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

    // POST /upload/initiate - Initiate upload and generate presigned URL
    if (method === 'POST' && path === '/upload/initiate') {
      return await initiateUpload(event, headers);
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

async function initiateUpload(
  event: APIGatewayProxyEvent,
  headers: any
): Promise<APIGatewayProxyResult> {
  // Parse request body
  const body: InitiateUploadRequest = JSON.parse(event.body || '{}');

  // Validate incoming metadata
  const validationError = validateMetadata(body);
  if (validationError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        message: 'Validation failed',
        error: validationError
      })
    };
  }

  // Generate unique IDs
  const bookId = generateBookId();
  const uploadId = generateUploadId();

  // Generate S3 key for the PDF
  const s3Key = generatePdfS3Key(bookId);

  // Generate presigned URL for S3 upload
  const command = new PutObjectCommand({
    Bucket: BOOKS_BUCKET,
    Key: s3Key,
    ContentType: 'application/pdf'
  });

  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRATION
  });

  // Return upload session data
  const response: InitiateUploadResponse = {
    uploadId,
    bookId,
    presignedUrl,
    expiresIn: PRESIGNED_URL_EXPIRATION
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

export function validateMetadata(request: InitiateUploadRequest): string | null {
  // Validate required fields exist
  if (!request.filename) {
    return 'filename is required';
  }

  if (!request.fileSize || typeof request.fileSize !== 'number') {
    return 'fileSize is required and must be a number';
  }

  if (!request.metadata) {
    return 'metadata is required';
  }

  const { metadata } = request;

  // Validate required metadata fields
  if (!metadata.title || typeof metadata.title !== 'string' || metadata.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }

  if (!metadata.author || typeof metadata.author !== 'string' || metadata.author.trim() === '') {
    return 'author is required and must be a non-empty string';
  }

  if (!metadata.description || typeof metadata.description !== 'string' || metadata.description.trim() === '') {
    return 'description is required and must be a non-empty string';
  }

  // Validate topics array
  if (!Array.isArray(metadata.topics)) {
    return 'topics must be an array';
  }

  // Validate difficulty
  const validDifficulties = ['beginner', 'intermediate', 'advanced'];
  if (!metadata.difficulty || !validDifficulties.includes(metadata.difficulty)) {
    return 'difficulty must be one of: beginner, intermediate, advanced';
  }

  // Validate optional publication year
  if (metadata.publicationYear !== undefined) {
    if (typeof metadata.publicationYear !== 'number' || 
        metadata.publicationYear < 1000 || 
        metadata.publicationYear > new Date().getFullYear()) {
      return `publicationYear must be a number between 1000 and ${new Date().getFullYear()}`;
    }
  }

  // Validate optional cover image URL
  if (metadata.coverImage !== undefined) {
    if (typeof metadata.coverImage !== 'string' || 
        !(metadata.coverImage.startsWith('http://') || metadata.coverImage.startsWith('https://'))) {
      return 'coverImage must be a valid URL starting with http:// or https://';
    }
  }

  return null;
}
