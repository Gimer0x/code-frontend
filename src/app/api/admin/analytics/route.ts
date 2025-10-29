import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

/**
 * Get admin analytics dashboard
 */
export async function GET(request: NextRequest) {
  return withAuth(async (request: NextRequest, context) => {
    try {
      // Only admins can access this endpoint
      if (context.user.role !== 'ADMIN') {
        return createErrorResponse('Unauthorized', 403)
      }

      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')

      if (courseId) {
        // Get specific course analytics
        const [statistics, leaderboard, lessonAnalytics] = await Promise.all([
          databaseService.getCourseStatistics(courseId),
          databaseService.getCourseLeaderboard(courseId, 20),
          prisma.lesson.findMany({
            where: {
              module: {
                courseId
              }
            },
            select: { id: true, title: true }
          }).then(lessons => 
            Promise.all(
              lessons.map(lesson => 
                databaseService.getLessonAnalytics(courseId, lesson.id)
                  .then(analytics => ({ lessonId: lesson.id, title: lesson.title, ...analytics }))
              )
            )
          )
        ])

        return createSuccessResponse({
          courseId,
          statistics,
          leaderboard,
          lessonAnalytics
        })
      }

      // Get overall platform analytics
      const [
        totalUsers,
        totalCourses,
        totalLessons,
        totalCompilations,
        totalTests,
        recentActivity,
        courseStats
      ] = await Promise.all([
        // Total users
        prisma.user.count(),

        // Total courses
        prisma.course.count(),

        // Total lessons
        prisma.lesson.count(),

        // Total compilations
        prisma.compilationResult.count(),

        // Total tests
        prisma.testResult.count(),

        // Recent activity (last 20 student actions)
        prisma.studentProgress.findMany({
          include: {
            user: {
              select: { name: true, email: true }
            },
            course: {
              select: { title: true }
            },
            lesson: {
              select: { title: true, type: true }
            }
          },
          orderBy: { lastSavedAt: 'desc' },
          take: 20
        }),

        // Course statistics
        prisma.course.findMany({
          include: {
            _count: {
              select: {
                studentProgress: true,
                modules: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ])

      // Get user growth over time (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const userGrowth = await prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        _count: { id: true },
        orderBy: { createdAt: 'asc' }
      })

      // Get compilation success rate
      const compilationStats = await prisma.compilationResult.aggregate({
        _count: { id: true },
        _avg: { compilationTime: true }
      })

      const successfulCompilations = await prisma.compilationResult.count({
        where: { success: true }
      })

      const compilationSuccessRate = compilationStats._count.id > 0 
        ? (successfulCompilations / compilationStats._count.id) * 100 
        : 0

      // Get test success rate
      const testStats = await prisma.testResult.aggregate({
        _count: { id: true },
        _avg: { testTime: true }
      })

      const successfulTests = await prisma.testResult.count({
        where: { success: true }
      })

      const testSuccessRate = testStats._count.id > 0 
        ? (successfulTests / testStats._count.id) * 100 
        : 0

      return createSuccessResponse({
        overview: {
          totalUsers,
          totalCourses,
          totalLessons,
          totalCompilations,
          totalTests,
          compilationSuccessRate,
          testSuccessRate,
          averageCompilationTime: compilationStats._avg.compilationTime,
          averageTestTime: testStats._avg.testTime
        },
        recentActivity,
        courseStats,
        userGrowth: userGrowth.map(day => ({
          date: day.createdAt,
          count: day._count.id
        }))
      })

    } catch (error) {
      return createErrorResponse('Failed to get admin analytics', 500)
    }
  })(request, { requireAuth: true, requireAdmin: true })
}
