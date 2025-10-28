import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const lessonId = searchParams.get('lessonId')

    if (!courseId || !lessonId) {
      return NextResponse.json({ error: 'Missing courseId or lessonId' }, { status: 400 })
    }

    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_courseId_lessonId: {
          userId: session.user.id,
          courseId,
          lessonId
        }
      }
    })

    return NextResponse.json({
      progress: progress || null
    })
  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
