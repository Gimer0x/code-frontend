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
  courseId: z.string().optional(),
  lessonId: z.string().optional() // If provided, backend will fetch solution code from database
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
    // Backend expects: courseId, testCode, and either lessonId OR code (or both)
    // If lessonId is provided, backend will prioritize solution code from database
    // If solution code not found in DB, backend will fallback to code from request
    // If lessonId is not provided, backend will use code from request body
    const courseId = parsed.courseId || 'default-course'
    
    // Build request body
    const requestBody: any = {
      courseId,
      testCode: cleanTestCode,
      code: cleanSolutionCode, // Always include as fallback
      contractName,
      testName,
      options: {}
    }
    
    // Include lessonId if provided - backend will prioritize solution code from database
    if (parsed.lessonId) {
      requestBody.lessonId = parsed.lessonId
    }
    
    const backendResponse = await fetch(`${BACKEND_URL}/api/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(requestBody)
    })

    const backendResult = await backendResponse.json()
    
    // Log backend response for debugging
    console.log('=== BACKEND TEST RESPONSE ===')
    console.log('Status:', backendResponse.status)
    console.log('Response:', JSON.stringify(backendResult, null, 2))
    console.log('Response keys:', Object.keys(backendResult))
    console.log('Error code:', backendResult.code)
    console.log('Result object:', backendResult.result)
    console.log('Errors:', backendResult.errors || backendResult.result?.errors || [])
    console.log('Warnings:', backendResult.warnings || backendResult.result?.warnings || backendResult.result?.compilation?.warnings || [])
    console.log('Tests array:', backendResult.tests || backendResult.result?.tests || backendResult.testResults || backendResult.result?.testResults)
    console.log('===========================')

    // Check for compilation failures (backend returns 200 OK but with error code)
    const compilationErrorCodes = ['TEST_COMPILATION_FAILED', 'COMPILATION_FAILED', 'SOLUTION_COMPILATION_FAILED']
    if (backendResult.code && compilationErrorCodes.includes(backendResult.code)) {
      // Handle compilation failure - return compilation errors in a format similar to compilation results
      // Check multiple possible locations for errors and warnings in the backend response
      const compilationErrors = backendResult.errors || 
                               backendResult.result?.errors || 
                               backendResult.result?.compilation?.errors || 
                               []
      const compilationWarnings = backendResult.warnings || 
                                  backendResult.result?.warnings || 
                                  backendResult.result?.compilation?.warnings || 
                                  []
      const compilationResult = backendResult.result?.compilation || backendResult.result || {}
      
      // Log warnings for debugging
      console.log('=== COMPILATION WARNINGS ===')
      console.log('Warnings from backendResult.warnings:', backendResult.warnings)
      console.log('Warnings from backendResult.result?.warnings:', backendResult.result?.warnings)
      console.log('Warnings from backendResult.result?.compilation?.warnings:', backendResult.result?.compilation?.warnings)
      console.log('Final compilationWarnings:', compilationWarnings)
      console.log('==========================')
      
      return NextResponse.json({
        success: false,
        error: backendResult.error || 'Compilation failed',
        message: backendResult.message || 'Compilation failed - tests were not run',
        // Return in compilation format so frontend can display compilation errors
        compilation: {
          success: false,
          errors: compilationErrors.map((err: any) => ({
            type: err.type || 'compilation_error',
            severity: err.severity || 'error',
            message: err.message || 'Unknown compilation error',
            code: err.code || undefined,
            file: err.file || backendResult.testFileName || 'Unknown',
            line: err.line || undefined,
            column: err.column || undefined,
            source: err.source || 'test_compilation'
          })),
          warnings: compilationWarnings.map((warn: any) => ({
            type: warn.type || 'compilation_warning',
            severity: warn.severity || 'warning',
            message: warn.message || 'Unknown warning',
            code: warn.code || undefined,
            file: warn.file || backendResult.testFileName || 'Unknown',
            line: warn.line || undefined,
            column: warn.column || undefined,
            source: warn.source || 'test_compilation'
          })),
          output: compilationResult.output || backendResult.output || '',
          contractName: backendResult.contractName || 'Unknown',
          testFileName: backendResult.testFileName || 'Unknown'
        },
        // Also include test-related fields for consistency
        results: [],
        testCount: 0,
        passedCount: 0,
        failedCount: 0,
        contractName: backendResult.contractName,
        testFileName: backendResult.testFileName,
        courseId: backendResult.courseId
      }, { status: backendResponse.ok ? 200 : backendResponse.status })
    }

    if (!backendResponse.ok) {
      // Backend returned a non-compilation error
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
    // Backend may return tests in various locations: result.tests, result.testResults, or directly in response
    const result = backendResult.result || backendResult
    let tests = result.tests || result.testResults || backendResult.tests || backendResult.testResults || []
    
    // If tests array is empty, try to parse from output (raw Foundry output might need parsing)
    if (tests.length === 0 && (result.output || backendResult.output)) {
      const output = result.output || backendResult.output
      // Try to parse Foundry test output format
      // Look for test results in output like [PASS] testName() or [FAIL] testName()
      const passMatches = output.match(/\[PASS\]\s+(\w+)/g) || []
      const failMatches = output.match(/\[FAIL\]\s+(\w+)/g) || []
      
      passMatches.forEach((match: string) => {
        const testName = match.match(/\[PASS\]\s+(\w+)/)?.[1] || 'Unknown'
        tests.push({
          name: testName,
          status: 'pass',
          message: 'Test passed'
        })
      })
      
      failMatches.forEach((match: string) => {
        const testName = match.match(/\[FAIL\]\s+(\w+)/)?.[1] || 'Unknown'
        tests.push({
          name: testName,
          status: 'fail',
          message: 'Test failed'
        })
      })
    }
    
    // Calculate summary from tests if not provided
    const passedCount = result.summary?.passed ?? 
                       tests.filter((t: any) => t.status === 'pass' || t.status === 'passed' || t.status === 'Success').length
    const failedCount = result.summary?.failed ?? 
                        tests.filter((t: any) => t.status === 'fail' || t.status === 'failed' || t.status === 'Failure').length
    const testCount = result.summary?.total ?? 
                      (backendResult.testCount ?? 
                       ((passedCount + failedCount) || tests.length))
    
    // Log parsed results for debugging
    console.log('=== PARSED TEST RESULTS ===')
    console.log('Tests found:', tests.length)
    console.log('Tests array:', JSON.stringify(tests, null, 2))
    console.log('Test count:', testCount)
    console.log('Passed count:', passedCount)
    console.log('Failed count:', failedCount)
    console.log('==========================')
    
    return NextResponse.json({
      success: backendResult.success ?? (failedCount === 0 && testCount > 0),
      output: result.output || backendResult.output || '',
      // Include debug info in development
      _debug: process.env.NODE_ENV === 'development' ? {
        backendResponse: backendResult,
        parsedTests: tests,
        testCount,
        passedCount,
        failedCount
      } : undefined,
      results: tests.map((test: any) => ({
        name: test.name || test.testName || 'Unknown',
        status: (test.status === 'pass' || test.status === 'passed' || test.status === 'Success') ? 'pass' : 'fail',
        message: test.message || 
                 (test.reason && `Test failed: ${test.reason}`) ||
                 ((test.status === 'pass' || test.status === 'passed' || test.status === 'Success') ? 'Test passed' : 'Test failed'),
        gasUsed: test.gasUsed || test.gas || test.kind?.Unit?.gas || 0,
        error: test.error || 
               (test.reason || (test.status === 'fail' || test.status === 'failed' || test.status === 'Failure' ? test.message : undefined))
      })),
      testCount,
      passedCount,
      failedCount,
      testTime: result.testTime || backendResult.testTime || null,
      message: backendResult.message || 
               (failedCount === 0 && testCount > 0 
                 ? `All ${testCount} test(s) passed! 🎉`
                 : testCount > 0 
                   ? `${passedCount} of ${testCount} test(s) passed`
                   : 'No tests were executed'),
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
