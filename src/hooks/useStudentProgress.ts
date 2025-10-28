import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface ProgressData {
  id: string
  isCompleted: boolean
  lastSavedAt: string | null
  completedAt: string | null
  codeContent: string | null
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
}

interface ProgressStatistics {
  totalLessons: number
  completedLessons: number
  progressPercentage: number
  totalCompilations: number
  totalTests: number
  lastActivity: string | null
}

interface UseStudentProgressOptions {
  courseId: string
  lessonId?: string
  autoSave?: boolean
  autoSaveDelay?: number
}

interface UseStudentProgressReturn {
  progress: ProgressData | null
  statistics: ProgressStatistics | null
  isLoading: boolean
  error: string | null
  saveCode: (code: string, fileName?: string) => Promise<boolean>
  markCompleted: (completed: boolean) => Promise<boolean>
  refreshProgress: () => Promise<void>
  isSaving: boolean
}

export function useStudentProgress({
  courseId,
  lessonId,
  autoSave = false,
  autoSaveDelay = 2000
}: UseStudentProgressOptions): UseStudentProgressReturn {
  const { data: session } = useSession()
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [statistics, setStatistics] = useState<ProgressStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  const fetchProgress = useCallback(async () => {
    if (!session?.user?.id) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({ courseId })
      if (lessonId) params.append('lessonId', lessonId)

      const response = await fetch(`/api/student/progress?${params}`)
      const data = await response.json()

      if (data.success) {
        setProgress(data.data.progress[0] || null)
        setStatistics(data.data.statistics)
      } else {
        setError(data.error || 'Failed to fetch progress')
      }
    } catch (err) {
      setError('Failed to fetch progress')
    } finally {
      setIsLoading(false)
    }
  }, [session, courseId, lessonId])

  const saveCode = useCallback(async (code: string, fileName = 'main.sol'): Promise<boolean> => {
    if (!lessonId) {
      return false
    }

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch('/api/challenge/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          code
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setProgress(prev => prev ? {
          ...prev,
          codeContent: code,
          lastSavedAt: new Date(data.savedAt)
        } : {
          id: 'temp',
          isCompleted: false,
          lastSavedAt: new Date(data.savedAt).toISOString(),
          completedAt: null,
          codeContent: code,
          lesson: {
            id: lessonId!,
            title: '',
            type: '',
            order: 0
          },
          compilationResults: [],
          testResults: []
        })
        
        // Removed fetchProgress() call to prevent infinite loops
        
        return true
      } else {
        setError(data.error || 'Failed to save code')
        return false
      }
    } catch (err) {
      setError('Failed to save code')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [courseId, lessonId])

  const markCompleted = useCallback(async (completed: boolean): Promise<boolean> => {
    if (!session?.user?.id || !lessonId) return false

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch('/api/student/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          isCompleted: completed
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setProgress(prev => prev ? {
          ...prev,
          isCompleted: completed,
          completedAt: completed ? new Date().toISOString() : null
        } : null)
        return true
      } else {
        setError(data.error || 'Failed to update progress')
        return false
      }
    } catch (err) {
      setError('Failed to update progress')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [session, courseId, lessonId])

  const refreshProgress = useCallback(async () => {
    await fetchProgress()
  }, [fetchProgress])

  // Auto-save functionality
  const handleAutoSave = useCallback((code: string) => {
    if (!autoSave || !code.trim()) return

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      saveCode(code)
    }, autoSaveDelay)

    setAutoSaveTimeout(timeout)
  }, [autoSave, autoSaveDelay, saveCode, autoSaveTimeout])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
      }
    }
  }, [autoSaveTimeout])

  // Initial fetch
  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    progress,
    statistics,
    isLoading,
    error,
    saveCode,
    markCompleted,
    refreshProgress,
    isSaving,
    // Expose auto-save handler for external use
    handleAutoSave: autoSave ? handleAutoSave : undefined
  } as UseStudentProgressReturn & { handleAutoSave?: (code: string) => void }
}

// Hook for analytics data
export function useStudentAnalytics(courseId: string, timeRange: 'day' | 'week' | 'month' | 'all' = 'month') {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        courseId,
        timeRange,
        includeDetails: 'true'
      })

      const response = await fetch(`/api/student/analytics?${params}`)
      const data = await response.json()

      if (data.success) {
        setAnalytics(data.data)
      } else {
        setError(data.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      setError('Failed to fetch analytics')
    } finally {
      setIsLoading(false)
    }
  }, [session, courseId, timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    isLoading,
    error,
    refreshAnalytics: fetchAnalytics
  }
}

// Hook for compilation history
export function useCompilationHistory(courseId: string, lessonId?: string, limit = 10) {
  const { data: session } = useSession()
  const [history, setHistory] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({ courseId, limit: limit.toString() })
      if (lessonId) params.append('lessonId', lessonId)

      const response = await fetch(`/api/student/compilation?${params}`)
      const data = await response.json()

      if (data.success) {
        setHistory(data.data.compilationHistory)
        setStatistics(data.data.statistics)
      } else {
        setError(data.error || 'Failed to fetch compilation history')
      }
    } catch (err) {
      setError('Failed to fetch compilation history')
    } finally {
      setIsLoading(false)
    }
  }, [session, courseId, lessonId, limit])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    history,
    statistics,
    isLoading,
    error,
    refreshHistory: fetchHistory
  }
}

// Hook for test history
export function useTestHistory(courseId: string, lessonId?: string, limit = 10) {
  const { data: session } = useSession()
  const [history, setHistory] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({ courseId, limit: limit.toString() })
      if (lessonId) params.append('lessonId', lessonId)

      const response = await fetch(`/api/student/tests?${params}`)
      const data = await response.json()

      if (data.success) {
        setHistory(data.data.testHistory)
        setStatistics(data.data.statistics)
      } else {
        setError(data.error || 'Failed to fetch test history')
      }
    } catch (err) {
      setError('Failed to fetch test history')
    } finally {
      setIsLoading(false)
    }
  }, [session, courseId, lessonId, limit])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    history,
    statistics,
    isLoading,
    error,
    refreshHistory: fetchHistory
  }
}
