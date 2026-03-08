# Book Upload System - Complete Guide

Upload books to your AI Digital Library in two ways: text-based or PDF.

## 🚀 Quick Start

### Text-Based Upload (Custom Content)
```bash
npm run upload-book ./sample-books/typescript-book.json
```

### PDF Upload (Existing PDFs)
```bash
npm run upload-pdf ./sample-books/sample-pdf-book.json
```

## 📚 Documentation

- **[Quick Start Guide](./BOOK_UPLOAD_GUIDE.md)** - Get started in 5 minutes
- **[PDF Upload Guide](./PDF_UPLOAD_GUIDE.md)** - Complete PDF upload documentation
- **[Upload Comparison](./UPLOAD_COMPARISON.md)** - Choose the right method
- **[Scripts README](./scripts/README.md)** - Technical details

## 🎯 Choose Your Method

### Text-Based Upload
**Best for:** New content, tutorials, documentation

```json
{
  "title": "My Book",
  "author": "Author Name",
  "description": "Description",
  "topics": ["programming"],
  "difficulty": "beginner",
  "chapters": [
    {
      "chapterId": "chapter-1",
      "chapterNumber": 1,
      "title": "Introduction",
      "s3Key": "",
      "pageCount": 10,
      "filePath": "./chapters/chapter1.txt"
    }
  ]
}
```

### PDF Upload
**Best for:** Existing PDFs, quick uploads, batch processing

```json
{
  "pdfPath": "./my-book.pdf",
  "title": "My Book",
  "author": "Author Name",
  "description": "Description",
  "topics": ["programming"],
  "difficulty": "intermediate",
  "splitByPages": 15,
  "chapterTitles": ["Intro", "Chapter 1", "Chapter 2"]
}
```

## 📋 Prerequisites

1. **AWS Setup**
   ```bash
   aws configure
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **PDF Tools (Optional but Recommended)**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install poppler-utils
   
   # macOS
   brew install poppler
   ```

4. **Environment Variables**
   ```bash
   # .env file
   AWS_REGION=us-east-1
   BOOKS_TABLE=Books
   BOOKS_BUCKET=ai-library-books
   ```

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `npm run upload-book <json>` | Upload text-based book |
| `npm run upload-pdf <json>` | Upload PDF book |

## 📖 Examples

### Example 1: Programming Tutorial (Text-Based)

```bash
# Create chapters
mkdir -p books/python/chapters
echo "# Chapter 1: Intro" > books/python/chapters/ch1.txt

# Create config
cat > books/python/book.json << 'EOF'
{
  "title": "Python Basics",
  "author": "Your Name",
  "description": "Learn Python",
  "topics": ["python", "programming"],
  "difficulty": "beginner",
  "chapters": [{
    "chapterId": "ch-1",
    "chapterNumber": 1,
    "title": "Introduction",
    "s3Key": "",
    "pageCount": 10,
    "filePath": "./books/python/chapters/ch1.txt"
  }]
}
EOF

# Upload
npm run upload-book books/python/book.json
```

### Example 2: Technical Manual (PDF)

```bash
# Create config
cat > books/manual.json << 'EOF'
{
  "pdfPath": "./manuals/api-guide.pdf",
  "title": "API Reference Manual",
  "author": "Tech Corp",
  "description": "Complete API documentation",
  "topics": ["api", "documentation"],
  "difficulty": "advanced",
  "splitByPages": 20
}
EOF

# Upload
npm run upload-pdf books/manual.json
```

## ✅ What Gets Uploaded

### Text-Based Upload
1. ✓ Chapter text files → S3
2. ✓ Book metadata → DynamoDB
3. ✓ Searchable content indexed

### PDF Upload
1. ✓ Original PDF → S3
2. ✓ Extracted text (per chapter) → S3
3. ✓ Book metadata → DynamoDB
4. ✓ Searchable content indexed

## 🎨 Features

- ✅ Automatic chapter organization
- ✅ Full-text search support
- ✅ AI chat with book content
- ✅ Quiz generation
- ✅ Progress tracking
- ✅ Multi-language support
- ✅ Metadata management

## 🐛 Troubleshooting

### AWS Credentials Error
```bash
aws configure
# Enter your AWS credentials
```

### S3 Bucket Not Found
```bash
aws s3 mb s3://ai-library-books --region us-east-1
```

### DynamoDB Table Not Found
```bash
aws dynamodb create-table \
  --table-name Books \
  --attribute-definitions AttributeName=bookId,AttributeType=S \
  --key-schema AttributeName=bookId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### PDF Text Extraction Not Working
```bash
# Install poppler-utils
sudo apt-get install poppler-utils  # Ubuntu/Debian
brew install poppler                 # macOS
```

## 📊 Comparison

| Feature | Text-Based | PDF |
|---------|-----------|-----|
| Setup Time | Medium | Fast |
| Control | High | Medium |
| Formatting | Full | Limited |
| Best For | New content | Existing PDFs |

## 🔗 Related

- [Main README](./README.md)
- [Requirements](./requirements.md)
- [Design Document](./design.md)
- [Testing Guide](./TESTING_GUIDE.md)

## 💡 Tips

1. **Use descriptive topics** for better search
2. **Set appropriate difficulty** levels
3. **Include publication year** for versioning
4. **Add cover images** for visual appeal
5. **Test with sample books** first
6. **Verify uploads** in AWS Console

## 🤝 Need Help?

- Check the [Quick Start Guide](./BOOK_UPLOAD_GUIDE.md)
- Read the [PDF Upload Guide](./PDF_UPLOAD_GUIDE.md)
- Compare methods in [Upload Comparison](./UPLOAD_COMPARISON.md)
- Review [Scripts README](./scripts/README.md)

## 📝 Next Steps

After uploading:
1. Verify in AWS Console (DynamoDB + S3)
2. Test book retrieval via API
3. Check search functionality
4. Try AI chat with book
5. Generate quizzes
6. Upload more books!

---

**Ready to upload?** Start with the [Quick Start Guide](./BOOK_UPLOAD_GUIDE.md)!
