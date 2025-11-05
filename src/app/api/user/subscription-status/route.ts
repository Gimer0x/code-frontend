import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Proxy subscription status to backend
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.backendAccessToken) {
      // Return default response if not authenticated
      return NextResponse.json({
        success: true,
        hasActiveSubscription: false,
        isPremium: false,
        subscriptionStatus: 'INACTIVE',
        subscriptionPlan: 'FREE'
      })
    }

    // Forward request to backend
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/api/user/subscription-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.backendAccessToken}`,
        },
      })

      if (backendResponse.ok) {
        const data = await backendResponse.json()
        return NextResponse.json(data)
      }
    } catch (backendError) {
      // Backend unavailable, return default
    }

    // Fallback response if backend unavailable
    return NextResponse.json({
      success: true,
      hasActiveSubscription: false,
      isPremium: false,
      subscriptionStatus: 'INACTIVE',
      subscriptionPlan: 'FREE'
    })

  } catch (error) {
    return NextResponse.json({
      success: true,
      hasActiveSubscription: false,
      isPremium: false,
      subscriptionStatus: 'INACTIVE',
      subscriptionPlan: 'FREE'
    })
  }
}
