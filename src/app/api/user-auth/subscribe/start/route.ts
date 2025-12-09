import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export async function POST(request: NextRequest) {
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

    // Validate backend URL is configured
    if (!BACKEND_URL) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend URL is not configured',
          code: 'SUBSCRIPTION_START_FAILED' 
        },
        { status: 500 }
      )
    }

    // Proxy to backend
    let backendResponse: Response
    try {
      backendResponse = await fetch(`${BACKEND_URL}/api/user-auth/subscribe/start`, {
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
    } catch (fetchError) {
      // Network error or fetch failed
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
      console.error('Failed to fetch from backend:', errorMessage)
      return NextResponse.json(
        { 
          success: false, 
          error: `Unable to connect to payment service: ${errorMessage}`,
          code: 'SUBSCRIPTION_START_FAILED' 
        },
        { status: 503 }
      )
    }

    // Try to parse JSON response
    let backendResult
    try {
      const responseText = await backendResponse.text()
      
      // Handle empty response
      if (!responseText || responseText.trim() === '') {
        console.error('Backend returned empty response:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          url: `${BACKEND_URL}/api/user-auth/subscribe/start`
        })
        return NextResponse.json(
          { 
            success: false, 
            error: `Backend returned empty response (Status: ${backendResponse.status})`,
            code: 'SUBSCRIPTION_START_FAILED' 
          },
          { status: backendResponse.status || 500 }
        )
      }

      backendResult = JSON.parse(responseText)
      
      // Validate response structure
      if (!backendResult || typeof backendResult !== 'object') {
        console.error('Backend returned invalid JSON:', {
          status: backendResponse.status,
          response: responseText.substring(0, 200)
        })
        return NextResponse.json(
          { 
            success: false, 
            error: 'Backend returned invalid response format',
            code: 'SUBSCRIPTION_START_FAILED' 
          },
          { status: backendResponse.status || 500 }
        )
      }

      // If backend returned an error, preserve it and add helpful context
      if (!backendResponse.ok) {
        // Log the full error for debugging
        console.error('Backend subscription error:', {
          status: backendResponse.status,
          error: backendResult.error,
          code: backendResult.code,
          fullResponse: backendResult
        })

        // Check for specific Stripe errors
        if (backendResult.error && backendResult.error.includes('No such customer')) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Customer account issue. Please contact support or try signing out and back in.',
              code: 'STRIPE_CUSTOMER_NOT_FOUND',
              details: backendResult.error
            },
            { status: backendResponse.status }
          )
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, return error with response text
      const errorText = await backendResponse.text().catch(() => 'Unknown error')
      console.error('Failed to parse backend response:', {
        error: parseError,
        status: backendResponse.status,
        response: errorText.substring(0, 200)
      })
      return NextResponse.json(
        { 
          success: false, 
          error: `Backend error (${backendResponse.status}): ${errorText || 'Invalid response format'}`,
          code: 'SUBSCRIPTION_START_FAILED' 
        },
        { status: backendResponse.status || 500 }
      )
    }

    // If backend returned an error status but no error code, add one
    if (!backendResponse.ok && !backendResult.code) {
      backendResult.code = 'SUBSCRIPTION_START_FAILED'
    }

    // Return backend response (preserve error codes from backend)
    return NextResponse.json(backendResult, { status: backendResponse.status })
  } catch (error) {
    // Handle network errors, fetch failures, etc.
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error proxying subscription start:', error)
    
    // Check if it's a network/connection error
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unable to connect to payment service. Please check your connection and try again.',
          code: 'SUBSCRIPTION_START_FAILED' 
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start subscription. Please try again.',
        code: 'SUBSCRIPTION_START_FAILED' 
      },
      { status: 500 }
    )
  }
}

