'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import AdminRoute from '@/components/AdminRoute'
import Link from 'next/link'
import SimpleCourseCreationForm from '@/components/SimpleCourseCreationForm'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'STUDENT'
}

export default function CreateCourse() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user || user.role !== 'ADMIN') {
      router.push('/admin/login')
      return
    }
  }, [router, user, loading])

  const handleSuccess = (courseId: string) => {
    router.push(`/admin/courses/${courseId}/edit`)
  }

  const handleCancel = () => {
    router.push('/admin/courses')
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
      <main className="max-w-6xl mx-auto py-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create New Course
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Create a new course with advanced configuration options.
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.email}
                </span>
                <Link
                  href="/admin/dashboard"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  ← Back to Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="p-6">
            <SimpleCourseCreationForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </main>
      </div>
    </AdminRoute>
  )
}