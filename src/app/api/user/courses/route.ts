import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export async function GET(request: NextRequest) {
  try {
    // Get NextAuth session
    const session = await getServerSession(authOptions)
    const sessionAny = session as any
    
    // Get backend token from session or Authorization header
    let backendToken: string | null = null
    
    // Try to get token from NextAuth session
    if (sessionAny?.backendAccessToken) {
      backendToken = sessionAny.backendAccessToken as string
    }
    
    // Fallback: try to get from Authorization header
    if (!backendToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        backendToken = authHeader.substring(7)
      }
    }

    if (!backendToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use the new /api/student/courses endpoint
    // This endpoint returns courses the user has started (has StudentProgress records)
    const endpoint = `${BACKEND_URL}/api/student/courses`
    
    
    const backendResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`,
      },
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}))
      
      if (process.env.NODE_ENV === 'development') {
        console.error('[API /api/user/courses] Backend error:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorData
        })
      }
      
      // If 404 or other error, return empty courses array
      if (backendResponse.status === 404) {
        return NextResponse.json({
          success: true,
          courses: [],
          total: 0
        })
      }
      
      // Return empty array instead of error to show empty state
      return NextResponse.json({
        success: true,
        courses: [],
        total: 0,
        error: errorData.error || `Backend returned status ${backendResponse.status}`
      })
    }

    const data = await backendResponse.json()
    
    
    // Return the response as-is (backend already returns the correct format)
    return NextResponse.json(data)
  } catch (error) {
    // Return empty array instead of error to show empty state
    return NextResponse.json(
      { 
        success: true,
        courses: [],
        total: 0,
        error: 'Failed to fetch user courses' 
      },
      { status: 200 }
    )
  }
}

