import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface SearchOptions {
  query?: string;
  topics?: string[];
  difficulty?: string;
  limit?: number;
  offset?: number;
}

// Fetch all books
export function useBooks(options?: SearchOptions) {
  return useQuery({
    queryKey: ['books', options],
    queryFn: async () => {
      const { data } = await api.get<Book[]>('/books', { params: options });
      return data;
    },
  });
}

// Fetch single book
export function useBook(bookId: string) {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const { data } = await api.get<Book>(`/books/${bookId}`);
      return data;
    },
    enabled: !!bookId,
  });
}

// Search books
export function useSearchBooks(query: string, options?: SearchOptions) {
  return useQuery({
    queryKey: ['books', 'search', query, options],
    queryFn: async () => {
      const { data } = await api.get<Book[]>('/books/search', {
        params: { query, ...options },
      });
      return data;
    },
    enabled: query.length > 0,
  });
}

// Add book to library
export function useAddToLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      const { data } = await api.post(`/library/books/${bookId}`);
      return data;
    },
    onSuccess: () => {
      // Invalidate library queries to refetch
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
}

// Remove book from library
export function useRemoveFromLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      const { data } = await api.delete(`/library/books/${bookId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
}
