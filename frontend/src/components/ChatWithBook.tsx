import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

interface Message {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: string;
}

interface Citation {
  chapterNumber: number;
  chapterTitle: string;
  sectionTitle: string;
  pageNumber: number;
  excerpt: string;
  relevanceScore: number;
}

interface ChatWithBookProps {
  bookId: string;
  bookTitle: string;
}

export default function ChatWithBook({ bookId, bookTitle }: ChatWithBookProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startSession();
  }, [bookId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startSession = async () => {
    try {
      const response = await api.post('/chat/sessions', {
        bookId,
        language: 'en'
      });
      setSessionId(response.data.session.sessionId);
    } catch (err) {
      console.error('Failed to start chat session:', err);
      setError('Failed to start chat session');
    }
  };

  const askQuestion = async () => {
    if (!question.trim() || !sessionId) return;

    const userQuestion = question;
    setQuestion('');
    setLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      messageId: `temp-${Date.now()}`,
      role: 'user',
      content: userQuestion,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await api.post(`/chat/sessions/${sessionId}/ask`, {
        question: userQuestion
      });

      const assistantMessage: Message = {
        messageId: response.data.messageId,
        role: 'assistant',
        content: response.data.answer,
        citations: response.data.citations,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to get answer');
      // Remove user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold">Chat with Book</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{bookTitle}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Ask me anything about this book!</p>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Example questions:</p>
              <button
                onClick={() => setQuestion('What are the main concepts covered in this book?')}
                className="block w-full text-left px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
              >
                What are the main concepts covered in this book?
              </button>
              <button
                onClick={() => setQuestion('Can you explain the key takeaways?')}
                className="block w-full text-left px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
              >
                Can you explain the key takeaways?
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.messageId}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                  <p className="text-xs font-semibold mb-2 opacity-75">Citations:</p>
                  <div className="space-y-1">
                    {message.citations.map((citation, index) => (
                      <div key={index} className="text-xs opacity-75">
                        • Chapter {citation.chapterNumber}: {citation.chapterTitle} - {citation.sectionTitle} (p. {citation.pageNumber})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs opacity-50 mt-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this book..."
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none dark:bg-gray-700 dark:border-gray-600"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={askQuestion}
            disabled={loading || !question.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
