import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:3002'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/lessons/${lessonId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
      }
      throw new Error(`Backend responded with status: ${backendResponse.status}`)
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Get lesson error:', error)
    return NextResponse.json({
      error: 'Failed to fetch lesson from backend'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const body = await request.json()

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/lessons/${lessonId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json()
      return NextResponse.json(errorData, { status: backendResponse.status })
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Update lesson error:', error)
    return NextResponse.json({
      error: 'Failed to update lesson'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/lessons/${lessonId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json()
      return NextResponse.json(errorData, { status: backendResponse.status })
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Delete lesson error:', error)
    return NextResponse.json({
      error: 'Failed to delete lesson'
    }, { status: 500 })
  }
}