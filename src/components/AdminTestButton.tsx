'use client'

import { useState } from 'react'
import { getTokens } from '@/lib/apiClient'

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

interface BackendTestResult {
  success: boolean
  result: {
    success: boolean
    tests: TestResult[]
    summary: TestSummary
    timestamp: string
  }
  courseId: string
  contractName: string
  testFileName: string
  timestamp: string
}

interface AdminTestButtonProps {
  solutionCode: string
  testCode: string
  onTestResult: (result: BackendTestResult | null) => void
  className?: string
  courseId?: string
}

export default function AdminTestButton({
  solutionCode,
  testCode,
  onTestResult,
  className,
  courseId = 'default-course'
}: AdminTestButtonProps) {
  const [isTesting, setIsTesting] = useState(false)

  const handleTest = async () => {
    if (!testCode || testCode.trim().length === 0) {
      onTestResult(null)
      return
    }

    if (!solutionCode || solutionCode.trim().length === 0) {
      onTestResult(null)
      return
    }

    setIsTesting(true)

    try {
      // Extract contract name from solution code
      const contractNameMatch = solutionCode.match(/contract\s+(\w+)/)
      const contractName = contractNameMatch ? contractNameMatch[1] : 'TestContract'

      // Get auth token from localStorage (set by authService)
      const { accessToken } = getTokens()
      
      // Use frontend proxy which authenticates via session or Authorization header
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Include Authorization header if token is available
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch('/api/admin/test', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          solutionCode: solutionCode.trim(),
          testCode: testCode.trim(),
          contractName,
          courseId
        }),
        credentials: 'include' // Include cookies for NextAuth session
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const testsArray = Array.isArray(data.results) ? data.results : []
      const mapped: BackendTestResult = {
        success: Boolean(data.success),
        result: {
          success: Boolean(data.success),
          tests: testsArray.map((r: any) => ({
            name: r.name,
            status: r.status === 'pass' ? 'passed' : 'failed',
            gasUsed: r.gasUsed || 0,
            duration: '0ms',
            error: r.status === 'fail' ? r.message : undefined
          })),
          summary: {
            total: data.testCount ?? testsArray.length,
            passed: data.passedCount ?? testsArray.filter((r: any) => r.status === 'pass').length,
            failed: data.failedCount ?? testsArray.filter((r: any) => r.status !== 'pass').length,
          },
          timestamp: new Date().toISOString()
        },
        courseId: courseId || 'default-course',
        contractName,
        testFileName: `${contractName}.t.sol`,
        timestamp: new Date().toISOString()
      }
      onTestResult(mapped)

    } catch (error: any) {
      console.error('Test execution error:', error)
      onTestResult(null)
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
