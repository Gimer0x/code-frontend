import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const getProgressSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().optional()
})

const updateProgressSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  lessonId: z.string().min(1, 'Lesson ID is required'),
  codeContent: z.string().optional(),
  isCompleted: z.boolean().optional()
})

/**
 * Get student progress for a course or specific lesson
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const params = url.search

    // Prefer backend token from NextAuth session; fall back to incoming Authorization
    const session = await getServerSession(authOptions)
    const authHeader = session?.backendAccessToken
      ? `Bearer ${session.backendAccessToken}`
      : request.headers.get('authorization') || undefined

    const backendResponse = await fetch(`http://localhost:3002/api/student/progress${params}`, {
      method: 'GET',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    const data = await backendResponse.json().catch(() => null)
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to get student progress' }, { status: 500 })
  }
}

/**
 * Update student progress
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const authHeader = session?.backendAccessToken
      ? `Bearer ${session.backendAccessToken}`
      : request.headers.get('authorization') || undefined

    const body = await request.text()
    const backendResponse = await fetch('http://localhost:3002/api/student/progress', {
      method: 'PUT',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        'Content-Type': 'application/json',
      },
      body,
    })

    const data = await backendResponse.json().catch(() => null)
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update progress' }, { status: 500 })
  }
}