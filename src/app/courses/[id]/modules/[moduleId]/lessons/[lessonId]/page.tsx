'use client'

import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useLesson } from '@/hooks/useLesson'

interface LessonData {
  id: string
  title: string
  type: string
  contentMarkdown: string | null
  youtubeUrl: string | null
  initialCode: string | null
  solutionCode: string | null
  tests: string | null
  module?: {
    id: string
    title: string
    course: {
      id: string
      title: string
    }
  }
  progress?: {
    completed: boolean
  } | null
  navigation?: {
    prevLesson: { id: string; title: string } | null
    nextLesson: { id: string; title: string } | null
    currentIndex: number
    totalLessons: number
  }
}

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

  if (error || !lesson) {
    notFound()
  }

  // Transform lesson data to match our interface
  const lessonData: LessonData = {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    contentMarkdown: lesson.contentMarkdown,
    youtubeUrl: lesson.youtubeUrl,
    initialCode: lesson.initialCode,
    solutionCode: lesson.solutionCode,
    tests: lesson.tests,
    module: lesson.module,
    progress: null, // No progress for public access
    navigation: {
      currentIndex: 0,
      totalLessons: 1,
      nextLesson: null,
      previousLesson: null
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                DappDojo
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                  Home
                </Link>
              </li>
              <li>
                <span className="text-gray-500 dark:text-gray-400">/</span>
              </li>
              <li>
                <Link href={`/courses/${courseId}`} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                  {lessonData.module?.course.title || 'Course'}
                </Link>
              </li>
              <li>
                <span className="text-gray-500 dark:text-gray-400">/</span>
              </li>
              <li>
                <span className="text-gray-900 dark:text-white font-medium">
                  {lessonData.title}
                </span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {lessonData.title}
          </h1>
          
          <div className="prose prose-lg max-w-none dark:prose-invert">
            {lessonData.contentMarkdown && (
              <div 
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: lessonData.contentMarkdown.replace(/\n/g, '<br>') 
                }}
              />
            )}
          </div>

          {lessonData.initialCode && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Code Example
              </h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code>{lessonData.initialCode}</code>
              </pre>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between items-center">
            <div>
              {lessonData.navigation?.previousLesson ? (
                <Link
                  href={`/courses/${courseId}/modules/${moduleId}/lessons/${lessonData.navigation.previousLesson.id}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  ← Previous: {lessonData.navigation.previousLesson.title}
                </Link>
              ) : (
                <div></div>
              )}
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Lesson {lessonData.navigation?.currentIndex ? lessonData.navigation.currentIndex + 1 : 1} of {lessonData.navigation?.totalLessons || 1}
            </div>
            
            <div>
              {lessonData.navigation?.nextLesson ? (
                <Link
                  href={`/courses/${courseId}/modules/${moduleId}/lessons/${lessonData.navigation.nextLesson.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
                >
                  Next: {lessonData.navigation.nextLesson.title} →
                </Link>
              ) : (
                <div></div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
