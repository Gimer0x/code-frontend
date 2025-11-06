import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/jwt-auth'
import { z } from 'zod'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

// Validation schema for course creation with Foundry integration
const createCourseWithFoundrySchema = z.object({
  title: z.string().min(1, 'Course title is required').max(200, 'Title too long'),
  language: z.string().min(1, 'Language is required'),
  goals: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  access: z.enum(['free', 'paid']),
  status: z.enum(['active', 'deactivated']),
  thumbnail: z.string().nullable().optional(),
  modules: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, 'Module title is required'),
    description: z.string().optional(),
    lessons: z.array(z.object({
      id: z.string(),
      type: z.enum(['intro', 'quiz', 'challenge']),
      title: z.string().min(1, 'Lesson title is required'),
      contentMarkdown: z.string().optional(),
      youtubeUrl: z.string().nullable().optional(),
      initialCode: z.string().nullable().optional(),
      solutionCode: z.string().nullable().optional(),
      tests: z.string().nullable().optional(),
    }))
  })).optional().default([])
})

/**
 * Proxy course creation with Foundry integration to backend
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using JWT
    const authResult = await requireAdmin(request)
    
    if (!authResult.success) {
      return NextResponse.json({ 
        success: false,
        error: authResult.error || 'Unauthorized - Admin access required' 
      }, { status: 401 })
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '') || ''

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createCourseWithFoundrySchema.parse(body)

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/courses/with-foundry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(validatedData),
    })

    const data = await backendResponse.json()

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status })
    }

    return NextResponse.json(data)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create course'
    }, { status: 500 })
  }
}
