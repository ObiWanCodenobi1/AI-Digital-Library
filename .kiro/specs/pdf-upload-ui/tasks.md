# Implementation Plan: PDF Upload UI

## Overview

This implementation plan breaks down the PDF upload UI feature into discrete coding tasks. The approach follows a bottom-up strategy: first implementing backend services and API endpoints, then building frontend components, and finally integrating everything together. Each task builds on previous work to ensure incremental progress with no orphaned code.

## Tasks

- [x] 1. Set up PDF processing dependencies and utilities
  - Install pdf-parse library for text extraction in backend
  - Create utility functions for S3 key generation (books/{bookId}/original.pdf pattern)
  - Create utility functions for generating unique IDs (bookId, uploadId)
  - _Requirements: 3.2, 6.3, 6.1_

- [ ] 2. Implement PDF Processor Service
  - [x] 2.1 Create pdf-processor.ts service file with core processing functions
    - Implement extractTextFromPDF(s3Key: string): Promise<string>
    - Implement getPDFPageCount(s3Key: string): Promise<number>
    - Implement splitTextIntoChapters(text: string, totalPages: number, pagesPerChapter: number): string[]
    - Implement uploadChapters(bookId: string, chapterTexts: string[], totalPages: number): Promise<Chapter[]>
    - Implement saveBookMetadata(book: Book): Promise<void>
    - Implement main processPDF(bookId: string, metadata: BookMetadata): Promise<Book> orchestration function
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 6.1, 6.2, 6.5_

  - [ ]* 2.2 Write property test for chapter count calculation
    - **Property 15: Chapter Count Calculation**
    - **Validates: Requirements 3.5**

  - [ ]* 2.3 Write property test for chapter S3 key pattern
    - **Property 16: Chapter S3 Key Pattern**
    - **Validates: Requirements 3.6**

  - [ ]* 2.4 Write property test for chapter numbering
    - **Property 17: Chapter Numbering**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 2.5 Write property test for PDF S3 key format
    - **Property 20: PDF S3 Key Format**
    - **Validates: Requirements 6.3**

  - [ ]* 2.6 Write unit tests for error handling (text extraction failure, page count failure)
    - Test graceful degradation when text extraction fails
    - Test default to 1 page when page count extraction fails
    - _Requirements: 3.3_

- [ ] 3. Implement Upload Handler Lambda endpoints
  - [-] 3.1 Create upload-handler.ts with POST /upload/initiate endpoint
    - Validate incoming metadata (required fields, types)
    - Generate unique bookId and uploadId
    - Generate S3 presigned URL for PDF upload
    - Return upload session data (uploadId, bookId, presignedUrl, expiresIn)
    - _Requirements: 1.4, 6.1_

  - [~] 3.2 Create POST /upload/complete endpoint
    - Verify PDF exists in S3 at expected location
    - Trigger PDF processor with bookId and metadata
    - Return processing status
    - _Requirements: 3.1, 6.1_

  - [ ]* 3.3 Write property test for presigned URL generation
    - **Property 9: Presigned URL Generation**
    - **Validates: Requirements 1.4**

  - [ ]* 3.4 Write property test for processing trigger
    - **Property 12: Processing Trigger**
    - **Validates: Requirements 3.1**

  - [ ]* 3.5 Write unit tests for upload handler error cases
    - Test invalid metadata returns 400
    - Test missing PDF returns 404
    - Test S3 failures return 500
    - _Requirements: 5.2, 5.3_

- [~] 4. Checkpoint - Backend services complete
  - Ensure all backend tests pass
  - Verify PDF processor can handle sample PDFs
  - Ask the user if questions arise

- [ ] 5. Implement file validation utilities
  - [~] 5.1 Create validation.ts with file validation functions
    - Implement validateFileExtension(filename: string): ValidationResult
    - Implement validateFileSize(sizeBytes: number): ValidationResult
    - Implement validateMetadata(metadata: BookMetadata): ValidationResult
    - Implement validatePublicationYear(year?: number): ValidationResult
    - Implement validateCoverImageUrl(url?: string): ValidationResult
    - _Requirements: 1.1, 1.2, 2.1, 2.4, 2.5, 9.1_

  - [ ]* 5.2 Write property test for PDF extension validation
    - **Property 1: PDF Extension Validation**
    - **Validates: Requirements 1.1**

  - [ ]* 5.3 Write property test for file size validation
    - **Property 2: File Size Validation**
    - **Validates: Requirements 1.2, 9.1, 9.2**

  - [ ]* 5.4 Write property test for required fields validation
    - **Property 4: Required Fields Validation**
    - **Validates: Requirements 2.1, 2.6**

  - [ ]* 5.5 Write property test for publication year validation
    - **Property 7: Publication Year Validation**
    - **Validates: Requirements 2.4**

  - [ ]* 5.6 Write property test for cover image URL validation
    - **Property 8: Cover Image URL Validation**
    - **Validates: Requirements 2.5**

- [ ] 6. Implement ProgressIndicator component
  - [~] 6.1 Create ProgressIndicator.tsx component
    - Accept props: stage, progress, message
    - Render progress bar with percentage
    - Display current stage message
    - Apply appropriate styling for each stage
    - _Requirements: 1.5, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.2 Write property test for progress calculation
    - **Property 10: Progress Calculation**
    - **Validates: Requirements 1.5**

  - [ ]* 6.3 Write unit tests for ProgressIndicator rendering
    - Test progress bar displays correct percentage
    - Test stage messages display correctly
    - Test success styling applied on complete
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Implement FileUploadInput component
  - [~] 7.1 Create FileUploadInput.tsx component
    - Accept props: onFileSelect, accept, maxSizeMB, error
    - Implement file input with drag-and-drop support
    - Display selected file information (name, size)
    - Show validation errors
    - Call onFileSelect when valid file is selected
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 7.2 Write unit tests for FileUploadInput
    - Test file selection triggers onFileSelect
    - Test drag-and-drop functionality
    - Test error display
    - Test file info display
    - _Requirements: 1.3_

- [ ] 8. Implement UploadPage component core structure
  - [~] 8.1 Create UploadPage.tsx with state management
    - Define UploadState interface and initialize state
    - Create form layout with file input and metadata fields
    - Implement handleFileSelect to validate and set file
    - Implement handleMetadataChange to update metadata fields
    - Add form validation before submission
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 8.2 Write property test for topics array handling
    - **Property 5: Topics Array Handling**
    - **Validates: Requirements 2.2**

  - [ ]* 8.3 Write property test for difficulty value validation
    - **Property 6: Difficulty Value Validation**
    - **Validates: Requirements 2.3**

  - [ ]* 8.4 Write unit tests for form validation
    - Test required fields prevent submission
    - Test invalid publication year shows error
    - Test invalid cover URL shows error
    - _Requirements: 2.1, 2.4, 2.5, 2.6_

- [ ] 9. Implement upload workflow in UploadPage
  - [~] 9.1 Implement initiateUpload function
    - Call POST /upload/initiate with file info and metadata
    - Store upload session data in state
    - Handle API errors and display error messages
    - _Requirements: 1.4_

  - [~] 9.2 Implement uploadToS3 function
    - Upload file to presigned URL using XMLHttpRequest or fetch
    - Track upload progress and update state
    - Handle upload errors (network, timeout, S3 failures)
    - _Requirements: 1.5, 5.2, 5.4_

  - [~] 9.3 Implement completeUpload function
    - Call POST /upload/complete with uploadId and bookId
    - Update state to processing status
    - Handle processing errors
    - Store uploaded bookId on success
    - _Requirements: 3.1, 5.3_

  - [~] 9.4 Implement resetForm function
    - Clear all form fields
    - Reset state to initial values
    - Clear error messages
    - _Requirements: 10.4_

  - [ ]* 9.5 Write property test for upload state machine
    - **Property 11: Upload State Machine**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [ ]* 9.6 Write property test for validation before upload
    - **Property 3: Validation Before Upload**
    - **Validates: Requirements 9.3**

  - [ ]* 9.7 Write unit tests for upload workflow
    - Test successful upload flow from start to finish
    - Test error handling at each stage
    - Test retry functionality
    - _Requirements: 1.4, 1.5, 3.1, 5.2, 5.3_

- [ ] 10. Implement success and error states in UploadPage
  - [~] 10.1 Add success state UI
    - Display success message with book title
    - Add "View Book" button linking to /book/{bookId}
    - Add "Upload Another" button that calls resetForm
    - _Requirements: 4.4, 4.5, 10.1, 10.2, 10.3_

  - [~] 10.2 Add error state UI
    - Display error messages based on error type
    - Show retry button for transient errors
    - Preserve form data on error
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ]* 10.3 Write property test for validation error messages
    - **Property 22: Validation Error Messages**
    - **Validates: Requirements 5.1**

  - [ ]* 10.4 Write property test for form state persistence on error
    - **Property 23: Form State Persistence on Error**
    - **Validates: Requirements 5.5**

  - [ ]* 10.5 Write property test for success message content
    - **Property 24: Success Message Content**
    - **Validates: Requirements 4.5, 10.1, 10.2, 10.3**

  - [ ]* 10.6 Write property test for form reset
    - **Property 25: Form Reset**
    - **Validates: Requirements 10.4**

- [ ] 11. Add navigation and routing
  - [~] 11.1 Add "Upload Book" link to main navigation
    - Update navigation component to include upload link
    - Link should navigate to /upload route
    - _Requirements: 7.1, 7.2_

  - [~] 11.2 Add /upload route to router configuration
    - Configure route to render UploadPage component
    - Add page heading "Upload PDF Book"
    - _Requirements: 7.2, 7.4_

  - [ ]* 11.3 Write unit tests for navigation
    - Test upload link exists in navigation
    - Test clicking link navigates to /upload
    - Test upload page displays correct heading
    - _Requirements: 7.1, 7.2, 7.4_

- [ ] 12. Implement data persistence property tests
  - [ ]* 12.1 Write property test for book record creation
    - **Property 18: Book Record Creation**
    - **Validates: Requirements 6.1**

  - [ ]* 12.2 Write property test for book record completeness
    - **Property 19: Book Record Completeness**
    - **Validates: Requirements 6.2, 6.4**

  - [ ]* 12.3 Write property test for timestamp format
    - **Property 21: Timestamp Format**
    - **Validates: Requirements 6.5**

  - [ ]* 12.4 Write property test for text extraction attempt
    - **Property 13: Text Extraction Attempt**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 12.5 Write property test for page count extraction
    - **Property 14: Page Count Extraction**
    - **Validates: Requirements 3.4**

- [ ] 13. Integration and end-to-end testing
  - [ ]* 13.1 Write integration test for complete upload workflow
    - Test file selection → metadata entry → upload → processing → success
    - Use mock S3 and DynamoDB services
    - Verify book appears in library after upload
    - _Requirements: All requirements_

  - [ ]* 13.2 Write integration test for error scenarios
    - Test upload failure recovery
    - Test processing failure handling
    - Test network error handling
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [~] 14. Final checkpoint - Complete feature
  - Ensure all tests pass (unit and property tests)
  - Test upload with real PDF files in development environment
  - Verify uploaded books appear in Browse page
  - Verify uploaded books can be read
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Backend tasks (1-4) should be completed before frontend tasks (5-11)
- Integration tests (13) should be completed last after all components are implemented
