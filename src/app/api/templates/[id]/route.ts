import { NextRequest, NextResponse } from 'next/server'
import { templateManager } from '@/lib/template-manager'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'

/**
 * Get specific template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (session) => {
    try {
      const templateId = params.id

      // Initialize template manager
      await templateManager.initialize()

      // Get template
      const template = templateManager.getTemplate(templateId)
      if (!template) {
        return createErrorResponse('Template not found', 404)
      }

      return createSuccessResponse({
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          difficulty: template.difficulty,
          language: template.language,
          files: template.files.map(file => ({
            path: file.path,
            content: file.content,
            description: file.description
          })),
          dependencies: template.dependencies,
          foundryConfig: template.foundryConfig,
          remappings: template.remappings,
          metadata: template.metadata
        }
      })

    } catch (error) {
      return createErrorResponse('Failed to get template', 500)
    }
  })
}
