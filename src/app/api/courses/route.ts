import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export async function GET(request: NextRequest) {
  try {
    // Get query parameters from the request
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/courses?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await backendResponse.json()
    
    if (!backendResponse.ok) {
      // Check if it's a database connection error
      if (data.error && data.error.includes('Server has closed the connection')) {
        return NextResponse.json({
          success: false,
          error: 'Database connection error. The backend cannot connect to the database.',
          details: 'Please check the backend database connection and try again later.'
        }, { status: 503 })
      }
      return NextResponse.json(data, { status: backendResponse.status })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch courses from backend',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get backend token from Authorization header (prioritize this for AdminAuthContext)
    const authHeader = request.headers.get('authorization')
    let backendToken: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      backendToken = authHeader.substring(7)
    } else {
      // Fallback: try to get from NextAuth session
      const session = await getServerSession(authOptions)
      const sessionAny = session as any
      if (sessionAny?.backendAccessToken) {
        backendToken = sessionAny.backendAccessToken
      }
    }
    
    if (!backendToken) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // Always verify admin status via backend to ensure accuracy
    // This handles cases where AdminAuthContext uses localStorage tokens
    let isAdmin = false
    try {
      const profileResponse = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${backendToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        if (profileData.success && profileData.user?.role === 'ADMIN') {
          isAdmin = true
        }
      } else {
        // If profile check fails, log for debugging
        console.warn('[API /api/courses] Profile check failed:', profileResponse.status)
      }
    } catch (error) {
      console.error('[API /api/courses] Error verifying admin status:', error)
    }

    if (!isAdmin) {
      return NextResponse.json({ 
        success: false,
        error: 'Admin access required' 
      }, { status: 403 })
    }

    const body = await request.json()
        
    // Forward request to backend with backend token
    const backendResponse = await fetch(`${BACKEND_URL}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`
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
      error: 'Failed to create course'
    }, { status: 500 })
  }
}
