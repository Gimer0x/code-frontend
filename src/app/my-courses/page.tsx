'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

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

export default function MyCoursesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Redirect to sign in if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin?callbackUrl=/my-courses')
      return
    }

    // Fetch user courses if authenticated
    if (isAuthenticated && !authLoading) {
      fetchUserCourses()
    }
  }, [isAuthenticated, authLoading, router])

  const fetchUserCourses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      
      const response = await api.getUserCourses(1, 50) // Get up to 50 courses
      
      
      // Transform backend courses to match our interface
      // Backend returns courses with _count.modules and _count.lessons
      const transformedCourses: Course[] = (response.courses || []).map((course: any) => ({
        id: course.id,
        title: course.title,
        language: course.language || 'Solidity',
        goals: course.goals || '',
        level: course.level || 'beginner',
        access: course.access || 'free',
        thumbnail: course.thumbnail,
        moduleCount: course._count?.modules || 0,
        totalLessons: course._count?.lessons || 0, // Use _count.lessons from backend
      }))
      
      
      setCourses(transformedCourses)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch your courses'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
              My Courses
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Continue learning from where you left off
            </p>
          </div>

          {/* Courses Grid */}
          {loading ? (
            // Loading state
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                  <div className="w-full h-48 bg-gray-300 dark:bg-gray-700"></div>
                  <div className="p-6">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-24 ml-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-12">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <p className="text-red-600 dark:text-red-400 mb-2">Failed to load your courses</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
              <button
                onClick={fetchUserCourses}
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => (
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
                    
                    {/* Continue Course Button */}
                    <div className="flex justify-end">
                      <Link href={`/courses/${course.id}`}>
                        <button className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-colors">
                          Continue Course
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Empty state
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                No courses yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start learning by enrolling in a course from our catalog
              </p>
              <Link href="/">
                <button className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors">
                  Browse Courses
                </button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

