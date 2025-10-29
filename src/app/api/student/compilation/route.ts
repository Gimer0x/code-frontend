import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const saveCompilationSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  success: z.boolean(),
  output: z.any().optional(),
  errors: z.any().optional(),
  warnings: z.any().optional(),
  compilationTime: z.number().optional()
})

const getCompilationHistorySchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10)
})

/**
 * Save compilation result
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = saveCompilationSchema.parse(body)

      // Get or create student progress
      const progress = await prisma.studentProgress.upsert({
        where: {
          userId_courseId_lessonId: {
            userId: session.user.id,
            courseId: validatedData.courseId,
            lessonId: validatedData.lessonId
          }
        },
        update: {
          updatedAt: new Date()
        },
        create: {
          userId: session.user.id,
          courseId: validatedData.courseId,
          lessonId: validatedData.lessonId
        }
      })

      // Save compilation result
      const compilationResult = await prisma.compilationResult.create({
        data: {
          studentProgressId: progress.id,
          success: validatedData.success,
          output: validatedData.output,
          errors: validatedData.errors,
          warnings: validatedData.warnings,
          compilationTime: validatedData.compilationTime
        }
      })

      // Update progress if compilation was successful
      if (validatedData.success) {
        await prisma.studentProgress.update({
          where: { id: progress.id },
          data: {
            lastSavedAt: new Date(),
            updatedAt: new Date()
          }
        })
      }

      return createSuccessResponse({
        message: 'Compilation result saved successfully',
        compilationResult: {
          id: compilationResult.id,
          success: compilationResult.success,
          compilationTime: compilationResult.compilationTime,
          createdAt: compilationResult.createdAt
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
        error instanceof Error ? error.message : 'Failed to save compilation result',
        500
      )
    }
  })
}

/**
 * Get compilation history
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')
      const lessonId = searchParams.get('lessonId')
      const limit = parseInt(searchParams.get('limit') || '10')

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      // Build where clause
      const whereClause: any = {
        studentProgress: {
          userId: session.user.id,
          courseId: courseId
        }
      }

      if (lessonId) {
        whereClause.studentProgress.lessonId = lessonId
      }

      // Get compilation history
      const compilationHistory = await prisma.compilationResult.findMany({
        where: whereClause,
        include: {
          studentProgress: {
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  type: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      // Get compilation statistics
      const stats = await prisma.compilationResult.aggregate({
        where: whereClause,
        _count: {
          id: true
        },
        _avg: {
          compilationTime: true
        }
      })

      const successStats = await prisma.compilationResult.groupBy({
        by: ['success'],
        where: whereClause,
        _count: {
          id: true
        }
      })

      const successRate = stats._count.id > 0 
        ? (successStats.find(s => s.success)?._count.id || 0) / stats._count.id * 100 
        : 0

      return createSuccessResponse({
        compilationHistory: compilationHistory.map(result => ({
          id: result.id,
          success: result.success,
          output: result.output,
          errors: result.errors,
          warnings: result.warnings,
          compilationTime: result.compilationTime,
          createdAt: result.createdAt,
          lesson: result.studentProgress.lesson
        })),
        statistics: {
          totalCompilations: stats._count.id,
          successRate: Math.round(successRate),
          averageCompilationTime: Math.round(stats._avg.compilationTime || 0),
          successfulCompilations: successStats.find(s => s.success)?._count.id || 0,
          failedCompilations: successStats.find(s => !s.success)?._count.id || 0
        }
      })

    } catch (error) {
      return createErrorResponse('Failed to get compilation history', 500)
    }
  })
}

/**
 * Get specific compilation result
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const { compilationId } = body

      if (!compilationId) {
        return createErrorResponse('Compilation ID is required', 400)
      }

      // Get compilation result
      const compilationResult = await prisma.compilationResult.findFirst({
        where: {
          id: compilationId,
          studentProgress: {
            userId: session.user.id
          }
        },
        include: {
          studentProgress: {
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  type: true
                }
              }
            }
          }
        }
      })

      if (!compilationResult) {
        return createErrorResponse('Compilation result not found', 404)
      }

      return createSuccessResponse({
        compilationResult: {
          id: compilationResult.id,
          success: compilationResult.success,
          output: compilationResult.output,
          errors: compilationResult.errors,
          warnings: compilationResult.warnings,
          compilationTime: compilationResult.compilationTime,
          createdAt: compilationResult.createdAt,
          lesson: compilationResult.studentProgress.lesson
        }
      })

    } catch (error) {
      return createErrorResponse('Failed to get compilation result', 500)
    }
  })
}