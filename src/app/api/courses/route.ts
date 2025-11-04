import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/jwt-auth'

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

    if (!backendResponse.ok) {
      throw new Error(`Backend responded with status: ${backendResponse.status}`)
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch courses from backend'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdmin(request)
    
    if (!authResult.success) {
      return NextResponse.json({ 
        success: false,
        error: authResult.error || 'Admin access required' 
      }, { status: 401 })
    }

    const body = await request.json()
    
    // Get the Authorization header from the original request
    const authHeader = request.headers.get('authorization')
        
    // Forward request to backend with Authorization header
    const backendResponse = await fetch(`${BACKEND_URL}/api/courses`, {
      method: 'POST',
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
      error: 'Failed to create course'
    }, { status: 500 })
  }
}
