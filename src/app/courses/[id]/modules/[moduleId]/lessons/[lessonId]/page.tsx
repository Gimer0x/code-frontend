'use client'

import React from 'react'
import { notFound } from 'next/navigation'
import { useLesson } from '@/hooks/useLesson'
import LessonViewer from '@/components/LessonViewer'
import ChallengeLessonViewer from '@/components/ChallengeLessonViewer'
import { api } from '@/lib/api'

export default function LessonPage({ params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }) {
  const [lessonId, setLessonId] = React.useState<string | null>(null)
  const [courseId, setCourseId] = React.useState<string | null>(null)
  const [moduleId, setModuleId] = React.useState<string | null>(null)
  const { lesson, loading, error } = useLesson(lessonId || '')
  const [moduleLessons, setModuleLessons] = React.useState<Array<{ id: string; title: string; type: string; order: number }>>([])

  React.useEffect(() => {
    params.then(({ id, moduleId, lessonId }) => {
      setCourseId(id)
      setModuleId(moduleId)
      setLessonId(lessonId)
    })
  }, [params])

  React.useEffect(() => {
    const fetchModuleLessons = async () => {
      if (!moduleId) return
      try {
        const res = await api.getModuleLessons(moduleId)
        // Expecting res.lessons or res.data?.lessons; normalize
        const lessons = (res.lessons || res.data?.lessons || []) as Array<any>
        const normalized = lessons
          .map(l => ({ id: l.id, title: l.title, type: l.type, order: l.order }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        setModuleLessons(normalized)
      } catch {}
    }
    fetchModuleLessons()
  }, [moduleId])

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

  // Compute navigation from module lessons
  const currentIndex = moduleLessons.findIndex(l => l.id === lesson.id)
  const navigation = {
    currentIndex: currentIndex >= 0 ? currentIndex : 0,
    totalLessons: moduleLessons.length || 1,
    nextLesson: currentIndex >= 0 && currentIndex < moduleLessons.length - 1 ? moduleLessons[currentIndex + 1] : null,
    previousLesson: currentIndex > 0 ? moduleLessons[currentIndex - 1] : null,
    allLessons: moduleLessons,
  }

  // Transform lesson data to match LessonViewer/ChallengeLessonViewer interface
  const lessonData = {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    contentMarkdown: lesson.contentMarkdown,
    youtubeUrl: lesson.youtubeUrl,
    initialCode: (lesson as any).initialCode || null,
    solutionCode: (lesson as any).solutionCode || null,
    tests: (lesson as any).tests || null,
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
    navigation
  }

  // Use ChallengeLessonViewer for challenge lessons, LessonViewer for others
  if (lesson.type?.toLowerCase() === 'challenge') {
    return <ChallengeLessonViewer lesson={lessonData} courseId={courseId} />
  }
  
  return <LessonViewer lesson={lessonData} courseId={courseId} />
}