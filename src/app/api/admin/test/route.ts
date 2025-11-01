import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'

const adminTestSchema = z.object({
  solutionCode: z.string(),
  testCode: z.string(),
  contractName: z.string().optional(),
  testName: z.string().optional(),
  courseId: z.string().optional()
})

/**
 * Proxy test execution requests to backend endpoint
 * Backend endpoint: POST /api/test
 * This replaces local testing with forge test
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Try Authorization header first (from localStorage token)
    const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    // Try to get session token as fallback
    let adminToken: string | null = authHeader || null
    
    // If no Authorization header, try to get from NextAuth session
    if (!adminToken) {
      try {
        const session = await getServerSession(authOptions)
        adminToken = (session as any)?.backendAccessToken || null
      } catch (sessionError) {
        // Session retrieval failed, continue with token verification
      }
    }
    
    if (!adminToken) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required. Please ensure you are logged in as an admin.',
        results: [],
        testCount: 0,
        passedCount: 0,
        failedCount: 0
      }, { status: 401 })
    }
    
    // Verify the token belongs to an admin
    try {
      const profileResponse = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!profileResponse.ok) {
        return NextResponse.json({ 
          success: false,
          error: 'Invalid authentication token. Please log out and log back in.',
          results: [],
          testCount: 0,
          passedCount: 0,
          failedCount: 0
        }, { status: 401 })
      }
      
      const profileData = await profileResponse.json()
      if (!profileData.success || profileData.user?.role !== 'ADMIN') {
        return NextResponse.json({
          success: false,
          error: `Admin access required. Your account role is: ${profileData.user?.role || 'unknown'}`,
          results: [],
          testCount: 0,
          passedCount: 0,
          failedCount: 0
        }, { status: 403 })
      }
      
      // Token is valid and user is admin, proceed with testing
      return handleTestRequest(request, adminToken)
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: `Authentication error: ${error.message || 'Failed to verify token'}`,
        results: [],
        testCount: 0,
        passedCount: 0,
        failedCount: 0
      }, { status: 401 })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Test request failed',
      results: [],
      testCount: 0,
      passedCount: 0,
      failedCount: 0
    }, { status: 500 })
  }
}

async function handleTestRequest(request: NextRequest, adminToken: string) {
  try {
    // Get and parse request body
    const body = await request.json()
    const parsed = adminTestSchema.parse(body)
    
    // Extract contract name from solution code if not provided
    const contractName = parsed.contractName || 
      (parsed.solutionCode.match(/contract\s+(\w+)/)?.[1]) || 
      'TempContract'
    
    // Extract test name from test code if not provided
    const testName = parsed.testName || 
      (parsed.testCode.match(/contract\s+(\w+)/)?.[1]) || 
      'TempTest'
    
    // Clean the code to remove invisible characters
    const cleanSolutionCode = parsed.solutionCode.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
    const cleanTestCode = parsed.testCode.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')

    // Call backend test endpoint with admin token
    // Backend expects: courseId, code, and testCode (not solutionCode)
    const courseId = parsed.courseId || 'default-course'
    
    const backendResponse = await fetch(`${BACKEND_URL}/api/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        courseId,
        code: cleanSolutionCode, // Backend expects 'code' not 'solutionCode'
        testCode: cleanTestCode,
        contractName,
        testName,
        options: {}
      })
    })

    const backendResult = await backendResponse.json()

    if (!backendResponse.ok) {
      // Backend returned an error
      return NextResponse.json({
        success: false,
        error: backendResult.error || 'Test execution failed',
        output: backendResult.output || '',
        results: [],
        testCount: 0,
        passedCount: 0,
        failedCount: 0,
        message: backendResult.message || 'Test execution failed'
      }, { status: backendResponse.status })
    }

    // Backend returned test results
    // Transform backend response to match frontend expected format
    const result = backendResult.result || {}
    const tests = result.tests || result.testResults || []
    
    return NextResponse.json({
      success: backendResult.success ?? true,
      output: result.output || backendResult.output || '',
      results: tests.map((test: any) => ({
        name: test.name || 'Unknown',
        status: test.status === 'pass' || test.status === 'passed' ? 'pass' : 'fail',
        message: test.message || (test.status === 'pass' || test.status === 'passed' ? 'Test passed' : 'Test failed'),
        gasUsed: test.gasUsed || test.gas || 0,
        error: test.error || (test.status === 'fail' || test.status === 'failed' ? test.message : undefined)
      })),
      testCount: result.summary?.total || tests.length,
      passedCount: result.summary?.passed || tests.filter((t: any) => (t.status === 'pass' || t.status === 'passed')).length,
      failedCount: result.summary?.failed || tests.filter((t: any) => (t.status === 'fail' || t.status === 'failed')).length,
      testTime: result.testTime || null,
      message: backendResult.success 
        ? 'Tests completed'
        : 'Test execution failed',
      timestamp: backendResult.timestamp || new Date().toISOString()
    })
    
  } catch (error: any) {
    // Validation error or network error
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        results: [],
        testCount: 0,
        passedCount: 0,
        failedCount: 0
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Test request failed',
      results: [],
      testCount: 0,
      passedCount: 0,
      failedCount: 0
    }, { status: 500 })
  }
}
