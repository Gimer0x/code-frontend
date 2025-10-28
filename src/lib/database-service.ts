import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Types for database operations
export interface StudentProgressData {
  userId: string
  courseId: string
  lessonId: string
  codeContent?: string
  isCompleted?: boolean
  completedAt?: Date
}

export interface CompilationResultData {
  studentProgressId: string
  success: boolean
  output?: any
  errors?: any
  warnings?: any
  compilationTime?: number
}

export interface TestResultData {
  studentProgressId: string
  success: boolean
  output?: any
  errors?: any
  testCount?: number
  passedCount?: number
  failedCount?: number
  testTime?: number
}

export interface CourseProgressData {
  userId: string
  courseId: string
  totalLessons: number
  completedLessons: number
  progressPercentage: number
  lastAccessedAt: Date
}

/**
 * Enhanced database service for course management and student progress
 */
export class DatabaseService {
  /**
   * Get or create student progress for a lesson
   */
  async getOrCreateStudentProgress(data: StudentProgressData) {
    return await prisma.studentProgress.upsert({
      where: {
        userId_courseId_lessonId: {
          userId: data.userId,
          courseId: data.courseId,
          lessonId: data.lessonId
        }
      },
      update: {
        codeContent: data.codeContent,
        isCompleted: data.isCompleted,
        completedAt: data.completedAt,
        lastSavedAt: new Date()
      },
      create: {
        userId: data.userId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        codeContent: data.codeContent || '',
        isCompleted: data.isCompleted || false,
        completedAt: data.completedAt,
        lastSavedAt: new Date()
      },
      include: {
        compilationResults: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Last 10 compilation results
        },
        testResults: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Last 10 test results
        }
      }
    })
  }

  /**
   * Save compilation result
   */
  async saveCompilationResult(data: CompilationResultData) {
    return await prisma.compilationResult.create({
      data: {
        studentProgressId: data.studentProgressId,
        success: data.success,
        output: data.output,
        errors: data.errors,
        warnings: data.warnings,
        compilationTime: data.compilationTime
      }
    })
  }

  /**
   * Save test result
   */
  async saveTestResult(data: TestResultData) {
    return await prisma.testResult.create({
      data: {
        studentProgressId: data.studentProgressId,
        success: data.success,
        output: data.output,
        errors: data.errors,
        testCount: data.testCount,
        passedCount: data.passedCount,
        failedCount: data.failedCount,
        testTime: data.testTime
      }
    })
  }

  /**
   * Get student progress for a course
   */
  async getStudentCourseProgress(userId: string, courseId: string) {
    const progress = await prisma.studentProgress.findMany({
      where: {
        userId,
        courseId
      },
      include: {
        lesson: {
          include: {
            module: true
          }
        },
        compilationResults: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        testResults: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: {
        lastSavedAt: 'desc'
      }
    })

    // Calculate course progress
    const totalLessons = await prisma.lesson.count({
      where: {
        module: {
          courseId
        }
      }
    })

    const completedLessons = progress.filter(p => p.isCompleted).length
    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

    return {
      progress,
      totalLessons,
      completedLessons,
      progressPercentage
    }
  }

  /**
   * Get course statistics for admin
   */
  async getCourseStatistics(courseId: string) {
    const [
      totalStudents,
      completedStudents,
      totalCompilations,
      totalTests,
      recentActivity
    ] = await Promise.all([
      // Total students enrolled
      prisma.studentProgress.findMany({
        where: { courseId },
        select: { userId: true },
        distinct: ['userId']
      }).then(results => results.length),

      // Students who completed the course
      prisma.studentProgress.findMany({
        where: { 
          courseId,
          isCompleted: true
        },
        select: { userId: true },
        distinct: ['userId']
      }).then(results => results.length),

      // Total compilations
      prisma.compilationResult.count({
        where: {
          studentProgress: {
            courseId
          }
        }
      }),

      // Total tests
      prisma.testResult.count({
        where: {
          studentProgress: {
            courseId
          }
        }
      }),

      // Recent activity
      prisma.studentProgress.findMany({
        where: { courseId },
        include: {
          user: {
            select: { name: true, email: true }
          },
          lesson: {
            select: { title: true }
          }
        },
        orderBy: { lastSavedAt: 'desc' },
        take: 10
      })
    ])

    return {
      totalStudents,
      completedStudents,
      completionRate: totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0,
      totalCompilations,
      totalTests,
      recentActivity
    }
  }

  /**
   * Get compilation history for a student
   */
  async getCompilationHistory(userId: string, courseId: string, lessonId?: string) {
    const whereClause: Prisma.CompilationResultWhereInput = {
      studentProgress: {
        userId,
        courseId
      }
    }

    if (lessonId) {
      whereClause.studentProgress.lessonId = lessonId
    }

    return await prisma.compilationResult.findMany({
      where: whereClause,
      include: {
        studentProgress: {
          include: {
            lesson: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  }

  /**
   * Get test history for a student
   */
  async getTestHistory(userId: string, courseId: string, lessonId?: string) {
    const whereClause: Prisma.TestResultWhereInput = {
      studentProgress: {
        userId,
        courseId
      }
    }

    if (lessonId) {
      whereClause.studentProgress.lessonId = lessonId
    }

    return await prisma.testResult.findMany({
      where: whereClause,
      include: {
        studentProgress: {
          include: {
            lesson: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  }

  /**
   * Update lesson completion status
   */
  async updateLessonCompletion(userId: string, courseId: string, lessonId: string, isCompleted: boolean) {
    return await prisma.studentProgress.update({
      where: {
        userId_courseId_lessonId: {
          userId,
          courseId,
          lessonId
        }
      },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    })
  }

  /**
   * Get student's code for a lesson
   */
  async getStudentCode(userId: string, courseId: string, lessonId: string) {
    const progress = await prisma.studentProgress.findUnique({
      where: {
        userId_courseId_lessonId: {
          userId,
          courseId,
          lessonId
        }
      },
      select: {
        codeContent: true,
        lastSavedAt: true
      }
    })

    return progress?.codeContent || ''
  }

  /**
   * Save student code
   */
  async saveStudentCode(userId: string, courseId: string, lessonId: string, codeContent: string) {
    return await prisma.studentProgress.upsert({
      where: {
        userId_courseId_lessonId: {
          userId,
          courseId,
          lessonId
        }
      },
      update: {
        codeContent,
        lastSavedAt: new Date()
      },
      create: {
        userId,
        courseId,
        lessonId,
        codeContent,
        lastSavedAt: new Date()
      }
    })
  }

  /**
   * Get course leaderboard
   */
  async getCourseLeaderboard(courseId: string, limit: number = 10) {
    const students = await prisma.studentProgress.groupBy({
      by: ['userId'],
      where: { courseId },
      _count: {
        isCompleted: true
      },
      _max: {
        lastSavedAt: true
      }
    })

    // Get user details and calculate completion rates
    const leaderboard = await Promise.all(
      students.map(async (student) => {
        const user = await prisma.user.findUnique({
          where: { id: student.userId },
          select: { name: true, email: true }
        })

        const totalLessons = await prisma.lesson.count({
          where: {
            module: {
              courseId
            }
          }
        })

        const completedLessons = await prisma.studentProgress.count({
          where: {
            userId: student.userId,
            courseId,
            isCompleted: true
          }
        })

        return {
          userId: student.userId,
          name: user?.name || 'Anonymous',
          email: user?.email,
          completedLessons,
          totalLessons,
          completionRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
          lastActivity: student._max.lastSavedAt
        }
      })
    )

    return leaderboard
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, limit)
  }

  /**
   * Get detailed lesson analytics
   */
  async getLessonAnalytics(courseId: string, lessonId: string) {
    const [
      totalAttempts,
      successfulCompilations,
      successfulTests,
      averageCompilationTime,
      averageTestTime,
      commonErrors
    ] = await Promise.all([
      // Total attempts
      prisma.studentProgress.count({
        where: { courseId, lessonId }
      }),

      // Successful compilations
      prisma.compilationResult.count({
        where: {
          studentProgress: { courseId, lessonId },
          success: true
        }
      }),

      // Successful tests
      prisma.testResult.count({
        where: {
          studentProgress: { courseId, lessonId },
          success: true
        }
      }),

      // Average compilation time
      prisma.compilationResult.aggregate({
        where: {
          studentProgress: { courseId, lessonId },
          compilationTime: { not: null }
        },
        _avg: { compilationTime: true }
      }),

      // Average test time
      prisma.testResult.aggregate({
        where: {
          studentProgress: { courseId, lessonId },
          testTime: { not: null }
        },
        _avg: { testTime: true }
      }),

      // Common errors (simplified - would need more complex analysis)
      prisma.compilationResult.findMany({
        where: {
          studentProgress: { courseId, lessonId },
          success: false,
          errors: { not: null }
        },
        select: { errors: true },
        take: 20
      })
    ])

    return {
      totalAttempts,
      successfulCompilations,
      successfulTests,
      compilationSuccessRate: totalAttempts > 0 ? (successfulCompilations / totalAttempts) * 100 : 0,
      testSuccessRate: totalAttempts > 0 ? (successfulTests / totalAttempts) * 100 : 0,
      averageCompilationTime: averageCompilationTime._avg.compilationTime,
      averageTestTime: averageTestTime._avg.testTime,
      commonErrors: commonErrors.map(c => c.errors).filter(Boolean)
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()
