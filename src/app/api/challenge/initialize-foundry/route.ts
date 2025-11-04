import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const initializeSchema = z.object({
  courseId: z.string(),
  lessonId: z.string()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, lessonId } = initializeSchema.parse(body)
    const userId = session.user.id

    // Check if course has a Foundry project
    const courseProject = await prisma.courseProject.findUnique({
      where: { courseId },
      include: {
        course: true
      }
    })

    if (!courseProject) {
      return NextResponse.json({ 
        error: 'Course project not found',
        message: 'This course does not have a Foundry project configured'
      }, { status: 404 })
    }

    // Check if student already has a session for this course
    const existingSession = await prisma.studentProgress.findFirst({
      where: {
        userId,
        courseId,
        lessonId
      }
    })

    if (existingSession) {
      return NextResponse.json({ 
        message: 'Student session already initialized',
        initialized: true,
        ready: true,
        sessionId: existingSession.id
      })
    }

    // Create student progress record
    const studentProgress = await prisma.studentProgress.create({
      data: {
        userId,
        courseId,
        lessonId,
        codeContent: null, // Will be set when student starts coding
        lastSavedAt: new Date(),
        isCompleted: false
      }
    })

    // Get lesson details for initialization
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ 
        error: 'Lesson not found'
      }, { status: 404 })
    }

    // Initialize student session with Foundry service
    const foundryServiceUrl = process.env.FOUNDRY_SERVICE_URL || ''
    
    try {
      // Create a unique session ID for this student-course-lesson combination
      const sessionId = `student-${userId}-course-${courseId}-lesson-${lessonId}`
      
      // Get course project configuration
      const courseConfig = {
        foundryConfig: courseProject.foundryConfig,
        remappings: courseProject.remappings,
        dependencies: await prisma.courseDependency.findMany({
          where: { courseProjectId: courseProject.id }
        }),
        templates: await prisma.courseTemplate.findMany({
          where: { courseProjectId: courseProject.id }
        })
      }

      // Initialize student session with Foundry service
      const foundryResponse = await fetch(`${foundryServiceUrl}/api/student-session/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userId,
          courseId,
          lessonId,
          courseConfig,
          lessonData: {
            title: lesson.title,
            type: lesson.type,
            initialCode: lesson.initialCode,
            solutionCode: lesson.solutionCode,
            tests: lesson.tests
          }
        })
      })

      if (!foundryResponse.ok) {
        const errorText = await foundryResponse.text()
        throw new Error(`Foundry service error: ${foundryResponse.status} - ${errorText}`)
      }

      const foundryResult = await foundryResponse.json()
      
      // Update student progress with session information
      await prisma.studentProgress.update({
        where: { id: studentProgress.id },
        data: {
          codeContent: lesson.initialCode || '// Start coding here...',
          lastSavedAt: new Date()
        }
      })

      return NextResponse.json({ 
        message: 'Student session initialized successfully',
        initialized: true,
        ready: true,
        sessionId: foundryResult.sessionId,
        studentProgressId: studentProgress.id,
        courseProject: {
          id: courseProject.id,
          projectPath: courseProject.projectPath
        }
      })

    } catch (foundryError) {
      
      // Clean up the student progress record if Foundry initialization failed
      await prisma.studentProgress.delete({
        where: { id: studentProgress.id }
      })

      return NextResponse.json({ 
        error: 'Failed to initialize with Foundry service',
        message: foundryError instanceof Error ? foundryError.message : 'Unknown error',
        initialized: false,
        ready: false
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
