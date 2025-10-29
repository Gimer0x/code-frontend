import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const getAnalyticsSchema = z.object({
  courseId: z.string().optional(),
  timeRange: z.enum(['day', 'week', 'month', 'all']).optional().default('month'),
  includeDetails: z.boolean().optional().default(false)
})

/**
 * Get comprehensive student analytics
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')
      const timeRange = searchParams.get('timeRange') || 'month'
      const includeDetails = searchParams.get('includeDetails') === 'true'

      // Calculate date range
      const now = new Date()
      let startDate: Date

      switch (timeRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0) // All time
      }

      // Build where clause
      const whereClause: any = {
        userId: session.user.id,
        updatedAt: {
          gte: startDate
        }
      }

      if (courseId) {
        whereClause.courseId = courseId
      }

      // Get progress statistics
      const progressStats = await prisma.studentProgress.findMany({
        where: whereClause,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              language: true,
              level: true
            }
          },
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
            take: 1
          },
          testResults: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      // Calculate overall statistics
      const totalLessons = progressStats.length
      const completedLessons = progressStats.filter(p => p.isCompleted).length
      const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

      // Get compilation statistics
      const compilationStats = await prisma.compilationResult.aggregate({
        where: {
          studentProgress: whereClause
        },
        _count: { id: true },
        _avg: { compilationTime: true }
      })

      const compilationSuccessStats = await prisma.compilationResult.groupBy({
        by: ['success'],
        where: {
          studentProgress: whereClause
        },
        _count: { id: true }
      })

      const compilationSuccessRate = compilationStats._count.id > 0
        ? (compilationSuccessStats.find(s => s.success)?._count.id || 0) / compilationStats._count.id * 100
        : 0

      // Get test statistics
      const testStats = await prisma.testResult.aggregate({
        where: {
          studentProgress: whereClause
        },
        _count: { id: true },
        _avg: { 
          testTime: true,
          testCount: true,
          passedCount: true,
          failedCount: true
        }
      })

      const testSuccessStats = await prisma.testResult.groupBy({
        by: ['success'],
        where: {
          studentProgress: whereClause
        },
        _count: { id: true }
      })

      const testSuccessRate = testStats._count.id > 0
        ? (testSuccessStats.find(s => s.success)?._count.id || 0) / testStats._count.id * 100
        : 0

      // Get activity timeline
      const activityTimeline = await prisma.studentProgress.findMany({
        where: whereClause,
        select: {
          updatedAt: true,
          isCompleted: true,
          course: {
            select: {
              title: true,
              language: true
            }
          },
          lesson: {
            select: {
              title: true,
              type: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      })

      // Get course-specific analytics if courseId is provided
      let courseAnalytics = null
      if (courseId) {
        const courseProgress = progressStats.filter(p => p.courseId === courseId)
        const courseLessons = await prisma.lesson.count({
          where: {
            module: {
              courseId: courseId
            }
          }
        })

        courseAnalytics = {
          courseId: courseId,
          totalLessons: courseLessons,
          completedLessons: courseProgress.filter(p => p.isCompleted).length,
          completionRate: courseLessons > 0 ? (courseProgress.filter(p => p.isCompleted).length / courseLessons) * 100 : 0,
          totalCompilations: courseProgress.reduce((sum, p) => sum + p.compilationResults.length, 0),
          totalTests: courseProgress.reduce((sum, p) => sum + p.testResults.length, 0),
          lastActivity: courseProgress[0]?.updatedAt || null
        }
      }

      // Get detailed progress if requested
      let detailedProgress = null
      if (includeDetails) {
        detailedProgress = progressStats.map(progress => ({
          id: progress.id,
          course: progress.course,
          lesson: progress.lesson,
          isCompleted: progress.isCompleted,
          lastSavedAt: progress.lastSavedAt,
          completedAt: progress.completedAt,
          compilationCount: progress.compilationResults.length,
          testCount: progress.testResults.length,
          lastCompilation: progress.compilationResults[0] || null,
          lastTest: progress.testResults[0] || null
        }))
      }

      return createSuccessResponse({
        overview: {
          totalLessons,
          completedLessons,
          completionRate: Math.round(completionRate),
          totalCompilations: compilationStats._count.id,
          totalTests: testStats._count.id,
          timeRange,
          startDate,
          endDate: now
        },
        compilation: {
          totalCompilations: compilationStats._count.id,
          successRate: Math.round(compilationSuccessRate),
          averageCompilationTime: Math.round(compilationStats._avg.compilationTime || 0),
          successfulCompilations: compilationSuccessStats.find(s => s.success)?._count.id || 0,
          failedCompilations: compilationSuccessStats.find(s => !s.success)?._count.id || 0
        },
        testing: {
          totalTests: testStats._count.id,
          successRate: Math.round(testSuccessRate),
          averageTestTime: Math.round(testStats._avg.testTime || 0),
          averageTestCount: Math.round(testStats._avg.testCount || 0),
          averagePassedCount: Math.round(testStats._avg.passedCount || 0),
          averageFailedCount: Math.round(testStats._avg.failedCount || 0),
          successfulTests: testSuccessStats.find(s => s.success)?._count.id || 0,
          failedTests: testSuccessStats.find(s => !s.success)?._count.id || 0
        },
        activityTimeline: activityTimeline.map(activity => ({
          timestamp: activity.updatedAt,
          type: activity.isCompleted ? 'completed' : 'updated',
          course: activity.course.title,
          courseLanguage: activity.course.language,
          lesson: activity.lesson.title,
          lessonType: activity.lesson.type
        })),
        courseAnalytics,
        detailedProgress
      })

    } catch (error) {
      return createErrorResponse('Failed to get student analytics', 500)
    }
  })
}

/**
 * Get student leaderboard
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const { courseId, limit = 10 } = body

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      // Get leaderboard data
      const leaderboard = await prisma.studentProgress.groupBy({
        by: ['userId'],
        where: {
          courseId: courseId,
          isCompleted: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: limit
      })

      // Get user details for leaderboard
      const leaderboardWithUsers = await Promise.all(
        leaderboard.map(async (entry) => {
          const user = await prisma.user.findUnique({
            where: { id: entry.userId },
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true
            }
          })

          return {
            user: user,
            completedLessons: entry._count.id
          }
        })
      )

      // Get current user's position
      const currentUserProgress = await prisma.studentProgress.count({
        where: {
          userId: session.user.id,
          courseId: courseId,
          isCompleted: true
        }
      })

      const currentUserPosition = leaderboardWithUsers.findIndex(
        entry => entry.user?.id === session.user.id
      ) + 1

      return createSuccessResponse({
        leaderboard: leaderboardWithUsers,
        currentUser: {
          position: currentUserPosition || null,
          completedLessons: currentUserProgress
        }
      })

    } catch (error) {
      return createErrorResponse('Failed to get leaderboard', 500)
    }
  })
}
