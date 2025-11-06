import { NextRequest, NextResponse } from 'next/server'
import { foundryConfigService, type FoundryConfig } from '@/lib/foundry-config-service'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const compilerConfigSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  solc: z.string().min(1, 'Solidity version is required'),
  viaIR: z.boolean().optional(),
  evmVersion: z.string().optional(),
  optimizer: z.boolean().optional(),
  optimizerRuns: z.number().min(0).optional(),
  extraOutput: z.array(z.string()).optional(),
  extraOutputFiles: z.array(z.string()).optional(),
  bytecodeHash: z.enum(['none', 'ipfs', 'bzzr1']).optional(),
  cborMetadata: z.boolean().optional(),
  verbosity: z.number().min(0).max(3).optional(),
  ffi: z.boolean().optional(),
  buildInfo: z.boolean().optional()
})

/**
 * Get compiler configuration
 */
export const GET = withAuth(async (request: NextRequest, context) => {
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
      compilerConfig: {
        solc: config.foundryConfig.solc,
        viaIR: config.foundryConfig.viaIR,
        evmVersion: config.foundryConfig.evmVersion,
        optimizer: config.foundryConfig.optimizer,
        optimizerRuns: config.foundryConfig.optimizerRuns,
        extraOutput: config.foundryConfig.extraOutput,
        extraOutputFiles: config.foundryConfig.extraOutputFiles,
        bytecodeHash: config.foundryConfig.bytecodeHash,
        cborMetadata: config.foundryConfig.cborMetadata,
        verbosity: config.foundryConfig.verbosity,
        ffi: config.foundryConfig.ffi,
        buildInfo: config.foundryConfig.buildInfo
      },
      availableSolcVersions: foundryConfigService.getAvailableSolcVersions(),
      availableEVMVersions: foundryConfigService.getAvailableEVMVersions(),
      defaultConfig: foundryConfigService.getDefaultConfig(),
      configurationPresets: foundryConfigService.getConfigurationPresets()
    })

  } catch (error) {
    return createErrorResponse('Failed to get compiler configuration', 500)
  }
})

/**
 * Update compiler configuration
 */
export const PUT = withAuth(async (request: NextRequest, context) => {
    try {
      const body = await request.json()
      const validatedData = compilerConfigSchema.parse(body)

      // Get current configuration
      const currentConfig = await foundryConfigService.getCourseConfig(validatedData.courseId)
      
      if (!currentConfig) {
        return createErrorResponse('Course configuration not found', 404)
      }

      // Create updated configuration
      const updatedConfig: FoundryConfig = {
        solc: validatedData.solc,
        optimizer: validatedData.optimizer ?? currentConfig.foundryConfig.optimizer,
        optimizerRuns: validatedData.optimizerRuns ?? currentConfig.foundryConfig.optimizerRuns,
        viaIR: validatedData.viaIR ?? currentConfig.foundryConfig.viaIR,
        evmVersion: validatedData.evmVersion ?? currentConfig.foundryConfig.evmVersion,
        extraOutput: validatedData.extraOutput ?? currentConfig.foundryConfig.extraOutput,
        extraOutputFiles: validatedData.extraOutputFiles ?? currentConfig.foundryConfig.extraOutputFiles,
        bytecodeHash: validatedData.bytecodeHash ?? currentConfig.foundryConfig.bytecodeHash,
        cborMetadata: validatedData.cborMetadata ?? currentConfig.foundryConfig.cborMetadata,
        verbosity: validatedData.verbosity ?? currentConfig.foundryConfig.verbosity,
        ffi: validatedData.ffi ?? currentConfig.foundryConfig.ffi,
        buildInfo: validatedData.buildInfo ?? currentConfig.foundryConfig.buildInfo
      }

      // Validate configuration
      const validation = foundryConfigService.validateConfig(updatedConfig)
      if (!validation.isValid) {
        return createErrorResponse('Invalid compiler configuration', 400, {
          errors: validation.errors
        })
      }

      // Update configuration
      const success = await foundryConfigService.updateCourseConfig(validatedData.courseId, {
        foundryConfig: updatedConfig
      })

      if (!success) {
        return createErrorResponse('Failed to update compiler configuration', 500)
      }

      return createSuccessResponse({
        message: 'Compiler configuration updated successfully',
        courseId: validatedData.courseId,
        compilerConfig: updatedConfig,
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
        error instanceof Error ? error.message : 'Failed to update compiler configuration',
        500
      )
    }
})

/**
 * Apply compiler preset
 */
export const POST = withAuth(async (request: NextRequest, context) => {
    try {
      const body = await request.json()
      const { courseId, preset } = body

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      if (!preset) {
        return createErrorResponse('Preset is required', 400)
      }

      // Get preset configuration
      const presets = foundryConfigService.getConfigurationPresets()
      const presetConfig = presets[preset]

      if (!presetConfig) {
        return createErrorResponse(`Invalid preset: ${preset}`, 400)
      }

      // Apply preset
      const success = await foundryConfigService.updateCourseConfig(courseId, {
        foundryConfig: presetConfig
      })

      if (!success) {
        return createErrorResponse('Failed to apply compiler preset', 500)
      }

      return createSuccessResponse({
        message: `Compiler preset ${preset} applied successfully`,
        courseId,
        preset,
        compilerConfig: presetConfig,
        updatedAt: new Date().toISOString()
      })

    } catch (error) {
      return createErrorResponse('Failed to apply compiler preset', 500)
    }
})
