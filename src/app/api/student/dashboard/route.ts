import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

/**
 * Get student dashboard data
 */
export async function GET(request: NextRequest) {
  return withAuth(async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')

      // Get user's enrolled courses
      const enrolledCourses = await prisma.course.findMany({
        where: {
          studentProgress: {
            some: {
              userId: context.user.id
            }
          }
        },
        include: {
          modules: {
            include: {
              lessons: {
                select: {
                  id: true,
                  title: true,
                  type: true
                }
              }
            },
            orderBy: { order: 'asc' }
          },
          _count: {
            select: {
              modules: true
            }
          }
        }
      })

      // Get detailed progress for each course
      const coursesWithProgress = await Promise.all(
        enrolledCourses.map(async (course) => {
          const progress = await databaseService.getStudentCourseProgress(
            context.user.id,
            course.id
          )

          return {
            ...course,
            progress: progress.progress,
            totalLessons: progress.totalLessons,
            completedLessons: progress.completedLessons,
            progressPercentage: progress.progressPercentage
          }
        })
      )

      // Get recent activity (last 10 compilation/test results)
      const recentActivity = await prisma.studentProgress.findMany({
        where: { userId: context.user.id },
        include: {
          course: {
            select: { title: true }
          },
          lesson: {
            select: { title: true, type: true }
          },
          compilationResults: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              success: true,
              compilationTime: true,
              createdAt: true
            }
          },
          testResults: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              success: true,
              testCount: true,
              passedCount: true,
              testTime: true,
              createdAt: true
            }
          }
        },
        orderBy: { lastSavedAt: 'desc' },
        take: 10
      })

      // Get overall statistics
      const totalCourses = enrolledCourses.length
      const totalLessons = enrolledCourses.reduce((sum, course) => {
        return sum + course.modules.reduce((moduleSum, module) => {
          return moduleSum + module.lessons.length
        }, 0)
      }, 0)

      const totalCompletedLessons = coursesWithProgress.reduce((sum, course) => {
        return sum + course.completedLessons
      }, 0)

      const overallProgressPercentage = totalLessons > 0 ? (totalCompletedLessons / totalLessons) * 100 : 0

      // Get compilation and test statistics
      const [compilationStats, testStats] = await Promise.all([
        prisma.compilationResult.aggregate({
          where: {
            studentProgress: {
              userId: context.user.id
            }
          },
          _count: { id: true },
          _avg: { compilationTime: true }
        }),
        prisma.testResult.aggregate({
          where: {
            studentProgress: {
              userId: context.user.id
            }
          },
          _count: { id: true },
          _avg: { testTime: true }
        })
      ])

      return createSuccessResponse({
        user: {
          id: context.user.id,
          name: context.user.name,
          email: context.user.email
        },
        courses: coursesWithProgress,
        recentActivity,
        statistics: {
          totalCourses,
          totalLessons,
          totalCompletedLessons,
          overallProgressPercentage,
          totalCompilations: compilationStats._count.id,
          averageCompilationTime: compilationStats._avg.compilationTime,
          totalTests: testStats._count.id,
          averageTestTime: testStats._avg.testTime
        }
      })

    } catch (error) {
      console.error('Get student dashboard error:', error)
      return createErrorResponse('Failed to get student dashboard', 500)
    }
  })(request, { requireAuth: true })
}
