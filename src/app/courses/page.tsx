'use client'

import { useRouter } from 'next/navigation'
import { useCourses } from '@/hooks/useCourses'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Suspense } from 'react'

interface Course {
  id: string
  title: string
  language: string
  goals: string
  level: string
  access: string
  thumbnail: string | null
  moduleCount: number
  totalLessons: number
}

function CoursesPageContent() {
  const { courses: backendCourses, loading, error } = useCourses(1, 50) // Fetch more courses for this page
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()

  // Transform backend courses to match our interface
  const courses: Course[] = backendCourses.map(course => ({
    id: course.id,
    title: course.title,
    language: course.language,
    goals: course.goals,
    level: course.level,
    access: course.access,
    thumbnail: course.thumbnail,
    moduleCount: course._count.modules,
    totalLessons: course._count.modules // We'll calculate this properly when we have lesson counts
  }))

  const handleStartCourse = async (courseId: string) => {
    // If not authenticated, redirect to sign-in with callback URL
    if (!authLoading && !isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/courses/${courseId}`)}`)
      return
    }
    
    // If authenticated, enroll in the course and then navigate
    if (isAuthenticated) {
      try {
        // Call the backend to start/enroll in the course
        // This creates an initial StudentProgress record to attach the course to the user
        const response = await fetch('/api/student/courses/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courseId }),
        })

        const data = await response.json()

        // Even if enrollment fails (e.g., already enrolled), still navigate to the course
        // The user can still access the course
        if (process.env.NODE_ENV === 'development') {
          if (response.ok && data.success) {
            console.log('[Start Course] Successfully enrolled in course:', courseId)
          } else if (data.error) {
            console.warn('[Start Course] Enrollment response:', data.error, '- Still navigating to course')
          }
        }

        // Navigate to course regardless of enrollment result
        // (The course might already be enrolled, or enrollment might fail silently)
        router.push(`/courses/${courseId}`)
      } catch (error) {
        // If enrollment fails, still navigate to the course
        // The user can still access it, and enrollment might happen on first save/compile
        console.error('[Start Course] Error enrolling in course:', error)
        router.push(`/courses/${courseId}`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Course Preview Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-800 dark:text-white text-center mb-12">
            All Courses
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              // Loading state
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                  <div className="w-full h-48 bg-gray-300 dark:bg-gray-700"></div>
                  <div className="p-6">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-24 ml-auto"></div>
                  </div>
                </div>
              ))
            ) : error ? (
              // Error state
              <div className="col-span-full text-center py-12">
                <div className="text-red-500 text-xl mb-4">⚠️</div>
                <p className="text-red-600 dark:text-red-400 mb-2">Failed to load courses</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
              </div>
            ) : courses.length > 0 ? (
              courses.map((course) => {
                const getCourseIcon = (title: string) => {
                  if (title.toLowerCase().includes('solidity')) return '🔧'
                  if (title.toLowerCase().includes('security')) return '🔒'
                  if (title.toLowerCase().includes('defi')) return '📈'
                  if (title.toLowerCase().includes('nft')) return '🎨'
                  return '💻'
                }

                const getLevelColor = (level: string) => {
                  switch (level.toLowerCase()) {
                    case 'beginner':
                      return 'text-green-600 dark:text-green-400'
                    case 'intermediate':
                      return 'text-yellow-600 dark:text-yellow-400'
                    case 'advanced':
                      return 'text-red-600 dark:text-red-400'
                    default:
                      return 'text-gray-600 dark:text-gray-400'
                  }
                }

                const getAccessColor = (access: string) => {
                  return access.toLowerCase() === 'free' 
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }

                return (
                  <div key={course.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Course Thumbnail */}
                    {course.thumbnail ? (
                      <div className="w-full h-48 relative overflow-hidden">
                        <img 
                          src={api.getImageUrl(course.thumbnail) || ''} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to a simple placeholder if image fails to load
                            const target = e.target as HTMLImageElement
                            if (target.src && !target.src.includes('data:image')) {
                              console.error('Failed to load course image:', course.thumbnail, 'Full URL:', api.getImageUrl(course.thumbnail))
                              // Use a simple SVG placeholder as data URL
                              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not available%3C/text%3E%3C/svg%3E'
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                          <span className="text-3xl">{getCourseIcon(course.title)}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Course Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                        {course.title}
                      </h3>
                      
                      {/* Course Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${getLevelColor(course.level)}`}>
                            {course.level}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {course.moduleCount} modules • {course.totalLessons} lessons
                          </span>
                        </div>
                      </div>
                      
                      {/* Start Course Button */}
                      <div className="flex justify-end">
                        <button 
                          onClick={() => handleStartCourse(course.id)}
                          disabled={authLoading}
                          className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {authLoading ? 'Loading...' : 'Start Course'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No courses available at the moment. Check back soon!
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <CoursesPageContent />
    </Suspense>
  )
}
