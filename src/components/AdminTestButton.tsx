'use client'

import { useState } from 'react'

interface TestResult {
  name: string
  status: 'pass' | 'fail'
  message: string
  gasUsed: number
}

interface AdminTestButtonProps {
  solutionCode: string
  testCode: string
  onTestResult: (result: any) => void
  className?: string
}

export default function AdminTestButton({
  solutionCode,
  testCode,
  onTestResult,
  className
}: AdminTestButtonProps) {
  const [isTesting, setIsTesting] = useState(false)

  const handleTest = async () => {
    if (!testCode || testCode.trim().length === 0) {
      onTestResult({
        success: false,
        results: [],
        testCount: 0,
        passedCount: 0,
        failedCount: 0,
        message: 'No test code provided'
      })
      return
    }

    setIsTesting(true)

    try {
      const response = await fetch('/api/admin/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solutionCode,
          testCode,
          contractName: 'TempContract',
          testName: 'TempTest'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      onTestResult(result)

    } catch (error: any) {
      console.error('Test execution error:', error)
      onTestResult({
        success: false,
        results: [],
        testCount: 0,
        passedCount: 0,
        failedCount: 0,
        message: error.message || 'Test execution failed'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const getButtonText = () => {
    if (isTesting) return 'Running Tests...'
    return 'Run Tests'
  }

  const getButtonClass = () => {
    if (isTesting) return 'bg-blue-500 hover:bg-blue-600'
    return 'bg-emerald-500 hover:bg-emerald-600'
  }

  return (
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
  )
}
