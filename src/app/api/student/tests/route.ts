import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createErrorResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const saveTestSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  success: z.boolean(),
  output: z.any().optional(),
  errors: z.any().optional(),
  testCount: z.number().optional(),
  passedCount: z.number().optional(),
  failedCount: z.number().optional(),
  testTime: z.number().optional()
})

const getTestHistorySchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10)
})

/**
 * Save test result
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.text()
      const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/tests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.backendAccessToken || ''}`,
          'Content-Type': 'application/json',
        },
        body,
      })
      const data = await backendRes.json().catch(() => null)
      return NextResponse.json(data, { status: backendRes.status })

    } catch (error) {
      
      if (error instanceof z.ZodError) {
        return createErrorResponse('Validation error', 400, {
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        })
      }

      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to save test result',
        500
      )
    }
  })
}

/**
 * Get test history
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const url = new URL(request.url)
      const params = url.search
      const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/tests${params}`, {
        headers: { Authorization: `Bearer ${session.backendAccessToken || ''}` },
      })
      const data = await backendRes.json().catch(() => null)
      return NextResponse.json(data, { status: backendRes.status })

    } catch (error) {
      return createErrorResponse('Failed to get test history', 500)
    }
  })
}

/**
 * Get specific test result
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.text()
      const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/tests`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.backendAccessToken || ''}`,
          'Content-Type': 'application/json',
        },
        body,
      })
      const data = await backendRes.json().catch(() => null)
      return NextResponse.json(data, { status: backendRes.status })

    } catch (error) {
      return createErrorResponse('Failed to get test result', 500)
    }
  })
}
