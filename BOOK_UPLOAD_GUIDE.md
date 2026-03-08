# Quick Start: Upload Books to AI Digital Library

## Step 1: Ensure AWS Infrastructure is Ready

Make sure you have:
- ✅ AWS credentials configured
- ✅ DynamoDB table `Books` created
- ✅ S3 bucket `ai-library-books` created

Check your `.env` file:
```bash
cat .env
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Choose Your Upload Method

### Option A: Upload Text-Based Books

Try uploading the included TypeScript book:

```bash
npm run upload-book ./sample-books/typescript-book.json
```

### Option B: Upload PDF Books

Upload a PDF book with automatic text extraction:

```bash
npm run upload-pdf ./sample-books/sample-pdf-book.json
```

**Note**: For PDF text extraction, install `poppler-utils`:
```bash
# Ubuntu/Debian
sudo apt-get install poppler-utils

# macOS
brew install poppler

# The script works without it, but won't extract text
```

You should see output like:
```
Uploading book: Introduction to TypeScript
Book ID: book-1234567890

Uploading chapters to S3...
  ✓ Uploaded chapter 1 to S3: books/book-1234567890/chapters/chapter-1.txt
  ✓ Uploaded chapter 2 to S3: books/book-1234567890/chapters/chapter-2.txt
  ✓ Uploaded chapter 3 to S3: books/book-1234567890/chapters/chapter-3.txt

Saving metadata to DynamoDB...
✓ Book metadata saved to DynamoDB

✅ Book uploaded successfully!

Book Details:
  ID: book-1234567890
  Title: Introduction to TypeScript
  Author: John Doe
  Chapters: 3
```

## Step 4: Create Your Own Book

### Method 1: Text-Based Book

#### 4.1 Create Book Structure

```bash
mkdir -p my-books/python-basics/chapters
```

### 4.2 Write Chapter Content

```bash
cat > my-books/python-basics/chapters/chapter1.txt << 'EOF'
# Chapter 1: Introduction to Python

Python is a high-level, interpreted programming language...

## Your First Python Program

```python
print("Hello, World!")
```

This simple program demonstrates...
EOF
```

### 4.3 Create Book JSON

```bash
cat > my-books/python-basics/book.json << 'EOF'
{
  "title": "Python Basics",
  "author": "Your Name",
  "description": "Learn Python programming from scratch",
  "topics": ["python", "programming", "beginners"],
  "difficulty": "beginner",
  "publicationYear": 2024,
  "chapters": [
    {
      "chapterId": "chapter-1",
      "chapterNumber": 1,
      "title": "Introduction to Python",
      "s3Key": "",
      "pageCount": 10,
      "filePath": "./my-books/python-basics/chapters/chapter1.txt"
    }
  ]
}
EOF
```

### 4.4 Upload Your Book

```bash
npm run upload-book ./my-books/python-basics/book.json
```

### Method 2: PDF Book

#### 4.1 Prepare Your PDF

Place your PDF file anywhere accessible:
```bash
cp /path/to/your/book.pdf ./my-books/my-book.pdf
```

#### 4.2 Create PDF Config JSON

```bash
cat > my-books/my-pdf-book.json << 'EOF'
{
  "pdfPath": "./my-books/my-book.pdf",
  "title": "My PDF Book",
  "author": "Your Name",
  "description": "A comprehensive guide uploaded from PDF",
  "topics": ["programming", "tutorial"],
  "difficulty": "intermediate",
  "publicationYear": 2024,
  "splitByPages": 15,
  "chapterTitles": [
    "Introduction",
    "Core Concepts",
    "Advanced Topics",
    "Conclusion"
  ]
}
EOF
```

**Config Options:**
- `splitByPages`: Number of PDF pages per chapter (default: 10)
- `chapterTitles`: Optional custom chapter names (auto-generated if omitted)

#### 4.3 Upload Your PDF Book

```bash
npm run upload-pdf ./my-books/my-pdf-book.json
```

The script will:
1. Upload the original PDF to S3
2. Extract text from the PDF (if poppler-utils installed)
3. Split content into chapters
4. Create searchable text versions
5. Save metadata to DynamoDB

## Common Issues

### Issue: AWS Credentials Not Found
```bash
# Configure AWS credentials
aws configure
```

### Issue: S3 Bucket Doesn't Exist
```bash
# Create the bucket
aws s3 mb s3://ai-library-books --region us-east-1
```

### Issue: DynamoDB Table Doesn't Exist
```bash
# Create the table
aws dynamodb create-table \
  --table-name Books \
  --attribute-definitions AttributeName=bookId,AttributeType=S \
  --key-schema AttributeName=bookId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Next Steps

1. **Verify Upload**: Check AWS Console to see your book in DynamoDB and S3
2. **Test API**: Use the book ID to fetch the book via your API
3. **Add More Books**: Create more book JSON files (text or PDF) and upload them
4. **Integrate Search**: Ensure uploaded books are indexed for search

## Book JSON Reference

### Text-Based Book Format

```json
{
  "title": "string (required)",
  "author": "string (required)",
  "description": "string (required)",
  "topics": ["array", "of", "strings"],
  "difficulty": "beginner|intermediate|advanced",
  "publicationYear": 2024,
  "coverImage": "https://url-to-cover-image.jpg (optional)",
  "chapters": [
    {
      "chapterId": "unique-id",
      "chapterNumber": 1,
      "title": "Chapter Title",
      "s3Key": "",
      "pageCount": 10,
      "filePath": "./path/to/chapter.txt"
    }
  ]
}
```

### PDF Book Format

```json
{
  "pdfPath": "./path/to/book.pdf (required)",
  "title": "string (required)",
  "author": "string (required)",
  "description": "string (required)",
  "topics": ["array", "of", "strings"],
  "difficulty": "beginner|intermediate|advanced",
  "publicationYear": 2024,
  "coverImage": "https://url-to-cover-image.jpg (optional)",
  "splitByPages": 10,
  "chapterTitles": ["optional", "custom", "chapter", "names"]
}
```

## Tips

### For Text-Based Books
- Use descriptive chapter IDs like `chapter-1`, `intro`, `getting-started`
- Keep chapter files in a consistent format (Markdown recommended)
- Include code examples with proper syntax highlighting markers
- Set realistic page counts for progress tracking

### For PDF Books
- Ensure PDFs are text-based (not scanned images) for best text extraction
- Install `poppler-utils` for automatic text extraction
- Adjust `splitByPages` based on your PDF's page count
- Provide custom `chapterTitles` for better organization
- Original PDF is always preserved in S3 for direct viewing

### General Tips
- Use relevant topics for better search discoverability
- Choose appropriate difficulty levels for your target audience
- Add cover images for better visual appeal
- Include publication year for version tracking

For more details, see [scripts/README.md](./scripts/README.md)
