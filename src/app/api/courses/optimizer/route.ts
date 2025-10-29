import { NextRequest, NextResponse } from 'next/server'
import { foundryConfigService } from '@/lib/foundry-config-service'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const optimizerConfigSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  optimizer: z.boolean(),
  optimizerRuns: z.number().min(0).optional(),
  viaIR: z.boolean().optional(),
  evmVersion: z.string().optional()
})

const optimizerPresetSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  preset: z.enum(['development', 'production', 'gasOptimized', 'sizeOptimized'])
})

/**
 * Get optimizer configuration
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

      return createSuccessResponse({
        courseId,
        optimizerConfig: {
          optimizer: config.foundryConfig.optimizer,
          optimizerRuns: config.foundryConfig.optimizerRuns,
          viaIR: config.foundryConfig.viaIR,
          evmVersion: config.foundryConfig.evmVersion
        },
        availableEVMVersions: foundryConfigService.getAvailableEVMVersions(),
        optimizerPresets: {
          development: {
            optimizer: false,
            optimizerRuns: 0,
            viaIR: false,
            description: 'No optimization for faster compilation'
          },
          production: {
            optimizer: true,
            optimizerRuns: 200,
            viaIR: false,
            description: 'Balanced optimization for production'
          },
          gasOptimized: {
            optimizer: true,
            optimizerRuns: 1000000,
            viaIR: true,
            description: 'Maximum gas optimization'
          },
          sizeOptimized: {
            optimizer: true,
            optimizerRuns: 1,
            viaIR: false,
            description: 'Maximum size optimization'
          }
        },
        currentPreset: getCurrentPreset(config.foundryConfig)
      })

    } catch (error) {
      return createErrorResponse('Failed to get optimizer configuration', 500)
    }
  })
}

/**
 * Update optimizer configuration
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = optimizerConfigSchema.parse(body)

      // Get current configuration
      const currentConfig = await foundryConfigService.getCourseConfig(validatedData.courseId)
      
      if (!currentConfig) {
        return createErrorResponse('Course configuration not found', 404)
      }

      // Create updated configuration
      const updatedConfig = {
        ...currentConfig.foundryConfig,
        optimizer: validatedData.optimizer,
        optimizerRuns: validatedData.optimizerRuns,
        viaIR: validatedData.viaIR,
        evmVersion: validatedData.evmVersion
      }

      // Validate configuration
      const validation = foundryConfigService.validateConfig(updatedConfig)
      if (!validation.isValid) {
        return createErrorResponse('Invalid optimizer configuration', 400, {
          errors: validation.errors
        })
      }

      // Update configuration
      const success = await foundryConfigService.updateCourseConfig(validatedData.courseId, {
        foundryConfig: updatedConfig
      })

      if (!success) {
        return createErrorResponse('Failed to update optimizer configuration', 500)
      }

      return createSuccessResponse({
        message: 'Optimizer configuration updated successfully',
        courseId: validatedData.courseId,
        optimizerConfig: {
          optimizer: updatedConfig.optimizer,
          optimizerRuns: updatedConfig.optimizerRuns,
          viaIR: updatedConfig.viaIR,
          evmVersion: updatedConfig.evmVersion
        },
        currentPreset: getCurrentPreset(updatedConfig),
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
        error instanceof Error ? error.message : 'Failed to update optimizer configuration',
        500
      )
    }
  })
}

/**
 * Apply optimizer preset
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = optimizerPresetSchema.parse(body)

      // Get preset configuration
      const presets = foundryConfigService.getConfigurationPresets()
      const presetConfig = presets[validatedData.preset]

      if (!presetConfig) {
        return createErrorResponse(`Invalid preset: ${validatedData.preset}`, 400)
      }

      // Get current configuration
      const currentConfig = await foundryConfigService.getCourseConfig(validatedData.courseId)
      
      if (!currentConfig) {
        return createErrorResponse('Course configuration not found', 404)
      }

      // Apply preset optimizer settings
      const updatedConfig = {
        ...currentConfig.foundryConfig,
        optimizer: presetConfig.optimizer,
        optimizerRuns: presetConfig.optimizerRuns,
        viaIR: presetConfig.viaIR,
        evmVersion: presetConfig.evmVersion
      }

      // Update configuration
      const success = await foundryConfigService.updateCourseConfig(validatedData.courseId, {
        foundryConfig: updatedConfig
      })

      if (!success) {
        return createErrorResponse('Failed to apply optimizer preset', 500)
      }

      return createSuccessResponse({
        message: `Optimizer preset ${validatedData.preset} applied successfully`,
        courseId: validatedData.courseId,
        preset: validatedData.preset,
        optimizerConfig: {
          optimizer: updatedConfig.optimizer,
          optimizerRuns: updatedConfig.optimizerRuns,
          viaIR: updatedConfig.viaIR,
          evmVersion: updatedConfig.evmVersion
        },
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
        error instanceof Error ? error.message : 'Failed to apply optimizer preset',
        500
      )
    }
  })
}

/**
 * Get current preset based on configuration
 */
function getCurrentPreset(config: any): string {
  if (!config.optimizer) {
    return 'development'
  }
  
  if (config.optimizerRuns === 1) {
    return 'sizeOptimized'
  }
  
  if (config.optimizerRuns >= 1000000 && config.viaIR) {
    return 'gasOptimized'
  }
  
  if (config.optimizerRuns === 200) {
    return 'production'
  }
  
  return 'custom'
}
