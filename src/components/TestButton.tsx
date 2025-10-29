'use client'

import { useState, useEffect } from 'react'

export interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip' | 'unknown'
  message?: string
  gasUsed?: number
  duration?: number
}

export interface TestExecutionResult {
  success: boolean
  results: TestResult[]
  output?: string
  error?: string
  details?: string
  message?: string
  // Enhanced test details
  testCount?: number
  passedCount?: number
  failedCount?: number
  testTime?: number
  timestamp?: string
}

interface TestButtonProps {
  testCode: string
  solutionCode: string
  courseId: string
  lessonId?: string
  onTestResult: (result: TestExecutionResult | null) => void
  className?: string
}

export function TestResultsDisplay({ result, className }: { result: TestExecutionResult | null, className?: string }) {
  if (!result) return null

  const hasPassedTests = result.results.some(r => r.status === 'pass')
  const hasFailedTests = result.results.some(r => r.status === 'fail')
  const allPassed = result.success && result.results.length > 0 && result.results.every(r => r.status === 'pass')

  return (
    <div className={`p-4 rounded-lg text-sm border ${allPassed ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'} ${className}`}>
      {/* Header with test summary */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {allPassed ? (
            <span className="text-green-600 dark:text-green-400">✅</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">❌</span>
          )}
          <span className="font-semibold">
            {allPassed ? 'All Tests Passed!' : 'Test Results'}
          </span>
        </div>
        {result.testTime && result.testTime > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {result.testTime}ms
          </div>
        )}
      </div>

      {/* Test summary stats - only show if we have meaningful counts */}
      {(result.testCount > 0 || result.passedCount > 0 || result.failedCount > 0) && (
        <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded">
          <div className="flex gap-4 text-xs">
            {result.testCount > 0 && (
              <span>Total: {result.testCount}</span>
            )}
            {result.passedCount > 0 && (
              <span className="text-green-600 dark:text-green-400">Passed: {result.passedCount}</span>
            )}
            {result.failedCount > 0 && (
              <span className="text-red-600 dark:text-red-400">Failed: {result.failedCount}</span>
            )}
          </div>
        </div>
      )}

      {/* Individual test results */}
      <div className="space-y-2">
        {result.results.map((test, index) => {
          // More explicit status checking
          const isPassed = test.status === 'pass' || test.status?.trim() === 'pass'
          
          return (
          <div key={index} className={`p-3 rounded border-l-4 ${isPassed ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={isPassed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {isPassed ? '✅' : '❌'}
                </span>
                <span className="font-medium">{test.name}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                {test.gasUsed && test.gasUsed > 0 && (
                  <span>Gas: {test.gasUsed.toLocaleString()}</span>
                )}
                {test.duration && test.duration > 0 && (
                  <span>Time: {test.duration}ms</span>
                )}
              </div>
            </div>
            {test.message && (
              <div className={`text-sm mt-1 ${isPassed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {test.message}
              </div>
            )}
          </div>
          )
        })}
      </div>

      {/* Error details */}
      {result.error && (
        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded border-l-4 border-red-500">
          <div className="font-medium text-red-800 dark:text-red-200 mb-1">
            {result.error === 'Compilation failed' ? 'Compilation Error:' : 'Execution Error:'}
          </div>
          <div className="text-sm text-red-700 dark:text-red-300">{result.error}</div>
          {result.details && (
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs font-mono text-red-800 dark:text-red-200 whitespace-pre-wrap">
              {result.details}
            </div>
          )}
        </div>
      )}

      {/* Raw output for debugging */}
      {result.output && process.env.NODE_ENV === 'development' && (
        <details className="mt-3">
          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">Raw Output (Debug)</summary>
          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
            {result.output}
          </pre>
        </details>
      )}

      {/* Timestamp */}
      {result.timestamp && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          Executed: {new Date(result.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

export default function TestButton({
  testCode,
  solutionCode,
  courseId,
  lessonId,
  onTestResult,
  className
}: TestButtonProps) {
  // Parse Foundry test output to extract test results
  const parseTestOutput = (output: string): TestResult[] => {
    const results: TestResult[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for test results like: [PASS] testInitialCountIsZero() (gas: 7628)
      const passMatch = line.match(/\[PASS\]\s+(\w+)\(\)\s+\(gas:\s+(\d+)\)/);
      const failMatch = line.match(/\[FAIL\]\s+(\w+)\(\)/);
      
      if (passMatch) {
        results.push({
          name: passMatch[1],
          status: 'pass',
          message: `Test passed`,
          gasUsed: parseInt(passMatch[2])
        });
      } else if (failMatch) {
        results.push({
          name: failMatch[1],
          status: 'fail',
          message: `Test failed`,
          gasUsed: 0
        });
      }
    }
    
    // If no results found but output contains test information, try alternative parsing
    if (results.length === 0 && output.includes('test')) {
      // Look for patterns like "testInitialZero()" in the output
      const testMatches = output.match(/test\w+\(\)/g);
      if (testMatches) {
        testMatches.forEach(testName => {
          const isPassed = output.includes(`[PASS] ${testName}`) || output.includes('Suite result: ok');
          results.push({
            name: testName,
            status: isPassed ? 'pass' : 'fail',
            message: isPassed ? 'Test passed' : 'Test failed',
            gasUsed: 0
          });
        });
      }
    }
    
    // If still no results, try to extract from the actual test output format
    if (results.length === 0 && output.includes('[PASS]')) {
      const passMatches = output.match(/\[PASS\]\s+(\w+)\(\)\s+\(gas:\s+(\d+)\)/g);
      if (passMatches) {
        passMatches.forEach(match => {
          const testMatch = match.match(/\[PASS\]\s+(\w+)\(\)\s+\(gas:\s+(\d+)\)/);
          if (testMatch) {
            results.push({
              name: testMatch[1],
              status: 'pass',
              message: 'Test passed',
              gasUsed: parseInt(testMatch[2])
            });
          }
        });
      }
    }
    
    return results;
  };
  const [isTesting, setIsTesting] = useState(false)
  const [lastResult, setLastResult] = useState<TestExecutionResult | null>(null)
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

  // Reset test state when code changes
  useEffect(() => {
    setLastResult(null)
    onTestResult(null)
  }, [testCode, solutionCode, onTestResult])

  const handleTest = async () => {
    if (!testCode || testCode.trim().length === 0) {
      onTestResult({
        success: false,
        error: 'No test code provided',
        results: []
      })
      return
    }

    if (!solutionCode || solutionCode.trim().length === 0) {
      onTestResult({
        success: false,
        error: 'No solution code provided',
        results: []
      })
      return
    }

    setIsTesting(true)
    setLastResult(null)
    onTestResult(null)

    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCode,
          solutionCode,
          courseId,
          lessonId
        })
      })

      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 400) {
          // Compilation error - get the error details
          const errorData = await response.json()
          const errorResult: TestExecutionResult = {
            success: false,
            error: errorData.message || errorData.error || 'Compilation failed',
            details: errorData.details,
            results: errorData.errors ? errorData.errors.map((err: any) => ({
              name: 'Compilation Error',
              status: 'fail' as const,
              message: err.message || err,
              gasUsed: 0
            })) : [{
              name: 'Compilation Error',
              status: 'fail' as const,
              message: errorData.message || 'Test code has syntax errors',
              gasUsed: 0
            }]
          }
          setLastResult(errorResult)
          onTestResult(errorResult)
          return
        } else {
          // Other HTTP errors
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      }

      const result = await response.json()

      // Use the structured testResults from Foundry service instead of parsing raw output
      const output = result.output || result.result?.output || '';
      
      // Use structured results from Foundry service if available, otherwise fallback to parsing
      const testResults = result.testResults || [];
      
      const transformedResult: TestExecutionResult = {
        success: result.success,
        message: result.message || 'Tests completed',
        results: testResults,
        output: output,
        error: result.success ? undefined : result.message,
        // Include test statistics if available
        testCount: result.testCount,
        passedCount: result.passedCount,
        failedCount: result.failedCount,
        testTime: result.testTime
      }

      setLastResult(transformedResult)
      onTestResult(transformedResult)

      // Show success toast for all tests passed
      if (transformedResult.success && transformedResult.results.length > 0 && transformedResult.results.every(r => r.status === 'pass')) {
        setShowSuccessToast(true)
      }
    } catch (error: any) {

      const errorResult: TestExecutionResult = {
        success: false,
        error: error.message || 'Test execution failed',
        results: [{
          name: 'Network Error',
          status: 'fail',
          message: error.message || 'Failed to connect to test server',
          gasUsed: 0
        }]
      }
      setLastResult(errorResult)
      onTestResult(errorResult)
    } finally {
      setIsTesting(false)
    }
  }

  const getButtonText = () => {
    if (isTesting) return 'Running Tests...'
    if (lastResult?.success && lastResult.results.every(r => r.status === 'pass')) return '✅ All Passed'
    if (lastResult && !lastResult.success) return '❌ Tests Failed'
    return 'Run Tests'
  }

  const getButtonClass = () => {
    if (isTesting) return 'bg-yellow-500 hover:bg-yellow-600'
    if (lastResult?.success && lastResult.results.every(r => r.status === 'pass')) return 'bg-green-500 hover:bg-green-600'
    if (lastResult && !lastResult.success) return 'bg-red-500 hover:bg-red-600'
    return 'bg-purple-600 hover:bg-purple-700'
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
            <span className="text-sm font-medium">All Tests Passed!</span>
          </div>
        </div>
      )}
      
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting}
          className={`px-4 py-2 text-white font-semibold rounded-md transition-colors duration-200 min-w-[140px] ${getButtonClass()}`}
        >
          {getButtonText()}
        </button>
      </div>
    </>
  )
}
