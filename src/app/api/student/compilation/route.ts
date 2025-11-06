import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createErrorResponse } from '@/lib/auth-utils'
import { z } from 'zod'

/**
 * Save compilation result
 */
export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.text()
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/compilation`, {
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

/**
 * Get compilation history
 */
export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const url = new URL(request.url)
    const params = url.search
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/compilation${params}`, {
      headers: { Authorization: `Bearer ${(context.session as any)?.backendAccessToken || ''}` },
    })
    const data = await backendRes.json().catch(() => null)
    return NextResponse.json(data, { status: backendRes.status })

  } catch (error) {
    return createErrorResponse('Failed to get compilation history', 500)
  }
})

/**
 * Get specific compilation result
 */
export const PUT = withAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.text()
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/compilation`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${(context.session as any)?.backendAccessToken || ''}`,
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
