import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCompilationClient } from '@/lib/compilationClient'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const foundryConfigSchema = z.object({
  solc: z.string().optional(),
  optimizer: z.boolean().optional(),
  optimizerRuns: z.number().optional(),
  viaIR: z.boolean().optional(),
  evmVersion: z.string().optional(),
  gasReports: z.array(z.string()).optional(),
  gasReportsIgnore: z.array(z.string()).optional(),
  extraOutput: z.array(z.string()).optional(),
  extraOutputFiles: z.array(z.string()).optional(),
  bytecodeHash: z.string().optional(),
  cborMetadata: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
})

const remappingsSchema = z.record(z.string())

const updateConfigSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  foundryConfig: foundryConfigSchema.optional(),
  remappings: remappingsSchema.optional()
})

/**
 * Get course configuration
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      // Get course project from database
      const courseProject = await prisma.courseProject.findFirst({
        where: { courseId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              language: true,
              creatorId: true
            }
          }
        }
      })

      if (!courseProject) {
        return createErrorResponse('Course project not found', 404)
      }

      // Check authorization
      if (session.user.role !== 'ADMIN' && courseProject.course.creatorId !== session.user.id) {
        return createErrorResponse('Unauthorized to access this course project', 403)
      }

      // Get current configuration from Foundry service
      const client = getCompilationClient()
      let serviceConfig = null

      try {
        const statusResult = await client.getProjectStatus(courseId)
        if (statusResult.success) {
          serviceConfig = {
            foundryConfig: statusResult.foundryConfig,
            remappings: statusResult.remappings,
            dependencies: statusResult.dependencies,
            templates: statusResult.templates
          }
        }
      } catch (statusError) {
        console.warn('⚠️ Failed to get project status from Foundry service:', statusError)
      }

      // Default configuration if none exists
      const defaultFoundryConfig = {
        solc: '0.8.30',
        optimizer: true,
        optimizerRuns: 200,
        viaIR: false,
        evmVersion: 'london',
        gasReports: [],
        gasReportsIgnore: [],
        extraOutput: ['metadata'],
        extraOutputFiles: ['metadata'],
        bytecodeHash: 'none',
        cborMetadata: true
      }

      const defaultRemappings = {
        'forge-std/': 'lib/forge-std/src/',
        '@openzeppelin/': 'lib/openzeppelin-contracts/'
      }

      return createSuccessResponse({
        courseId,
        course: courseProject.course,
        configuration: {
          foundryConfig: courseProject.foundryConfig || defaultFoundryConfig,
          remappings: courseProject.remappings || defaultRemappings,
          dependencies: courseProject.dependencies || [],
          templates: courseProject.templates || []
        },
        serviceConfig,
        defaultConfiguration: {
          foundryConfig: defaultFoundryConfig,
          remappings: defaultRemappings
        },
        lastUpdated: courseProject.updatedAt
      })

    } catch (error) {
      console.error('Get course configuration error:', error)
      return createErrorResponse('Failed to get course configuration', 500)
    }
  })
}

/**
 * Update course configuration
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = updateConfigSchema.parse(body)

      // Get course project from database
      const courseProject = await prisma.courseProject.findFirst({
        where: { courseId: validatedData.courseId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              language: true,
              creatorId: true
            }
          }
        }
      })

      if (!courseProject) {
        return createErrorResponse('Course project not found', 404)
      }

      // Check authorization
      if (session.user.role !== 'ADMIN' && courseProject.course.creatorId !== session.user.id) {
        return createErrorResponse('Unauthorized to access this course project', 403)
      }

      // Update configuration on Foundry service
      const client = getCompilationClient()
      let updateResult = null

      try {
        const result = await client.updateProjectConfig(validatedData.courseId, {
          foundryConfig: validatedData.foundryConfig,
          remappings: validatedData.remappings
        })

        if (result.success) {
          updateResult = result
        } else {
          throw new Error(result.error || 'Configuration update failed')
        }
      } catch (updateError) {
        console.error('❌ Configuration update failed:', updateError)
        return createErrorResponse(
          `Failed to update configuration: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
          500
        )
      }

      // Update configuration in database
      const updatedProject = await prisma.courseProject.update({
        where: { id: courseProject.id },
        data: {
          foundryConfig: validatedData.foundryConfig || courseProject.foundryConfig,
          remappings: validatedData.remappings || courseProject.remappings,
          updatedAt: new Date()
        }
      })

      return createSuccessResponse({
        message: 'Course configuration updated successfully',
        courseId: validatedData.courseId,
        configuration: {
          foundryConfig: updatedProject.foundryConfig,
          remappings: updatedProject.remappings,
          dependencies: updatedProject.dependencies,
          templates: updatedProject.templates
        },
        updateResult,
        updatedAt: updatedProject.updatedAt
      })

    } catch (error) {
      console.error('Update course configuration error:', error)
      
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
        error instanceof Error ? error.message : 'Failed to update course configuration',
        500
      )
    }
  })
}

/**
 * Reset course configuration to defaults
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      // Get course project from database
      const courseProject = await prisma.courseProject.findFirst({
        where: { courseId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              language: true,
              creatorId: true
            }
          }
        }
      })

      if (!courseProject) {
        return createErrorResponse('Course project not found', 404)
      }

      // Check authorization
      if (session.user.role !== 'ADMIN' && courseProject.course.creatorId !== session.user.id) {
        return createErrorResponse('Unauthorized to access this course project', 403)
      }

      // Default configuration
      const defaultFoundryConfig = {
        solc: '0.8.30',
        optimizer: true,
        optimizerRuns: 200,
        viaIR: false,
        evmVersion: 'london',
        gasReports: [],
        gasReportsIgnore: [],
        extraOutput: ['metadata'],
        extraOutputFiles: ['metadata'],
        bytecodeHash: 'none',
        cborMetadata: true
      }

      const defaultRemappings = {
        'forge-std/': 'lib/forge-std/src/',
        '@openzeppelin/': 'lib/openzeppelin-contracts/'
      }

      // Reset configuration on Foundry service
      const client = getCompilationClient()
      let resetResult = null

      try {
        const result = await client.updateProjectConfig(courseId, {
          foundryConfig: defaultFoundryConfig,
          remappings: defaultRemappings
        })

        if (result.success) {
          resetResult = result
        } else {
          throw new Error(result.error || 'Configuration reset failed')
        }
      } catch (resetError) {
        console.error('❌ Configuration reset failed:', resetError)
        return createErrorResponse(
          `Failed to reset configuration: ${resetError instanceof Error ? resetError.message : 'Unknown error'}`,
          500
        )
      }

      // Reset configuration in database
      const updatedProject = await prisma.courseProject.update({
        where: { id: courseProject.id },
        data: {
          foundryConfig: defaultFoundryConfig,
          remappings: defaultRemappings,
          updatedAt: new Date()
        }
      })

      return createSuccessResponse({
        message: 'Course configuration reset to defaults',
        courseId,
        configuration: {
          foundryConfig: updatedProject.foundryConfig,
          remappings: updatedProject.remappings,
          dependencies: updatedProject.dependencies,
          templates: updatedProject.templates
        },
        resetResult,
        updatedAt: updatedProject.updatedAt
      })

    } catch (error) {
      console.error('Reset course configuration error:', error)
      return createErrorResponse('Failed to reset course configuration', 500)
    }
  })
}