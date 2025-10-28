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
}

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
}

interface CourseProject {
  id: string;
  projectPath: string;
  foundryConfig: {
    solc: string;
    via_ir: boolean;
    optimizer: boolean;
    evm_version: string;
    optimizer_runs: number;
  };
  dependencies: Array<{
    id: string;
    name: string;
    version: string;
    source: string;
    isInstalled: boolean;
  }>;
}

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
  modules: Module[];
  courseProject?: CourseProject;
  _count: {
    modules: number;
    progress: number;
  };
}

interface UseCourseResult {
  course: Course | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useCourse = (courseId: string): UseCourseResult => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = async () => {
    if (!courseId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCourse(courseId);
      setCourse(response.course || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch course');
      setCourse(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  return { 
    course, 
    loading, 
    error, 
    refetch: fetchCourse 
  };
};

export default useCourse;
