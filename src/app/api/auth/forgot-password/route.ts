import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePasswordResetToken } from '@/lib/auth-utils'
import { createDevEmailService } from '@/lib/email'
import { forgotPasswordSchema, RateLimiter } from '@/lib/validation'

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

    const { email } = validationResult.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ message: 'If an account exists, a password reset email has been sent' })
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Save reset token to database
    await prisma.passwordReset.create({
      data: {
        email: user.email,
        token: resetToken,
        expiresAt
      }
    })

    // Send reset email
    const emailService = createDevEmailService()
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password`
    
    const emailSent = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      resetUrl
    )

    if (emailSent) {
      // In development mode, return the reset token for testing
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ 
          message: 'Password reset email sent successfully!',
          resetToken: resetToken, // Only in development
          resetUrl: resetUrl
        })
      } else {
        return NextResponse.json({ 
          message: 'If an account exists, a password reset email has been sent' 
        })
      }
    } else {
      return NextResponse.json(
        { error: 'Failed to send reset email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
