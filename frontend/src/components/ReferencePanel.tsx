import { useState } from 'react';
import api from '../services/api';

interface SearchResult {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  section: string;
  content: string;
  context: string;
  relevanceScore: number;
}

interface SavedReference {
  referenceId: string;
  bookId: string;
  chapterId: string;
  section: string;
  title: string;
  content: string;
  createdAt: string;
}

interface ReferencePanelProps {
  bookId: string;
}

export default function ReferencePanel({ bookId }: ReferencePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [savedReferences, setSavedReferences] = useState<SavedReference[]>([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'ai' | 'saved'>('search');

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await api.get(`/books/${bookId}/search`, {
        params: { q: searchQuery }
      });
      setSearchResults(response.data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAIAnswer = async () => {
    if (!aiQuestion.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/reference/answer', {
        question: aiQuestion,
        bookId
      });
      setAiAnswer(response.data);
    } catch (err) {
      console.error('Failed to get AI answer:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveReference = async (result: SearchResult) => {
    try {
      await api.post('/reference/saved', {
        bookId: result.bookId,
        chapterId: result.chapterId,
        section: result.section,
        title: `${result.chapterTitle} - ${result.section}`,
        content: result.content
      });
      fetchSavedReferences();
    } catch (err) {
      console.error('Failed to save reference:', err);
    }
  };

  const fetchSavedReferences = async () => {
    try {
      const response = await api.get('/reference/saved');
      setSavedReferences(response.data.references || []);
    } catch (err) {
      console.error('Failed to fetch saved references:', err);
    }
  };

  const deleteSavedReference = async (referenceId: string) => {
    try {
      await api.delete(`/reference/saved/${referenceId}`);
      fetchSavedReferences();
    } catch (err) {
      console.error('Failed to delete reference:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 w-96 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Reference Mode</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 ${activeTab === 'search' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 ${activeTab === 'ai' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Ask AI
          </button>
          <button
            onClick={() => {
              setActiveTab('saved');
              fetchSavedReferences();
            }}
            className={`px-4 py-2 ${activeTab === 'saved' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Saved
          </button>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                placeholder="Search within this book..."
                className="w-full p-2 border border-gray-300 rounded mb-2 dark:bg-gray-600 dark:border-gray-500"
              />
              <button
                onClick={performSearch}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{result.chapterTitle}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{result.section}</p>
                    </div>
                    <button
                      onClick={() => saveReference(result)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{result.context}</p>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !loading && (
                <p className="text-gray-500 text-center py-4">No results found</p>
              )}
            </div>
          </div>
        )}

        {/* AI Answer Tab */}
        {activeTab === 'ai' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Ask a question and get an AI-generated answer with citations from the book.
            </p>

            <textarea
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="What would you like to know?"
              className="w-full p-2 border border-gray-300 rounded mb-2 dark:bg-gray-600 dark:border-gray-500"
              rows={3}
            />

            <button
              onClick={getAIAnswer}
              disabled={loading || !aiQuestion.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg mb-4 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Thinking...' : 'Get Answer'}
            </button>

            {aiAnswer && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <h4 className="font-semibold mb-2">Answer:</h4>
                  <p className="text-sm whitespace-pre-wrap">{aiAnswer.answer}</p>
                </div>

                {aiAnswer.citations && aiAnswer.citations.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Citations:</h4>
                    <ul className="space-y-1">
                      {aiAnswer.citations.map((citation: any, index: number) => (
                        <li key={index} className="text-xs text-gray-600 dark:text-gray-400">
                          • {citation.chapterTitle} - {citation.section}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnswer.relatedSections && aiAnswer.relatedSections.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Related Sections:</h4>
                    <div className="space-y-2">
                      {aiAnswer.relatedSections.map((section: SearchResult, index: number) => (
                        <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                          <p className="font-medium">{section.chapterTitle}</p>
                          <p className="text-gray-600 dark:text-gray-400">{section.section}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Saved References Tab */}
        {activeTab === 'saved' && (
          <div>
            <div className="space-y-3">
              {savedReferences.map((ref) => (
                <div key={ref.referenceId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-sm">{ref.title}</p>
                    <button
                      onClick={() => deleteSavedReference(ref.referenceId)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {new Date(ref.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                    {ref.content}
                  </p>
                </div>
              ))}
              {savedReferences.length === 0 && (
                <p className="text-gray-500 text-center py-4">No saved references yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
