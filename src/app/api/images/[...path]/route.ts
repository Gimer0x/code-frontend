import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:3002'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
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
    
    // Construct the backend URL
    const imageUrl = `${BACKEND_URL}/${imagePath}`
    
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      console.error(`Image proxy failed: ${imageUrl} returned ${response.status}`)
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }
    
    const imageBuffer = await response.arrayBuffer()
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
    
  } catch (error) {
    console.error('Image proxy error:', error)
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 })
  }
}
