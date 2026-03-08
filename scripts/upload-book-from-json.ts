#!/usr/bin/env ts-node

import { uploadBook, BookData } from './upload-book';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npm run upload-book <path-to-book.json>');
    console.error('\nExample: npm run upload-book ./sample-books/typescript-book.json');
    process.exit(1);
  }

  const jsonPath = path.resolve(args[0]);
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: File not found: ${jsonPath}`);
    process.exit(1);
  }

  try {
    const bookData: BookData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    await uploadBook(bookData);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
