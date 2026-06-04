import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';

interface PDFUploaderProps {
  onUploadSuccess: (documentId: string, file: File) => void;
}

export default function PDFUploader({ onUploadSuccess }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onUploadSuccess(data.document_id, file);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div 
        className={`w-full max-w-md p-10 border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col items-center justify-center text-center space-y-6 ${
          isDragging 
            ? 'border-blue-400 bg-blue-500/10 scale-105' 
            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full"></div>
          {isUploading ? (
            <Loader2 className="w-16 h-16 text-blue-400 animate-spin relative z-10" />
          ) : (
            <UploadCloud className="w-16 h-16 text-blue-400 relative z-10" />
          )}
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2">
            {isUploading ? 'Processing Document...' : 'Upload PDF Document'}
          </h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            {isUploading 
              ? 'Extracting text and generating vectors. This might take a moment.'
              : 'Drag and drop your PDF here, or click to select a file from your computer.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg w-full">
            {error}
          </div>
        )}

        {!isUploading && (
          <label className="relative overflow-hidden cursor-pointer group">
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              onChange={onChange}
            />
            <div className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Select File</span>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
