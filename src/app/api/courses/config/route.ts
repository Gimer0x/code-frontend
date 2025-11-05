import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCompilationClient } from '@/lib/compilationClient'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

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

      // Try to get from backend first
      try {
        const backendResponse = await fetch(`${BACKEND_URL}/api/courses/${courseId}/config`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.backendAccessToken || ''}`,
          },
        })

        if (backendResponse.ok) {
          const data = await backendResponse.json()
          return NextResponse.json(data)
        }
      } catch (backendError) {
        // Backend unavailable, continue with local check
      }

      // Fallback: Get current configuration from Foundry service
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
        // Service unavailable
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

      return createSuccessResponse({
        courseId,
        configuration: {
          foundryConfig: serviceConfig?.foundryConfig || defaultFoundryConfig,
          remappings: serviceConfig?.remappings || defaultRemappings,
          dependencies: serviceConfig?.dependencies || [],
          templates: serviceConfig?.templates || []
        },
        defaultConfiguration: {
          foundryConfig: defaultFoundryConfig,
          remappings: defaultRemappings
        }
      })

    } catch (error) {
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

      // Forward request to backend
      const backendResponse = await fetch(`${BACKEND_URL}/api/courses/${validatedData.courseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.backendAccessToken || ''}`,
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

      // Forward request to backend
      const backendResponse = await fetch(`${BACKEND_URL}/api/courses/${courseId}/config`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.backendAccessToken || ''}`,
        },
      })

      const data = await backendResponse.json()

      if (!backendResponse.ok) {
        return NextResponse.json(data, { status: backendResponse.status })
      }

      return NextResponse.json(data)

    } catch (error) {
      return createErrorResponse('Failed to reset course configuration', 500)
    }
  })
}
