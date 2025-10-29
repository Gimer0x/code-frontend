import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:3002'

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
    console.log('Backend courses response:', JSON.stringify(data, null, 2)) // Debug log
    return NextResponse.json(data)

  } catch (error) {
    console.error('Get courses error:', error)
    return NextResponse.json({
      error: 'Failed to fetch courses from backend'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/courses`, {
      method: 'POST',
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
    console.error('Create course error:', error)
    return NextResponse.json({
      error: 'Failed to create course'
    }, { status: 500 })
  }
}
