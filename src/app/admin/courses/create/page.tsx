'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import CourseCreationForm from '@/components/CourseCreationForm'

interface User {
  id: string
  email: string
  name: string
  role: string
}

export default function CreateCourse() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/admin/login')
      return
    }
  }, [router, session, status])

  const handleSuccess = (courseId: string) => {
    router.push(`/admin/courses/${courseId}/edit`)
  }

  const handleCancel = () => {
    router.push('/admin/courses')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
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
                  {session.user.email}
                </span>
                <Link
                  href="/admin/courses"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  ← Back to Courses
                </Link>
              </div>
            </div>
          </div>

          <div className="p-6">
            <CourseCreationForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </main>
    </div>
  )
}