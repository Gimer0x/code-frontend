import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 })
    }

    const { path } = await context.params
    let imagePath = Array.isArray(path) ? path.join('/') : path
    
    // Decode URL-encoded characters in the path
    imagePath = decodeURIComponent(imagePath)
    
    // Ensure the path starts with 'uploads/' if it doesn't already
    if (!imagePath.startsWith('uploads/')) {
      // If it starts with 'courses/', add 'uploads/' prefix
      if (imagePath.startsWith('courses/')) {
        imagePath = `uploads/${imagePath}`
      } else {
        // Otherwise assume it's a full path that needs 'uploads/'
        imagePath = `uploads/${imagePath}`
      }
    }
    
    // Construct the backend URL - ensure no double slashes
    const backendBase = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
    const imageUrl = `${backendBase}/${cleanPath}`
    
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*',
      },
    })
    
    if (!response.ok) {
      // If 404, return a more helpful error
      if (response.status === 404) {
        return NextResponse.json({ 
          error: 'Image not found',
          message: `Image not found on backend: ${imageUrl}`
        }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch image',
        message: `Backend returned ${response.status} for ${imageUrl}`
      }, { status: response.status })
    }
    
    const imageBuffer = await response.arrayBuffer()
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to load image',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
