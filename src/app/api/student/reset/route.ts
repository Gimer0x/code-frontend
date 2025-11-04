import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/auth-utils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Reset student code to initial state
 */
export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    const authHeader = session?.backendAccessToken ? `Bearer ${session.backendAccessToken}` : request.headers.get('authorization') || undefined
    
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Missing Authorization' }, { status: 401 })
    }

    const body = await request.text()
    
    const backendRes = await fetch(`${BACKEND_URL}/api/student/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body,
    })

    const text = await backendRes.text()
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }

    return NextResponse.json(data ?? {}, { status: backendRes.status })
  } catch (error) {
    return createErrorResponse('Failed to reset code', 500)
  }
}

