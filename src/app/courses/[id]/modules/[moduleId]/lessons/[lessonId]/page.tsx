'use client'

import React from 'react'
import { notFound } from 'next/navigation'
import { useLesson } from '@/hooks/useLesson'
import LessonViewer from '@/components/LessonViewer'
import ChallengeLessonViewer from '@/components/ChallengeLessonViewer'

export default function LessonPage({ params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }) {
  const [lessonId, setLessonId] = React.useState<string | null>(null)
  const [courseId, setCourseId] = React.useState<string | null>(null)
  const [moduleId, setModuleId] = React.useState<string | null>(null)
  const { lesson, loading, error } = useLesson(lessonId || '')

  React.useEffect(() => {
    params.then(({ id, moduleId, lessonId }) => {
      setCourseId(id)
      setModuleId(moduleId)
      setLessonId(lessonId)
    })
  }, [params])

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (error || !lesson || !courseId) {
    notFound()
  }

  // Transform lesson data to match LessonViewer interface
  const lessonData = {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    contentMarkdown: lesson.contentMarkdown,
    youtubeUrl: lesson.youtubeUrl,
    order: 1, // Default order
    module: lesson.module || {
      id: moduleId || '',
      title: 'Module',
      description: '',
      course: {
        id: courseId,
        title: 'Course'
      }
    },
    progress: null, // No progress for public access
    navigation: {
      currentIndex: 0,
      totalLessons: 1,
      nextLesson: null,
      previousLesson: null,
      allLessons: []
    }
  }

  // Use ChallengeLessonViewer for challenge lessons, LessonViewer for others
  if (lesson.type?.toLowerCase() === 'challenge') {
    return <ChallengeLessonViewer lesson={lessonData} courseId={courseId} />
  }
  
  return <LessonViewer lesson={lessonData} courseId={courseId} />
}