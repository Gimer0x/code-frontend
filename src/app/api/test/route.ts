import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const testSchema = z.object({
  courseId: z.string(),
  lessonId: z.string().optional(),
  solutionCode: z.string(),
  testCode: z.string()
})

// Helper function to extract test name from test code
function extractTestName(testCode: string): string {
  const contractMatch = testCode.match(/contract\s+(\w+)/)
  if (contractMatch) {
    return contractMatch[1]
  }
  return 'Test'
}

export async function POST(request: NextRequest) {
  const requestId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  console.log(`[${requestId}] Starting test request`)
  
  try {
    const session = await getServerSession(authOptions)
    console.log(`[${requestId}] Session:`, session?.user?.id || 'anonymous')
    
    // Temporarily disable authentication for testing
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    console.log(`[${requestId}] Received request body:`, {
      courseId: body.courseId,
      lessonId: body.lessonId,
      solutionCodeLength: body.solutionCode?.length || 0,
      testCodeLength: body.testCode?.length || 0
    })
    
    const { courseId, lessonId, solutionCode, testCode } = testSchema.parse(body)

    // Clean the code to remove invisible characters and trailing whitespace
    const cleanSolutionCode = solutionCode.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
    const cleanTestCode = testCode.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
    
    console.log(`[${requestId}] Code cleaned - Solution: ${cleanSolutionCode.length} chars, Test: ${cleanTestCode.length} chars`)

    // Resolve the correct lesson ID if it's a temporary ID
    let actualLessonId = lessonId
    if (lessonId && lessonId.startsWith('lesson-')) {
      // This is a temporary lesson ID, find the actual lesson in the database
      const lesson = await prisma.lesson.findFirst({
        where: {
          module: {
            courseId: courseId
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      if (lesson) {
        actualLessonId = lesson.id
        console.log(`Mapped temporary lesson ID ${lessonId} to actual lesson ID ${actualLessonId}`)
      } else {
        console.warn(`Could not find lesson for course ${courseId}, using temporary ID`)
      }
    }

    // Extract contract name from cleaned solution code
    let contractName = 'TempContract' // default fallback
    const contractMatch = cleanSolutionCode.match(/contract\s+(\w+)/)
    if (contractMatch) {
      contractName = contractMatch[1]
    }

    const testName = extractTestName(cleanTestCode)
    const testFileName = `${testName}.t.sol`

    console.log(`[${requestId}] Contract: ${contractName}, Test: ${testName}`)

    // Call Foundry service for testing (new course-based architecture)
    const foundryServiceUrl = process.env.FOUNDRY_SERVICE_URL || 'http://localhost:3002'
    console.log(`[${requestId}] Calling Foundry service at: ${foundryServiceUrl}`)
    
    try {
      const foundryPayload = {
        userId: session?.user?.id || 'anonymous', // Use session user ID or fallback to anonymous
        courseId,
        lessonId: actualLessonId || 'default',
        code: cleanSolutionCode,
        testCode: cleanTestCode,
        contractName,
        testName,
        options: {}
      }
      console.log(`[${requestId}] Sending to Foundry service:`, {
        userId: foundryPayload.userId,
        courseId: foundryPayload.courseId,
        lessonId: foundryPayload.lessonId,
        contractName: foundryPayload.contractName,
        testName: foundryPayload.testName,
        codeLength: foundryPayload.code.length,
        testCodeLength: foundryPayload.testCode.length
      })
      
      const foundryResponse = await fetch(`${foundryServiceUrl}/api/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(foundryPayload)
      })
      
      console.log(`[${requestId}] Foundry service response status: ${foundryResponse.status}`)

      if (!foundryResponse.ok) {
        const errorText = await foundryResponse.text()
        throw new Error(`Foundry service error: ${foundryResponse.status} - ${errorText}`)
      }

      const result = await foundryResponse.json()
      console.log(`[${requestId}] Foundry service response:`, {
        success: result.success,
        message: result.message,
        hasResult: !!result.result,
        hasOutput: !!result.result?.output,
        outputLength: result.result?.output?.length || 0
      })
      
      if (!result.success) {
        console.log(`[${requestId}] Foundry service returned failure:`, result)
        return NextResponse.json({
          success: false,
          message: result.error || 'Test execution failed',
          errors: result.errors || []
        })
      }

      console.log(`[${requestId}] Test completed successfully, returning results`)
      // Return the test results from Foundry service
      return NextResponse.json({
        success: result.success,
        message: result.message || 'Tests completed',
        testResults: result.testResults || [],
        testCount: result.testCount || 0,
        passedCount: result.passedCount || 0,
        failedCount: result.failedCount || 0,
        testTime: result.testTime || 0,
        // Include the raw output for parsing
        result: result.result || result,
        output: result.result?.output || result.output
      })

    } catch (foundryError) {
      console.error(`[${requestId}] Foundry service test error:`, foundryError)
      
      return NextResponse.json({
        success: false,
        message: foundryError instanceof Error ? foundryError.message : 'Test execution failed',
        errors: []
      }, { status: 500 })
    }

  } catch (error) {
    console.error(`[${requestId}] Test API error:`, error)
    return NextResponse.json({
      success: false,
      message: 'Test execution failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}