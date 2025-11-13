import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Start/enroll in a course
 * This creates an initial StudentProgress record to attach the course to the user
 */
export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    const authHeader = session?.backendAccessToken 
      ? `Bearer ${session.backendAccessToken}` 
      : request.headers.get('authorization') || undefined

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { courseId } = body

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Call backend endpoint to start/enroll in the course
    // The backend should create an initial StudentProgress record or initialize the course for the user
    const backendResponse = await fetch(`${BACKEND_URL}/api/student/courses/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ courseId }),
    })

    const data = await backendResponse.json().catch(() => ({
      success: false,
      error: 'Failed to start course'
    }))

    if (!backendResponse.ok) {
      return NextResponse.json(
        { 
          success: false,
          error: data.error || data.message || 'Failed to start course',
          code: data.code
        },
        { status: backendResponse.status }
      )
    }

    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    console.error('Error starting course:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

