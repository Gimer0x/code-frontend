import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schema for test results
const testResultSchema = z.object({
  courseId: z.string(),
  lessonId: z.string(),
  success: z.boolean(),
  output: z.any().optional(),
  errors: z.any().optional(),
  testCount: z.number().optional(),
  passedCount: z.number().optional(),
  failedCount: z.number().optional(),
  testTime: z.number().optional()
})

/**
 * Get test history for a student
 */
export async function GET(request: NextRequest) {
  return withAuth(async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')
      const lessonId = searchParams.get('lessonId')

      if (!courseId) {
        return createErrorResponse('Course ID is required', 400)
      }

      const history = await databaseService.getTestHistory(
        context.user.id,
        courseId,
        lessonId || undefined
      )

      return createSuccessResponse({
        history,
        totalCount: history.length
      })

    } catch (error) {
      console.error('Get test history error:', error)
      return createErrorResponse('Failed to get test history', 500)
    }
  })(request, { requireAuth: true })
}

/**
 * Save test result
 */
export async function POST(request: NextRequest) {
  return withAuth(async (request: NextRequest, context) => {
    try {
      const body = await request.json()
      const validatedData = testResultSchema.parse(body)

      // Get or create student progress
      const progress = await databaseService.getOrCreateStudentProgress({
        userId: context.user.id,
        courseId: validatedData.courseId,
        lessonId: validatedData.lessonId
      })

      // Save test result
      const result = await databaseService.saveTestResult({
        studentProgressId: progress.id,
        success: validatedData.success,
        output: validatedData.output,
        errors: validatedData.errors,
        testCount: validatedData.testCount,
        passedCount: validatedData.passedCount,
        failedCount: validatedData.failedCount,
        testTime: validatedData.testTime
      })

      // Update lesson completion if all tests passed
      if (validatedData.success && validatedData.passedCount && validatedData.passedCount > 0) {
        await databaseService.updateLessonCompletion(
          context.user.id,
          validatedData.courseId,
          validatedData.lessonId,
          true
        )
      }

      return createSuccessResponse({
        message: 'Test result saved successfully',
        result: {
          id: result.id,
          success: result.success,
          testCount: result.testCount,
          passedCount: result.passedCount,
          failedCount: result.failedCount,
          testTime: result.testTime,
          createdAt: result.createdAt
        }
      })

    } catch (error) {
      console.error('Save test result error:', error)
      return createErrorResponse('Failed to save test result', 500)
    }
  })(request, { requireAuth: true })
}
