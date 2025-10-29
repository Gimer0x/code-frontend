import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const saveCodeSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  codeContent: z.string().min(1, 'Code content is required'),
  fileName: z.string().optional().default('main.sol')
})

const loadCodeSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  fileName: z.string().optional()
})

/**
 * Save student code
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const validatedData = saveCodeSchema.parse(body)

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
          codeContent: validatedData.codeContent,
          lastSavedAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          userId: session.user.id,
          courseId: validatedData.courseId,
          lessonId: validatedData.lessonId,
          codeContent: validatedData.codeContent,
          lastSavedAt: new Date()
        }
      })

      // Save or update student file
      const studentFile = await prisma.studentFile.upsert({
        where: {
          studentProgressId_fileName: {
            studentProgressId: progress.id,
            fileName: validatedData.fileName
          }
        },
        update: {
          content: validatedData.codeContent,
          updatedAt: new Date()
        },
        create: {
          studentProgressId: progress.id,
          fileName: validatedData.fileName,
          content: validatedData.codeContent
        }
      })

      return createSuccessResponse({
        message: 'Code saved successfully',
        progress: {
          id: progress.id,
          lastSavedAt: progress.lastSavedAt,
          isCompleted: progress.isCompleted
        },
        file: {
          id: studentFile.id,
          fileName: studentFile.fileName,
          savedAt: studentFile.updatedAt
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
        error instanceof Error ? error.message : 'Failed to save code',
        500
      )
    }
  })
}

/**
 * Load student code
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')
      const lessonId = searchParams.get('lessonId')
      const fileName = searchParams.get('fileName')

      if (!courseId || !lessonId) {
        return createErrorResponse('Course ID and Lesson ID are required', 400)
      }

      // Get student progress
      const progress = await prisma.studentProgress.findUnique({
        where: {
          userId_courseId_lessonId: {
            userId: session.user.id,
            courseId: courseId,
            lessonId: lessonId
          }
        },
        include: {
          studentFiles: {
            where: fileName ? { fileName: fileName } : undefined,
            orderBy: { updatedAt: 'desc' }
          },
          lesson: {
            select: {
              id: true,
              title: true,
              type: true,
              initialCode: true,
              solutionCode: true
            }
          }
        }
      })

      if (!progress) {
        return createSuccessResponse({
          message: 'No progress found for this lesson',
          code: null,
          files: [],
          lesson: null
        })
      }

      // Get all files for this lesson
      const allFiles = await prisma.studentFile.findMany({
        where: {
          studentProgressId: progress.id
        },
        orderBy: { updatedAt: 'desc' }
      })

      return createSuccessResponse({
        message: 'Code loaded successfully',
        progress: {
          id: progress.id,
          lastSavedAt: progress.lastSavedAt,
          isCompleted: progress.isCompleted,
          codeContent: progress.codeContent
        },
        files: allFiles.map(file => ({
          id: file.id,
          fileName: file.fileName,
          content: file.content,
          savedAt: file.updatedAt
        })),
        lesson: progress.lesson
      })

    } catch (error) {
      return createErrorResponse('Failed to load code', 500)
    }
  })
}

/**
 * Delete student code
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = new URL(request.url)
      const courseId = searchParams.get('courseId')
      const lessonId = searchParams.get('lessonId')
      const fileName = searchParams.get('fileName')

      if (!courseId || !lessonId) {
        return createErrorResponse('Course ID and Lesson ID are required', 400)
      }

      // Get student progress
      const progress = await prisma.studentProgress.findUnique({
        where: {
          userId_courseId_lessonId: {
            userId: session.user.id,
            courseId: courseId,
            lessonId: lessonId
          }
        }
      })

      if (!progress) {
        return createErrorResponse('No progress found for this lesson', 404)
      }

      if (fileName) {
        // Delete specific file
        await prisma.studentFile.deleteMany({
          where: {
            studentProgressId: progress.id,
            fileName: fileName
          }
        })
      } else {
        // Delete all files and reset progress
        await prisma.studentFile.deleteMany({
          where: {
            studentProgressId: progress.id
          }
        })

        await prisma.studentProgress.update({
          where: { id: progress.id },
          data: {
            codeContent: null,
            lastSavedAt: null,
            isCompleted: false,
            completedAt: null
          }
        })
      }

      return createSuccessResponse({
        message: fileName ? 'File deleted successfully' : 'All code deleted successfully'
      })

    } catch (error) {
      return createErrorResponse('Failed to delete code', 500)
    }
  })
}
