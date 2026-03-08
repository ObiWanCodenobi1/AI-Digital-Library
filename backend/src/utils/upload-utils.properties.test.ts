import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import {
  generatePdfS3Key,
  generateChapterS3Key,
  generateChapterId,
  generateChapterTitle
} from './upload-utils';

describe('Upload Utils Property Tests', () => {
  // Feature: pdf-upload-ui, Property 20: PDF S3 Key Format
  // **Validates: Requirements 6.3**
  describe('Property 20: PDF S3 Key Format', () => {
    it('should always generate S3 keys matching pattern books/{bookId}/original.pdf', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // Generate random bookIds
          (bookId) => {
            const s3Key = generatePdfS3Key(bookId);
            const expectedPattern = `books/${bookId}/original.pdf`;
            expect(s3Key).toBe(expectedPattern);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: pdf-upload-ui, Property 16: Chapter S3 Key Pattern
  // **Validates: Requirements 3.6**
  describe('Property 16: Chapter S3 Key Pattern', () => {
    it('should always generate chapter S3 keys matching pattern books/{bookId}/chapters/chapter-{N}.txt', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // Generate random bookIds
          fc.integer({ min: 1, max: 1000 }), // Generate random chapter numbers
          (bookId, chapterNumber) => {
            const s3Key = generateChapterS3Key(bookId, chapterNumber);
            const expectedPattern = `books/${bookId}/chapters/chapter-${chapterNumber}.txt`;
            expect(s3Key).toBe(expectedPattern);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: pdf-upload-ui, Property 17: Chapter Numbering (Part 1 - Chapter ID)
  // **Validates: Requirements 8.1, 8.2**
  describe('Property 17: Chapter Numbering - Chapter IDs', () => {
    it('should generate chapter IDs in format chapter-{N} for any positive integer N', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (chapterNumber) => {
            const chapterId = generateChapterId(chapterNumber);
            const expectedId = `chapter-${chapterNumber}`;
            expect(chapterId).toBe(expectedId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: pdf-upload-ui, Property 17: Chapter Numbering (Part 2 - Chapter Title)
  // **Validates: Requirements 8.1, 8.2**
  describe('Property 17: Chapter Numbering - Chapter Titles', () => {
    it('should generate chapter titles in format "Chapter {N}" for any positive integer N', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (chapterNumber) => {
            const title = generateChapterTitle(chapterNumber);
            const expectedTitle = `Chapter ${chapterNumber}`;
            expect(title).toBe(expectedTitle);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: pdf-upload-ui, Property 17: Chapter Numbering (Part 3 - Sequential Numbering)
  // **Validates: Requirements 8.1, 8.2**
  describe('Property 17: Chapter Numbering - Sequential Consistency', () => {
    it('should generate consecutive chapter numbers starting at 1', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // bookId
          fc.integer({ min: 1, max: 100 }), // number of chapters
          (bookId, numChapters) => {
            const chapters = [];
            for (let i = 1; i <= numChapters; i++) {
              chapters.push({
                chapterId: generateChapterId(i),
                chapterNumber: i,
                title: generateChapterTitle(i),
                s3Key: generateChapterS3Key(bookId, i)
              });
            }

            // Verify consecutive numbering starting at 1
            for (let i = 0; i < chapters.length; i++) {
              expect(chapters[i].chapterNumber).toBe(i + 1);
              expect(chapters[i].chapterId).toBe(`chapter-${i + 1}`);
              expect(chapters[i].title).toBe(`Chapter ${i + 1}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
