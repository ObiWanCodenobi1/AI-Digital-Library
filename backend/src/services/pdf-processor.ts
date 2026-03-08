/**
 * PDF Processing Service
 * Handles PDF text extraction, chapter splitting, and book metadata management
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
const pdfParse = require('pdf-parse');
import {
  generateChapterId,
  generateChapterTitle,
  generateChapterS3Key,
} from '../utils/upload-utils';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const BOOKS_BUCKET = process.env.BOOKS_BUCKET || 'ai-library-books';
const BOOKS_TABLE = process.env.BOOKS_TABLE || 'Books';

interface Chapter {
  chapterId: string;
  chapterNumber: number;
  title: string;
  s3Key: string;
  pageCount: number;
}

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
  pdfUrl: string;
  chapters: Chapter[];
  totalPages: number;
  createdAt: string;
  updatedAt: string;
}

interface BookMetadata {
  title: string;
  author: string;
  description: string;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  publicationYear?: number;
  coverImage?: string;
}

/**
 * Extracts text content from a PDF file stored in S3
 * 
 * @param s3Key - S3 key of the PDF file
 * @returns Extracted text content, or empty string if extraction fails
 */
export async function extractTextFromPDF(s3Key: string): Promise<string> {
  try {
    // Download PDF from S3
    const getCommand = new GetObjectCommand({
      Bucket: BOOKS_BUCKET,
      Key: s3Key,
    });
    
    const response = await s3Client.send(getCommand);
    
    if (!response.Body) {
      console.error('No body in S3 response');
      return '';
    }
    
    // Convert stream to buffer
    const pdfBuffer = await streamToBuffer(response.Body);
    
    // Extract text using pdf-parse
    const data = await pdfParse(pdfBuffer);
    
    return data.text || '';
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

/**
 * Gets the page count from a PDF file stored in S3
 * 
 * @param s3Key - S3 key of the PDF file
 * @returns Number of pages in the PDF
 */
export async function getPDFPageCount(s3Key: string): Promise<number> {
  try {
    // Download PDF from S3
    const getCommand = new GetObjectCommand({
      Bucket: BOOKS_BUCKET,
      Key: s3Key,
    });
    
    const response = await s3Client.send(getCommand);
    
    if (!response.Body) {
      console.error('No body in S3 response');
      return 1;
    }
    
    // Convert stream to buffer
    const pdfBuffer = await streamToBuffer(response.Body);
    
    // Extract page count using pdf-parse
    const data = await pdfParse(pdfBuffer);
    
    return data.numpages || 1;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    return 1;
  }
}

/**
 * Splits text content into chapters based on page count
 * 
 * @param text - Full text content to split
 * @param totalPages - Total number of pages in the PDF
 * @param pagesPerChapter - Number of pages per chapter (default: 10)
 * @returns Array of chapter text strings
 */
export function splitTextIntoChapters(
  text: string,
  totalPages: number,
  pagesPerChapter: number = 10
): string[] {
  // Calculate number of chapters
  const numChapters = Math.ceil(totalPages / pagesPerChapter);
  
  if (numChapters === 0) {
    return [''];
  }
  
  // If text is empty, return empty chapters
  if (!text || text.trim().length === 0) {
    return Array(numChapters).fill('');
  }
  
  // Split text into equal portions
  const chapterTexts: string[] = [];
  const textLength = text.length;
  const charsPerChapter = Math.ceil(textLength / numChapters);
  
  for (let i = 0; i < numChapters; i++) {
    const start = i * charsPerChapter;
    const end = Math.min(start + charsPerChapter, textLength);
    chapterTexts.push(text.slice(start, end));
  }
  
  return chapterTexts;
}

/**
 * Uploads chapter texts to S3 and creates chapter metadata
 * 
 * @param bookId - Unique book identifier
 * @param chapterTexts - Array of chapter text content
 * @param totalPages - Total number of pages in the PDF
 * @returns Array of chapter objects with metadata
 */
export async function uploadChapters(
  bookId: string,
  chapterTexts: string[],
  totalPages: number
): Promise<Chapter[]> {
  const chapters: Chapter[] = [];
  const pagesPerChapter = 10;
  
  for (let i = 0; i < chapterTexts.length; i++) {
    const chapterNumber = i + 1;
    const chapterId = generateChapterId(chapterNumber);
    const title = generateChapterTitle(chapterNumber);
    const s3Key = generateChapterS3Key(bookId, chapterNumber);
    
    // Calculate page count for this chapter
    const isLastChapter = i === chapterTexts.length - 1;
    const pageCount = isLastChapter
      ? totalPages - (i * pagesPerChapter)
      : pagesPerChapter;
    
    // Upload chapter text to S3
    const putCommand = new PutObjectCommand({
      Bucket: BOOKS_BUCKET,
      Key: s3Key,
      Body: chapterTexts[i],
      ContentType: 'text/plain',
    });
    
    await s3Client.send(putCommand);
    
    chapters.push({
      chapterId,
      chapterNumber,
      title,
      s3Key,
      pageCount,
    });
  }
  
  return chapters;
}

/**
 * Saves book metadata to DynamoDB
 * 
 * @param book - Complete book object with metadata and chapters
 */
export async function saveBookMetadata(book: Book): Promise<void> {
  const putCommand = new PutCommand({
    TableName: BOOKS_TABLE,
    Item: book,
  });
  
  await docClient.send(putCommand);
}

/**
 * Main orchestration function for PDF processing
 * Extracts text, splits into chapters, uploads to S3, and saves metadata
 * 
 * @param bookId - Unique book identifier
 * @param metadata - Book metadata provided by user
 * @returns Complete book object
 */
export async function processPDF(
  bookId: string,
  metadata: BookMetadata
): Promise<Book> {
  const s3Key = `books/${bookId}/original.pdf`;
  
  // Extract text and page count from PDF
  const [text, totalPages] = await Promise.all([
    extractTextFromPDF(s3Key),
    getPDFPageCount(s3Key),
  ]);
  
  // Split text into chapters
  const chapterTexts = splitTextIntoChapters(text, totalPages);
  
  // Upload chapters to S3
  const chapters = await uploadChapters(bookId, chapterTexts, totalPages);
  
  // Create book object
  const now = new Date().toISOString();
  const book: Book = {
    bookId,
    title: metadata.title,
    author: metadata.author,
    description: metadata.description,
    topics: metadata.topics,
    difficulty: metadata.difficulty,
    publicationYear: metadata.publicationYear,
    coverImage: metadata.coverImage,
    s3Key,
    pdfUrl: s3Key,
    chapters,
    totalPages,
    createdAt: now,
    updatedAt: now,
  };
  
  // Save book metadata to DynamoDB
  await saveBookMetadata(book);
  
  return book;
}

/**
 * Helper function to convert a readable stream to a buffer
 * 
 * @param stream - Readable stream from S3
 * @returns Buffer containing the stream data
 */
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}
