import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const saveTestSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  success: z.boolean(),
  output: z.any().optional(),
  errors: z.any().optional(),
  testCount: z.number().optional(),
  passedCount: z.number().optional(),
  failedCount: z.number().optional(),
  testTime: z.number().optional()
})

const getTestHistorySchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10)
})

/**
 * Save test result
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = saveTestSchema.parse(body)

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

      // Save test result
      const testResult = await prisma.testResult.create({
        data: {
          studentProgressId: progress.id,
          success: validatedData.success,
          output: validatedData.output,
          errors: validatedData.errors,
          testCount: validatedData.testCount,
          passedCount: validatedData.passedCount,
          failedCount: validatedData.failedCount,
          testTime: validatedData.testTime
        }
      })

      // Update progress if tests passed
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
        message: 'Test result saved successfully',
        testResult: {
          id: testResult.id,
          success: testResult.success,
          testCount: testResult.testCount,
          passedCount: testResult.passedCount,
          failedCount: testResult.failedCount,
          testTime: testResult.testTime,
          createdAt: testResult.createdAt
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
        error instanceof Error ? error.message : 'Failed to save test result',
        500
      )
    }
  })
}

/**
 * Get test history
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

      // Get test history
      const testHistory = await prisma.testResult.findMany({
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

      // Get test statistics
      const stats = await prisma.testResult.aggregate({
        where: whereClause,
        _count: {
          id: true
        },
        _avg: {
          testTime: true,
          testCount: true,
          passedCount: true,
          failedCount: true
        }
      })

      const successStats = await prisma.testResult.groupBy({
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
        testHistory: testHistory.map(result => ({
          id: result.id,
          success: result.success,
          output: result.output,
          errors: result.errors,
          testCount: result.testCount,
          passedCount: result.passedCount,
          failedCount: result.failedCount,
          testTime: result.testTime,
          createdAt: result.createdAt,
          lesson: result.studentProgress.lesson
        })),
        statistics: {
          totalTests: stats._count.id,
          successRate: Math.round(successRate),
          averageTestTime: Math.round(stats._avg.testTime || 0),
          averageTestCount: Math.round(stats._avg.testCount || 0),
          averagePassedCount: Math.round(stats._avg.passedCount || 0),
          averageFailedCount: Math.round(stats._avg.failedCount || 0),
          successfulTests: successStats.find(s => s.success)?._count.id || 0,
          failedTests: successStats.find(s => !s.success)?._count.id || 0
        }
      })

    } catch (error) {
      return createErrorResponse('Failed to get test history', 500)
    }
  })
}

/**
 * Get specific test result
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const { testId } = body

      if (!testId) {
        return createErrorResponse('Test ID is required', 400)
      }

      // Get test result
      const testResult = await prisma.testResult.findFirst({
        where: {
          id: testId,
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

      if (!testResult) {
        return createErrorResponse('Test result not found', 404)
      }

      return createSuccessResponse({
        testResult: {
          id: testResult.id,
          success: testResult.success,
          output: testResult.output,
          errors: testResult.errors,
          testCount: testResult.testCount,
          passedCount: testResult.passedCount,
          failedCount: testResult.failedCount,
          testTime: testResult.testTime,
          createdAt: testResult.createdAt,
          lesson: testResult.studentProgress.lesson
        }
      })

    } catch (error) {
      return createErrorResponse('Failed to get test result', 500)
    }
  })
}
