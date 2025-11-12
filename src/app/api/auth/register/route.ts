import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Proxy user registration to backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields (name is optional per backend)
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Prepare request body for backend
    // Backend expects: email (required), password (required), name (optional), role (optional, defaults to 'STUDENT')
    const backendBody: { email: string; password: string; name?: string; role?: string } = {
      email: body.email.trim(),
      password: body.password,
    }

    // Only include name if provided
    if (body.name && body.name.trim()) {
      backendBody.name = body.name.trim()
    }

    // Role defaults to 'STUDENT' on backend, but we can include it if provided
    if (body.role) {
      backendBody.role = body.role
    }

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendBody),
    })

    const data = await backendResponse.json()

    // Pass through backend response (including error codes like USER_EXISTS, WEAK_PASSWORD, etc.)
    if (!backendResponse.ok) {
      return NextResponse.json(
        { 
          error: data.error || data.message || 'Registration failed',
          code: data.code, // Pass through error codes if present
        }, 
        { status: backendResponse.status }
      )
    }

    return NextResponse.json(data, { status: backendResponse.status })

  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
