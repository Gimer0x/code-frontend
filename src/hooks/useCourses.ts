import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Course {
  id: string;
  title: string;
  language: string;
  goals: string;
  level: string;
  access: string;
  status: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    modules: number;
    progress: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UseCoursesResult {
  courses: Course[];
  loading: boolean;
  error: string | null;
  pagination: Pagination | null;
  refetch: () => void;
}

export const useCourses = (
  page = 1, 
  limit = 10, 
  filters: Record<string, string> = {}
): UseCoursesResult => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCourses(page, limit, filters);
      setCourses(response.courses || []);
      setPagination(response.pagination || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch courses';
      setError(errorMessage);
      // Don't clear courses on rate limit error - keep showing cached data if available
      if (!errorMessage.includes('Rate limit')) {
        setCourses([]);
        setPagination(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [page, limit, JSON.stringify(filters)]);

  return { 
    courses, 
    loading, 
    error, 
    pagination, 
    refetch: fetchCourses 
  };
};

export default useCourses;
