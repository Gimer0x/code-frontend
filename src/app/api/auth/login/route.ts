import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Proxy user login to backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'MISSING_CREDENTIALS',
          message: 'Email and password are required' 
        },
        { status: 400 }
      )
    }

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email.trim(),
        password: body.password,
      }),
    })

    const data = await backendResponse.json()

    // Pass through backend response (including error codes)
    if (!backendResponse.ok) {
      return NextResponse.json(
        { 
          success: false,
          error: data.error || data.code || 'LOGIN_FAILED',
          message: data.message || data.error || 'Login failed',
          code: data.code || data.error, // Pass through error codes
        }, 
        { status: backendResponse.status }
      )
    }

    // Success response
    return NextResponse.json(data, { status: backendResponse.status })

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'LOGIN_FAILED',
        message: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

