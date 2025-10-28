import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCompilationClient } from '@/lib/compilationClient'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const projectActionSchema = z.object({
  action: z.enum(['build', 'test', 'clean', 'install', 'update']),
  options: z.record(z.any()).optional()
})

const updateProjectConfigSchema = z.object({
  foundryConfig: z.record(z.any()).optional(),
  dependencies: z.array(z.object({
    name: z.string(),
    version: z.string().optional(),
    source: z.string().optional()
  })).optional(),
  templates: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    templatePath: z.string().optional(),
    options: z.record(z.any()).optional()
  })).optional(),
  remappings: z.record(z.string()).optional()
})

/**
 * Get course project status and configuration
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

      // Get project status from Foundry service
      const client = getCompilationClient()
      let projectStatus = null
      
      try {
        const statusResult = await client.getProjectStatus(courseId)
        if (statusResult.success) {
          projectStatus = statusResult
        }
      } catch (statusError) {
        console.warn('⚠️ Failed to get project status from Foundry service:', statusError)
      }

      return createSuccessResponse({
        courseProject: {
          id: courseProject.id,
          courseId: courseProject.courseId,
          projectPath: courseProject.projectPath,
          foundryConfig: courseProject.foundryConfig,
          dependencies: courseProject.dependencies,
          templates: courseProject.templates,
          remappings: courseProject.remappings,
          isActive: courseProject.isActive,
          status: courseProject.status,
          errorMessage: courseProject.errorMessage,
          createdAt: courseProject.createdAt,
          updatedAt: courseProject.updatedAt
        },
        course: courseProject.course,
        projectStatus,
        lastChecked: new Date().toISOString()
      })

    } catch (error) {
      console.error('Get course project error:', error)
      return createErrorResponse('Failed to get course project', 500)
    }
  })
}

/**
 * Execute project actions (build, test, clean, install, update)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const { courseId, ...actionData } = body
      const validatedAction = projectActionSchema.parse(actionData)

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

      // Execute action on Foundry service
      const client = getCompilationClient()
      let actionResult = null

      try {
        const result = await client.executeProjectAction(courseId, validatedAction.action, validatedAction.options)
        if (result.success) {
          actionResult = result
        } else {
          throw new Error(result.error || 'Action execution failed')
        }
      } catch (actionError) {
        console.error(`❌ Project action ${validatedAction.action} failed:`, actionError)
        return createErrorResponse(
          `Failed to execute ${validatedAction.action} action: ${actionError instanceof Error ? actionError.message : 'Unknown error'}`,
          500
        )
      }

      // Update project status in database
      await prisma.courseProject.update({
        where: { id: courseProject.id },
        data: {
          status: 'active',
          updatedAt: new Date()
        }
      })

      return createSuccessResponse({
        message: `Project ${validatedAction.action} executed successfully`,
        action: validatedAction.action,
        result: actionResult,
        projectId: courseProject.id,
        courseId: courseProject.courseId
      })

    } catch (error) {
      console.error('Execute project action error:', error)
      
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
        error instanceof Error ? error.message : 'Failed to execute project action',
        500
      )
    }
  })
}

/**
 * Update project configuration
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const { courseId, ...configData } = body
      const validatedConfig = updateProjectConfigSchema.parse(configData)

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

      // Update project configuration on Foundry service
      const client = getCompilationClient()
      let updateResult = null

      try {
        const result = await client.updateProjectConfig(courseId, validatedConfig)
        if (result.success) {
          updateResult = result
        } else {
          throw new Error(result.error || 'Configuration update failed')
        }
      } catch (updateError) {
        console.error('❌ Project configuration update failed:', updateError)
        return createErrorResponse(
          `Failed to update project configuration: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
          500
        )
      }

      // Update project configuration in database
      const updatedProject = await prisma.courseProject.update({
        where: { id: courseProject.id },
        data: {
          foundryConfig: validatedConfig.foundryConfig || courseProject.foundryConfig,
          dependencies: validatedConfig.dependencies || courseProject.dependencies,
          templates: validatedConfig.templates || courseProject.templates,
          remappings: validatedConfig.remappings || courseProject.remappings,
          updatedAt: new Date()
        }
      })

      return createSuccessResponse({
        message: 'Project configuration updated successfully',
        project: {
          id: updatedProject.id,
          courseId: updatedProject.courseId,
          foundryConfig: updatedProject.foundryConfig,
          dependencies: updatedProject.dependencies,
          templates: updatedProject.templates,
          remappings: updatedProject.remappings,
          updatedAt: updatedProject.updatedAt
        },
        updateResult
      })

    } catch (error) {
      console.error('Update project configuration error:', error)
      
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
        error instanceof Error ? error.message : 'Failed to update project configuration',
        500
      )
    }
  })
}

/**
 * Delete course project
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

      // Delete project from Foundry service
      const client = getCompilationClient()
      let deleteResult = null

      try {
        const result = await client.deleteProject(courseId, courseProject.projectPath)
        if (result.success) {
          deleteResult = result
        } else {
          console.warn('⚠️ Foundry service project deletion failed:', result.error)
        }
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete project from Foundry service:', deleteError)
      }

      // Delete project record from database
      await prisma.courseProject.delete({
        where: { id: courseProject.id }
      })

      return createSuccessResponse({
        message: 'Course project deleted successfully',
        projectId: courseProject.id,
        courseId: courseProject.courseId,
        deleteResult
      })

    } catch (error) {
      console.error('Delete course project error:', error)
      return createErrorResponse('Failed to delete course project', 500)
    }
  })
}