'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import AdminRoute from '@/components/AdminRoute'
import Link from 'next/link'
import CourseManagementDashboard from '@/components/CourseManagementDashboard'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'STUDENT'
}

interface Course {
  id: string
  title: string
  language: string
  level: string
  access: string
  status: string
  thumbnail: string | null
  createdAt: string
  _count: {
    progress: number
  }
  modules: Array<{
    id: string
    title: string
    lessons: Array<{
      id: string
      title: string
      type: string
    }>
  }>
}

export default function AdminCourses() {
  const { user, loading, logout } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user || user.role !== 'ADMIN') {
      router.push('/admin/login')
      return
    }
    fetchCourses()
  }, [router, user, loading])

  const fetchCourses = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/courses')
      const data = await response.json()
      console.log('Courses API Response:', data) // Debug log
      
      if (data.success) {
        console.log('Courses data:', data.courses) // Debug log
        setCourses(data.courses || [])
      } else {
        setError(data.error || 'Failed to fetch courses')
      }
    } catch (err) {
      setError('Failed to fetch courses')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }


  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/admin/dashboard" className="text-2xl font-bold text-yellow-500">
                DappDojo
              </Link>
              <span className="ml-4 text-gray-500 dark:text-gray-400">Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </span>
              <button
                onClick={() => logout()}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading courses...</p>
            </div>
          ) : (
            <CourseManagementDashboard 
              courses={courses} 
              onRefresh={fetchCourses}
            />
          )}
        </div>
      </main>
      </div>
    </AdminRoute>
  )
}