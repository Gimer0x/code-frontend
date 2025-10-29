import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCompilationClient } from '@/lib/compilationClient'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  templatePath: z.string().optional(),
  isDefault: z.boolean().optional(),
  options: z.record(z.any()).optional()
})

const applyTemplateSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  templateName: z.string().min(1, 'Template name is required'),
  templatePath: z.string().optional(),
  targetPath: z.string().optional(),
  options: z.record(z.any()).optional()
})

/**
 * Get available templates
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')

      // Get available templates from Foundry service
      const client = getCompilationClient()
      let availableTemplates = []
      let courseTemplates = []

      try {
        const templatesResult = await client.getTemplates()
        if (templatesResult.success) {
          availableTemplates = templatesResult.templates || []
        }
      } catch (templateError) {
      }

      // If courseId is provided, get course-specific templates
      if (courseId) {
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

        if (courseProject) {
          // Check authorization
          if (session.user.role !== 'ADMIN' && courseProject.course.creatorId !== session.user.id) {
            return createErrorResponse('Unauthorized to access this course project', 403)
          }

          courseTemplates = courseProject.templates || []
        }
      }

      // Default templates if none available
      if (availableTemplates.length === 0) {
        availableTemplates = [
          { name: 'basic', description: 'Basic Solidity template', isDefault: true },
          { name: 'erc20', description: 'ERC-20 token template', isDefault: false },
          { name: 'nft', description: 'NFT template', isDefault: false },
          { name: 'defi', description: 'DeFi protocol template', isDefault: false },
          { name: 'dao', description: 'DAO template', isDefault: false },
          { name: 'multisig', description: 'Multisig wallet template', isDefault: false }
        ]
      }

      return createSuccessResponse({
        availableTemplates,
        courseTemplates: courseId ? courseTemplates : null,
        courseId,
        totalTemplates: availableTemplates.length
      })

    } catch (error) {
      return createErrorResponse('Failed to get templates', 500)
    }
  })
}

/**
 * Apply template to course
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = applyTemplateSchema.parse(body)

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

      // Apply template on Foundry service
      const client = getCompilationClient()
      let applyResult = null

      try {
        const result = await client.applyTemplate({
          courseId: validatedData.courseId,
          projectPath: courseProject.projectPath,
          templatePath: validatedData.templatePath || `/templates/${validatedData.templateName}`,
          targetPath: validatedData.targetPath
        })

        if (result.success) {
          applyResult = result
        } else {
          throw new Error(result.error || 'Template application failed')
        }
      } catch (applyError) {
        return createErrorResponse(
          `Failed to apply template: ${applyError instanceof Error ? applyError.message : 'Unknown error'}`,
          500
        )
      }

      // Update project templates in database
      const newTemplate = {
        name: validatedData.templateName,
        description: `Applied ${validatedData.templateName} template`,
        templatePath: validatedData.templatePath || `/templates/${validatedData.templateName}`,
        isDefault: false,
        options: validatedData.options || {},
        appliedAt: new Date().toISOString()
      }

      const updatedTemplates = [
        ...(courseProject.templates || []),
        newTemplate
      ]

      await prisma.courseProject.update({
        where: { id: courseProject.id },
        data: {
          templates: updatedTemplates,
          updatedAt: new Date()
        }
      })

      return createSuccessResponse({
        message: 'Template applied successfully',
        courseId: validatedData.courseId,
        templateName: validatedData.templateName,
        applyResult,
        appliedTemplate: newTemplate,
        totalTemplates: updatedTemplates.length
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
        error instanceof Error ? error.message : 'Failed to apply template',
        500
      )
    }
  })
}

/**
 * Remove template from course
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')
      const templateName = searchParams.get('templateName')

      if (!courseId || !templateName) {
        return createErrorResponse('Course ID and template name are required', 400)
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

      // Remove template from project templates in database
      const updatedTemplates = (courseProject.templates || []).filter(
        template => template.name !== templateName
      )

      await prisma.courseProject.update({
        where: { id: courseProject.id },
        data: {
          templates: updatedTemplates,
          updatedAt: new Date()
        }
      })

      return createSuccessResponse({
        message: 'Template removed successfully',
        courseId,
        removedTemplate: templateName,
        remainingTemplates: updatedTemplates.length
      })

    } catch (error) {
      return createErrorResponse('Failed to remove template', 500)
    }
  })
}