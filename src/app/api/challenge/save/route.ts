import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { databaseService } from '@/lib/database-service'
import { z } from 'zod'

const saveSchema = z.object({
  code: z.string(),
  courseId: z.string(),
  lessonId: z.string()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const body = await request.json()
    const { code, courseId, lessonId } = saveSchema.parse(body)

    // For anonymous users, we can't save to database, so just return success
    // The foundry service will handle the code compilation and temporary storage
    if (!session?.user?.id) {
      return NextResponse.json({
        success: true,
        message: 'Code processed successfully. Register to save your progress permanently.',
        savedAt: new Date().toISOString(),
        requiresAuth: true
      })
    }

    // Extract contract name from student's code
    let contractName = 'TempContract' // default fallback
    const contractMatch = code.match(/contract\s+(\w+)/)
    if (contractMatch) {
      contractName = contractMatch[1]
    }

    // Use the same database service as the compile endpoint
    await databaseService.saveStudentCode(session.user.id, courseId, lessonId, code)
    
    return NextResponse.json({
      success: true,
      message: 'Progress saved successfully',
      savedAt: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to save progress'
    }, { status: 500 })
  }
}
