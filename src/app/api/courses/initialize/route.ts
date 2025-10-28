import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCompilationClient } from '@/lib/compilationClient'
import { z } from 'zod'

const initializeCourseSchema = z.object({
  courseId: z.string(),
  userId: z.string().optional()
})

/**
 * Initialize a course for a student
 * This endpoint sets up the student's environment for a specific course
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, userId } = initializeCourseSchema.parse(body)
    
    const targetUserId = userId || session.user.id

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if user has access to the course
    if (course.access === 'paid') {
      // Check if user has active subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: targetUserId,
          status: 'active'
        }
      })

      if (!subscription) {
        return NextResponse.json({ 
          error: 'Subscription required for this course' 
        }, { status: 403 })
      }
    }

    // Initialize student progress for all lessons
    const progressEntries = []
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        progressEntries.push({
          userId: targetUserId,
          courseId,
          lessonId: lesson.id,
          codeContent: lesson.initialCode || '',
          isCompleted: false,
          lastSavedAt: new Date()
        })
      }
    }

    // Create progress entries
    await prisma.studentProgress.createMany({
      data: progressEntries,
      skipDuplicates: true
    })

    // Initialize course project on Fly.io if it's a Solidity course
    if (course.language.toLowerCase().includes('solidity')) {
      try {
        const client = getCompilationClient()
        
        // Check if course project exists on Fly.io
        const status = await client.getStatus()
        
        if (status.status === 'active') {
          // Course project is ready on Fly.io
          console.log(`Course ${courseId} project is ready on Fly.io`)
        }
      } catch (error) {
        console.warn('Failed to initialize course project on Fly.io:', error)
        // Continue even if Fly.io initialization fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Course initialized successfully',
      courseId,
      userId: targetUserId,
      progressEntries: progressEntries.length
    })

  } catch (error) {
    console.error('Course initialization error:', error)
    return NextResponse.json({
      error: 'Failed to initialize course',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Get course initialization status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const userId = searchParams.get('userId') || session.user.id

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Check if course is initialized for user
    const progressCount = await prisma.studentProgress.count({
      where: {
        userId,
        courseId
      }
    })

    // Check Fly.io service status for Solidity courses
    let flyioStatus = null
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { language: true }
      })

      if (course?.language.toLowerCase().includes('solidity')) {
        const client = getCompilationClient()
        const status = await client.getStatus()
        flyioStatus = {
          status: status.status,
          environment: status.environment,
          features: status.features
        }
      }
    } catch (error) {
      console.warn('Failed to check Fly.io status:', error)
    }

    return NextResponse.json({
      initialized: progressCount > 0,
      progressCount,
      flyioStatus,
      courseId,
      userId
    })

  } catch (error) {
    console.error('Get initialization status error:', error)
    return NextResponse.json({
      error: 'Failed to get initialization status'
    }, { status: 500 })
  }
}
