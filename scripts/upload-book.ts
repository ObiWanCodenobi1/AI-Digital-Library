#!/usr/bin/env ts-node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const BOOKS_TABLE = process.env.BOOKS_TABLE || 'Books';
const BOOKS_BUCKET = process.env.BOOKS_BUCKET || 'ai-library-books';

interface Chapter {
  chapterId: string;
  chapterNumber: number;
  title: string;
  s3Key: string;
  pageCount: number;
  content?: string;
  filePath?: string;
}

interface BookData {
  title: string;
  author: string;
  description: string;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  publicationYear?: number;
  coverImage?: string;
  chapters: Chapter[];
}

async function uploadChapterToS3(bookId: string, chapter: Chapter): Promise<void> {
  if (!chapter.filePath) {
    console.log(`  Skipping chapter ${chapter.chapterNumber} - no file path provided`);
    return;
  }

  const filePath = path.resolve(chapter.filePath);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Chapter file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const s3Key = `books/${bookId}/chapters/chapter-${chapter.chapterNumber}.txt`;

  await s3Client.send(new PutObjectCommand({
    Bucket: BOOKS_BUCKET,
    Key: s3Key,
    Body: content,
    ContentType: 'text/plain'
  }));

  chapter.s3Key = s3Key;
  delete chapter.filePath;
  delete chapter.content;

  console.log(`  ✓ Uploaded chapter ${chapter.chapterNumber} to S3: ${s3Key}`);
}

async function uploadBook(bookData: BookData): Promise<void> {
  const bookId = `book-${Date.now()}`;
  const now = new Date().toISOString();

  console.log(`\nUploading book: ${bookData.title}`);
  console.log(`Book ID: ${bookId}`);

  // Upload all chapters to S3
  console.log('\nUploading chapters to S3...');
  for (const chapter of bookData.chapters) {
    await uploadChapterToS3(bookId, chapter);
  }

  // Create book metadata
  const book = {
    bookId,
    title: bookData.title,
    author: bookData.author,
    description: bookData.description,
    topics: bookData.topics,
    difficulty: bookData.difficulty,
    publicationYear: bookData.publicationYear,
    coverImage: bookData.coverImage,
    s3Key: `books/${bookId}/metadata.json`,
    chapters: bookData.chapters.map(ch => ({
      chapterId: ch.chapterId,
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      s3Key: ch.s3Key,
      pageCount: ch.pageCount
    })),
    createdAt: now,
    updatedAt: now
  };

  // Save metadata to DynamoDB
  console.log('\nSaving metadata to DynamoDB...');
  await docClient.send(new PutCommand({
    TableName: BOOKS_TABLE,
    Item: book
  }));

  console.log('✓ Book metadata saved to DynamoDB');
  console.log('\n✅ Book uploaded successfully!');
  console.log(`\nBook Details:`);
  console.log(`  ID: ${bookId}`);
  console.log(`  Title: ${book.title}`);
  console.log(`  Author: ${book.author}`);
  console.log(`  Chapters: ${book.chapters.length}`);
}

// Example usage
async function main() {
  const bookData: BookData = {
    title: 'Introduction to TypeScript',
    author: 'John Doe',
    description: 'A comprehensive guide to TypeScript for beginners',
    topics: ['typescript', 'programming', 'web-development'],
    difficulty: 'beginner',
    publicationYear: 2024,
    chapters: [
      {
        chapterId: 'chapter-1',
        chapterNumber: 1,
        title: 'Getting Started',
        s3Key: '', // Will be set during upload
        pageCount: 15,
        filePath: './sample-books/typescript/chapter1.txt' // Path to chapter content
      },
      {
        chapterId: 'chapter-2',
        chapterNumber: 2,
        title: 'Basic Types',
        s3Key: '',
        pageCount: 20,
        filePath: './sample-books/typescript/chapter2.txt'
      }
    ]
  };

  try {
    await uploadBook(bookData);
  } catch (error) {
    console.error('Error uploading book:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { uploadBook, BookData, Chapter };
