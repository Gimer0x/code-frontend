import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createErrorResponse } from '@/lib/auth-utils'

/**
 * Get comprehensive student analytics
 */
export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const url = new URL(request.url)
    const params = url.search
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/analytics${params}`, {
      headers: { Authorization: `Bearer ${(context.session as any)?.backendAccessToken || ''}` },
    })
    const data = await backendRes.json().catch(() => null)
    return NextResponse.json(data, { status: backendRes.status })
  } catch (error) {
    return createErrorResponse('Failed to get student analytics', 500)
  }
})

/**
 * Get student leaderboard
 */
export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.text()
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/analytics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${(context.session as any)?.backendAccessToken || ''}`,
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
