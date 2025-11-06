import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

// Enhanced validation schema for course creation with comprehensive Foundry integration
const createCourseSchema = z.object({
  // Basic course information
  title: z.string().min(1, 'Course title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  language: z.string().min(1, 'Language is required'),
  goals: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  access: z.enum(['free', 'paid']),
  status: z.enum(['active', 'deactivated']),
  thumbnail: z.string().nullable().optional(),
  
  // Foundry-specific configuration
  foundryConfig: z.object({
    solc: z.string().default('0.8.30'),
    optimizer: z.boolean().default(true),
    optimizerRuns: z.number().default(200),
    viaIR: z.boolean().optional(),
    evmVersion: z.string().optional(),
    gasReports: z.array(z.string()).optional(),
    gasReportsIgnore: z.array(z.string()).optional()
  }).optional(),
  
  // Dependencies configuration
  dependencies: z.array(z.object({
    name: z.string().min(1, 'Dependency name is required'),
    version: z.string().optional(),
    source: z.string().optional(),
    installPath: z.string().optional()
  })).optional().default([]),
  
  // Templates configuration
  templates: z.array(z.object({
    name: z.string().min(1, 'Template name is required'),
    description: z.string().optional(),
    templatePath: z.string().optional(),
    isDefault: z.boolean().optional(),
    options: z.record(z.string(), z.any()).optional()
  })).optional().default([]),
  
  // Remappings configuration
  remappings: z.record(z.string(), z.string()).optional().default({}),
  
  // Course structure
  modules: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, 'Module title is required'),
    description: z.string().optional(),
    order: z.number().optional(),
    lessons: z.array(z.object({
      id: z.string(),
      type: z.enum(['intro', 'quiz', 'challenge']),
      title: z.string().min(1, 'Lesson title is required'),
      contentMarkdown: z.string().optional(),
      youtubeUrl: z.string().nullable().optional(),
      initialCode: z.string().nullable().optional(),
      solutionCode: z.string().nullable().optional(),
      tests: z.string().nullable().optional(),
      order: z.number().optional()
    }))
  })).optional().default([])
})

export const POST = withAuth(async (request: NextRequest, context) => {
    try {
      const body = await request.json()
      const validatedData = createCourseSchema.parse(body)

      // Check if user has permission to create courses
      if (context.user.role !== 'ADMIN') {
        return createErrorResponse('Only admins can create courses', 403)
      }

      // Forward request to backend
      const backendResponse = await fetch(`${BACKEND_URL}/api/courses/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(context.session as any)?.backendAccessToken || ''}`,
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
        return createErrorResponse('Validation error', 400, {
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        })
      }

      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to create course',
        500
      )
    }
  }, { requireAdmin: true }) // Only admins can create courses

export const GET = withAuth(async (request: NextRequest, context) => {
    try {
      // Forward request to backend
      const backendResponse = await fetch(`${BACKEND_URL}/api/courses/create`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(context.session as any)?.backendAccessToken || ''}`,
        },
      })

      const data = await backendResponse.json()

      if (!backendResponse.ok) {
        return NextResponse.json(data, { status: backendResponse.status })
      }

      return NextResponse.json(data)

    } catch (error) {
      return createErrorResponse('Failed to get course creation information', 500)
    }
  })
