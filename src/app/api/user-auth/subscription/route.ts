import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'

export async function GET(request: NextRequest) {
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

    // Proxy to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/user-auth/subscription`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
    })

    const backendResult = await backendResponse.json()

    // Log for debugging
    console.log('[Subscription Status] Backend response:', {
      status: backendResponse.status,
      result: backendResult,
    })

    return NextResponse.json(backendResult, { status: backendResponse.status })
  } catch (error) {
    console.error('Error fetching subscription status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription status', code: 'SUBSCRIPTION_STATUS_FAILED' },
      { status: 500 }
    )
  }
}

