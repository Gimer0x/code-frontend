import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const { courseId, lessonId } = await request.json()

    if (!courseId || !lessonId) {
      return NextResponse.json({ error: 'Missing courseId or lessonId' }, { status: 400 })
    }

    // Get the lesson to find the contract name
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { 
        id: true, 
        title: true,
        initialCode: true,
        module: {
          select: {
            course: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // For anonymous users, we can't save to database, so just return success
    // The foundry service will handle the code reset
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: true, 
        message: 'Code reset successfully (anonymous user)',
        initialCode: lesson.initialCode
      })
    }

    // Extract contract name from initial code (simple regex to find contract name)
    const contractNameMatch = lesson.initialCode?.match(/contract\s+(\w+)/)
    const contractName = contractNameMatch ? contractNameMatch[1] : 'Challenge'

    // Clean up user progress from database
    await prisma.progress.deleteMany({
      where: {
        userId: session.user.id,
        lessonId: lessonId
      }
    })

    // Clean up files in the student's foundry project
    const studentProjectPath = path.join(process.cwd(), 'foundry-projects', `student-${session.user.id}`, `course-${courseId}`)
    
    if (fs.existsSync(studentProjectPath)) {
      // Remove the specific contract file
      const contractFilePath = path.join(studentProjectPath, 'src', `${contractName}.sol`)
      if (fs.existsSync(contractFilePath)) {
        fs.unlinkSync(contractFilePath)
      }

      // Remove the specific contract's output folder
      const outContractPath = path.join(studentProjectPath, 'out', `${contractName}.sol`)
      if (fs.existsSync(outContractPath)) {
        fs.rmSync(outContractPath, { recursive: true, force: true })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Code reset successfully',
      contractName: contractName,
      initialCode: lesson.initialCode
    })

  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json({ 
      error: 'Failed to reset code',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
