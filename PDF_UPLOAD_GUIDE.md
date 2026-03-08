# PDF Book Upload Guide

Complete guide for uploading PDF books to the AI Digital Library.

## Quick Start

```bash
# 1. Install PDF tools (optional but recommended)
sudo apt-get install poppler-utils  # Ubuntu/Debian
# or
brew install poppler  # macOS

# 2. Create config file
cat > my-pdf-book.json << 'EOF'
{
  "pdfPath": "./my-book.pdf",
  "title": "My Book Title",
  "author": "Author Name",
  "description": "Book description",
  "topics": ["programming"],
  "difficulty": "intermediate",
  "splitByPages": 15
}
EOF

# 3. Upload
npm run upload-pdf ./my-pdf-book.json
```

## How It Works

The PDF upload script:

1. **Uploads Original PDF** - Stores the complete PDF in S3
2. **Extracts Text** - Uses `pdftotext` to extract searchable text
3. **Splits into Chapters** - Divides content based on page count
4. **Creates Metadata** - Saves book info to DynamoDB
5. **Enables Search** - Makes content searchable and readable

## Configuration Options

### Required Fields

```json
{
  "pdfPath": "./path/to/book.pdf",
  "title": "Book Title",
  "author": "Author Name",
  "description": "Detailed description",
  "topics": ["topic1", "topic2"],
  "difficulty": "beginner|intermediate|advanced"
}
```

### Optional Fields

```json
{
  "publicationYear": 2024,
  "coverImage": "https://example.com/cover.jpg",
  "splitByPages": 10,
  "chapterTitles": [
    "Introduction",
    "Chapter 1: Basics",
    "Chapter 2: Advanced",
    "Conclusion"
  ]
}
```

### Field Descriptions

- **pdfPath**: Relative or absolute path to PDF file
- **splitByPages**: Number of PDF pages per chapter (default: 10)
  - Small books (50 pages): Use 5-10 pages per chapter
  - Medium books (200 pages): Use 10-20 pages per chapter
  - Large books (500+ pages): Use 20-50 pages per chapter
- **chapterTitles**: Custom names for each chapter
  - If provided, must match the number of chapters
  - If omitted, auto-generates "Chapter 1", "Chapter 2", etc.

## Text Extraction

### With poppler-utils (Recommended)

Install poppler-utils for automatic text extraction:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install poppler-utils

# macOS
brew install poppler

# Fedora/RHEL
sudo dnf install poppler-utils

# Windows (via Chocolatey)
choco install poppler

# Verify installation
pdftotext -v
```

**Benefits:**
- Extracts searchable text from PDF
- Enables full-text search
- Allows AI chat with book content
- Supports quiz generation

### Without poppler-utils

The script still works but:
- Original PDF is uploaded and accessible
- No text extraction (placeholder text used)
- Limited search functionality
- AI features may be limited

## Examples

### Example 1: Programming Book

```json
{
  "pdfPath": "./books/python-guide.pdf",
  "title": "Python Programming Guide",
  "author": "Jane Developer",
  "description": "A comprehensive guide to Python programming for beginners and intermediate developers.",
  "topics": ["python", "programming", "software-development"],
  "difficulty": "intermediate",
  "publicationYear": 2024,
  "splitByPages": 15,
  "chapterTitles": [
    "Introduction to Python",
    "Data Types and Variables",
    "Control Flow",
    "Functions and Modules",
    "Object-Oriented Programming",
    "File I/O and Exceptions",
    "Advanced Topics"
  ]
}
```

### Example 2: Technical Documentation

```json
{
  "pdfPath": "./docs/api-reference.pdf",
  "title": "REST API Reference",
  "author": "Tech Corp",
  "description": "Complete API documentation for the Tech Corp REST API v2.0",
  "topics": ["api", "rest", "documentation", "web-services"],
  "difficulty": "advanced",
  "publicationYear": 2024,
  "splitByPages": 20
}
```

### Example 3: Tutorial Book

```json
{
  "pdfPath": "./tutorials/web-dev-basics.pdf",
  "title": "Web Development Basics",
  "author": "John Teacher",
  "description": "Learn HTML, CSS, and JavaScript from scratch",
  "topics": ["html", "css", "javascript", "web-development"],
  "difficulty": "beginner",
  "publicationYear": 2023,
  "splitByPages": 10,
  "coverImage": "https://example.com/covers/web-dev.jpg"
}
```

## Best Practices

### PDF Preparation

1. **Use Text-Based PDFs**
   - Avoid scanned images (OCR not supported)
   - Ensure text is selectable in the PDF
   - Test by trying to copy text from the PDF

2. **Optimize File Size**
   - Compress large PDFs before upload
   - Remove unnecessary embedded fonts
   - Use tools like `gs` (Ghostscript) to optimize

3. **Check Page Count**
   ```bash
   pdfinfo your-book.pdf | grep Pages
   ```

### Chapter Organization

1. **Calculate Chapters**
   ```
   Number of Chapters = Total Pages / splitByPages (rounded up)
   ```

2. **Choose splitByPages Wisely**
   - Too small (< 5): Too many chapters, hard to navigate
   - Too large (> 50): Chapters too long, poor UX
   - Sweet spot: 10-20 pages per chapter

3. **Custom Chapter Titles**
   - Use descriptive names
   - Match the PDF's table of contents
   - Keep titles concise (< 50 characters)

### Topics Selection

Choose relevant, searchable topics:
- Programming languages: `python`, `javascript`, `java`
- Frameworks: `react`, `django`, `spring`
- Concepts: `algorithms`, `databases`, `security`
- Domains: `web-development`, `machine-learning`, `devops`

## Troubleshooting

### PDF Not Found

```
Error: PDF file not found: /path/to/book.pdf
```

**Solution**: Check the path in your JSON config
```bash
ls -la ./path/to/book.pdf
```

### Text Extraction Failed

```
⚠️  pdftotext not found. Uploading PDF as-is without text extraction.
```

**Solution**: Install poppler-utils (see Text Extraction section)

### Permission Denied

```
Error: EACCES: permission denied
```

**Solution**: Check file permissions
```bash
chmod 644 your-book.pdf
```

### S3 Upload Failed

```
Error: Access Denied
```

**Solution**: Check AWS credentials and S3 bucket permissions
```bash
aws s3 ls s3://ai-library-books/
```

### Invalid PDF

```
Error: Unable to read PDF
```

**Solution**: Verify PDF is not corrupted
```bash
pdfinfo your-book.pdf
```

## Advanced Usage

### Batch Upload Multiple PDFs

Create a script to upload multiple books:

```bash
#!/bin/bash

for pdf in ./books/*.pdf; do
  filename=$(basename "$pdf" .pdf)
  
  cat > "./configs/${filename}.json" << EOF
{
  "pdfPath": "$pdf",
  "title": "$filename",
  "author": "Various",
  "description": "Auto-uploaded book",
  "topics": ["general"],
  "difficulty": "intermediate",
  "splitByPages": 15
}
EOF
  
  npm run upload-pdf "./configs/${filename}.json"
done
```

### Custom Processing

Import and extend the upload function:

```typescript
import { uploadPDFBook, PDFBookConfig } from './scripts/upload-pdf-book';

async function customUpload() {
  const config: PDFBookConfig = {
    pdfPath: './my-book.pdf',
    title: 'Custom Book',
    // ... other fields
  };
  
  // Add custom logic here
  await uploadPDFBook(config);
  // Post-processing here
}
```

## Output Example

```
Uploading PDF book: Python Programming Guide
Book ID: book-1709876543210
PDF: /home/user/books/python-guide.pdf

Uploading PDF to S3...
✓ Uploaded PDF to S3: books/book-1709876543210/original.pdf

Extracting text from PDF...
✓ PDF has 150 pages
✓ Splitting into 10 chapters (15 pages each)

Uploading chapters to S3...
  ✓ Uploaded chapter 1: Introduction to Python
  ✓ Uploaded chapter 2: Data Types and Variables
  ✓ Uploaded chapter 3: Control Flow
  ✓ Uploaded chapter 4: Functions and Modules
  ✓ Uploaded chapter 5: Object-Oriented Programming
  ✓ Uploaded chapter 6: File I/O and Exceptions
  ✓ Uploaded chapter 7: Advanced Topics
  ✓ Uploaded chapter 8: Best Practices
  ✓ Uploaded chapter 9: Real-World Projects
  ✓ Uploaded chapter 10: Conclusion

Saving metadata to DynamoDB...
✓ Book metadata saved to DynamoDB

✅ PDF book uploaded successfully!

Book Details:
  ID: book-1709876543210
  Title: Python Programming Guide
  Author: Jane Developer
  Total Pages: 150
  Chapters: 10
  PDF Location: s3://ai-library-books/books/book-1709876543210/original.pdf
```

## FAQ

**Q: Can I upload scanned PDFs?**
A: Yes, but text extraction won't work. Consider using OCR tools first.

**Q: What's the maximum PDF size?**
A: Limited by S3 (5GB per object) and Lambda timeout (15 minutes).

**Q: Can I update a book after uploading?**
A: Currently no. Delete and re-upload with a new book ID.

**Q: Are images from the PDF preserved?**
A: Images are in the original PDF but not extracted separately.

**Q: Can I upload EPUB or other formats?**
A: Not directly. Convert to PDF first using tools like Calibre.

**Q: How do I delete an uploaded book?**
A: Delete from DynamoDB and S3 manually or create a delete script.

## See Also

- [Main Upload Guide](./BOOK_UPLOAD_GUIDE.md)
- [Scripts README](./scripts/README.md)
- [Text-Based Book Upload](./scripts/upload-book.ts)
