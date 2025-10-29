import { NextRequest, NextResponse } from 'next/server'
import { templateManager } from '@/lib/template-manager'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schema for template creation
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  category: z.enum(['basic', 'advanced', 'defi', 'nft', 'dao', 'custom']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.enum(['solidity', 'javascript', 'typescript']),
  files: z.array(z.object({
    path: z.string().min(1, 'File path is required'),
    content: z.string().min(1, 'File content is required'),
    description: z.string().optional()
  })).min(1, 'At least one file is required'),
  dependencies: z.array(z.object({
    name: z.string().min(1, 'Dependency name is required'),
    version: z.string().min(1, 'Version is required'),
    source: z.enum(['github', 'npm', 'git'])
  })).optional().default([]),
  foundryConfig: z.object({
    solc: z.string().min(1, 'Solidity version is required'),
    optimizer: z.boolean().optional().default(true),
    optimizerRuns: z.number().min(0).optional().default(200),
    viaIR: z.boolean().optional().default(false),
    evmVersion: z.string().optional().default('london')
  }),
  remappings: z.record(z.string()).optional().default({}),
  metadata: z.object({
    author: z.string().optional(),
    version: z.string().min(1, 'Version is required'),
    tags: z.array(z.string()).optional().default([]),
    estimatedTime: z.string().optional(),
    prerequisites: z.array(z.string()).optional().default([])
  })
})

/**
 * Create a new template
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = createTemplateSchema.parse(body)

      // Check if user has permission to create templates
      if (session.user.role !== 'ADMIN') {
        return createErrorResponse('Only admins can create templates', 403)
      }

      // Initialize template manager
      await templateManager.initialize()

      // Generate template ID
      const templateId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Create template object
      const template = {
        id: templateId,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        difficulty: validatedData.difficulty,
        language: validatedData.language,
        files: validatedData.files,
        dependencies: validatedData.dependencies,
        foundryConfig: validatedData.foundryConfig,
        remappings: validatedData.remappings,
        metadata: {
          ...validatedData.metadata,
          author: validatedData.metadata.author || session.user.name || 'Unknown',
          createdAt: new Date().toISOString()
        }
      }

      // Add template to manager (in a real implementation, this would be persisted)
      // For now, we'll just return the template
      // In a production system, you'd save this to a database

      return createSuccessResponse({
        message: 'Template created successfully',
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          difficulty: template.difficulty,
          language: template.language,
          files: template.files.map(file => ({
            path: file.path,
            description: file.description
          })),
          dependencies: template.dependencies,
          foundryConfig: template.foundryConfig,
          metadata: template.metadata
        }
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
        error instanceof Error ? error.message : 'Failed to create template',
        500
      )
    }
  }, ['ADMIN']) // Only admins can create templates
}
