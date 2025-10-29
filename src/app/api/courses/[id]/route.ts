import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/jwt-auth'

const BACKEND_URL = 'http://localhost:3002'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params

    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/courses/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }
      throw new Error(`Backend responded with status: ${backendResponse.status}`)
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch course from backend'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin(request)
    
    if (!authResult.success) {
      return NextResponse.json({ 
        success: false,
        error: authResult.error || 'Admin access required' 
      }, { status: 401 })
    }

    const { id: courseId } = await params
    const body = await request.json()

    // Get the Authorization header from the original request
    const authHeader = request.headers.get('authorization')

    // Forward request to backend with Authorization header
    const backendResponse = await fetch(`${BACKEND_URL}/api/courses/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader })
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
    return NextResponse.json({
      error: 'Failed to update course'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin(request)
    
    if (!authResult.success) {
      return NextResponse.json({ 
        success: false,
        error: authResult.error || 'Admin access required' 
      }, { status: 401 })
    }

    const { id: courseId } = await params

    // Get the Authorization header from the original request
    const authHeader = request.headers.get('authorization')

    // Forward request to backend with Authorization header
    const backendResponse = await fetch(`${BACKEND_URL}/api/courses/${courseId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader })
      },
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json()
      return NextResponse.json(errorData, { status: backendResponse.status })
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to delete course'
    }, { status: 500 })
  }
}