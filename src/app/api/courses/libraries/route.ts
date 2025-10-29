import { NextRequest, NextResponse } from 'next/server'
import { foundryConfigService } from '@/lib/foundry-config-service'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const installLibrarySchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  library: z.object({
    name: z.string().min(1, 'Library name is required'),
    version: z.string().optional(),
    source: z.enum(['github', 'npm', 'git']).optional(),
    url: z.string().optional(),
    branch: z.string().optional(),
    commit: z.string().optional(),
    installPath: z.string().optional()
  })
})

const removeLibrarySchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  libraryName: z.string().min(1, 'Library name is required')
})

/**
 * Get course libraries
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      // Get library status
      const libraryStatus = await foundryConfigService.getLibraryStatus(courseId)
      const availableLibraries = foundryConfigService.getAvailableLibraries()

      return createSuccessResponse({
        courseId,
        installed: libraryStatus.installed,
        available: libraryStatus.available,
        allAvailable: availableLibraries,
        totalInstalled: libraryStatus.installed.length,
        totalAvailable: libraryStatus.available.length
      })

    } catch (error) {
      return createErrorResponse('Failed to get course libraries', 500)
    }
  })
}

/**
 * Install library
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = installLibrarySchema.parse(body)

      // Install library
      const success = await foundryConfigService.installLibrary(
        validatedData.courseId,
        validatedData.library
      )

      if (!success) {
        return createErrorResponse('Failed to install library', 500)
      }

      // Get updated library status
      const libraryStatus = await foundryConfigService.getLibraryStatus(validatedData.courseId)

      return createSuccessResponse({
        message: `Library ${validatedData.library.name} installed successfully`,
        courseId: validatedData.courseId,
        installedLibrary: validatedData.library,
        libraryStatus,
        totalInstalled: libraryStatus.installed.length
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
        error instanceof Error ? error.message : 'Failed to install library',
        500
      )
    }
  })
}

/**
 * Remove library
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = removeLibrarySchema.parse(body)

      // Remove library
      const success = await foundryConfigService.removeLibrary(
        validatedData.courseId,
        validatedData.libraryName
      )

      if (!success) {
        return createErrorResponse('Failed to remove library', 500)
      }

      // Get updated library status
      const libraryStatus = await foundryConfigService.getLibraryStatus(validatedData.courseId)

      return createSuccessResponse({
        message: `Library ${validatedData.libraryName} removed successfully`,
        courseId: validatedData.courseId,
        removedLibrary: validatedData.libraryName,
        libraryStatus,
        totalInstalled: libraryStatus.installed.length
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
        error instanceof Error ? error.message : 'Failed to remove library',
        500
      )
    }
  })
}
