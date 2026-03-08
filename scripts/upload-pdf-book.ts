#!/usr/bin/env ts-node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const BOOKS_TABLE = process.env.BOOKS_TABLE || 'Books';
const BOOKS_BUCKET = process.env.BOOKS_BUCKET || 'ai-library-books';

interface PDFBookConfig {
  pdfPath: string;
  title: string;
  author: string;
  description: string;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  publicationYear?: number;
  coverImage?: string;
  splitByPages?: number; // Number of pages per chapter (default: 10)
  chapterTitles?: string[]; // Optional custom chapter titles
}

async function checkPdfToText(): Promise<boolean> {
  try {
    await execAsync('pdftotext -v');
    return true;
  } catch {
    return false;
  }
}

async function extractTextFromPDF(pdfPath: string): Promise<string> {
  const hasPdfToText = await checkPdfToText();
  
  if (!hasPdfToText) {
    console.log('⚠️  pdftotext not found. Uploading PDF as-is without text extraction.');
    console.log('   Install poppler-utils for text extraction: sudo apt-get install poppler-utils');
    return '';
  }

  try {
    const outputPath = pdfPath.replace('.pdf', '.txt');
    await execAsync(`pdftotext "${pdfPath}" "${outputPath}"`);
    const text = fs.readFileSync(outputPath, 'utf-8');
    fs.unlinkSync(outputPath); // Clean up temp file
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

async function getPDFPageCount(pdfPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages`);
    const match = stdout.match(/Pages:\s+(\d+)/);
    return match ? parseInt(match[1]) : 1;
  } catch {
    // If pdfinfo not available, return 1
    return 1;
  }
}

function splitTextIntoChapters(text: string, numChapters: number): string[] {
  if (!text) return [];
  
  const lines = text.split('\n');
  const linesPerChapter = Math.ceil(lines.length / numChapters);
  const chapters: string[] = [];

  for (let i = 0; i < numChapters; i++) {
    const start = i * linesPerChapter;
    const end = Math.min(start + linesPerChapter, lines.length);
    chapters.push(lines.slice(start, end).join('\n'));
  }

  return chapters;
}

async function uploadPDFBook(config: PDFBookConfig): Promise<void> {
  const bookId = `book-${Date.now()}`;
  const now = new Date().toISOString();

  console.log(`\nUploading PDF book: ${config.title}`);
  console.log(`Book ID: ${bookId}`);
  console.log(`PDF: ${config.pdfPath}`);

  const pdfPath = path.resolve(config.pdfPath);
  
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  // Upload original PDF to S3
  console.log('\nUploading PDF to S3...');
  const pdfContent = fs.readFileSync(pdfPath);
  const pdfS3Key = `books/${bookId}/original.pdf`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: BOOKS_BUCKET,
    Key: pdfS3Key,
    Body: pdfContent,
    ContentType: 'application/pdf'
  }));
  console.log(`✓ Uploaded PDF to S3: ${pdfS3Key}`);

  // Extract text from PDF
  console.log('\nExtracting text from PDF...');
  const fullText = await extractTextFromPDF(pdfPath);
  
  // Get page count
  const totalPages = await getPDFPageCount(pdfPath);
  console.log(`✓ PDF has ${totalPages} pages`);

  // Determine number of chapters
  const pagesPerChapter = config.splitByPages || 10;
  const numChapters = Math.ceil(totalPages / pagesPerChapter);
  console.log(`✓ Splitting into ${numChapters} chapters (${pagesPerChapter} pages each)`);

  // Split text into chapters
  const chapterTexts = fullText ? splitTextIntoChapters(fullText, numChapters) : [];

  // Upload chapters
  console.log('\nUploading chapters to S3...');
  const chapters = [];
  
  for (let i = 0; i < numChapters; i++) {
    const chapterNumber = i + 1;
    const chapterId = `chapter-${chapterNumber}`;
    const chapterTitle = config.chapterTitles?.[i] || `Chapter ${chapterNumber}`;
    const chapterS3Key = `books/${bookId}/chapters/chapter-${chapterNumber}.txt`;
    
    // Upload chapter text (or placeholder if no text extracted)
    const chapterContent = chapterTexts[i] || `[Chapter ${chapterNumber} - Text extraction not available. View original PDF.]`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: BOOKS_BUCKET,
      Key: chapterS3Key,
      Body: chapterContent,
      ContentType: 'text/plain'
    }));

    chapters.push({
      chapterId,
      chapterNumber,
      title: chapterTitle,
      s3Key: chapterS3Key,
      pageCount: Math.min(pagesPerChapter, totalPages - (i * pagesPerChapter))
    });

    console.log(`  ✓ Uploaded chapter ${chapterNumber}: ${chapterTitle}`);
  }

  // Create book metadata
  const book = {
    bookId,
    title: config.title,
    author: config.author,
    description: config.description,
    topics: config.topics,
    difficulty: config.difficulty,
    publicationYear: config.publicationYear,
    coverImage: config.coverImage,
    s3Key: pdfS3Key, // Reference to original PDF
    pdfUrl: pdfS3Key, // For direct PDF access
    chapters,
    totalPages,
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
  console.log('\n✅ PDF book uploaded successfully!');
  console.log(`\nBook Details:`);
  console.log(`  ID: ${bookId}`);
  console.log(`  Title: ${book.title}`);
  console.log(`  Author: ${book.author}`);
  console.log(`  Total Pages: ${totalPages}`);
  console.log(`  Chapters: ${book.chapters.length}`);
  console.log(`  PDF Location: s3://${BOOKS_BUCKET}/${pdfS3Key}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npm run upload-pdf <path-to-config.json>');
    console.error('\nExample: npm run upload-pdf ./sample-books/my-pdf-book.json');
    console.error('\nConfig format:');
    console.error(JSON.stringify({
      pdfPath: './path/to/book.pdf',
      title: 'Book Title',
      author: 'Author Name',
      description: 'Book description',
      topics: ['topic1', 'topic2'],
      difficulty: 'beginner',
      publicationYear: 2024,
      splitByPages: 10,
      chapterTitles: ['Chapter 1', 'Chapter 2']
    }, null, 2));
    process.exit(1);
  }

  const configPath = path.resolve(args[0]);
  
  if (!fs.existsSync(configPath)) {
    console.error(`Error: Config file not found: ${configPath}`);
    process.exit(1);
  }

  try {
    const config: PDFBookConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    await uploadPDFBook(config);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { uploadPDFBook, PDFBookConfig };
