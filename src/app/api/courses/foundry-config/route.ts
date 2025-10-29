import { NextRequest, NextResponse } from 'next/server'
import { foundryConfigService } from '@/lib/foundry-config-service'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const foundryConfigSchema = z.object({
  solc: z.string().min(1, 'Solidity version is required'),
  viaIR: z.boolean().optional(),
  evmVersion: z.string().optional(),
  optimizer: z.boolean().optional(),
  optimizerRuns: z.number().min(0).optional(),
  extraOutput: z.array(z.string()).optional(),
  extraOutputFiles: z.array(z.string()).optional(),
  bytecodeHash: z.enum(['none', 'ipfs', 'bzzr1']).optional(),
  cborMetadata: z.boolean().optional(),
  gasReports: z.array(z.string()).optional(),
  gasReportsIgnore: z.array(z.string()).optional(),
  verbosity: z.number().min(0).max(3).optional(),
  ffi: z.boolean().optional(),
  buildInfo: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
})

const libraryConfigSchema = z.object({
  name: z.string().min(1, 'Library name is required'),
  version: z.string().optional(),
  source: z.enum(['github', 'npm', 'git']).optional(),
  url: z.string().optional(),
  branch: z.string().optional(),
  commit: z.string().optional(),
  installPath: z.string().optional()
})

const updateConfigSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  foundryConfig: foundryConfigSchema.optional(),
  libraries: z.array(libraryConfigSchema).optional(),
  remappings: z.record(z.string()).optional()
})

/**
 * Get course Foundry configuration
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      // Get course configuration
      const config = await foundryConfigService.getCourseConfig(courseId)
      
      if (!config) {
        return createErrorResponse('Course configuration not found', 404)
      }

      // Get library status
      const libraryStatus = await foundryConfigService.getLibraryStatus(courseId)

      return createSuccessResponse({
        courseId,
        foundryConfig: config.foundryConfig,
        libraries: config.libraries,
        remappings: config.remappings,
        libraryStatus,
        availableSolcVersions: foundryConfigService.getAvailableSolcVersions(),
        availableEVMVersions: foundryConfigService.getAvailableEVMVersions(),
        availableLibraries: foundryConfigService.getAvailableLibraries(),
        defaultRemappings: foundryConfigService.getDefaultRemappings(),
        configurationPresets: foundryConfigService.getConfigurationPresets()
      })

    } catch (error) {
      return createErrorResponse('Failed to get Foundry configuration', 500)
    }
  })
}

/**
 * Update course Foundry configuration
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = updateConfigSchema.parse(body)

      // Validate Foundry configuration if provided
      if (validatedData.foundryConfig) {
        const validation = foundryConfigService.validateConfig(validatedData.foundryConfig)
        if (!validation.isValid) {
          return createErrorResponse('Invalid Foundry configuration', 400, {
            errors: validation.errors
          })
        }
      }

      // Update configuration
      const success = await foundryConfigService.updateCourseConfig(
        validatedData.courseId,
        {
          foundryConfig: validatedData.foundryConfig,
          libraries: validatedData.libraries,
          remappings: validatedData.remappings
        }
      )

      if (!success) {
        return createErrorResponse('Failed to update Foundry configuration', 500)
      }

      // Get updated configuration
      const updatedConfig = await foundryConfigService.getCourseConfig(validatedData.courseId)

      return createSuccessResponse({
        message: 'Foundry configuration updated successfully',
        courseId: validatedData.courseId,
        configuration: updatedConfig,
        updatedAt: new Date().toISOString()
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
        error instanceof Error ? error.message : 'Failed to update Foundry configuration',
        500
      )
    }
  })
}

/**
 * Reset configuration to defaults
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')
      const preset = searchParams.get('preset') || 'development'

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      // Get preset configuration
      const presets = foundryConfigService.getConfigurationPresets()
      const presetConfig = presets[preset] || presets.development

      // Reset to default configuration
      const success = await foundryConfigService.updateCourseConfig(courseId, {
        foundryConfig: presetConfig,
        libraries: foundryConfigService.getAvailableLibraries().slice(0, 2), // Default libraries
        remappings: foundryConfigService.getDefaultRemappings()
      })

      if (!success) {
        return createErrorResponse('Failed to reset Foundry configuration', 500)
      }

      return createSuccessResponse({
        message: `Foundry configuration reset to ${preset} preset`,
        courseId,
        preset,
        configuration: presetConfig,
        updatedAt: new Date().toISOString()
      })

    } catch (error) {
      return createErrorResponse('Failed to reset Foundry configuration', 500)
    }
  })
}
