'use client'

import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useCourse } from '@/hooks/useCourse'
import { api } from '@/lib/api'

interface Course {
  id: string
  title: string
  language: string
  goals: string
  level: string
  access: string
  thumbnail: string | null
  modules: Module[]
}

interface Module {
  id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  type: string
  title: string
  order: number
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const [courseId, setCourseId] = React.useState<string | null>(null)
  const { course, loading, error } = useCourse(courseId || '')

  React.useEffect(() => {
    params.then(({ id }) => setCourseId(id))
  }, [params])

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading course...</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
    notFound()
  }


  // Mock completion status for now
  const completedLessons = new Set<string>()

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getAccessColor = (access: string) => {
    return access.toLowerCase() === 'free' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
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

      {/* Main Content */}
      <main>
        {/* Course Header */}
        <section className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center mb-6">
              <Link 
                href="/"
                className="text-gray-600 dark:text-gray-400 hover:text-yellow-500 transition-colors"
              >
                ← Back to Courses
              </Link>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Course Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-6">
                  {course.title}
                </h1>
                
                {/* Course Info */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(course.level)}`}>
                      {course.level}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {course.modules.length} Modules • {course.modules.reduce((total, module) => total + module.lessons.length, 0)} Lessons
                    </span>
                  </div>
                </div>
                
              </div>
              
              {/* Course Thumbnail */}
              {course.thumbnail ? (
                <div className="lg:w-80">
                  <img 
                    src={api.getImageUrl(course.thumbnail) || ''} 
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="lg:w-80">
                  <div className="w-full h-48 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg flex items-center justify-center">
                    <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <span className="text-4xl">🔧</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Modules Section */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Course Modules
              </h2>
            </div>
            
            <div className="space-y-4">
              {course.modules.map((module, index) => {
                const completedInModule = module.lessons.filter(lesson => completedLessons.has(lesson.id)).length
                const totalLessons = module.lessons.length
                const isFirstModule = index === 0
                
                return (
                  <div key={module.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                          Module {index + 1}: {module.title}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {completedInModule} of {totalLessons} completed
                        </span>
                        {!isFirstModule && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded-full">
                            Upgrade Required
                          </span>
                        )}
                      </div>
                    </div>
                  
                    <div className="px-4 pt-4 pb-4">
                      <div className="space-y-2">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const isCompleted = completedLessons.has(lesson.id)
                          const isLessonBlocked = !isFirstModule
                          
                          const lessonContent = (
                            <div className={`flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded ${isLessonBlocked ? 'opacity-60' : ''}`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                isCompleted 
                                  ? 'bg-green-500' 
                                  : isLessonBlocked
                                  ? 'bg-gray-200 dark:bg-gray-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }`}>
                                <span className={`text-xs ${
                                  isCompleted 
                                    ? 'text-white' 
                                    : isLessonBlocked
                                    ? 'text-gray-400 dark:text-gray-600'
                                    : 'text-gray-600 dark:text-gray-300'
                                }`}>
                                  {lessonIndex + 1}
                                </span>
                              </div>
                              <div className="flex-1">
                                <span className={`text-sm font-medium ${isLessonBlocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                                  {lesson.title}
                                </span>
                                <span className={`ml-2 text-xs capitalize ${isLessonBlocked ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                  ({lesson.type})
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {lesson.type === 'intro' ? '📖' : lesson.type === 'quiz' ? '❓' : '💻'}
                              </div>
                            </div>
                          )

                          // If lesson is accessible, make it clickable
                          if (!isLessonBlocked) {
                            return (
                              <Link 
                                key={lesson.id} 
                                href={`/courses/${course.id}/modules/${module.id}/lessons/${lesson.id}`}
                                className="block hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors rounded"
                              >
                                {lessonContent}
                              </Link>
                            )
                          }

                          // Otherwise, render as non-clickable
                          return (
                            <div key={lesson.id}>
                              {lessonContent}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-333 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold text-yellow-500 mb-4">
                DappDojo
              </h3>
              <p className="text-gray-300 max-w-md">
                Your gateway to becoming a professional Web3 developer through hands-on learning and practical exercises.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-yellow-500 transition-colors">About</a></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-500 transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-yellow-500 transition-colors">Terms of Use</a></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-500 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-600 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 DappDojo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
