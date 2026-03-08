import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

interface Topic {
  topicId: string;
  name: string;
  parentId?: string;
  bookCount: number;
  subtopics?: Topic[];
}

interface Book {
  bookId: string;
  title: string;
  author: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  topics: string[];
  publicationYear?: number;
  coverImage?: string;
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [recommendations, setRecommendations] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Topic[]>([]);

  // Fetch all topics
  const fetchTopics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/topics');
      setTopics(response.data.topics || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch books for a topic
  const fetchBooksForTopic = async (topicId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/topics/${topicId}/books`);
      setBooks(response.data.books || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  // Fetch topic recommendations
  const fetchRecommendations = async () => {
    try {
      const response = await api.get('/topics/recommendations');
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
  };

  // Handle topic selection
  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setSearchParams({ topic: topic.topicId });
    fetchBooksForTopic(topic.topicId);

    // Build breadcrumb
    const newBreadcrumb: Topic[] = [];
    let current: Topic | undefined = topic;
    
    while (current) {
      newBreadcrumb.unshift(current);
      current = topics.find(t => t.topicId === current?.parentId);
    }
    
    setBreadcrumb(newBreadcrumb);
  };

  // Navigate back in breadcrumb
  const handleBreadcrumbClick = (topic: Topic | null) => {
    if (!topic) {
      setSelectedTopic(null);
      setBooks([]);
      setBreadcrumb([]);
      setSearchParams({});
    } else {
      handleTopicSelect(topic);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchTopics();
    fetchRecommendations();

    const topicId = searchParams.get('topic');
    if (topicId) {
      // Will be handled after topics are loaded
    }
  }, []);

  // Handle URL topic parameter
  useEffect(() => {
    const topicId = searchParams.get('topic');
    if (topicId && topics.length > 0) {
      const topic = findTopicById(topics, topicId);
      if (topic) {
        handleTopicSelect(topic);
      }
    }
  }, [topics]);

  // Helper to find topic by ID recursively
  const findTopicById = (topicList: Topic[], id: string): Topic | null => {
    for (const topic of topicList) {
      if (topic.topicId === id) return topic;
      if (topic.subtopics) {
        const found = findTopicById(topic.subtopics, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Render topic tree
  const renderTopicTree = (topicList: Topic[], level: number = 0) => {
    return (
      <div className={level > 0 ? 'ml-6' : ''}>
        {topicList.map((topic) => (
          <div key={topic.topicId} className="mb-2">
            <button
              onClick={() => handleTopicSelect(topic)}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex justify-between items-center"
            >
              <span className="font-medium">{topic.name}</span>
              <span className="text-sm text-gray-500">{topic.bookCount} books</span>
            </button>
            {topic.subtopics && topic.subtopics.length > 0 && (
              <div className="mt-1">
                {renderTopicTree(topic.subtopics, level + 1)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Browse by Topic</h1>

      {/* Loading State */}
      {loading && topics.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading topics...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Topic Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Topics</h2>
              
              {/* Breadcrumb */}
              {breadcrumb.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <button
                    onClick={() => handleBreadcrumbClick(null)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    All Topics
                  </button>
                  {breadcrumb.map((topic, index) => (
                    <span key={topic.topicId}>
                      <span className="mx-2 text-gray-400">/</span>
                      <button
                        onClick={() => handleBreadcrumbClick(topic)}
                        className={`text-sm ${
                          index === breadcrumb.length - 1
                            ? 'text-gray-700 font-medium'
                            : 'text-blue-600 hover:text-blue-800'
                        }`}
                      >
                        {topic.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Topic Tree */}
              <div className="max-h-96 overflow-y-auto">
                {selectedTopic?.subtopics && selectedTopic.subtopics.length > 0 ? (
                  renderTopicTree(selectedTopic.subtopics)
                ) : (
                  renderTopicTree(topics)
                )}
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-semibold mb-3">Recommended for You</h3>
                <div className="space-y-2">
                  {recommendations.map((topic) => (
                    <button
                      key={topic.topicId}
                      onClick={() => handleTopicSelect(topic)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-blue-100 text-sm"
                    >
                      {topic.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Books Display */}
          <div className="lg:col-span-2">
            {selectedTopic ? (
              <>
                <h2 className="text-2xl font-bold mb-6">{selectedTopic.name}</h2>
                
                {books.length === 0 && !loading ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No books found in this topic</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {books.map((book) => (
                      <div
                        key={book.bookId}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex gap-4">
                          {book.coverImage && (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-24 h-32 object-cover rounded"
                            />
                          )}
                          
                          <div className="flex-1">
                            <a
                              href={`/book/${book.bookId}`}
                              className="text-xl font-semibold text-blue-600 hover:text-blue-800 mb-2 block"
                            >
                              {book.title}
                            </a>
                            
                            <p className="text-gray-700 mb-2">by {book.author}</p>
                            
                            <p className="text-gray-600 mb-3">{book.description}</p>
                            
                            <div className="flex flex-wrap gap-2">
                              <span className={`px-3 py-1 text-sm rounded-full ${getDifficultyColor(book.difficulty)}`}>
                                {book.difficulty}
                              </span>
                              
                              {book.publicationYear && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                                  {book.publicationYear}
                                </span>
                              )}
                              
                              {book.topics.slice(0, 3).map((topic, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600 mb-4">Select a topic to view books</p>
                <p className="text-gray-500">Choose from the topics on the left to get started</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
