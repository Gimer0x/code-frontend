'use client'

import React from 'react'
import { notFound } from 'next/navigation'
import { useSession } from 'next-auth/react'
import LessonViewer from '@/components/LessonViewer'
import ChallengeLessonViewer from '@/components/ChallengeLessonViewer'
import { api } from '@/lib/api'
import { getTokens } from '@/lib/apiClient'

export default function LessonPage({ params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }) {
  const [lessonId, setLessonId] = React.useState<string | null>(null)
  const [courseId, setCourseId] = React.useState<string | null>(null)
  const [moduleId, setModuleId] = React.useState<string | null>(null)
  const [lesson, setLesson] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [progressData, setProgressData] = React.useState<any>(null)
  const [moduleLessons, setModuleLessons] = React.useState<Array<{ id: string; title: string; type: string; order: number }>>([])
  const { data: session } = useSession()

  React.useEffect(() => {
    params.then(({ id, moduleId, lessonId }) => {
      setCourseId(id)
      setModuleId(moduleId)
      setLessonId(lessonId)
    })
  }, [params])

  // Fetch lesson and progress data in parallel
  React.useEffect(() => {
    const fetchData = async () => {
      if (!lessonId || !courseId) return

      setLoading(true)
      setError(null)

      try {
        // Check if user is authenticated for progress API
        const sessionAny = session as any
        const { accessToken } = getTokens()
        const authToken = accessToken || sessionAny?.backendAccessToken

        // Fetch lesson and progress in parallel
        const promises: Promise<any>[] = [
          api.getLesson(lessonId).catch(err => {
            throw new Error('Failed to fetch lesson')
          })
        ]

        // Only fetch progress if user is authenticated and it's a challenge lesson
        // We'll check lesson type after lesson loads, but we can start the request
        if (authToken) {
          promises.push(
            api.getStudentProgress(courseId, lessonId, authToken).catch(() => {
              // Progress fetch failure is not critical - return null
              return null
            })
          )
        } else {
          promises.push(Promise.resolve(null))
        }

        const [lessonResponse, progressResponse] = await Promise.all(promises)

        // Set lesson data
        if (lessonResponse?.lesson) {
          setLesson(lessonResponse.lesson)
        } else {
          throw new Error('Lesson not found')
        }

        // Set progress data (only for challenge lessons, but we fetch it anyway)
        if (progressResponse) {
          setProgressData(progressResponse)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch lesson')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [lessonId, courseId, session])

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

  // Additional guard to ensure lesson is loaded before accessing properties
  // This prevents race conditions in React Strict Mode or rapid re-renders
  if (!lesson || !lesson.id) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading lesson...</p>
        </div>
      </div>
    )
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
    module: lesson.module ? {
      ...lesson.module,
      description: (lesson.module as any).description || ''
    } : {
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
    return <ChallengeLessonViewer lesson={lessonData} courseId={courseId} initialProgress={progressData} />
  }
  
  return <LessonViewer lesson={lessonData} courseId={courseId} />
}