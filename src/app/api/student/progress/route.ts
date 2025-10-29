import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const getProgressSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().optional()
})

const updateProgressSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  codeContent: z.string().optional(),
  isCompleted: z.boolean().optional()
})

/**
 * Get student progress for a course or specific lesson
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const lessonId = searchParams.get('lessonId')

    if (!courseId) {
      return NextResponse.json({
        success: false,
        error: 'Course ID is required'
      }, { status: 400 })
    }

    // Get the session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Build the where clause
    const whereClause: any = {
      userId: session.user.id,
      courseId: courseId
    }

    if (lessonId) {
      whereClause.lessonId = lessonId
    }

    // Get progress data
    const progress = await prisma.studentProgress.findMany({
      where: whereClause,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            type: true,
            order: true
          }
        }
      },
      orderBy: {
        lastSavedAt: 'desc'
      }
    }).catch(err => {
      return []
    })

    // Get statistics
    const totalLessons = await prisma.lesson.count({
      where: {
        module: {
          courseId: courseId
        }
      }
    }).catch(() => 0)

    const completedLessons = await prisma.studentProgress.count({
      where: {
        userId: session.user.id,
        courseId: courseId,
        isCompleted: true
      }
    }).catch(() => 0)

    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // Get recent activity
    const recentActivity = await prisma.studentProgress.findMany({
      where: {
        userId: session.user.id,
        courseId: courseId
      },
      include: {
        lesson: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        lastSavedAt: 'desc'
      },
      take: 5
    }).catch(() => [])

    return NextResponse.json({
      success: true,
      data: {
        progress,
        statistics: {
          totalLessons,
          completedLessons,
          progressPercentage,
          totalCompilations: 0,
          totalTests: 0,
          lastActivity: recentActivity[0]?.lastSavedAt || null
        },
        recentActivity
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get student progress'
    }, { status: 500 })
  }
}

/**
 * Update student progress
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = updateProgressSchema.parse(body)

      // Upsert student progress
      const progress = await prisma.studentProgress.upsert({
        where: {
          userId_courseId_lessonId: {
            userId: session.user.id,
            courseId: validatedData.courseId,
            lessonId: validatedData.lessonId
          }
        },
        update: {
          codeContent: validatedData.codeContent,
          isCompleted: validatedData.isCompleted,
          lastSavedAt: validatedData.codeContent ? new Date() : undefined,
          completedAt: validatedData.isCompleted ? new Date() : undefined,
          updatedAt: new Date()
        },
        create: {
          userId: session.user.id,
          courseId: validatedData.courseId,
          lessonId: validatedData.lessonId,
          codeContent: validatedData.codeContent,
          isCompleted: validatedData.isCompleted || false,
          lastSavedAt: validatedData.codeContent ? new Date() : undefined,
          completedAt: validatedData.isCompleted ? new Date() : undefined
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              type: true,
              order: true
            }
          },
          compilationResults: {
            orderBy: { createdAt: 'desc' },
            take: 3
          },
          testResults: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      })

      return createSuccessResponse({
        message: 'Progress updated successfully',
        progress
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
        error instanceof Error ? error.message : 'Failed to update progress',
        500
      )
    }
  })
}