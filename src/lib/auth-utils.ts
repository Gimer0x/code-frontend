/**
 * Authentication and Authorization Utilities for Railway API Routes
 * 
 * This module provides utilities for handling authentication and authorization
 * in the Railway-deployed API routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface AuthContext {
  user: {
    id: string
    email: string
    role: 'ADMIN' | 'STUDENT'
    name?: string
  }
  session: any
}

export interface AuthOptions {
  requireAuth?: boolean
  requireAdmin?: boolean
  requireCourseAccess?: string // courseId
  allowAnonymous?: boolean
}

export type UserRole = 'ADMIN' | 'STUDENT'

/**
 * Authenticate and authorize request
 */
export async function authenticateRequest(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<{
  success: boolean
  response?: NextResponse
  context?: AuthContext
  error?: string
}> {
  const {
    requireAuth = true,
    requireAdmin = false,
    requireCourseAccess,
    allowAnonymous = false
  } = options

  try {
    // Get session
    const session = await getServerSession(authOptions)
    
    // Handle anonymous access
    if (!session && allowAnonymous) {
      return { success: true, context: undefined }
    }

    // Check if authentication is required
    if (!session && requireAuth) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        ),
        error: 'No session found'
      }
    }

    if (!session) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
        error: 'No session found'
      }
    }

    // Create auth context
    const context: AuthContext = {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role: session.user.role || 'STUDENT',
        name: session.user.name
      },
      session
    }

    // Check admin requirement
    if (requireAdmin && context.user.role !== 'ADMIN') {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        ),
        error: 'Insufficient permissions'
      }
    }

    // Check course access
    if (requireCourseAccess) {
      const hasAccess = await checkCourseAccess(
        context.user.id,
        requireCourseAccess
      )
      
      if (!hasAccess) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Course access denied' },
            { status: 403 }
          ),
          error: 'No course access'
        }
      }
    }

    return { success: true, context }

  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      ),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if user has access to a course
 */
export async function checkCourseAccess(
  userId: string,
  courseId: string
): Promise<boolean> {
  try {
    // Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { access: true, creatorId: true }
    })

    if (!course) {
      return false
    }

    // Free courses are accessible to everyone
    if (course.access === 'free') {
      return true
    }

    // Course creator has access
    if (course.creatorId === userId) {
      return true
    }

    // Check if user has active subscription for paid courses
    if (course.access === 'paid') {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active'
        }
      })
      return !!subscription
    }

    return false

  } catch (error) {
    return false
  }
}

/**
 * Check if user is course creator or admin
 */
export async function checkCourseOwnership(
  userId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  try {
    // Admins have access to all courses
    if (userRole === 'ADMIN') {
      return true
    }

    // Check if user is course creator
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { creatorId: true }
    })

    return course?.creatorId === userId

  } catch (error) {
    return false
  }
}

/**
 * Middleware wrapper for API routes
 */
export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request, options)
    
    if (!authResult.success) {
      return authResult.response!
    }

    return handler(request, authResult.context!)
  }
}

/**
 * Rate limiting utility
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier
  const current = rateLimitMap.get(key)

  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs
    }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    }
  }

  // Increment count
  current.count++
  rateLimitMap.set(key, current)

  return {
    allowed: true,
    remaining: limit - current.count,
    resetTime: current.resetTime
  }
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(
  remaining: number,
  resetTime: number
): NextResponse {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
      }
    }
  )
}

/**
 * Validate request body with Zod schema
 */
export function validateRequestBody<T>(
  body: any,
  schema: any
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error: any) {
    return {
      success: false,
      error: error.errors?.map((e: any) => e.message).join(', ') || 'Validation failed'
    }
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(
  data: any,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 12)
}

/**
 * Verify password using bcrypt
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
