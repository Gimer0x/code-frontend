import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export async function GET(request: NextRequest) {
  try {
    // Get NextAuth session
    const session = await getServerSession(authOptions)
    const sessionAny = session as any
    
    // Get backend token from session or Authorization header
    let backendToken: string | null = null
    
    // Try to get token from NextAuth session
    if (sessionAny?.backendAccessToken) {
      backendToken = sessionAny.backendAccessToken as string
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
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Proxy to backend subscription endpoint
    const backendResponse = await fetch(`${BACKEND_URL}/api/user-auth/subscription`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
    })

    const backendResult = await backendResponse.json()

    // Transform backend response to match expected format
    if (backendResult.success && backendResult.subscription) {
      const subscription = backendResult.subscription
      return NextResponse.json({
        subscriptionPlan: subscription.plan || 'FREE',
        subscriptionStatus: subscription.status || 'INACTIVE',
        trialEndsAt: subscription.trialEndsAt,
        subscriptionEndsAt: subscription.endsAt,
        stripeCustomerId: subscription.stripeSubscriptionId ? 'set' : null, // Don't expose full ID
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      })
    }

    // If backend returns error, return a default response
    return NextResponse.json({
      subscriptionPlan: 'FREE',
      subscriptionStatus: 'INACTIVE',
      trialEndsAt: null,
      subscriptionEndsAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
