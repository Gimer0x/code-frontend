import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createErrorResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const saveCompilationSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  success: z.boolean(),
  output: z.any().optional(),
  errors: z.any().optional(),
  warnings: z.any().optional(),
  compilationTime: z.number().optional()
})

const getCompilationHistorySchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10)
})

/**
 * Save compilation result
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.text()
      const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/compilation`, {
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
        error instanceof Error ? error.message : 'Failed to save compilation result',
        500
      )
    }
  })
}

/**
 * Get compilation history
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const url = new URL(request.url)
      const params = url.search
      const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/compilation${params}`, {
        headers: { Authorization: `Bearer ${session.backendAccessToken || ''}` },
      })
      const data = await backendRes.json().catch(() => null)
      return NextResponse.json(data, { status: backendRes.status })

    } catch (error) {
      return createErrorResponse('Failed to get compilation history', 500)
    }
  })
}

/**
 * Get specific compilation result
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.text()
      const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/compilation`, {
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
      return createErrorResponse('Failed to get compilation result', 500)
    }
  })
}