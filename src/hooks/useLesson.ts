import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Lesson {
  id: string;
  type: string;
  title: string;
  contentMarkdown: string | null;
  youtubeUrl: string | null;
  order: number;
  initialCode: string | null;
  solutionCode: string | null;
  tests: string | null;
  createdAt: string;
  updatedAt: string;
  module?: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
    };
  };
}

interface UseLessonResult {
  lesson: Lesson | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useLesson = (lessonId: string): UseLessonResult => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLesson = async () => {
    if (!lessonId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.getLesson(lessonId);
      setLesson(response.lesson || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lesson');
      setLesson(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLesson();
  }, [lessonId]);

  return { 
    lesson, 
    loading, 
    error, 
    refetch: fetchLesson 
  };
};

export default useLesson;
