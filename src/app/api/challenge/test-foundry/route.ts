import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const testSchema = z.object({
  code: z.string(),
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
    const { code, courseId, lessonId } = testSchema.parse(body)
    const userId = session.user.id

    // Extract contract name from student's code
    let contractName = 'TempContract' // default fallback
    const contractMatch = code.match(/contract\s+(\w+)/)
    if (contractMatch) {
      contractName = contractMatch[1]
    }

    // Save to database first (before testing)
    try {
      await prisma.studentProgress.upsert({
        where: {
          userId_courseId_lessonId: {
            userId,
            courseId,
            lessonId
          }
        },
        update: {
          codeContent: code,
          lastSavedAt: new Date()
        },
        create: {
          userId,
          courseId,
          lessonId,
          codeContent: code,
          lastSavedAt: new Date(),
          isCompleted: false
        }
      })
      
    } catch (dbError) {
      // Continue with testing even if database save fails
    }

    // Get lesson test code
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId }
    })

    if (!lesson) {
      return NextResponse.json({ 
        error: 'Lesson not found'
      }, { status: 404 })
    }

    const testCode = lesson.tests || ''

    // Clean the test code to remove invisible characters
    const cleanTestCode = testCode.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')

    // Route testing to Foundry service
    const foundryServiceUrl = process.env.FOUNDRY_SERVICE_URL || ''
    
    try {
      
      const foundryResponse = await fetch(`${foundryServiceUrl}/api/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          courseId,
          lessonId,
          code,
          testCode: cleanTestCode,
          contractName,
          testName: `${contractName}Test`,
          options: {
            verbose: true,
            gasReport: true
          }
        })
      })

      if (!foundryResponse.ok) {
        const errorText = await foundryResponse.text()
        throw new Error(`Foundry service error: ${foundryResponse.status} - ${errorText}`)
      }

      const foundryResult = await foundryResponse.json()
      
      // Store test result in database
      if (foundryResult.success) {
        try {
          const studentProgress = await prisma.studentProgress.findFirst({
            where: { userId, courseId, lessonId }
          })

          if (studentProgress) {
            await prisma.testResult.create({
              data: {
                studentProgressId: studentProgress.id,
                success: foundryResult.result?.success || false,
                output: foundryResult.result,
                testCount: foundryResult.result?.tests?.total || 0,
                passedCount: foundryResult.result?.tests?.passed || 0,
                failedCount: foundryResult.result?.tests?.failed || 0,
                testTime: foundryResult.result?.testTime || 0
              }
            })
            
          }
        } catch (dbError) {
          // Continue even if database storage fails
        }
      }

      return NextResponse.json({
        success: foundryResult.success,
        message: foundryResult.success ? 'Tests completed successfully' : 'Tests failed',
        result: foundryResult.result,
        contractName,
        timestamp: new Date().toISOString()
      })

    } catch (foundryError) {
      
      return NextResponse.json({
        success: false,
        message: 'Testing failed',
        error: foundryError instanceof Error ? foundryError.message : 'Unknown error',
        result: {
          success: false,
          tests: {
            total: 0,
            passed: 0,
            failed: 0
          },
          errors: [foundryError instanceof Error ? foundryError.message : 'Unknown error']
        },
        contractName,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
