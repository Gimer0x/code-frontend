'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface ProgressData {
  progress: Array<{
    id: string
    isCompleted: boolean
    lastSavedAt: string | null
    completedAt: string | null
    lesson: {
      id: string
      title: string
      type: string
      order: number
    }
    compilationResults: Array<{
      id: string
      success: boolean
      compilationTime: number | null
      createdAt: string
    }>
    testResults: Array<{
      id: string
      success: boolean
      testCount: number | null
      passedCount: number | null
      failedCount: number | null
      testTime: number | null
      createdAt: string
    }>
  }>
  statistics: {
    totalLessons: number
    completedLessons: number
    progressPercentage: number
    totalCompilations: number
    totalTests: number
    lastActivity: string | null
  }
  recentActivity: Array<{
    id: string
    updatedAt: string
    isCompleted: boolean
    lesson: {
      title: string
      type: string
    }
  }>
}

interface AnalyticsData {
  overview: {
    totalLessons: number
    completedLessons: number
    completionRate: number
    totalCompilations: number
    totalTests: number
  }
  compilation: {
    totalCompilations: number
    successRate: number
    averageCompilationTime: number
    successfulCompilations: number
    failedCompilations: number
  }
  testing: {
    totalTests: number
    successRate: number
    averageTestTime: number
    averageTestCount: number
    averagePassedCount: number
    averageFailedCount: number
    successfulTests: number
    failedTests: number
  }
  activityTimeline: Array<{
    timestamp: string
    type: string
    course: string
    courseLanguage: string
    lesson: string
    lessonType: string
  }>
}

interface StudentProgressDashboardProps {
  courseId: string
  lessonId?: string
  showAnalytics?: boolean
}

export default function StudentProgressDashboard({ 
  courseId, 
  lessonId, 
  showAnalytics = false 
}: StudentProgressDashboardProps) {
  const { data: session } = useSession()
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'progress' | 'analytics' | 'activity'>('progress')

  useEffect(() => {
    if (session?.user?.id) {
      fetchProgressData()
      if (showAnalytics) {
        fetchAnalyticsData()
      }
    }
  }, [session, courseId, lessonId, showAnalytics])

  const fetchProgressData = async () => {
    try {
      const params = new URLSearchParams({ courseId })
      if (lessonId) params.append('lessonId', lessonId)

      const response = await fetch(`/api/student/progress?${params}`)
      const data = await response.json()

      if (data.success) {
        setProgressData(data.data)
      } else {
        setError(data.error || 'Failed to fetch progress data')
      }
    } catch (err) {
      setError('Failed to fetch progress data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAnalyticsData = async () => {
    try {
      const params = new URLSearchParams({ 
        courseId,
        timeRange: 'month',
        includeDetails: 'true'
      })

      const response = await fetch(`/api/student/analytics?${params}`)
      const data = await response.json()

      if (data.success) {
        setAnalyticsData(data.data)
      }
    } catch (err) {
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (milliseconds: number | null) => {
    if (!milliseconds) return 'N/A'
    return `${(milliseconds / 1000).toFixed(2)}s`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading progress...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  if (!progressData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No progress data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Progress Dashboard</h2>
          {showAnalytics && (
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('progress')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  activeTab === 'progress'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Progress
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  activeTab === 'analytics'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  activeTab === 'activity'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Activity
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">
                        {progressData.statistics.completedLessons}/{progressData.statistics.totalLessons}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Lessons Completed</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {progressData.statistics.progressPercentage}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm font-medium">✓</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Compilations</p>
                    <p className="text-2xl font-bold text-green-600">
                      {progressData.statistics.totalCompilations}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-sm font-medium">🧪</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-900">Tests Run</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {progressData.statistics.totalTests}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-sm font-medium">⏰</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-900">Last Activity</p>
                    <p className="text-sm font-bold text-orange-600">
                      {formatDate(progressData.statistics.lastActivity)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress List */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Lesson Progress</h3>
              <div className="space-y-3">
                {progressData.progress.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${
                          item.isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <div>
                          <h4 className="font-medium text-gray-900">{item.lesson.title}</h4>
                          <p className="text-sm text-gray-500">
                            {item.lesson.type} • Order: {item.lesson.order}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Last saved: {formatDate(item.lastSavedAt)}
                        </p>
                        {item.isCompleted && (
                          <p className="text-sm text-green-600">
                            Completed: {formatDate(item.completedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Recent Activity */}
                    <div className="mt-3 flex space-x-4 text-sm text-gray-500">
                      <span>
                        Compilations: {item.compilationResults.length}
                      </span>
                      <span>
                        Tests: {item.testResults.length}
                      </span>
                      {item.compilationResults.length > 0 && (
                        <span>
                          Last compilation: {formatDate(item.compilationResults[0].createdAt)}
                        </span>
                      )}
                      {item.testResults.length > 0 && (
                        <span>
                          Last test: {formatDate(item.testResults[0].createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && analyticsData && (
          <div className="space-y-6">
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Compilation Stats</h3>
                <div className="space-y-1">
                  <p className="text-sm text-blue-700">
                    Success Rate: {analyticsData.compilation.successRate}%
                  </p>
                  <p className="text-sm text-blue-700">
                    Total: {analyticsData.compilation.totalCompilations}
                  </p>
                  <p className="text-sm text-blue-700">
                    Avg Time: {formatDuration(analyticsData.compilation.averageCompilationTime)}
                  </p>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-900 mb-2">Test Stats</h3>
                <div className="space-y-1">
                  <p className="text-sm text-green-700">
                    Success Rate: {analyticsData.testing.successRate}%
                  </p>
                  <p className="text-sm text-green-700">
                    Total: {analyticsData.testing.totalTests}
                  </p>
                  <p className="text-sm text-green-700">
                    Avg Time: {formatDuration(analyticsData.testing.averageTestTime)}
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-900 mb-2">Overall Progress</h3>
                <div className="space-y-1">
                  <p className="text-sm text-purple-700">
                    Completion: {analyticsData.overview.completionRate}%
                  </p>
                  <p className="text-sm text-purple-700">
                    Lessons: {analyticsData.overview.completedLessons}/{analyticsData.overview.totalLessons}
                  </p>
                  <p className="text-sm text-purple-700">
                    Activity: {analyticsData.overview.totalCompilations + analyticsData.overview.totalTests} actions
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && analyticsData && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            <div className="space-y-3">
              {analyticsData.activityTimeline.slice(0, 10).map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.type === 'completed' ? 'Completed' : 'Updated'} {activity.lesson}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.course} • {activity.courseLanguage} • {activity.lessonType}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(activity.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
