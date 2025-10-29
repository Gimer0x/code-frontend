import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:3002'

export async function POST(request: NextRequest) {
  try {
    console.log('Course thumbnail upload API called') // Debug log
    const formData = await request.formData()
    console.log('FormData received, entries:', Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `${value.name} (${value.size} bytes)` : value])) // Debug log
    
    // Forward the form data to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/upload/course-thumbnail`, {
      method: 'POST',
      body: formData,
    })

    if (!backendResponse.ok) {
      console.error('Backend upload failed with status:', backendResponse.status) // Debug log
      const errorData = await backendResponse.json().catch(() => ({ error: 'Backend upload failed' }))
      console.error('Backend error response:', errorData) // Debug log
      return NextResponse.json(errorData, { status: backendResponse.status })
    }

    const data = await backendResponse.json()
    console.log('Backend upload response:', JSON.stringify(data, null, 2)) // Debug log
    console.log('Backend response keys:', Object.keys(data)) // Debug log
    return NextResponse.json(data)

  } catch (error) {
    console.error('Course thumbnail upload error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to upload course thumbnail'
    }, { status: 500 })
  }
}
