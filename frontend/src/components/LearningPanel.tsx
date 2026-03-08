import { useState, useEffect } from 'react';
import api from '../services/api';

interface Note {
  noteId: string;
  bookId: string;
  chapterId: string;
  location: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Bookmark {
  bookmarkId: string;
  bookId: string;
  chapterId: string;
  location: string;
  title: string;
  createdAt: string;
}

interface LearningSession {
  sessionId: string;
  bookId: string;
  overallProgress: number;
  completedChapters: string[];
  timeSpent: number;
}

interface LearningPanelProps {
  bookId: string;
  chapterId: string;
  sessionId?: string;
}

export default function LearningPanel({ bookId, chapterId, sessionId }: LearningPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [showAssistance, setShowAssistance] = useState(false);
  const [assistanceContext, setAssistanceContext] = useState('');
  const [assistance, setAssistance] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks' | 'progress' | 'assistance'>('notes');

  useEffect(() => {
    fetchNotes();
    fetchBookmarks();
    if (sessionId) {
      fetchSession();
    }
  }, [bookId, chapterId]);

  const fetchNotes = async () => {
    try {
      const response = await api.get('/notes', { params: { bookId } });
      setNotes(response.data.notes.filter((n: Note) => n.chapterId === chapterId));
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const response = await api.get('/bookmarks', { params: { bookId } });
      setBookmarks(response.data.bookmarks.filter((b: Bookmark) => b.chapterId === chapterId));
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    }
  };

  const fetchSession = async () => {
    if (!sessionId) return;
    try {
      const response = await api.get(`/learning/sessions/${sessionId}`);
      setSession(response.data.session);
    } catch (err) {
      console.error('Failed to fetch session:', err);
    }
  };

  const createNote = async () => {
    if (!newNote.trim()) return;

    try {
      await api.post('/notes', {
        bookId,
        chapterId,
        location: window.scrollY.toString(),
        content: newNote
      });
      setNewNote('');
      setShowNoteEditor(false);
      fetchNotes();
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await api.delete(`/notes/${noteId}`);
      fetchNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const createBookmark = async () => {
    if (!newBookmarkTitle.trim()) return;

    try {
      await api.post('/bookmarks', {
        bookId,
        chapterId,
        location: window.scrollY.toString(),
        title: newBookmarkTitle
      });
      setNewBookmarkTitle('');
      fetchBookmarks();
    } catch (err) {
      console.error('Failed to create bookmark:', err);
    }
  };

  const deleteBookmark = async (bookmarkId: string) => {
    try {
      await api.delete(`/bookmarks/${bookmarkId}`);
      fetchBookmarks();
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  const getAssistance = async () => {
    if (!assistanceContext.trim() || !sessionId) return;

    setLoading(true);
    try {
      const response = await api.post(`/learning/sessions/${sessionId}/assistance`, {
        context: assistanceContext
      });
      setAssistance(response.data.assistance.content);
    } catch (err) {
      console.error('Failed to get assistance:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 w-96 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Learning Tools</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 ${activeTab === 'notes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-4 py-2 ${activeTab === 'bookmarks' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Bookmarks ({bookmarks.length})
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-4 py-2 ${activeTab === 'progress' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Progress
          </button>
          <button
            onClick={() => setActiveTab('assistance')}
            className={`px-4 py-2 ${activeTab === 'assistance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Help
          </button>
        </div>

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div>
            <button
              onClick={() => setShowNoteEditor(!showNoteEditor)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg mb-4 hover:bg-blue-700"
            >
              + Add Note
            </button>

            {showNoteEditor && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your note here..."
                  className="w-full p-2 border border-gray-300 rounded mb-2 dark:bg-gray-600 dark:border-gray-500"
                  rows={4}
                />
                <div className="flex gap-2">
                  <button
                    onClick={createNote}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteEditor(false);
                      setNewNote('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.noteId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm mb-2">{note.content}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => deleteNote(note.noteId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-gray-500 text-center py-4">No notes yet</p>
              )}
            </div>
          </div>
        )}

        {/* Bookmarks Tab */}
        {activeTab === 'bookmarks' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                value={newBookmarkTitle}
                onChange={(e) => setNewBookmarkTitle(e.target.value)}
                placeholder="Bookmark title..."
                className="w-full p-2 border border-gray-300 rounded mb-2 dark:bg-gray-600 dark:border-gray-500"
              />
              <button
                onClick={createBookmark}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Bookmark
              </button>
            </div>

            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.bookmarkId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-medium mb-1">{bookmark.title}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{new Date(bookmark.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => deleteBookmark(bookmark.bookmarkId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {bookmarks.length === 0 && (
                <p className="text-gray-500 text-center py-4">No bookmarks yet</p>
              )}
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && session && (
          <div>
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">{session.overallProgress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${session.overallProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Chapters Completed</p>
                <p className="text-2xl font-bold">{session.completedChapters.length}</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Time Spent</p>
                <p className="text-2xl font-bold">{Math.round(session.timeSpent / 60)} min</p>
              </div>
            </div>
          </div>
        )}

        {/* Assistance Tab */}
        {activeTab === 'assistance' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Need help understanding something? Paste the text below and get a simplified explanation.
            </p>

            <textarea
              value={assistanceContext}
              onChange={(e) => setAssistanceContext(e.target.value)}
              placeholder="Paste the text you need help with..."
              className="w-full p-2 border border-gray-300 rounded mb-2 dark:bg-gray-600 dark:border-gray-500"
              rows={4}
            />

            <button
              onClick={getAssistance}
              disabled={loading || !assistanceContext.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg mb-4 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Getting help...' : 'Get Help'}
            </button>

            {assistance && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <h4 className="font-semibold mb-2">Explanation:</h4>
                <p className="text-sm whitespace-pre-wrap">{assistance}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
