import { NextRequest, NextResponse } from 'next/server'
import { forgotPasswordSchema, RateLimiter } from '@/lib/validation'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Proxy forgot password to backend
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for password reset requests
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimiter = new RateLimiter(3, 60 * 60 * 1000) // 3 attempts per hour
    
    if (!rateLimiter.isAllowed(clientIP)) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Validate input schema
    const validationResult = forgotPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validationResult.data),
    })

    const data = await backendResponse.json()

    // Return backend response (may include resetToken in development)
    return NextResponse.json(data, { status: backendResponse.status })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
