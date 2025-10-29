'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    modules: number
  }
  modules?: Array<{
    id: string
    title: string
    lessons: Array<{
      id: string
      title: string
      type: string
    }>
  }>
}

interface CourseManagementDashboardProps {
  courses: Course[]
  onRefresh?: () => void
}

export default function CourseManagementDashboard({ courses, onRefresh }: CourseManagementDashboardProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterLanguage, setFilterLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    const matchesStatus = filterStatus === 'all' || course.status === filterStatus
    const matchesLanguage = filterLanguage === 'all' || course.language === filterLanguage

    return matchesSearch && matchesStatus && matchesLanguage
  }).sort((a, b) => {
    let aValue: any, bValue: any

    switch (sortBy) {
      case 'title':
        aValue = a.title
        bValue = b.title
        break
      case 'level':
        aValue = a.level
        bValue = b.level
        break
      case 'progress':
        aValue = a._count.progress
        bValue = b._count.progress
        break
      default:
        aValue = new Date(a.createdAt)
        bValue = new Date(b.createdAt)
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'deactivated':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAccessColor = (access: string) => {
    switch (access) {
      case 'free':
        return 'bg-blue-100 text-blue-800'
      case 'paid':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your courses, modules, and lessons
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/courses/templates"
            className="bg-blue-500 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-600 transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/admin/courses/create"
            className="bg-yellow-500 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-600 transition-colors"
          >
            Create New Course
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Courses
            </label>
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Languages</option>
              <option value="solidity">Solidity</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="createdAt">Created Date</option>
                <option value="title">Title</option>
                <option value="level">Level</option>
                <option value="progress">Progress</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <div key={course.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Course Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {course.title || 'Untitled Course'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {course.language || 'Unknown'} • {course.level || 'Unknown'}
                  </p>
                </div>
                {course.thumbnail && (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
              </div>

              {/* Course Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Modules</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {course._count?.modules || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Students</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {course._count?.progress || 0}
                  </p>
                </div>
              </div>

              {/* Course Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-2 py-1 text-xs rounded ${getStatusColor(course.status || 'unknown')}`}>
                  {course.status || 'Unknown'}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${getLevelColor(course.level || 'unknown')}`}>
                  {course.level || 'Unknown'}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${getAccessColor(course.access || 'unknown')}`}>
                  {course.access || 'Unknown'}
                </span>
              </div>

              {/* Course Actions */}
              <div className="flex space-x-2">
                <Link
                  href={`/admin/courses/${course.id}/edit`}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors text-center"
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/courses/${course.id}/config`}
                  className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors text-center"
                >
                  Config
                </Link>
                <Link
                  href={`/courses/${course.id}`}
                  className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors text-center"
                >
                  View
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || filterStatus !== 'all' || filterLanguage !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating your first course.'}
          </p>
          <Link
            href="/admin/courses/create"
            className="bg-yellow-500 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-600 transition-colors"
          >
            Create Course
          </Link>
        </div>
      )}
    </div>
  )
}
