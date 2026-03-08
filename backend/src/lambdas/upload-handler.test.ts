import { describe, it, expect } from '@jest/globals';
import { validateMetadata } from './upload-handler';

describe('Upload Handler - Validation', () => {
  describe('Successful validation', () => {
    it('should return null for valid request with all required fields', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: ['programming', 'testing'],
          difficulty: 'intermediate' as const
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toBeNull();
    });

    it('should accept optional publicationYear', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: ['programming'],
          difficulty: 'beginner' as const,
          publicationYear: 2020
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toBeNull();
    });

    it('should accept optional coverImage', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: ['programming'],
          difficulty: 'advanced' as const,
          coverImage: 'https://example.com/cover.jpg'
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toBeNull();
    });

    it('should accept empty topics array', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toBeNull();
    });
  });

  describe('Validation errors', () => {
    it('should return error when filename is missing', () => {
      const requestBody = {
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const
        }
      };

      const error = validateMetadata(requestBody as any);
      expect(error).toContain('filename');
    });

    it('should return error when fileSize is missing', () => {
      const requestBody = {
        filename: 'test.pdf',
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const
        }
      };

      const error = validateMetadata(requestBody as any);
      expect(error).toContain('fileSize');
    });

    it('should return error when title is missing', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const
        }
      };

      const error = validateMetadata(requestBody as any);
      expect(error).toContain('title');
    });

    it('should return error when title is empty string', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: '   ',
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toContain('title');
    });

    it('should return error when author is missing', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const
        }
      };

      const error = validateMetadata(requestBody as any);
      expect(error).toContain('author');
    });

    it('should return error when description is missing', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          topics: [],
          difficulty: 'intermediate' as const
        }
      };

      const error = validateMetadata(requestBody as any);
      expect(error).toContain('description');
    });

    it('should return error when topics is not an array', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: 'not-an-array',
          difficulty: 'intermediate' as const
        }
      };

      const error = validateMetadata(requestBody as any);
      expect(error).toContain('topics');
    });

    it('should return error when difficulty is invalid', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'expert' as any
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toContain('difficulty');
    });

    it('should return error when publicationYear is too old', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const,
          publicationYear: 999
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toContain('publicationYear');
    });

    it('should return error when publicationYear is in the future', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const,
          publicationYear: new Date().getFullYear() + 1
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toContain('publicationYear');
    });

    it('should return error when coverImage is not a valid URL', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const,
          coverImage: 'not-a-url'
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toContain('coverImage');
    });

    it('should accept http:// URLs for coverImage', () => {
      const requestBody = {
        filename: 'test.pdf',
        fileSize: 1024000,
        metadata: {
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          topics: [],
          difficulty: 'intermediate' as const,
          coverImage: 'http://example.com/cover.jpg'
        }
      };

      const error = validateMetadata(requestBody);
      expect(error).toBeNull();
    });
  });
});
