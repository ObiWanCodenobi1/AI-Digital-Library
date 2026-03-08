/**
 * Utility functions for PDF upload processing
 * Provides ID generation and S3 key pattern functions
 */

/**
 * Generates a unique book ID with timestamp
 * Format: book-{timestamp}
 * 
 * @returns Unique book identifier
 */
export function generateBookId(): string {
  return `book-${Date.now()}`;
}

/**
 * Generates a unique upload ID with timestamp and random component
 * Format: upload-{timestamp}-{random}
 * 
 * @returns Unique upload identifier
 */
export function generateUploadId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `upload-${timestamp}-${random}`;
}

/**
 * Generates S3 key for original PDF file
 * Pattern: books/{bookId}/original.pdf
 * 
 * @param bookId - The unique book identifier
 * @returns S3 key for the original PDF
 */
export function generatePdfS3Key(bookId: string): string {
  return `books/${bookId}/original.pdf`;
}

/**
 * Generates S3 key for a chapter text file
 * Pattern: books/{bookId}/chapters/chapter-{N}.txt
 * 
 * @param bookId - The unique book identifier
 * @param chapterNumber - The chapter number (1-indexed)
 * @returns S3 key for the chapter text file
 */
export function generateChapterS3Key(bookId: string, chapterNumber: number): string {
  return `books/${bookId}/chapters/chapter-${chapterNumber}.txt`;
}

/**
 * Generates a chapter ID
 * Format: chapter-{N}
 * 
 * @param chapterNumber - The chapter number (1-indexed)
 * @returns Chapter identifier
 */
export function generateChapterId(chapterNumber: number): string {
  return `chapter-${chapterNumber}`;
}

/**
 * Generates a chapter title
 * Format: Chapter {N}
 * 
 * @param chapterNumber - The chapter number (1-indexed)
 * @returns Default chapter title
 */
export function generateChapterTitle(chapterNumber: number): string {
  return `Chapter ${chapterNumber}`;
}
