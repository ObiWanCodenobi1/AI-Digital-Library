import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import PDFUploader from './components/PDFUploader';
import PDFViewer from './components/PDFViewer';
import ChatPanel from './components/ChatPanel';
import QuizModal from './components/QuizModal';

export default function App() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  const handleUploadSuccess = (id: string, file: File) => {
    setDocumentId(id);
    setPdfFile(file);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Sidebar / Left Panel */}
      <div className="w-1/2 h-full flex flex-col border-r border-slate-700 bg-slate-900 shadow-xl relative z-10">
        <header className="p-6 border-b border-slate-700 flex items-center gap-3 bg-slate-800/50">
          <BookOpen className="text-blue-400 w-8 h-8" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            OmniLibrary AI
          </h1>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {!documentId ? (
            <PDFUploader onUploadSuccess={handleUploadSuccess} />
          ) : (
            <PDFViewer file={pdfFile!} />
          )}
        </main>
      </div>

      {/* Right Panel */}
      <div className="w-1/2 h-full flex flex-col bg-slate-800 relative z-0">
        {documentId ? (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shadow-md">
              <h2 className="text-lg font-semibold text-slate-200">AI Assistant</h2>
              <button 
                onClick={() => setIsQuizModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                Generate Quiz
              </button>
            </div>
            <ChatPanel documentId={documentId} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-4">
            <div className="w-24 h-24 bg-slate-700/30 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-xl font-medium text-slate-400">Upload a document to begin</h2>
            <p className="max-w-md">The AI assistant is waiting to help you read, summarize, and quiz you on your reading material.</p>
          </div>
        )}
      </div>

      {isQuizModalOpen && documentId && (
        <QuizModal 
          documentId={documentId} 
          onClose={() => setIsQuizModalOpen(false)} 
        />
      )}
    </div>
  );
}
