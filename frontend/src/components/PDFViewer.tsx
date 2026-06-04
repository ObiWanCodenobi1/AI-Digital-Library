import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

interface PDFViewerProps {
  file: File;
}

export default function PDFViewer({ file }: PDFViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center gap-3">
        <FileText className="text-slate-400 w-5 h-5" />
        <span className="text-sm font-medium text-slate-300 truncate">{file.name}</span>
      </div>
      <div className="flex-1 w-full h-full bg-slate-950 p-2">
        {fileUrl ? (
          <iframe 
            src={`${fileUrl}#toolbar=0`} 
            className="w-full h-full rounded-lg shadow-inner bg-white"
            title="PDF Viewer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            Loading Document...
          </div>
        )}
      </div>
    </div>
  );
}
