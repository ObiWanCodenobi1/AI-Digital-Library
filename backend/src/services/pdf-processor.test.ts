import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  splitTextIntoChapters,
} from './pdf-processor';

// Note: extractTextFromPDF, getPDFPageCount, uploadChapters, saveBookMetadata, and processPDF
// require AWS SDK and pdf-parse mocking which is complex in TypeScript.
// These functions are tested through integration tests and manual testing.

describe('PDF Processor Service', () => {
  describe('splitTextIntoChapters', () => {
    it('should split text into correct number of chapters based on page count', () => {
      const text = 'A'.repeat(1000);
      const totalPages = 30;
      const pagesPerChapter = 10;
      
      const chapters = splitTextIntoChapters(text, totalPages, pagesPerChapter);
      
      expect(chapters).toHaveLength(3);
    });

    it('should handle single page PDF', () => {
      const text = 'Short text';
      const totalPages = 1;
      
      const chapters = splitTextIntoChapters(text, totalPages);
      
      expect(chapters).toHaveLength(1);
      expect(chapters[0]).toBe('Short text');
    });

    it('should handle empty text', () => {
      const text = '';
      const totalPages = 20;
      
      const chapters = splitTextIntoChapters(text, totalPages);
      
      expect(chapters).toHaveLength(2);
      expect(chapters[0]).toBe('');
      expect(chapters[1]).toBe('');
    });

    it('should handle zero pages', () => {
      const text = 'Some text';
      const totalPages = 0;
      
      const chapters = splitTextIntoChapters(text, totalPages);
      
      expect(chapters).toHaveLength(1);
      expect(chapters[0]).toBe('');
    });

    it('should split text evenly across chapters', () => {
      const text = 'ABCDEFGHIJ'; // 10 characters
      const totalPages = 20;
      const pagesPerChapter = 10;
      
      const chapters = splitTextIntoChapters(text, totalPages, pagesPerChapter);
      
      expect(chapters).toHaveLength(2);
      expect(chapters[0]).toBe('ABCDE');
      expect(chapters[1]).toBe('FGHIJ');
    });

    it('should handle pages not evenly divisible by pagesPerChapter', () => {
      const text = 'A'.repeat(100);
      const totalPages = 25;
      const pagesPerChapter = 10;
      
      const chapters = splitTextIntoChapters(text, totalPages, pagesPerChapter);
      
      expect(chapters).toHaveLength(3); // ceil(25/10) = 3
    });
  });
});
