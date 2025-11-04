import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Forward the form data to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/upload/course-thumbnail`, {
      method: 'POST',
      body: formData,
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ error: 'Backend upload failed' }))
      return NextResponse.json(errorData, { status: backendResponse.status })
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to upload course thumbnail'
    }, { status: 500 })
  }
}
