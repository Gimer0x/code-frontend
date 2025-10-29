'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import AdminRoute from '@/components/AdminRoute'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'STUDENT'
}

interface Course {
  id: string
  title: string
  status: string
  level: string
  access: string
  createdAt: string
  modules?: Array<{
    id: string
    lessons: Array<{
      id: string
    }>
  }>
  _count?: {
    modules: number
    progress: number
  }
}

interface DashboardStats {
  totalCourses: number
  activeCourses: number
  totalModules: number
  totalLessons: number
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    activeCourses: 0,
    totalModules: 0,
    totalLessons: 0
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [recentCourses, setRecentCourses] = useState<Course[]>([])
  
  const router = useRouter()

  useEffect(() => {
    // For demo purposes, allow access without authentication
    // In production, this would check for proper admin authentication
    // if (status === 'loading') return // Still loading
    
    // if (!session || session.user.role !== 'ADMIN') {
    //   router.push('/admin/login')
    //   return
    // }

    // User data is now available through user context
  }, [router, user])

  // Fetch course statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/courses')

        if (response.ok) {
          const data = await response.json()
          
          const courses: Course[] = data.courses || []
          
          const totalCourses = courses.length
          const activeCourses = courses.filter(course => course.status?.toLowerCase() === 'active').length
          const totalModules = courses.reduce((sum, course) => {
            return sum + (course._count?.modules || 0)
          }, 0)
          const totalLessons = courses.reduce((sum, course) => {
            const modules = course.modules || []
            return sum + modules.reduce((moduleSum, module) => {
              const lessons = module.lessons || []
              return moduleSum + lessons.length
            }, 0)
          }, 0)

          setStats({
            totalCourses,
            activeCourses,
            totalModules,
            totalLessons
          })

          // Remove duplicates based on course ID and set recent courses (last 4 created)
          const uniqueCourses = courses.filter((course, index, self) => 
            index === self.findIndex(c => c.id === course.id)
          )
          
          
          const sortedCourses = uniqueCourses
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 4)
          
          setRecentCourses(sortedCourses)
        } else {
          // Set default stats if API fails
          setStats({
            totalCourses: 0,
            activeCourses: 0,
            totalModules: 0,
            totalLessons: 0
          })
        }
      } catch (error) {
        // Set default stats if error occurs
        setStats({
          totalCourses: 0,
          activeCourses: 0,
          totalModules: 0,
          totalLessons: 0
        })
      } finally {
        setIsLoadingStats(false)
      }
    }

    // For demo purposes, always fetch stats
    fetchStats()
  }, [user])

  const handleLogout = () => {
    logout()
    router.push('/admin/login')
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match')
      setMessageType('error')
      return
    }

    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters long')
      setMessageType('error')
      return
    }

    // Check password complexity
    const hasLowercase = /[a-z]/.test(newPassword)
    const hasUppercase = /[A-Z]/.test(newPassword)
    const hasNumber = /\d/.test(newPassword)
    
    if (!hasLowercase || !hasUppercase || !hasNumber) {
      setMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
      setMessageType('error')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Password updated successfully!')
        setMessageType('success')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordChange(false)
      } else {
        setMessage(data.error || 'Failed to update password')
        setMessageType('error')
      }
    } catch (err) {
      setMessage('An error occurred. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  // For demo purposes, skip authentication checks
  // if (status === 'loading') {
  //   return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
  //     <div className="text-center">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
  //       <p className="text-gray-600 dark:text-gray-400">Loading...</p>
  //     </div>
  //   </div>
  // }

  // if (!session) {
  //   return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
  //     <div className="text-center">
  //       <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
  //     </div>
  //   </div>
  // }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-333 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-yellow-500">
                  DappDojo
                </h1>
              </Link>
              <nav className="ml-10 flex space-x-8">
                <span className="text-white px-3 py-2 text-sm font-medium">
                  Admin Dashboard
                </span>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm">
                Welcome, {user?.name || 'Admin'}
              </span>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="text-yellow-500 hover:text-yellow-400 text-sm font-medium transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={handleLogout}
                className="text-white hover:text-gray-300 text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to DappDojo Admin Panel
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Manage courses, modules, and track student progress from this centralized dashboard.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Quick Stats */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Total Courses
                </h3>
                {isLoadingStats ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-yellow-200 dark:bg-yellow-800 rounded mb-2"></div>
                    <div className="h-4 bg-yellow-200 dark:bg-yellow-800 rounded w-3/4"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.totalCourses}</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {stats.totalCourses === 0 ? 'No courses created yet' : `${stats.activeCourses} active`}
                    </p>
                  </>
                )}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Total Modules
                </h3>
                {isLoadingStats ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-blue-200 dark:bg-blue-800 rounded mb-2"></div>
                    <div className="h-4 bg-blue-200 dark:bg-blue-800 rounded w-3/4"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalModules}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {stats.totalModules === 0 ? 'No modules created yet' : 'Across all courses'}
                    </p>
                  </>
                )}
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">
                  Total Lessons
                </h3>
                {isLoadingStats ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-purple-200 dark:bg-purple-800 rounded mb-2"></div>
                    <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-3/4"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalLessons}</p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {stats.totalLessons === 0 ? 'No lessons created yet' : 'Including quizzes & challenges'}
                    </p>
                  </>
                )}
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  Security Status
                </h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">🛡️</p>
                <p className="text-sm text-green-700 dark:text-green-300">All security measures active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Course */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Create New Course
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start building a new learning path with modules and lessons
              </p>
              <Link href="/admin/courses/create" className="block w-full bg-yellow-500 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-600 transition-colors text-center">
                Create Course
              </Link>
            </div>

            {/* Manage Courses */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Manage Courses
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Edit existing courses, add modules, and update content
              </p>
              <Link href="/admin/courses" className="block w-full bg-blue-500 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-600 transition-colors text-center">
                Manage Courses
              </Link>
            </div>

            {/* Student Analytics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Student Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Track progress, quiz results, and engagement metrics
              </p>
              <button className="w-full bg-green-500 text-white px-4 py-2 rounded-md font-medium hover:bg-green-600 transition-colors">
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Courses
            </h3>
            {isLoadingStats ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentCourses.length > 0 ? (
              <div className="space-y-4">
                {recentCourses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{course.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {course.level} • {course.access} • {course._count?.modules || 0} modules
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        course.status?.toLowerCase() === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                      }`}>
                        {course.status || 'Unknown'}
                      </span>
                      <Link 
                        href={`/admin/courses/${course.id}/edit`}
                        className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 text-sm font-medium"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <p className="text-gray-500 dark:text-gray-400">
                  No courses created yet. Start by creating your first course!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Change Password
            </h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {message && (
                <div className={`text-sm text-center p-2 rounded ${
                  messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {message}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-yellow-500 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordChange(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminRoute>
  )
}
