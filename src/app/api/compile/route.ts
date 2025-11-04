import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const compileSchema = z.object({
  courseId: z.string(),
  lessonId: z.string().optional(),
  code: z.string(),
  contractName: z.string().optional()
})


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, lessonId, code, contractName } = compileSchema.parse(body)

    // Call Foundry service for compilation
    const foundryServiceUrl = process.env.FOUNDRY_SERVICE_URL || ''
    
    try {
      const foundryResponse = await fetch(`${foundryServiceUrl}/api/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          courseId,
          lessonId: lessonId || 'default',
          code,
          contractName: contractName || 'StudentContract'
        })
      })

      if (!foundryResponse.ok) {
        const errorText = await foundryResponse.text()
        throw new Error(`Foundry service error: ${foundryResponse.status} - ${errorText}`)
      }

      const result = await foundryResponse.json()
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          message: result.error || 'Compilation failed',
          errors: result.errors || []
        })
      }

      // Return the compilation results from Foundry service with enhanced details
      return NextResponse.json({
        success: result.success,
        message: result.message || 'Compilation completed',
        result: result.result || result,
        // Enhanced compilation details - handle both old and new response formats
        compilationTime: result.result?.compilationTime || result.result?.output?.compilationTime || null,
        artifacts: result.result?.artifacts || result.result?.output?.artifacts || [],
        contracts: result.result?.contracts || result.result?.output?.contracts || [],
        errors: result.result?.errors || [],
        warnings: result.result?.warnings || [],
        sessionId: result.sessionId || null,
        timestamp: result.timestamp || new Date().toISOString()
      })

    } catch (foundryError) {
      
      return NextResponse.json({
        success: false,
        message: foundryError instanceof Error ? foundryError.message : 'Compilation failed',
        errors: []
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Compilation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// GET endpoint to check service status
export async function GET() {
  return NextResponse.json({
    service: 'compile-api',
    status: 'active',
    foundryServiceUrl: process.env.FOUNDRY_SERVICE_URL || ''
  })
}
