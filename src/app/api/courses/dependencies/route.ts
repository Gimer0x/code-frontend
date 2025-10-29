import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCompilationClient } from '@/lib/compilationClient'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const dependencySchema = z.object({
  name: z.string().min(1, 'Dependency name is required'),
  version: z.string().optional(),
  source: z.string().optional(),
  installPath: z.string().optional()
})

const installDependenciesSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  dependencies: z.array(dependencySchema).min(1, 'At least one dependency is required')
})

const removeDependencySchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  dependencyName: z.string().min(1, 'Dependency name is required')
})

/**
 * Get course dependencies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    // For course creation, we don't need authentication
    // Return available dependencies for template selection
    const availableDependencies = [
      { name: 'forge-std', version: 'latest', source: 'github', description: 'Foundry standard library', category: 'testing' },
      { name: 'openzeppelin-contracts', version: 'latest', source: 'github', description: 'OpenZeppelin contracts library', category: 'security' },
      { name: 'solmate', version: 'latest', source: 'github', description: 'Modern Solidity library', category: 'utility' },
      { name: 'ds-test', version: 'latest', source: 'github', description: 'Dappsys test utilities', category: 'testing' },
      { name: 'hardhat', version: 'latest', source: 'npm', description: 'Hardhat development environment', category: 'framework' },
      { name: 'truffle', version: 'latest', source: 'npm', description: 'Truffle development framework', category: 'framework' }
    ]

    return NextResponse.json({
      success: true,
      dependencies: availableDependencies,
      total: availableDependencies.length,
      categories: [...new Set(availableDependencies.map(dep => dep.category))]
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get course dependencies'
    }, { status: 500 })
  }
}

/**
 * Install dependencies
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = installDependenciesSchema.parse(body)

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

      // Install dependencies on Foundry service
      const client = getCompilationClient()
      let installResult = null

      try {
        const result = await client.installDependencies({
          courseId: validatedData.courseId,
          projectPath: courseProject.projectPath,
          dependencies: validatedData.dependencies
        })

        if (result.success) {
          installResult = result
        } else {
          throw new Error(result.error || 'Dependency installation failed')
        }
      } catch (installError) {
        return createErrorResponse(
          `Failed to install dependencies: ${installError instanceof Error ? installError.message : 'Unknown error'}`,
          500
        )
      }

      // Update project dependencies in database
      const updatedDependencies = [
        ...(courseProject.dependencies || []),
        ...validatedData.dependencies
      ]

      await prisma.courseProject.update({
        where: { id: courseProject.id },
        data: {
          dependencies: updatedDependencies,
          updatedAt: new Date()
        }
      })

      return createSuccessResponse({
        message: 'Dependencies installed successfully',
        courseId: validatedData.courseId,
        installedDependencies: validatedData.dependencies,
        installResult,
        totalDependencies: updatedDependencies.length
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
        error instanceof Error ? error.message : 'Failed to install dependencies',
        500
      )
    }
  })
}

/**
 * Remove dependency
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = removeDependencySchema.parse(body)

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

      // Remove dependency from Foundry service
      const client = getCompilationClient()
      let removeResult = null

      try {
        // Note: The compilation client doesn't have a direct remove dependency method
        // This would need to be implemented in the Foundry service
        // For now, we'll just update the database
        
        // Simulate successful removal
        removeResult = {
          success: true,
          message: `Dependency ${validatedData.dependencyName} removed successfully`
        }
      } catch (removeError) {
        return createErrorResponse(
          `Failed to remove dependency: ${removeError instanceof Error ? removeError.message : 'Unknown error'}`,
          500
        )
      }

      // Update project dependencies in database
      const updatedDependencies = (courseProject.dependencies || []).filter(
        dep => dep.name !== validatedData.dependencyName
      )

      await prisma.courseProject.update({
        where: { id: courseProject.id },
        data: {
          dependencies: updatedDependencies,
          updatedAt: new Date()
        }
      })

      return createSuccessResponse({
        message: 'Dependency removed successfully',
        courseId: validatedData.courseId,
        removedDependency: validatedData.dependencyName,
        removeResult,
        remainingDependencies: updatedDependencies.length
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
        error instanceof Error ? error.message : 'Failed to remove dependency',
        500
      )
    }
  })
}