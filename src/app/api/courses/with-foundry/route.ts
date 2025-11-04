import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/jwt-auth'
import { z } from 'zod'

// Validation schema for course creation with Foundry integration
const createCourseWithFoundrySchema = z.object({
  title: z.string().min(1, 'Course title is required').max(200, 'Title too long'),
  language: z.string().min(1, 'Language is required'),
  goals: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  access: z.enum(['free', 'paid']),
  status: z.enum(['active', 'deactivated']),
  thumbnail: z.string().nullable().optional(),
  modules: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, 'Module title is required'),
    description: z.string().optional(),
    lessons: z.array(z.object({
      id: z.string(),
      type: z.enum(['intro', 'quiz', 'challenge']),
      title: z.string().min(1, 'Lesson title is required'),
      contentMarkdown: z.string().optional(),
      youtubeUrl: z.string().nullable().optional(),
      initialCode: z.string().nullable().optional(),
      solutionCode: z.string().nullable().optional(),
      tests: z.string().nullable().optional(),
    }))
  })).optional().default([])
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using JWT
    const authResult = await requireAdmin(request)
    
    if (!authResult.success) {
      
      return NextResponse.json({ 
        success: false,
        error: authResult.error || 'Unauthorized - Admin access required' 
      }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createCourseWithFoundrySchema.parse(body)

    // Create course in database
    const course = await prisma.course.create({
      data: {
        title: validatedData.title,
        language: validatedData.language,
        goals: validatedData.goals || '',
        level: validatedData.level.toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
        access: validatedData.access.toUpperCase() as 'FREE' | 'PAID',
        status: validatedData.status.toUpperCase() as 'ACTIVE' | 'DEACTIVATED',
        thumbnail: validatedData.thumbnail || null,
        creatorId: session.user.id,
        modules: {
          create: validatedData.modules.map((module, moduleIndex) => ({
            title: module.title,
            description: module.description || '',
            order: moduleIndex + 1,
            lessons: {
              create: module.lessons.map((lesson, lessonIndex) => ({
                type: lesson.type.toUpperCase() as 'INTRO' | 'QUIZ' | 'CHALLENGE',
                title: lesson.title,
                contentMarkdown: lesson.contentMarkdown || '',
                youtubeUrl: lesson.youtubeUrl || null,
                initialCode: lesson.initialCode || '',
                solutionCode: lesson.solutionCode || '',
                tests: lesson.tests || '',
                order: lessonIndex + 1,
              }))
            }
          }))
        }
      },
      include: {
        modules: {
          include: {
            lessons: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    // Create course project in Foundry service for Solidity courses
    if (validatedData.language.toLowerCase() === 'solidity') {
      try {        
        // Call Foundry service to create course project
        const foundryServiceUrl = process.env.FOUNDRY_SERVICE_URL || ''
        const courseData = {
          courseId: course.id,
          title: course.title,
          description: course.goals || '',
          language: 'solidity',
          foundryConfig: {
            solc: '0.8.30',
            optimizer: true,
            optimizer_runs: 200
          },
          dependencies: [
            { name: 'forge-std', version: 'latest' },
            { name: 'openzeppelin-contracts', version: 'latest' }
          ],
          templates: [
            { name: 'basic', options: {} }
          ],
          remappings: {
            'forge-std/': 'lib/forge-std/src/',
            '@openzeppelin/': 'lib/openzeppelin-contracts/'
          }
        }

        const foundryResponse = await fetch(`${foundryServiceUrl}/api/courses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(courseData)
        })

        if (!foundryResponse.ok) {
          const errorText = await foundryResponse.text()
          throw new Error(`Foundry service error: ${foundryResponse.status} - ${errorText}`)
        }

        const foundryResult = await foundryResponse.json()
        
        // Update course with Foundry project information
        await prisma.courseProject.create({
          data: {
            courseId: course.id,
            projectPath: foundryResult.projectPath || `course-${course.id}`,
            foundryConfig: courseData.foundryConfig,
            remappings: courseData.remappings,
            isActive: true
          }
        })

      } catch (foundryError) {
        // Don't fail the course creation if Foundry project creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Course created successfully with Foundry integration',
      course,
      foundryIntegration: validatedData.language.toLowerCase() === 'solidity'
    })

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create course with Foundry integration'
    }, { status: 500 })
  }
}
