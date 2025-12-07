import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { getTokens } from '@/lib/apiClient'

// Global request deduplication cache to prevent multiple simultaneous requests
export const progressRequestCache = new Map<string, Promise<any>>()

interface StudentFile {
  id: string
  fileName: string
  filePath: string
  content: string
  fileType: string
  isMain: boolean
}

interface ProgressData {
  id: string
  isCompleted: boolean
  lastSavedAt: string | null
  completedAt: string | null
  files: StudentFile[]
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
  const isFetchingRef = useRef(false)
  const hasFetchedRef = useRef(false)

  const fetchProgress = useCallback(async () => {
    if (!session?.user?.id) {
      return
    }

    const params = new URLSearchParams({ courseId })
    if (lessonId) params.append('lessonId', lessonId)
    const cacheKey = `/api/student/progress?${params}`

    // Check if there's already a request in progress for this key (atomic check)
    if (progressRequestCache.has(cacheKey)) {
      try {
        const data = await progressRequestCache.get(cacheKey)
        if (data?.success) {
          // Backend returns data in flat structure: { success: true, files: [...], isCompleted: false, ... }
          // Extract files array from response
          const files: StudentFile[] = (data.files && Array.isArray(data.files))
            ? data.files.map((f: any) => ({
                id: f.id || '',
                fileName: f.fileName || f.name || '',
                filePath: f.filePath || f.path || '',
                content: f.content || f.code || '',
                fileType: f.fileType || f.type || '',
                isMain: f.isMain || false
              }))
            : []
          
          // Create progress object from flat response structure
          const progressEntry: ProgressData = {
            id: 'temp',
            isCompleted: data.isCompleted || false,
            lastSavedAt: data.lastSavedAt || null,
            completedAt: data.completedAt || null,
            files,
            lesson: {
              id: lessonId || '',
              title: '',
              type: '',
              order: 0
            },
            compilationResults: data.lastCompilation ? [data.lastCompilation] : [],
            testResults: data.lastTest ? [data.lastTest] : []
          }
          
          setProgress(progressEntry)
          setStatistics(data.statistics || data.data?.statistics || null)
        }
        setIsLoading(false)
        return
      } catch (err) {
        // If cached request fails, remove it and continue with new request
        progressRequestCache.delete(cacheKey)
      }
    }

    // Set cache immediately BEFORE starting request to prevent race conditions
    const requestPromise = fetch(cacheKey)
      .then(async (response) => {
        if (response.status === 404) {
          return { success: true, data: { progress: [], statistics: null } }
        }
        return response.json()
      })
      .finally(() => {
        // Remove from cache after 1 second to allow fresh requests
        setTimeout(() => progressRequestCache.delete(cacheKey), 1000)
      })

    // Set cache IMMEDIATELY to prevent other components from making duplicate requests
    progressRequestCache.set(cacheKey, requestPromise)

    try {
      isFetchingRef.current = true
      setIsLoading(true)
      setError(null)

      const data = await requestPromise

      if (data?.success) {
        // Backend returns data in flat structure: { success: true, files: [...], isCompleted: false, ... }
        // Extract files array from response
        const files: StudentFile[] = (data.files && Array.isArray(data.files))
          ? data.files.map((f: any) => ({
              id: f.id || '',
              fileName: f.fileName || f.name || '',
              filePath: f.filePath || f.path || '',
              content: f.content || f.code || '',
              fileType: f.fileType || f.type || '',
              isMain: f.isMain || false
            }))
          : []
        
        // Create progress object from flat response structure
        const progressEntry: ProgressData = {
          id: 'temp', // Backend doesn't return progress ID in this format
          isCompleted: data.isCompleted || false,
          lastSavedAt: data.lastSavedAt || null,
          completedAt: data.completedAt || null,
          files,
          lesson: {
            id: lessonId || '',
            title: '',
            type: '',
            order: 0
          },
          compilationResults: data.lastCompilation ? [data.lastCompilation] : [],
          testResults: data.lastTest ? [data.lastTest] : []
        }
        
        setProgress(progressEntry)
        setStatistics(data.statistics || null)
      } else {
        setError(data.error || 'Failed to fetch progress')
      }
    } catch (err) {
      setError('Failed to fetch progress')
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [session?.user?.id, courseId, lessonId]) // Only depend on user.id, not entire session object

  const saveCode = useCallback(async (code: string, fileName = 'main.sol'): Promise<boolean> => {
    if (!lessonId) {
      return false
    }

    try {
      setIsSaving(true)
      setError(null)

      // Get auth token from localStorage or session
      const { accessToken } = getTokens()
      
      // Extract contract name from code to determine file path
      const contractMatch = code.match(/contract\s+(\w+)/)
      const contractName = contractMatch ? contractMatch[1] : 'Contract'
      const filePath = `src/${contractName}.sol`

      // Use the backend API endpoint that proxies to the backend
      const response = await fetch('/api/student/code', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          files: [
            { path: filePath, content: code }
          ]
        })
      })

      const data = await response.json()

      if (response.ok && data.success !== false) {
        // Update local state
        const savedAt = data.savedAt ? new Date(data.savedAt) : new Date()
        // Extract contract name from code to determine file path
        const contractMatch = code.match(/contract\s+(\w+)/)
        const contractName = contractMatch ? contractMatch[1] : 'Contract'
        const filePath = `src/${contractName}.sol`
        
        const savedFile: StudentFile = {
          id: data.files?.[0]?.id || '',
          fileName: `${contractName}.sol`,
          filePath: filePath,
          content: code,
          fileType: 'contract',
          isMain: true
        }
        
        setProgress(prev => prev ? {
          ...prev,
          files: [savedFile],
          lastSavedAt: savedAt.toISOString()
        } : {
          id: 'temp',
          isCompleted: false,
          lastSavedAt: savedAt.toISOString(),
          completedAt: null,
          files: [savedFile],
          lesson: {
            id: lessonId!,
            title: '',
            type: '',
            order: 0
          },
          compilationResults: [],
          testResults: []
        })
        
        return true
      } else {
        setError(data.error || data.message || 'Failed to save code')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save code')
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

  // Initial fetch - only run when user ID, courseId, or lessonId changes
  useEffect(() => {
    if (!session?.user?.id) {
      return
    }

    // Create a unique key for this fetch
    const params = new URLSearchParams({ courseId })
    if (lessonId) params.append('lessonId', lessonId)
    const cacheKey = `/api/student/progress?${params}`

    // If there's already a request in progress, don't fetch again
    if (progressRequestCache.has(cacheKey)) {
      return
    }

    // If we've already fetched for this combination, don't fetch again
    // This prevents React Strict Mode from causing duplicate fetches
    if (hasFetchedRef.current) {
      return
    }

    hasFetchedRef.current = true
    fetchProgress()

    // Reset hasFetchedRef when dependencies change
    return () => {
      hasFetchedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, courseId, lessonId]) // Only depend on these values, not fetchProgress

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
