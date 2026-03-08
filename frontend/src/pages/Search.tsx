import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

interface SearchResult {
  bookId: string;
  title: string;
  author: string;
  relevanceScore: number;
  explanation: string;
  snippet: string;
  topics: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  publicationYear?: number;
}

interface SearchFilters {
  topics?: string[];
  difficulty?: string;
  yearMin?: number;
  yearMax?: number;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const RESULTS_PER_PAGE = 10;

  // Fetch search suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await api.get('/search/suggestions', {
        params: { q: searchQuery }
      });
      setSuggestions(response.data.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  }, []);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, currentPage: number = 1) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/search', {
        params: {
          q: searchQuery,
          limit: RESULTS_PER_PAGE,
          offset: (currentPage - 1) * RESULTS_PER_PAGE,
          ...filters
        }
      });

      setResults(response.data.results || []);
      setTotalResults(response.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Handle search input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(true);
    fetchSuggestions(value);
  };

  // Handle search submission
  const handleSearch = (searchQuery: string = query) => {
    setSearchParams({ q: searchQuery });
    setShowSuggestions(false);
    setPage(1);
    performSearch(searchQuery, 1);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    performSearch(query, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load initial search from URL
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
      performSearch(urlQuery, 1);
    }
  }, []);

  // Apply filters
  useEffect(() => {
    if (query) {
      performSearch(query, page);
    }
  }, [filters]);

  const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search for books, topics, or concepts..."
            className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleSearch()}
            className="absolute right-2 top-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setQuery(suggestion);
                    handleSearch(suggestion);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-4">
          <select
            value={filters.difficulty || ''}
            onChange={(e) => handleFilterChange({ difficulty: e.target.value || undefined })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <input
            type="number"
            placeholder="Year from"
            value={filters.yearMin || ''}
            onChange={(e) => handleFilterChange({ yearMin: e.target.value ? parseInt(e.target.value) : undefined })}
            className="px-4 py-2 border border-gray-300 rounded-lg w-32"
          />

          <input
            type="number"
            placeholder="Year to"
            value={filters.yearMax || ''}
            onChange={(e) => handleFilterChange({ yearMax: e.target.value ? parseInt(e.target.value) : undefined })}
            className="px-4 py-2 border border-gray-300 rounded-lg w-32"
          />

          {(filters.difficulty || filters.yearMin || filters.yearMax) && (
            <button
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
              className="px-4 py-2 text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Searching...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && !error && results.length > 0 && (
        <>
          <div className="mb-4 text-gray-600">
            Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
          </div>

          <div className="space-y-6">
            {results.map((result) => (
              <div
                key={result.bookId}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <a
                    href={`/book/${result.bookId}`}
                    className="text-xl font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {result.title}
                  </a>
                  <span className="text-sm text-gray-500">
                    Relevance: {(result.relevanceScore * 100).toFixed(0)}%
                  </span>
                </div>

                <p className="text-gray-700 mb-2">by {result.author}</p>

                {/* AI Explanation */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Why this matches:</span> {result.explanation}
                  </p>
                </div>

                {/* Snippet */}
                <p className="text-gray-600 mb-3">{result.snippet}</p>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2">
                  {result.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                  {result.difficulty && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      {result.difficulty}
                    </span>
                  )}
                  {result.publicationYear && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                      {result.publicationYear}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 border rounded-lg ${
                      page === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* No Results */}
      {!loading && !error && query && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 mb-4">No results found for "{query}"</p>
          <p className="text-gray-500">Try different keywords or check your spelling</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !query && (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600">Start searching for books and resources</p>
        </div>
      )}
    </div>
  );
}
