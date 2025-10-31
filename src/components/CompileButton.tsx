'use client'

import { useState, useEffect } from 'react'

interface CompilationError {
  severity: 'error' | 'warning' | 'info'
  message: string
  type: string
  line?: number
  file?: string
  column?: number
  code?: string
  sourceLocation?: {
    file: string
    start: { line: number; column: number }
    end?: { line: number; column: number }
  }
  suggestions?: string[]
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
          <div className="font-medium mb-2 text-red-700 dark:text-red-300">
            ❌ Errors ({result.errors.length}):
          </div>
          {result.errors.map((error, index) => (
            <div key={index} className="ml-4 mb-3 p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium text-red-800 dark:text-red-200">
                  {error.type || 'Compilation Error'}
                  {error.code && (
                    <span className="ml-2 text-xs bg-red-200 dark:bg-red-800 px-2 py-1 rounded">
                      Code: {error.code}
                    </span>
                  )}
                </div>
                {((error.line && error.line > 0) || error.sourceLocation?.start?.line) && (
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-200 dark:bg-red-800 px-2 py-1 rounded">
                    Line {error.line || error.sourceLocation?.start?.line}
                    {error.column && `, Col ${error.column}`}
                  </div>
                )}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 mb-2">
                {error.message}
              </div>
              {(error.sourceLocation || (error.line && error.line > 0 && error.file)) ? (
                <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                  📍 {error.sourceLocation?.file || error.file}:{error.sourceLocation?.start?.line || error.line}{((error.sourceLocation?.start?.column ?? error.column ?? 0) > 0 ? `:${error.sourceLocation?.start?.column ?? error.column ?? 0}` : '')}
                </div>
              ) : null}
              {error.suggestions && error.suggestions.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-red-700 dark:text-red-300 font-medium mb-1">💡 Suggestions:</div>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                    {error.suggestions.map((suggestion: string, suggestionIndex: number) => (
                      <li key={suggestionIndex} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
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
              {(warning.sourceLocation || (warning.line && warning.file)) && (
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  📍 {warning.sourceLocation?.file || warning.file}:{warning.sourceLocation?.start?.line || warning.line}:{warning.sourceLocation?.start?.column || warning.column}
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
      // Extract contract name from code
      const contractNameMatch = code.match(/contract\s+(\w+)/)
      const contractName = contractNameMatch ? contractNameMatch[1] : 'CompileContract'

      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
      
      // Use frontend admin compile route which handles authentication via session
      const response = await fetch('/api/admin/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code.trim(),
          contractName,
          courseId: courseId || 'default-course'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const apiResult = await response.json()

      // Handle both structured (backend) and simple (admin compile route) response formats
      let warnings: any[] = []
      let errors: any[] = []
      
      // Backend route returns: { success, result: { errors: object[], warnings: object[], ... } }
      if (apiResult.result) {
        // Backend format - structured errors/warnings
        const backendResult = apiResult.result || {}
        warnings = backendResult.warnings || []
        errors = backendResult.errors || []
      } else {
        // Admin compile route format - parse output to extract structured errors/warnings
        const output = apiResult.output || ''
        const errorStrings = apiResult.errors || []
        const warningStrings = apiResult.warnings || []
        const lines = output.split('\n')
        
        // Parse forge output to extract structured errors and warnings
        const seenErrors = new Set<string>()
        const seenWarnings = new Set<string>()
        
        // Pattern 1: Forge error format "src/Contract.sol:12:5: Error: message"
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          
          // Extract error with file:line:col format
          const fileLineMatch = trimmed.match(/^(.+?\.sol):(\d+):(\d+):\s*(Error|Warning):\s*(.+)$/i)
          if (fileLineMatch) {
            const [, file, lineNum, colNum, severity, message] = fileLineMatch
            const isError = severity.toLowerCase() === 'error'
            const errorKey = `${file}:${lineNum}:${message.trim()}`
            
            if (!seenErrors.has(errorKey)) {
              const parsed = {
                type: isError ? 'compilation_error' : 'compilation_warning',
                severity: isError ? 'error' : 'warning',
                message: message.trim(),
                line: parseInt(lineNum, 10) || 0,
                column: parseInt(colNum, 10) || 0,
                file: file.trim().replace(/^src\//, ''), // Remove src/ prefix for display
                code: 'UNKNOWN'
              }
              
              if (isError) {
                errors.push(parsed)
                seenErrors.add(errorKey)
              } else {
                warnings.push(parsed)
                seenWarnings.add(errorKey)
              }
            }
            continue
          }
          
          // Pattern for Warning format "Warning [XXXX] (file.sol:line:col): message"
          const solidityWarningMatch = trimmed.match(/^Warning\s+\[(\d+)\]\s+\((.+?):(\d+):(\d+)\):\s*(.+)$/i)
          if (solidityWarningMatch) {
            const [, code, file, lineNum, colNum, message] = solidityWarningMatch
            const warningKey = `${file}:${lineNum}:${message.trim()}`
            
            if (!seenWarnings.has(warningKey)) {
              const filePath = file.trim().replace(/^src\//, '')
              warnings.push({
                type: 'compilation_warning',
                severity: 'warning',
                message: message.trim(),
                line: parseInt(lineNum, 10) || 0,
                column: parseInt(colNum, 10) || 0,
                file: filePath,
                code: code || 'UNKNOWN'
              })
              seenWarnings.add(warningKey)
            }
            continue
          }
          
          // Pattern for forge warning format with code: "src/Contract.sol:12:5: Warning [XXXX]: message"
          const forgeWarningWithCode = trimmed.match(/^(.+?\.sol):(\d+):(\d+):\s*Warning\s+\[(\d+)\]:\s*(.+)$/i)
          if (forgeWarningWithCode) {
            const [, file, lineNum, colNum, code, message] = forgeWarningWithCode
            const warningKey = `${file}:${lineNum}:${message.trim()}`
            
            if (!seenWarnings.has(warningKey)) {
              const filePath = file.trim().replace(/^src\//, '')
              warnings.push({
                type: 'compilation_warning',
                severity: 'warning',
                message: message.trim(),
                line: parseInt(lineNum, 10) || 0,
                column: parseInt(colNum, 10) || 0,
                file: filePath,
                code: code || 'UNKNOWN'
              })
              seenWarnings.add(warningKey)
            }
            continue
          }
          
          // Pattern for standalone warning messages (e.g., "Warning: Unused function parameter...")
          const standaloneWarning = trimmed.match(/warning[^:]*:\s*(.+)$/i)
          if (standaloneWarning && !trimmed.match(/^\d+\s*\|/) && !trimmed.match(/^\s*\||^\s*\^/)) {
            const message = standaloneWarning[1].trim()
            const warningKey = `warning:${message}`
            
            if (!seenWarnings.has(warningKey)) {
              warnings.push({
                type: 'compilation_warning',
                severity: 'warning',
                message: message,
                line: 0,
                column: 0,
                file: contractName + '.sol',
                code: 'UNKNOWN'
              })
              seenWarnings.add(warningKey)
            }
            continue
          }
          
          // Pattern 2: Solidity compiler error format "Error [XXXX] (file.sol:line:col): message"
          const solidityErrorMatch = trimmed.match(/^Error\s+\[(\d+)\]\s+\((.+?):(\d+):(\d+)\):\s*(.+)$/i)
          if (solidityErrorMatch) {
            const [, code, file, lineNum, colNum, message] = solidityErrorMatch
            const errorKey = `${file}:${lineNum}:${message.trim()}`
            
            if (!seenErrors.has(errorKey)) {
              const filePath = file.trim().replace(/^src\//, '')
              errors.push({
                type: 'compilation_error',
                severity: 'error',
                message: message.trim(),
                line: parseInt(lineNum, 10) || 0,
                column: parseInt(colNum, 10) || 0,
                file: filePath,
                code: code || 'UNKNOWN'
              })
              seenErrors.add(errorKey)
            }
            continue
          }
          
          // Pattern 2b: Try to extract error code from forge format with code
          // Format: "src/Contract.sol:12:5: Error [2314]: message"
          const forgeErrorWithCode = trimmed.match(/^(.+?\.sol):(\d+):(\d+):\s*Error\s+\[(\d+)\]:\s*(.+)$/i)
          if (forgeErrorWithCode) {
            const [, file, lineNum, colNum, code, message] = forgeErrorWithCode
            const errorKey = `${file}:${lineNum}:${message.trim()}`
            
            if (!seenErrors.has(errorKey)) {
              const filePath = file.trim().replace(/^src\//, '')
              errors.push({
                type: 'compilation_error',
                severity: 'error',
                message: message.trim(),
                line: parseInt(lineNum, 10) || 0,
                column: parseInt(colNum, 10) || 0,
                file: filePath,
                code: code || 'UNKNOWN'
              })
              seenErrors.add(errorKey)
            }
            continue
          }
        }
        
        // Pattern 3: Parse string warnings array from admin compile route
        if (Array.isArray(warningStrings)) {
          for (const warningStr of warningStrings) {
            const trimmed = warningStr.trim()
            if (!trimmed) continue
            
            // Try to extract structured info with error code
            let fileLineMatch = trimmed.match(/(.+?\.sol):(\d+):(\d+):\s*Warning\s+\[(\d+)\]:\s*(.+)$/i)
            let code = 'UNKNOWN'
            
            if (fileLineMatch) {
              const [, file, lineNum, colNum, errorCode, message] = fileLineMatch
              code = errorCode || 'UNKNOWN'
              const warningKey = `${file}:${lineNum}:${message.trim()}`
              
              if (!seenWarnings.has(warningKey)) {
                warnings.push({
                  type: 'compilation_warning',
                  severity: 'warning',
                  message: message.trim(),
                  line: parseInt(lineNum, 10) || 0,
                  column: parseInt(colNum, 10) || 0,
                  file: file.trim().replace(/^src\//, ''),
                  code: code
                })
                seenWarnings.add(warningKey)
              }
            } else {
              // Fallback to format without code: "file.sol:12:5: Warning: message"
              fileLineMatch = trimmed.match(/(.+?\.sol):(\d+):(\d+):\s*Warning:\s*(.+)$/i)
              if (fileLineMatch) {
                const [, file, lineNum, colNum, message] = fileLineMatch
                const warningKey = `${file}:${lineNum}:${message.trim()}`
                
                if (!seenWarnings.has(warningKey)) {
                  warnings.push({
                    type: 'compilation_warning',
                    severity: 'warning',
                    message: message.trim(),
                    line: parseInt(lineNum, 10) || 0,
                    column: parseInt(colNum, 10) || 0,
                    file: file.trim().replace(/^src\//, ''),
                    code: 'UNKNOWN'
                  })
                  seenWarnings.add(warningKey)
                }
              } else {
                // Warning without location - extract message
                const messageMatch = trimmed.match(/warning[^:]*:\s*(.+)$/i)
                const warningMessage = messageMatch ? messageMatch[1].trim() : trimmed
                const warningKey = `warning:${warningMessage}`
                
                if (!seenWarnings.has(warningKey)) {
                  warnings.push({
                    type: 'compilation_warning',
                    severity: 'warning',
                    message: warningMessage,
                    line: 0,
                    column: 0,
                    file: contractName + '.sol',
                    code: 'UNKNOWN'
                  })
                  seenWarnings.add(warningKey)
                }
              }
            }
          }
        }
        
        // Pattern 4: Parse string errors array (fallback)
        if (errors.length === 0 && Array.isArray(errorStrings)) {
          for (const errorStr of errorStrings) {
            const trimmed = errorStr.trim()
            if (!trimmed || trimmed.toLowerCase().includes('compiler run failed')) continue
            
            // Try to extract structured info with error code
            // First try format with error code: "file.sol:12:5: Error [2314]: message"
            let fileLineMatch = trimmed.match(/(.+?\.sol):(\d+):(\d+):\s*(Error|Warning)\s+\[(\d+)\]:\s*(.+)$/i)
            let code = 'UNKNOWN'
            
            if (fileLineMatch) {
              const [, file, lineNum, colNum, severity, errorCode, message] = fileLineMatch
              code = errorCode || 'UNKNOWN'
              const isError = severity.toLowerCase() === 'error'
              const errorKey = `${file}:${lineNum}:${message.trim()}`
              
              if (!seenErrors.has(errorKey)) {
                const parsed = {
                  type: isError ? 'compilation_error' : 'compilation_warning',
                  severity: isError ? 'error' : 'warning',
                  message: message.trim(),
                  line: parseInt(lineNum, 10) || 0,
                  column: parseInt(colNum, 10) || 0,
                  file: file.trim().replace(/^src\//, ''),
                  code: code
                }
                
                if (isError) {
                  errors.push(parsed)
                } else {
                  warnings.push(parsed)
                }
                seenErrors.add(errorKey)
              }
            } else {
              // Fallback to format without code: "file.sol:12:5: Error: message"
              fileLineMatch = trimmed.match(/(.+?\.sol):(\d+):(\d+):\s*(Error|Warning):\s*(.+)$/i)
              if (fileLineMatch) {
                const [, file, lineNum, colNum, severity, message] = fileLineMatch
                const isError = severity.toLowerCase() === 'error'
                const errorKey = `${file}:${lineNum}:${message.trim()}`
                
                if (!seenErrors.has(errorKey)) {
                  const parsed = {
                    type: isError ? 'compilation_error' : 'compilation_warning',
                    severity: isError ? 'error' : 'warning',
                    message: message.trim(),
                    line: parseInt(lineNum, 10) || 0,
                    column: parseInt(colNum, 10) || 0,
                    file: file.trim().replace(/^src\//, ''),
                    code: 'UNKNOWN'
                  }
                  
                  if (isError) {
                    errors.push(parsed)
                  } else {
                    warnings.push(parsed)
                  }
                  seenErrors.add(errorKey)
                }
              } else if (trimmed.toLowerCase().includes('warning')) {
                // Warning without location
                warnings.push({
                  type: 'compilation_warning',
                  severity: 'warning',
                  message: trimmed,
                  line: 0,
                  column: 0,
                  file: contractName + '.sol',
                  code: 'UNKNOWN'
                })
              } else {
                // Error without location
                errors.push({
                  type: 'compilation_error',
                  severity: 'error',
                  message: trimmed,
                  line: 0,
                  column: 0,
                  file: contractName + '.sol',
                  code: 'UNKNOWN'
                })
              }
            }
          }
        }
      }
      
      console.log('Processing errors:', errors.length, 'warnings:', warnings.length)
      
      // Process warnings to ensure consistent structure
      const processedWarnings = warnings.map((warning: any) => ({
        ...warning,
        type: warning.type || 'compilation_warning',
        severity: warning.severity || 'warning',
        sourceLocation: warning.sourceLocation || (warning.line ? {
          file: warning.file || 'Unknown',
          start: {
            line: warning.line || 0,
            column: warning.column || 0
          }
        } : undefined)
      }))

      // Process errors with detailed information (backend already deduplicates)
      const processedErrors = errors.map((error: any) => ({
        ...error,
        type: error.type || 'compilation_error',
        severity: error.severity || 'error',
        message: error.message || 'Unknown compilation error',
        line: error.line || 0,
        column: error.column || 0,
        file: error.file || 'Unknown',
        code: error.code || 'UNKNOWN',
        sourceLocation: error.sourceLocation || (error.line ? {
          file: error.file || 'Unknown',
          start: {
            line: error.line || 0,
            column: error.column || 0
          }
        } : undefined),
        suggestions: getErrorSuggestions(error)
      }))

      console.log('Processed - errors:', processedErrors.length, 'warnings:', processedWarnings.length)

      // Transform the API response to match the expected CompilationResult format
      const result: CompilationResult = {
        success: apiResult.success && processedErrors.length === 0,
        message: processedErrors.length === 0
          ? (processedWarnings.length > 0 
              ? `Compilation completed with ${processedWarnings.length} warning(s)` 
              : 'Compilation completed')
          : `Compilation failed with ${processedErrors.length} error(s)`,
        compilationTime: apiResult.compilationTime || null,
        artifacts: apiResult.artifacts || [],
        contracts: apiResult.contracts || [],
        errors: processedErrors,
        warnings: processedWarnings,
        sessionId: undefined, // Not used in backend response
        timestamp: apiResult.timestamp || new Date().toISOString()
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

  // Helper function to provide error suggestions
  const getErrorSuggestions = (error: any): string[] => {
    const suggestions: string[] = []
    const message = error.message?.toLowerCase() || ''
    const code = error.code || ''
    
    // Syntax errors
    if (message.includes('expected') && message.includes('but got')) {
      suggestions.push('Check the syntax at the specified location')
      suggestions.push('Ensure proper punctuation (semicolons, commas, brackets)')
    }
    
    if (message.includes('semicolon')) {
      suggestions.push('Add semicolon (;) at the end of the statement')
      suggestions.push('Check line ' + (error.line || 'unknown') + ' for missing semicolon')
    }
    
    if (message.includes('bracket') || message.includes('brace')) {
      suggestions.push('Check for matching opening and closing brackets/braces')
      suggestions.push('Ensure all { } and ( ) are properly paired')
    }
    
    // Type errors
    if (message.includes('type') && message.includes('not')) {
      suggestions.push('Check variable types and ensure they match')
      suggestions.push('Verify function parameter and return types')
    }
    
    // Name errors
    if (message.includes('not found') || message.includes('undefined')) {
      suggestions.push('Check spelling of variable/function names')
      suggestions.push('Ensure all variables are declared before use')
    }
    
    // Visibility errors
    if (message.includes('visibility')) {
      suggestions.push('Add visibility specifier: public, private, internal, or external')
    }
    
    // Event errors
    if (message.includes('event')) {
      suggestions.push('Check event name spelling')
      suggestions.push('Ensure event is declared before use')
    }
    
    // Function errors
    if (message.includes('function')) {
      suggestions.push('Check function declaration syntax')
      suggestions.push('Ensure proper parameter and return type declarations')
    }
    
    // Specific error codes
    if (code === '2314') {
      suggestions.push('Missing semicolon - add ; at the end of the statement')
    }
    
    if (code === '7920') {
      suggestions.push('Variable declared but never used - remove or use the variable')
    }
    
    // Generic suggestions if no specific match
    if (suggestions.length === 0) {
      suggestions.push('Check the syntax around line ' + (error.line || 'unknown'))
      suggestions.push('Review Solidity documentation for proper syntax')
    }
    
    return suggestions
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
