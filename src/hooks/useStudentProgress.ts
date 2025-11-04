import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { getTokens } from '@/lib/apiClient'

// Global request deduplication cache to prevent multiple simultaneous requests
export const progressRequestCache = new Map<string, Promise<any>>()

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
          // Backend returns data in flat structure: { success: true, codeContent: "...", files: [...] }
          let codeContent = data.codeContent || null
          
          // If codeContent is not available, try to get from files array
          if (!codeContent && data.files && Array.isArray(data.files) && data.files.length > 0) {
            const solFile = data.files.find((f: any) => 
              f.path?.endsWith('.sol') || 
              f.filePath?.endsWith('.sol') || 
              f.fileName?.endsWith('.sol')
            ) || data.files[0]
            
            codeContent = solFile?.content || solFile?.code || null
          }
          
          // Backward compatibility: check nested structure
          if (!codeContent && data.data?.progress?.[0]?.codeContent) {
            codeContent = data.data.progress[0].codeContent
          }
          
          if (!codeContent && data.data?.files && Array.isArray(data.data.files) && data.data.files.length > 0) {
            const solFile = data.data.files.find((f: any) => 
              f.path?.endsWith('.sol') || 
              f.filePath?.endsWith('.sol') || 
              f.fileName?.endsWith('.sol')
            ) || data.data.files[0]
            
            codeContent = solFile?.content || solFile?.code || null
          }
          
          // Create progress object from flat response structure
          const progressEntry: ProgressData = {
            id: 'temp',
            isCompleted: data.isCompleted || false,
            lastSavedAt: data.lastSavedAt || null,
            completedAt: data.completedAt || null,
            codeContent,
            lesson: {
              id: lessonId || '',
              title: '',
              type: '',
              order: 0
            },
            compilationResults: data.lastCompilation ? [data.lastCompilation] : [],
            testResults: data.lastTest ? [data.lastTest] : []
          }
          
          setProgress(codeContent ? progressEntry : null)
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

      // Debug: Log the response structure to see what the backend returns
      // Also log the raw response to see what we're actually getting
      console.log('[useStudentProgress] Raw response data:', data)
      console.log('[useStudentProgress] Backend progress response:', {
        success: data?.success,
        hasProgress: !!data?.data?.progress,
        progressLength: data?.data?.progress?.length,
        progressEntry: data?.data?.progress?.[0],
        hasFiles: !!data?.data?.files,
        filesLength: data?.data?.files?.length,
        dataKeys: data?.data ? Object.keys(data.data) : [],
        topLevelKeys: Object.keys(data || {}),
        fullData: data
      })
      
      // Also log the full response as JSON for easier inspection
      console.log('[useStudentProgress] Full response JSON:', JSON.stringify(data, null, 2))

      if (data?.success) {
        // Backend returns data in flat structure, not nested in data.data.progress
        // Response structure: { success: true, codeContent: "...", files: [...], isCompleted: false, ... }
        
        // Extract codeContent directly from response (backend returns it at top level)
        let codeContent = data.codeContent || null
        
        // If codeContent is not available, try to get from files array
        if (!codeContent && data.files && Array.isArray(data.files) && data.files.length > 0) {
          // Find the first .sol file
          const solFile = data.files.find((f: any) => 
            f.path?.endsWith('.sol') || 
            f.filePath?.endsWith('.sol') || 
            f.fileName?.endsWith('.sol')
          ) || data.files[0]
          
          codeContent = solFile?.content || solFile?.code || null
          console.log('[useStudentProgress] Extracted code from files array:', { codeContent: codeContent?.substring(0, 100) })
        }
        
        // Also check nested structure (backward compatibility)
        if (!codeContent && data.data?.progress?.[0]?.codeContent) {
          codeContent = data.data.progress[0].codeContent
          console.log('[useStudentProgress] Extracted code from nested data.data.progress[0]:', { codeContent: codeContent?.substring(0, 100) })
        }
        
        // Also check data.data.files (backward compatibility)
        if (!codeContent && data.data?.files && Array.isArray(data.data.files) && data.data.files.length > 0) {
          const solFile = data.data.files.find((f: any) => 
            f.path?.endsWith('.sol') || 
            f.filePath?.endsWith('.sol') || 
            f.fileName?.endsWith('.sol')
          ) || data.data.files[0]
          
          codeContent = solFile?.content || solFile?.code || null
          console.log('[useStudentProgress] Extracted code from data.data.files:', { codeContent: codeContent?.substring(0, 100) })
        }
        
        console.log('[useStudentProgress] Final codeContent:', { 
          hasCode: !!codeContent, 
          codeLength: codeContent?.length,
          codePreview: codeContent?.substring(0, 100)
        })
        
        // Create progress object from flat response structure
        const progressEntry: ProgressData = {
          id: 'temp', // Backend doesn't return progress ID in this format
          isCompleted: data.isCompleted || false,
          lastSavedAt: data.lastSavedAt || null,
          completedAt: data.completedAt || null,
          codeContent,
          lesson: {
            id: lessonId || '',
            title: '',
            type: '',
            order: 0
          },
          compilationResults: data.lastCompilation ? [data.lastCompilation] : [],
          testResults: data.lastTest ? [data.lastTest] : []
        }
        
        setProgress(codeContent ? progressEntry : null)
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
        setProgress(prev => prev ? {
          ...prev,
          codeContent: code,
          lastSavedAt: savedAt.toISOString()
        } : {
          id: 'temp',
          isCompleted: false,
          lastSavedAt: savedAt.toISOString(),
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
