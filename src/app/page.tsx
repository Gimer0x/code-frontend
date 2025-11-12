'use client'

import Link from 'next/link'
import { useCourses } from '@/hooks/useCourses'
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

export default function Home() {
  const { courses: backendCourses, loading, error } = useCourses(1, 10)
  
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
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6">
              Write code and become a{' '}
              <span className="text-yellow-500">Professional Web3 Developer</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-4xl mx-auto">
              Learn by doing, stop tutorials, it&apos;s time to get your hands dirty!
            </p>
            
            <p className="text-lg text-gray-700 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
              Find hundreds of guided exercises to create smart contracts.
            </p>

            {/* Pricing Banner */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-2xl mx-auto mb-12">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Login and get premium access
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Unlimited learning
              </p>
              <Link
                href="/courses"
                className="inline-block bg-yellow-500 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </section>

        {/* Course Preview Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-12">
              Available Courses
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
                          <Link href={`/courses/${course.id}`}>
                            <button className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-colors">
                              Start Course
                            </button>
                          </Link>
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
