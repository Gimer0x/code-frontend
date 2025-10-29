'use client'

import { useState } from 'react'

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
      // Call backend testing endpoint directly
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'
      
      // Get admin JWT token for backend call
      let adminToken = null
      try {
        const loginResponse = await fetch(`${backendUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@dappdojo.com',
            password: 'admin123'
          })
        })
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json()
          adminToken = loginData.accessToken
        } else {
          console.error('Failed to get admin token:', await loginResponse.text())
        }
      } catch (loginError) {
        console.error('Admin login error:', loginError)
      }
      
      if (!adminToken) {
        throw new Error('Unable to get admin authentication token for testing')
      }

      // Extract contract name from solution code
      const contractNameMatch = solutionCode.match(/contract\s+(\w+)/)
      const contractName = contractNameMatch ? contractNameMatch[1] : 'TestContract'

      const response = await fetch(`${backendUrl}/api/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          courseId,
          code: solutionCode.trim(),
          testCode: testCode.trim(),
          contractName
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result: BackendTestResult = await response.json()
      onTestResult(result)

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
