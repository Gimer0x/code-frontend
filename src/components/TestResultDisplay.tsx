'use client'

interface TestResult {
  name: string
  status: 'passed' | 'failed'
  gasUsed: number
  duration: string
  error?: string
}

interface TestSummary {
  total: number
  passed: number
  failed: number
}

interface CompilationError {
  type: string
  severity: 'error' | 'warning'
  message: string
  code?: string
  file?: string
  line?: number
  column?: number
  source?: string
}

interface CompilationResult {
  success: boolean
  errors: CompilationError[]
  warnings: CompilationError[]
  output?: string
  contractName?: string
  testFileName?: string
}

interface BackendTestResult {
  success: boolean
  result?: {
    success: boolean
    tests: TestResult[]
    summary: TestSummary
    timestamp: string
  }
  compilation?: CompilationResult
  courseId: string
  contractName: string
  testFileName: string
  timestamp: string
  message?: string
  error?: string
}

interface TestResultDisplayProps {
  result: BackendTestResult | null
  className?: string
}

export default function TestResultDisplay({ result, className }: TestResultDisplayProps) {
  if (!result) return null

  // Check if this is a compilation failure
  if (result.compilation) {
    const compilation = result.compilation
    const isSuccess = compilation.success && compilation.errors.length === 0
    const hasErrors = compilation.errors.length > 0
    const hasWarnings = compilation.warnings.length > 0

    return (
      <div className={`p-4 rounded-lg text-sm border ${
        isSuccess 
          ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' 
          : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
      } ${className}`}>
        {/* Header with status */}
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
          {result.message && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {result.message}
            </div>
          )}
        </div>

        {/* Compilation errors */}
        {hasErrors && (
          <div className="mb-3">
            <div className="font-medium mb-2 text-red-700 dark:text-red-300">
              ❌ Errors ({compilation.errors.length}):
            </div>
            {compilation.errors.map((error, index) => (
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
                  {error.line && error.line > 0 && (
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-200 dark:bg-red-800 px-2 py-1 rounded">
                      {error.file && `${error.file}: `}
                      Line {error.line}
                      {error.column && `, Col ${error.column}`}
                    </div>
                  )}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  {error.message}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Compilation warnings */}
        {hasWarnings && (
          <div className="mb-3">
            <div className="font-medium mb-2 text-yellow-700 dark:text-yellow-300">
              ⚠️ Warnings ({compilation.warnings.length}):
            </div>
            {compilation.warnings.map((warning, index) => (
              <div key={index} className="ml-4 mb-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-700">
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  {warning.message}
                  {warning.line && warning.line > 0 && (
                    <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                      ({warning.file || 'Unknown'}:{warning.line})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          Contract: {compilation.contractName || result.contractName} • Test File: {compilation.testFileName || result.testFileName}
          {result.timestamp && (
            <span className="ml-2">
              • {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Handle test results (compilation succeeded)
  const testResult = result.result
  if (!testResult) return null

  const isSuccess = testResult.success
  const hasTests = testResult.tests.length > 0

  return (
    <div className={`p-4 rounded-lg text-sm border ${
      isSuccess 
        ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' 
        : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
    } ${className}`}>
      {/* Header with status and summary */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <span className="text-green-600 dark:text-green-400">✅</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">❌</span>
          )}
          <span className="font-semibold">
            {isSuccess ? 'All Tests Passed' : 'Some Tests Failed'}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {testResult.summary.passed}/{testResult.summary.total} passed
        </div>
      </div>


      {/* Individual Test Results */}
      {hasTests && (
        <div className="space-y-3">
          
          {testResult.tests.map((test, index) => (
            <div key={index} className={`p-3 rounded-lg border ${
              test.status === 'passed'
                ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {test.status === 'passed' ? (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">✗</span>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {test.name}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {test.duration}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Gas: {test.gasUsed.toLocaleString()}</span>
                <span className={`px-2 py-1 rounded ${
                  test.status === 'passed'
                    ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                    : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                }`}>
                  {test.status}
                </span>
              </div>

              {/* Error message for failed tests */}
              {test.status === 'failed' && test.error && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/50 rounded border border-red-200 dark:border-red-700">
                  <div className="text-xs text-red-700 dark:text-red-300 font-medium mb-1">
                    Error:
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400 font-mono">
                    {test.error}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer with timestamp */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        Contract: {result.contractName} • Test File: {result.testFileName}
        {result.timestamp && (
          <span className="ml-2">
            • {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}
