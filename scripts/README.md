# Book Upload Scripts

This directory contains scripts for uploading books to the AI Digital Library.

## Prerequisites

1. AWS credentials configured (via `aws configure` or environment variables)
2. DynamoDB table created (default: `Books`)
3. S3 bucket created (default: `ai-library-books`)
4. Dependencies installed: `npm install`
5. (Optional) For PDF text extraction: `poppler-utils` package

## Environment Variables

Set these in your `.env` file or environment:

```bash
AWS_REGION=us-east-1
BOOKS_TABLE=Books
BOOKS_BUCKET=ai-library-books
```

## Usage

### 1. Upload a Text-Based Book

Upload books with individual chapter files:

```bash
npm run upload-book ./sample-books/typescript-book.json
```

### 2. Upload a PDF Book

Upload books from PDF files with automatic text extraction:

```bash
npm run upload-pdf ./sample-books/sample-pdf-book.json
```

**PDF Text Extraction Setup:**
```bash
# Ubuntu/Debian
sudo apt-get install poppler-utils

# macOS
brew install poppler

# Windows (via Chocolatey)
choco install poppler
```

The script works without poppler-utils, but won't extract searchable text.

### 3. Text-Based Book JSON Format

Create a JSON file with your book metadata:

```json
{
  "title": "Your Book Title",
  "author": "Author Name",
  "description": "Book description",
  "topics": ["topic1", "topic2"],
  "difficulty": "beginner",
  "publicationYear": 2024,
  "chapters": [
    {
      "chapterId": "chapter-1",
      "chapterNumber": 1,
      "title": "Chapter Title",
      "s3Key": "",
      "pageCount": 15,
      "filePath": "./path/to/chapter1.txt"
    }
  ]
}
```

### 4. PDF Book JSON Format

Create a JSON file for PDF uploads:

```json
{
  "pdfPath": "./path/to/book.pdf",
  "title": "Your Book Title",
  "author": "Author Name",
  "description": "Book description",
  "topics": ["topic1", "topic2"],
  "difficulty": "intermediate",
  "publicationYear": 2024,
  "splitByPages": 10,
  "chapterTitles": ["Chapter 1", "Chapter 2", "Chapter 3"]
}
```

**PDF Config Options:**
- `pdfPath` (required): Path to the PDF file
- `splitByPages` (optional): Pages per chapter (default: 10)
- `chapterTitles` (optional): Custom chapter names (auto-generated if omitted)

### 5. Chapter Content Files

Create text files for each chapter. The script supports:
- Plain text (`.txt`)
- Markdown (`.md`)
- Any text-based format

Example chapter structure:
```
sample-books/
├── my-book.json
└── chapters/
    ├── chapter1.txt
    ├── chapter2.txt
    └── chapter3.txt
```

## Example: Upload Sample Books

### Text-Based Book

A sample TypeScript book is included:

```bash
npm run upload-book ./sample-books/typescript-book.json
```

### PDF Book

To test PDF upload, place a PDF file and create a config:

```bash
npm run upload-pdf ./sample-books/sample-pdf-book.json
```

Both will:
1. Upload all chapter content files to S3
2. Create book metadata in DynamoDB
3. Print the book ID and confirmation

## Creating Your Own Book

1. Create a directory for your book:
   ```bash
   mkdir -p sample-books/my-book/chapters
   ```

2. Write your chapter content:
   ```bash
   echo "# Chapter 1 Content" > sample-books/my-book/chapters/chapter1.txt
   ```

3. Create the book JSON:
   ```json
   {
     "title": "My Book",
     "author": "Your Name",
     "description": "Book description",
     "topics": ["programming"],
     "difficulty": "intermediate",
     "chapters": [
       {
         "chapterId": "chapter-1",
         "chapterNumber": 1,
         "title": "Introduction",
         "s3Key": "",
         "pageCount": 10,
         "filePath": "./sample-books/my-book/chapters/chapter1.txt"
       }
     ]
   }
   ```

4. Upload:
   ```bash
   npm run upload-book ./sample-books/my-book/book.json
   ```

## Troubleshooting

### AWS Credentials Error
```
Error: Missing credentials in config
```
**Solution**: Run `aws configure` or set AWS environment variables

### S3 Bucket Not Found
```
Error: The specified bucket does not exist
```
**Solution**: Create the S3 bucket or update `BOOKS_BUCKET` in `.env`

### DynamoDB Table Not Found
```
Error: Requested resource not found
```
**Solution**: Create the DynamoDB table or update `BOOKS_TABLE` in `.env`

### File Not Found
```
Error: Chapter file not found: /path/to/file
```
**Solution**: Check that all `filePath` values in your JSON point to existing files

## Advanced Usage

### Programmatic Upload

You can also import and use the upload function in your own scripts:

```typescript
import { uploadBook, BookData } from './scripts/upload-book';

const bookData: BookData = {
  title: "My Book",
  author: "Author",
  description: "Description",
  topics: ["topic"],
  difficulty: "beginner",
  chapters: [...]
};

await uploadBook(bookData);
```

## Notes

- Book IDs are automatically generated as `book-{timestamp}`
- Chapter S3 keys are automatically generated as `books/{bookId}/chapters/chapter-{number}.txt`
- All timestamps are in ISO 8601 format
- The script validates that all chapter files exist before uploading
