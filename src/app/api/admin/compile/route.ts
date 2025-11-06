import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, createErrorResponse } from '@/lib/auth-utils'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

const adminCompileSchema = z.object({
  code: z.string(),
  contractName: z.string().optional(),
  courseId: z.string().optional()
})

/**
 * Proxy compilation requests to backend endpoint
 * Backend endpoint: POST /api/compile
 * This replaces local compilation with forge build
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  // Try withAuth first (session-based auth), but also support Authorization header fallback
  const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '')
  
  // If we have an Authorization header, verify it directly without requiring NextAuth session
  if (authHeader) {
    try {
      // Verify the token belongs to an admin
      const profileResponse = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authHeader}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!profileResponse.ok) {
        return NextResponse.json({ 
          success: false,
          error: 'Invalid authentication token',
          errors: ['Failed to verify token with backend'],
          warnings: []
        }, { status: 401 })
      }
      
      const profileData = await profileResponse.json()
      if (!profileData.success || profileData.user?.role !== 'ADMIN') {
        return createErrorResponse(
          `Admin access required. Your account role is: ${profileData.user?.role || 'unknown'}`,
          403
        )
      }
      
      // Token is valid and user is admin, proceed with compilation
      return handleCompileRequest(request, authHeader)
    } catch (error: any) {
      return createErrorResponse(
        `Authentication error: ${error.message || 'Failed to verify token'}`,
        401
      )
    }
  }
  
  // Fall back to withAuth (session-based authentication)
  const withAuthHandler = withAuth(async (request: NextRequest, context) => {
    try {
      // Get admin token from session
      const session: any = context.session
      const adminToken = session?.backendAccessToken
      
      if (!adminToken) {
        return NextResponse.json({ 
          success: false,
          error: 'Unauthorized - Admin token required',
          errors: ['Authentication token not found. Please ensure you are logged in as an admin.'],
          warnings: []
        }, { status: 401 })
      }
      
      return handleCompileRequest(request, adminToken)
    } catch (error: any) {
      return createErrorResponse(
        error.message || 'Compilation request failed',
        500
      )
    }
  }, { requireAuth: true, requireAdmin: true })
  
  return withAuthHandler(request)
}

async function handleCompileRequest(request: NextRequest, adminToken: string) {
  try {
    // Get and parse request body
    const body = await request.json()
    const parsed = adminCompileSchema.parse(body)
      
      // Extract contract name from code if not provided
      const contractName = parsed.contractName || 
        (parsed.code.match(/contract\s+(\w+)/)?.[1]) || 
        'TempContract'
      
      const courseId = parsed.courseId || 'default-course'

      // Clean the code to remove invisible characters
      const cleanCode = parsed.code.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')

      // Call backend compilation endpoint with admin token
      const backendResponse = await fetch(`${BACKEND_URL}/api/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          courseId,
          code: cleanCode,
          contractName
        })
      })

      const backendResult = await backendResponse.json()

      if (!backendResponse.ok) {
        // Backend returned an error
        return NextResponse.json({
          success: false,
          error: backendResult.error || 'Compilation failed',
          errors: backendResult.errors || [backendResult.error || 'Compilation failed'],
          warnings: backendResult.warnings || [],
          output: backendResult.output || '',
          contractName,
          message: 'Compilation failed'
        }, { status: backendResponse.status })
      }

      // Backend returned successful compilation
      // Response format: { success, result: {...}, courseId, contractName, timestamp }
      // Transform to match frontend expected format
      const result = backendResult.result || {}
      
      // Ensure output is always a string (backend might return an object for compilation artifacts)
      const outputValue = result.output || backendResult.output || ''
      const outputString = typeof outputValue === 'string' 
        ? outputValue 
        : (typeof outputValue === 'object' 
            ? JSON.stringify(outputValue, null, 2) 
            : String(outputValue || ''))
      
      return NextResponse.json({
        success: backendResult.success ?? true,
        output: outputString,
        errors: result.errors || [],
        warnings: result.warnings || [],
        contractName: backendResult.contractName || contractName,
        compilationTime: result.compilationTime || null,
        message: backendResult.success 
          ? ((result.warnings && result.warnings.length > 0)
              ? `Compilation completed with ${result.warnings.length} warning(s)`
              : 'Compilation successful')
          : 'Compilation failed',
        courseId: backendResult.courseId || courseId,
        timestamp: backendResult.timestamp || new Date().toISOString()
      })
      
    } catch (error: any) {
      // Validation error or network error
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Invalid request body',
          errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
          warnings: [],
          output: '',
          contractName: 'Unknown',
          message: 'Invalid request'
        }, { status: 400 })
      }

      return createErrorResponse(
        error.message || 'Compilation request failed',
        500
      )
    }
}
