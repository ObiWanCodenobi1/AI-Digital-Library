# Requirements Document: PDF Upload UI

## Introduction

This document specifies the requirements for adding a web-based PDF upload interface to the AI Digital Library. Currently, users can only upload PDF books through a command-line script. This feature will provide a user-friendly web interface that allows users to upload PDF books directly through the website, with the same processing capabilities as the CLI script (text extraction, chapter splitting, S3 storage, and DynamoDB metadata management).

## Glossary

- **Upload_Form**: The web interface component that collects PDF file and book metadata from users
- **Upload_Handler**: The backend Lambda function that processes PDF uploads and orchestrates the upload workflow
- **PDF_Processor**: The backend service that extracts text from PDF files and splits content into chapters
- **Progress_Indicator**: The UI component that displays upload and processing status to users
- **File_Validator**: The component that validates PDF files before upload (file type, size, format)
- **S3_Storage**: AWS S3 bucket service for storing PDF files and chapter content
- **Metadata_Store**: DynamoDB table for storing book metadata and chapter information
- **Presigned_URL**: A temporary, secure URL for uploading files directly to S3 from the browser
- **Upload_Session**: A tracked upload operation with unique identifier and status

## Requirements

### Requirement 1: PDF File Upload

**User Story:** As a user, I want to upload a PDF file through the web interface, so that I can add books to the library without using command-line tools.

#### Acceptance Criteria

1. WHEN a user selects a PDF file, THE File_Validator SHALL verify the file has a .pdf extension
2. WHEN a user selects a file larger than 50MB, THE File_Validator SHALL reject the file and display an error message
3. WHEN a valid PDF is selected, THE Upload_Form SHALL display the filename and file size
4. WHEN the upload begins, THE System SHALL generate a Presigned_URL for direct S3 upload
5. WHEN uploading to S3, THE Progress_Indicator SHALL display upload percentage based on bytes transferred

### Requirement 2: Book Metadata Collection

**User Story:** As a user, I want to provide book information during upload, so that the book is properly cataloged in the library.

#### Acceptance Criteria

1. THE Upload_Form SHALL require title, author, and description fields before submission
2. THE Upload_Form SHALL provide a topics field that accepts multiple topic tags
3. THE Upload_Form SHALL provide a difficulty selector with options: beginner, intermediate, advanced
4. WHERE a user provides publication year, THE Upload_Form SHALL validate it is a four-digit number between 1000 and current year
5. WHERE a user provides a cover image URL, THE Upload_Form SHALL validate it is a valid URL format
6. WHEN any required field is empty, THE Upload_Form SHALL prevent submission and highlight missing fields

### Requirement 3: PDF Processing

**User Story:** As a system administrator, I want PDFs to be processed automatically after upload, so that book content is extracted and organized into chapters.

#### Acceptance Criteria

1. WHEN a PDF upload completes, THE Upload_Handler SHALL trigger the PDF_Processor
2. WHEN processing begins, THE PDF_Processor SHALL extract text content from the PDF file
3. IF text extraction fails, THEN THE PDF_Processor SHALL continue with empty chapter content and log the failure
4. WHEN text is extracted, THE PDF_Processor SHALL determine page count from the PDF
5. WHEN page count is determined, THE PDF_Processor SHALL split content into chapters of 10 pages each
6. WHEN chapters are created, THE System SHALL upload each chapter text to S3_Storage with key pattern: books/{bookId}/chapters/chapter-{N}.txt

### Requirement 4: Progress Feedback

**User Story:** As a user, I want to see upload and processing progress, so that I know the status of my book upload.

#### Acceptance Criteria

1. WHEN upload begins, THE Progress_Indicator SHALL display "Uploading PDF..." with percentage
2. WHEN S3 upload completes, THE Progress_Indicator SHALL display "Processing PDF..."
3. WHEN processing completes, THE Progress_Indicator SHALL display "Extracting text and creating chapters..."
4. WHEN all steps complete successfully, THE Progress_Indicator SHALL display "Upload complete!" with success styling
5. WHEN the upload completes, THE System SHALL display a link to view the uploaded book

### Requirement 5: Error Handling

**User Story:** As a user, I want clear error messages when upload fails, so that I can understand what went wrong and retry if needed.

#### Acceptance Criteria

1. IF file validation fails, THEN THE Upload_Form SHALL display a specific error message describing the validation failure
2. IF S3 upload fails, THEN THE System SHALL display "Upload failed. Please try again." and allow retry
3. IF PDF processing fails, THEN THE System SHALL display "Processing failed. The PDF may be corrupted or invalid."
4. IF network connection is lost during upload, THEN THE System SHALL display "Connection lost. Please check your network and retry."
5. WHEN an error occurs, THE Upload_Form SHALL remain populated with user-entered data to allow easy retry

### Requirement 6: Data Persistence

**User Story:** As a system, I want to store book metadata and content reliably, so that uploaded books are available in the library.

#### Acceptance Criteria

1. WHEN processing completes, THE Upload_Handler SHALL create a book record in Metadata_Store with unique bookId
2. THE book record SHALL include: bookId, title, author, description, topics, difficulty, publicationYear, coverImage, s3Key, chapters array, totalPages, createdAt, updatedAt
3. WHEN saving metadata, THE System SHALL store the original PDF S3 key as: books/{bookId}/original.pdf
4. WHEN creating chapter records, THE System SHALL include: chapterId, chapterNumber, title, s3Key, pageCount
5. WHEN metadata is saved, THE System SHALL set both createdAt and updatedAt to current ISO timestamp

### Requirement 7: Upload Page Access

**User Story:** As a user, I want to access the upload page from the main navigation, so that I can easily find the upload feature.

#### Acceptance Criteria

1. THE System SHALL provide a navigation link labeled "Upload Book" in the main navigation menu
2. WHEN a user clicks "Upload Book", THE System SHALL navigate to the upload page at route /upload
3. THE upload page SHALL be accessible without authentication for the initial implementation
4. THE upload page SHALL display a clear heading "Upload PDF Book"

### Requirement 8: Chapter Title Generation

**User Story:** As a system, I want to generate default chapter titles, so that chapters are properly labeled when no custom titles are provided.

#### Acceptance Criteria

1. WHEN creating chapters, THE PDF_Processor SHALL generate default titles in format "Chapter {N}" where N is the chapter number
2. THE chapter numbering SHALL start at 1 and increment sequentially
3. WHEN a PDF has 100 pages with 10 pages per chapter, THE System SHALL create 10 chapters numbered 1 through 10

### Requirement 9: File Size Validation

**User Story:** As a system administrator, I want to enforce file size limits, so that the system remains performant and storage costs are controlled.

#### Acceptance Criteria

1. THE File_Validator SHALL reject files larger than 50MB
2. WHEN a file exceeds 50MB, THE System SHALL display error message: "File size exceeds 50MB limit. Please upload a smaller file."
3. THE File_Validator SHALL check file size before initiating S3 upload

### Requirement 10: Upload Success Confirmation

**User Story:** As a user, I want confirmation when my upload succeeds, so that I know the book was added successfully and can view it.

#### Acceptance Criteria

1. WHEN upload and processing complete successfully, THE System SHALL display a success message with the book title
2. THE success message SHALL include a "View Book" button that navigates to /book/{bookId}
3. THE success message SHALL include an "Upload Another" button that resets the form
4. WHEN "Upload Another" is clicked, THE Upload_Form SHALL clear all fields and reset to initial state
