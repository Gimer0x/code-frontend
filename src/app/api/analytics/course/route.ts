import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

/**
 * Get course analytics and statistics
 */
export async function GET(request: NextRequest) {
  return withAuth(async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      // Check if user has access to course analytics
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { creatorId: true }
      })

      if (!course) {
        return createErrorResponse('Course not found', 404)
      }

      // Only course creators and admins can view analytics
      if (context.user.role !== 'ADMIN' && course.creatorId !== context.user.id) {
        return createErrorResponse('Unauthorized', 403)
      }

      const [statistics, leaderboard, lessonAnalytics] = await Promise.all([
        databaseService.getCourseStatistics(courseId),
        databaseService.getCourseLeaderboard(courseId, 10),
        // Get analytics for all lessons in the course
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

    } catch (error) {
      return createErrorResponse('Failed to get course analytics', 500)
    }
  })(request, { requireAuth: true })
}
