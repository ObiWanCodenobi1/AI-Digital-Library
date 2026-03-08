import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import LearningPanel from '../components/LearningPanel';
import ReferencePanel from '../components/ReferencePanel';

interface Book {
  bookId: string;
  title: string;
  author: string;
  description: string;
  chapters: Chapter[];
}

interface Chapter {
  chapterId: string;
  chapterNumber: number;
  title: string;
  pageCount: number;
  content?: string;
}

interface ReadingProgress {
  chapterId: string;
  position: number;
  percentage: number;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
}

export default function BookReader() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTOC, setShowTOC] = useState(false);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    fontSize: 'medium'
  });
  const [mode, setMode] = useState<'reading' | 'learning' | 'reference'>('reading');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Fetch book metadata
  const fetchBook = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/books/${id}`);
      setBook(response.data.book);

      // Load reading progress
      const progressResponse = await api.get(`/books/${id}/progress`);
      const savedProgress = progressResponse.data.progress;
      setProgress(savedProgress);

      // Load last read chapter or first chapter
      if (savedProgress?.chapterId) {
        const chapter = response.data.book.chapters.find(
          (c: Chapter) => c.chapterId === savedProgress.chapterId
        );
        if (chapter) {
          loadChapter(chapter);
        }
      } else if (response.data.book.chapters.length > 0) {
        loadChapter(response.data.book.chapters[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user preferences
  const fetchPreferences = async () => {
    try {
      const response = await api.get('/preferences');
      setPreferences(response.data.preferences);
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  // Load chapter content
  const loadChapter = async (chapter: Chapter) => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/books/${id}/chapters/${chapter.chapterId}`);
      setCurrentChapter(chapter);
      setChapterContent(response.data.chapter.content || '');
      setShowTOC(false);

      // Highlight code blocks
      setTimeout(() => {
        Prism.highlightAll();
      }, 100);

      // Save progress
      saveProgress(chapter.chapterId, 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  };

  // Save reading progress
  const saveProgress = useCallback(async (chapterId: string, position: number) => {
    if (!id || !book) return;

    const chapterIndex = book.chapters.findIndex(c => c.chapterId === chapterId);
    const percentage = ((chapterIndex + 1) / book.chapters.length) * 100;

    try {
      await api.put(`/books/${id}/progress`, {
        chapterId,
        position,
        percentage
      });

      setProgress({ chapterId, position, percentage });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, [id, book]);

  // Update preferences
  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);

    try {
      await api.put('/preferences', updated);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  // Navigate to next/previous chapter
  const navigateChapter = (direction: 'next' | 'prev') => {
    if (!book || !currentChapter) return;

    const currentIndex = book.chapters.findIndex(
      c => c.chapterId === currentChapter.chapterId
    );

    let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex >= 0 && targetIndex < book.chapters.length) {
      loadChapter(book.chapters[targetIndex]);
    }
  };

  // Auto-save progress on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (currentChapter) {
        const position = window.scrollY;
        saveProgress(currentChapter.chapterId, position);
      }
    };

    const debounced = debounce(handleScroll, 2000);
    window.addEventListener('scroll', debounced);

    return () => window.removeEventListener('scroll', debounced);
  }, [currentChapter, saveProgress]);

  // Load initial data
  useEffect(() => {
    fetchBook();
    fetchPreferences();
  }, [id]);

  // Start learning session if in learning mode
  const startLearningSession = async () => {
    if (!id) return;
    
    try {
      const response = await api.post('/learning/sessions', {
        bookId: id,
        knowledgeLevel: 'intermediate'
      });
      setSessionId(response.data.session.sessionId);
      setMode('learning');
    } catch (err) {
      console.error('Failed to start learning session:', err);
    }
  };

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
  }, [preferences.theme]);

  const getFontSizeClass = () => {
    switch (preferences.fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-xl';
      default: return 'text-base';
    }
  };

  if (loading && !book) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading book...</p>
        </div>
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${preferences.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${preferences.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTOC(!showTOC)}
              className="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ☰ Contents
            </button>
            <div>
              <h1 className="text-lg font-semibold">{book?.title}</h1>
              {currentChapter && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Chapter {currentChapter.chapterNumber}: {currentChapter.title}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Mode Selector */}
            <div className="flex items-center gap-2 mr-4">
              <button
                onClick={() => setMode('reading')}
                className={`px-3 py-1 rounded ${mode === 'reading' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                Read
              </button>
              <button
                onClick={() => {
                  if (!sessionId) {
                    startLearningSession();
                  } else {
                    setMode('learning');
                  }
                }}
                className={`px-3 py-1 rounded ${mode === 'learning' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                Learn
              </button>
              <button
                onClick={() => setMode('reference')}
                className={`px-3 py-1 rounded ${mode === 'reference' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                Reference
              </button>
            </div>

            {/* Font Size Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updatePreferences({ fontSize: 'small' })}
                className={`px-3 py-1 rounded ${preferences.fontSize === 'small' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                A
              </button>
              <button
                onClick={() => updatePreferences({ fontSize: 'medium' })}
                className={`px-3 py-1 rounded text-lg ${preferences.fontSize === 'medium' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                A
              </button>
              <button
                onClick={() => updatePreferences({ fontSize: 'large' })}
                className={`px-3 py-1 rounded text-xl ${preferences.fontSize === 'large' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                A
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })}
              className="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {preferences.theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* Progress */}
            {progress && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {progress.percentage.toFixed(0)}% complete
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Table of Contents Sidebar */}
        {showTOC && book && (
          <div className={`w-80 border-r ${preferences.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} overflow-y-auto h-screen sticky top-16`}>
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4">Table of Contents</h2>
              <div className="space-y-2">
                {book.chapters.map((chapter) => (
                  <button
                    key={chapter.chapterId}
                    onClick={() => loadChapter(chapter)}
                    className={`w-full text-left px-4 py-3 rounded ${
                      currentChapter?.chapterId === chapter.chapterId
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium">
                      {chapter.chapterNumber}. {chapter.title}
                    </div>
                    <div className="text-sm opacity-75">
                      {chapter.pageCount} pages
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          <div className={`max-w-4xl mx-auto px-8 py-12 ${getFontSizeClass()}`}>
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {!loading && !error && chapterContent && (
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: chapterContent }}
              />
            )}

            {/* Navigation */}
            {book && currentChapter && (
              <div className="flex justify-between mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => navigateChapter('prev')}
                  disabled={book.chapters[0].chapterId === currentChapter.chapterId}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  ← Previous Chapter
                </button>
                <button
                  onClick={() => navigateChapter('next')}
                  disabled={book.chapters[book.chapters.length - 1].chapterId === currentChapter.chapterId}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  Next Chapter →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Learning Panel */}
        {mode === 'learning' && book && currentChapter && (
          <LearningPanel 
            bookId={book.bookId} 
            chapterId={currentChapter.chapterId}
            sessionId={sessionId || undefined}
          />
        )}

        {/* Reference Panel */}
        {mode === 'reference' && book && (
          <ReferencePanel bookId={book.bookId} />
        )}
      </div>
    </div>
  );
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
