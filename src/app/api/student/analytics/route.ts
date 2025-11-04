import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const getAnalyticsSchema = z.object({
  courseId: z.string().optional(),
  timeRange: z.enum(['day', 'week', 'month', 'all']).optional().default('month'),
  includeDetails: z.boolean().optional().default(false)
})

/**
 * Get comprehensive student analytics
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const url = new URL(request.url)
      const params = url.search
      const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/analytics${params}`, {
        headers: { Authorization: `Bearer ${session.backendAccessToken || ''}` },
      })
      const data = await backendRes.json().catch(() => null)
      return NextResponse.json(data, { status: backendRes.status })
    } catch (error) {
      return createErrorResponse('Failed to get student analytics', 500)
    }
  })
}

/**
 * Get student leaderboard
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.text()
      const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/analytics`, {
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
      return createErrorResponse('Failed to get leaderboard', 500)
    }
  })
}
