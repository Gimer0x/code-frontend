import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCompilationClient } from '@/lib/compilationClient'
import { courseCreationService } from '@/lib/course-creation-service'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

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
    options: z.record(z.any()).optional()
  })).optional().default([]),
  
  // Remappings configuration
  remappings: z.record(z.string()).optional().default({}),
  
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

export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = createCourseSchema.parse(body)

      // Use course creation service for comprehensive course creation
      const creationResult = await courseCreationService.createCourse({
        title: validatedData.title,
        description: validatedData.description,
        language: validatedData.language,
        goals: validatedData.goals,
        level: validatedData.level,
        access: validatedData.access,
        status: validatedData.status,
        thumbnail: validatedData.thumbnail,
        creatorId: session.user.id,
        foundryConfig: validatedData.foundryConfig,
        dependencies: validatedData.dependencies,
        templates: validatedData.templates,
        remappings: validatedData.remappings,
        modules: validatedData.modules
      })

      if (!creationResult.success) {
        return createErrorResponse(
          'Course creation failed',
          500,
          {
            errors: creationResult.errors,
            warnings: creationResult.warnings
          }
        )
      }

      // Get available templates for response
      const availableTemplates = await courseCreationService.getCourseTemplates()

      return createSuccessResponse({
        message: 'Course created successfully with enhanced Foundry integration',
        course: creationResult.course,
        foundryProject: creationResult.foundryProject,
        availableTemplates,
        foundryIntegration: validatedData.language.toLowerCase() === 'solidity',
        configuration: {
          foundryConfig: validatedData.foundryConfig,
          dependencies: validatedData.dependencies,
          templates: validatedData.templates,
          remappings: validatedData.remappings
        },
        warnings: creationResult.warnings
      })

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
  }, ['ADMIN']) // Only admins can create courses
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      // Get course creation defaults and available templates
      const defaults = courseCreationService.getCourseCreationDefaults()
      const availableTemplates = await courseCreationService.getCourseTemplates()
      const availableDependencies = courseCreationService.getAvailableDependencies()

      return createSuccessResponse({
        availableTemplates,
        availableDependencies,
        ...defaults
      })

    } catch (error) {
      return createErrorResponse('Failed to get course creation information', 500)
    }
  })
}