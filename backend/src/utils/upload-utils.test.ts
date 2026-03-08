import { describe, it, expect } from '@jest/globals';
import {
  generateBookId,
  generateUploadId,
  generatePdfS3Key,
  generateChapterS3Key,
  generateChapterId,
  generateChapterTitle
} from './upload-utils';

describe('Upload Utilities', () => {
  describe('generateBookId', () => {
    it('should generate a book ID with correct format', () => {
      const bookId = generateBookId();
      expect(bookId).toMatch(/^book-\d+$/);
    });

    it('should generate unique IDs', async () => {
      const id1 = generateBookId();
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));
      const id2 = generateBookId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateUploadId', () => {
    it('should generate an upload ID with correct format', () => {
      const uploadId = generateUploadId();
      expect(uploadId).toMatch(/^upload-\d+-[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateUploadId();
      const id2 = generateUploadId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generatePdfS3Key', () => {
    it('should generate correct S3 key pattern for PDF', () => {
      const bookId = 'book-1234567890';
      const s3Key = generatePdfS3Key(bookId);
      expect(s3Key).toBe('books/book-1234567890/original.pdf');
    });

    it('should handle different book IDs', () => {
      const bookId = 'book-9999999999';
      const s3Key = generatePdfS3Key(bookId);
      expect(s3Key).toBe('books/book-9999999999/original.pdf');
    });
  });

  describe('generateChapterS3Key', () => {
    it('should generate correct S3 key pattern for chapter', () => {
      const bookId = 'book-1234567890';
      const chapterNumber = 1;
      const s3Key = generateChapterS3Key(bookId, chapterNumber);
      expect(s3Key).toBe('books/book-1234567890/chapters/chapter-1.txt');
    });

    it('should handle different chapter numbers', () => {
      const bookId = 'book-1234567890';
      const s3Key5 = generateChapterS3Key(bookId, 5);
      const s3Key10 = generateChapterS3Key(bookId, 10);
      expect(s3Key5).toBe('books/book-1234567890/chapters/chapter-5.txt');
      expect(s3Key10).toBe('books/book-1234567890/chapters/chapter-10.txt');
    });
  });

  describe('generateChapterId', () => {
    it('should generate correct chapter ID format', () => {
      const chapterId = generateChapterId(1);
      expect(chapterId).toBe('chapter-1');
    });

    it('should handle different chapter numbers', () => {
      expect(generateChapterId(5)).toBe('chapter-5');
      expect(generateChapterId(10)).toBe('chapter-10');
      expect(generateChapterId(100)).toBe('chapter-100');
    });
  });

  describe('generateChapterTitle', () => {
    it('should generate correct chapter title format', () => {
      const title = generateChapterTitle(1);
      expect(title).toBe('Chapter 1');
    });

    it('should handle different chapter numbers', () => {
      expect(generateChapterTitle(5)).toBe('Chapter 5');
      expect(generateChapterTitle(10)).toBe('Chapter 10');
      expect(generateChapterTitle(100)).toBe('Chapter 100');
    });
  });
});
