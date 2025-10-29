'use client'

import { useState, useEffect } from 'react'

interface CompilationError {
  severity: 'error' | 'warning' | 'info'
  message: string
  type: string
  sourceLocation?: {
    file: string
    start: { line: number; column: number }
    end?: { line: number; column: number }
  }
}

interface CompilationResult {
  success: boolean
  errors: CompilationError[]
  warnings: CompilationError[]
  contractName?: string
  // Enhanced compilation details
  compilationTime?: number
  artifacts?: Array<{ file: string; status: string }>
  contracts?: Array<{ count: number; status: string }>
  sessionId?: string
  timestamp?: string
  message?: string
}

interface CompileButtonProps {
  code: string
  onCompilationResult: (result: CompilationResult | null) => void
  className?: string
  version?: string
  courseId?: string
  skipSession?: boolean // Skip session creation for admin/preview use
}

const SUPPORTED_VERSIONS = ['0.8.0', '0.8.19', '0.8.30'] as const
type SolidityVersion = typeof SUPPORTED_VERSIONS[number]

export function CompilationResultDisplay({ result, className }: { result: CompilationResult | null, className?: string }) {
  if (!result) return null

  const isSuccess = result.success && result.errors.length === 0
  const hasWarnings = result.warnings.length > 0

  return (
    <div className={`p-4 rounded-lg text-sm border ${isSuccess ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'} ${className}`}>
      {/* Header with status and timing */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <span className="text-green-600 dark:text-green-400">✅</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">❌</span>
          )}
          <span className="font-semibold">
            {isSuccess ? 'Compilation Successful' : 'Compilation Failed'}
          </span>
        </div>
        {result.compilationTime && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {result.compilationTime}ms
          </div>
        )}
      </div>

      {/* Compilation details */}
      {result.message && (
        <div className="mb-3 text-sm">
          {result.message}
        </div>
      )}

      {/* Artifacts information */}
      {result.artifacts && result.artifacts.length > 0 && (
        <div className="mb-3">
          <div className="font-medium mb-1">📁 Compiled Files:</div>
          <div className="ml-4 space-y-1">
            {result.artifacts.map((artifact, index) => (
              <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                • {artifact.file} ({artifact.status})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contracts information */}
      {result.contracts && result.contracts.length > 0 && (
        <div className="mb-3">
          <div className="font-medium mb-1">📄 Contracts:</div>
          <div className="ml-4 space-y-1">
            {result.contracts.map((contract, index) => (
              <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                • {contract.count} contract(s) compiled successfully
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="mb-3">
          <div className="font-medium mb-2 text-red-700 dark:text-red-300">❌ Errors:</div>
          {result.errors.map((error, index) => (
            <div key={index} className="ml-4 mb-2 p-2 bg-red-100 dark:bg-red-900/30 rounded">
              <div className="font-medium text-red-800 dark:text-red-200">{error.type}:</div>
              <div className="text-sm">{error.message}</div>
              {error.sourceLocation && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  📍 {error.sourceLocation.file}:{error.sourceLocation.start.line}:{error.sourceLocation.start.column}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="mb-3">
          <div className="font-medium mb-2 text-yellow-700 dark:text-yellow-300">⚠️ Warnings:</div>
          {result.warnings.map((warning, index) => (
            <div key={index} className="ml-4 mb-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded">
              <div className="font-medium text-yellow-800 dark:text-yellow-200">{warning.type}:</div>
              <div className="text-sm">{warning.message}</div>
              {warning.sourceLocation && (
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  📍 {warning.sourceLocation.file}:{warning.sourceLocation.start.line}:{warning.sourceLocation.start.column}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Session info */}
      {result.sessionId && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          Session: {result.sessionId}
          {result.timestamp && (
            <span className="ml-2">
              • {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function CompileButton({
  code,
  onCompilationResult,
  className,
  version = '0.8.30',
  courseId,
  skipSession = false
}: CompileButtonProps) {
  const [isCompiling, setIsCompiling] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<SolidityVersion>(version as SolidityVersion)
  const [lastResult, setLastResult] = useState<CompilationResult | null>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  // Auto-dismiss success toast
  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false)
      }, 2000) // Auto-dismiss after 2 seconds

      return () => clearTimeout(timer)
    }
  }, [showSuccessToast])

  // Reset compilation state when code changes
  useEffect(() => {
    setLastResult(null)
    onCompilationResult(null)
  }, [code, onCompilationResult])

  const handleCompile = async () => {
    if (!code || code.trim().length === 0) {
      onCompilationResult({
        success: false,
        errors: [{
          severity: 'error',
          message: 'No code to compile',
          type: 'ValidationError'
        }],
        warnings: []
      })
      return
    }

    setIsCompiling(true)
    setLastResult(null)
    onCompilationResult(null)

    try {
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
      
      // Use lightweight admin endpoints when skipSession is true
      const endpoint = skipSession ? '/api/admin/compile' : '/api/challenge/compile'
      const body = skipSession 
        ? { code, contractName: 'TempContract' }
        : { code, courseId, lessonId: 'default' }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const apiResult = await response.json()

      // Transform the API response to match the expected CompilationResult format
      const result: CompilationResult = {
        success: apiResult.success,
        message: apiResult.message,
        compilationTime: apiResult.compilationTime,
        artifacts: apiResult.artifacts,
        contracts: apiResult.contracts,
        errors: apiResult.errors || [],
        warnings: apiResult.warnings || [],
        sessionId: apiResult.sessionId,
        timestamp: apiResult.timestamp
      }


      setLastResult(result)
      onCompilationResult(result)

      // Show success toast for successful compilation without warnings
      if (result.success && result.errors.length === 0 && result.warnings.length === 0) {
        setShowSuccessToast(true)
      }
    } catch (error: any) {
      
      let errorMessage = error.message || 'Compilation failed'
      let errorType = 'RuntimeError'
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        errorMessage = 'Compilation timed out. The project may still be initializing. Please try again in a few seconds.'
        errorType = 'TimeoutError'
      } else if (error.message?.includes('ProjectInitializationError')) {
        errorMessage = 'Failed to initialize Foundry project. Please try again.'
        errorType = 'ProjectInitializationError'
      } else if (error.message?.includes('ProjectSetupError')) {
        errorMessage = 'Project setup is incomplete. Please wait a moment for libraries to install and try again.'
        errorType = 'ProjectSetupError'
      } else if (error.message?.includes('ProjectValidationError')) {
        errorMessage = 'Failed to validate project setup. Please try again.'
        errorType = 'ProjectValidationError'
      } else if (error.message?.includes('Failed to parse compilation output')) {
        errorMessage = 'Project may not be fully initialized. Please wait a moment and try again.'
        errorType = 'ParseError'
      } else if (error.message?.includes('stdout maxBuffer length exceeded')) {
        errorMessage = 'Compilation output too large. Please try with simpler code or contact support.'
        errorType = 'BufferOverflowError'
      }

      const errorResult: CompilationResult = {
        success: false,
        errors: [{
          severity: 'error',
          message: errorMessage,
          type: errorType
        }],
        warnings: []
      }
      setLastResult(errorResult)
      onCompilationResult(errorResult)
    } finally {
      setIsCompiling(false)
    }
  }

  const getButtonText = () => {
    if (isCompiling) return 'Compiling...'
    if (lastResult?.success) return '✓ Compiled'
    return 'Compile'
  }

  const getButtonClass = () => {
    if (isCompiling) return 'bg-yellow-500 hover:bg-yellow-600'
    if (lastResult?.success) return 'bg-green-500 hover:bg-green-600'
    if (lastResult && !lastResult.success) return 'bg-red-500 hover:bg-red-600'
    return 'bg-blue-600 hover:bg-blue-700'
  }

  return (
    <>
      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-green-500 text-white rounded-md shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Compilation Successful!</span>
          </div>
        </div>
      )}
      
      <div className={`flex items-center gap-2 ${className}`}>
        <select
          value={selectedVersion}
          onChange={(e) => setSelectedVersion(e.target.value as SolidityVersion)}
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          disabled={isCompiling}
        >
          {SUPPORTED_VERSIONS.map(version => (
            <option key={version} value={version}>Solidity {version}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleCompile}
          disabled={isCompiling}
          className={`px-4 py-2 text-white font-semibold rounded-md transition-colors duration-200 min-w-[120px] ${getButtonClass()}`}
        >
          {getButtonText()}
        </button>
      </div>
    </>
  )
}
