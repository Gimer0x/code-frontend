import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export async function POST(request: NextRequest) {
  try {
    // Get NextAuth session
    const session = await getServerSession(authOptions)
    
    // Get backend token from session or Authorization header
    let backendToken: string | null = null
    
    // Try to get token from NextAuth session
    if (session?.backendAccessToken) {
      backendToken = session.backendAccessToken as string
    }
    
    // Fallback: try to get from Authorization header
    if (!backendToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        backendToken = authHeader.substring(7)
      }
    }

    if (!backendToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    
    // Validate request body
    const { plan, successUrl, cancelUrl } = body

    if (!plan || (plan !== 'MONTHLY' && plan !== 'YEARLY')) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan. Must be MONTHLY or YEARLY', code: 'INVALID_PLAN' },
        { status: 400 }
      )
    }

    // Proxy to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/user-auth/subscribe/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
      body: JSON.stringify({
        plan,
        successUrl,
        cancelUrl,
      }),
    })

    const backendResult = await backendResponse.json()

    // Log for debugging
    console.log('[Subscription Start] Backend response:', {
      status: backendResponse.status,
      result: backendResult,
    })

    return NextResponse.json(backendResult, { status: backendResponse.status })
  } catch (error) {
    console.error('Error proxying subscription start:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start subscription', code: 'SUBSCRIPTION_START_FAILED' },
      { status: 500 }
    )
  }
}

