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
    
    // Try multiple possible paths:
    // 1. Direct static file path: /uploads/courses/image.webp
    // 2. API endpoint: /api/images/uploads/courses/image.webp
    // 3. Files API: /api/files/uploads/courses/image.webp
    const possibleUrls = [
      `${backendBase}/${cleanPath}`, // Direct static file
      `${backendBase}/api/images/${cleanPath}`, // API endpoint
      `${backendBase}/api/files/${cleanPath}`, // Files API
    ]
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Image proxy request:', { originalPath: path, imagePath, tryingUrls: possibleUrls })
    }
    
    // Try each URL until one works
    let response: Response | null = null
    let lastError: Error | null = null
    let triedUrl = ''
    
    for (const imageUrl of possibleUrls) {
      triedUrl = imageUrl
      try {
        response = await fetch(imageUrl, {
          headers: {
            'Accept': 'image/*',
          },
        })
        
        if (response.ok) {
          // Found the image, break out of loop
          if (process.env.NODE_ENV === 'development') {
            console.log('Image found at:', imageUrl)
          }
          break
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        response = null
        continue
      }
    }
    
    // If no response was successful, use the last attempted URL for error reporting
    if (!response || !response.ok) {
      if (!triedUrl) {
        triedUrl = possibleUrls[possibleUrls.length - 1]
      }
      // Log the error for debugging
      const errorText = response ? await response.text().catch(() => 'Unable to read error response') : (lastError?.message || 'No response received')
      console.error('Image proxy error:', {
        status: response?.status || 'NO_RESPONSE',
        statusText: response?.statusText || 'No response',
        triedUrl,
        imagePath,
        originalPath: path,
        error: typeof errorText === 'string' ? errorText.substring(0, 200) : String(errorText) // Limit error text length
      })
      
      // If 404 or no response, return a more helpful error
      if (!response || response.status === 404) {
        return NextResponse.json({ 
          error: 'Image not found',
          message: `Image not found on backend. Tried: ${possibleUrls.join(', ')}`,
          debug: {
            requestedPath: imagePath,
            triedUrls: possibleUrls,
            originalPath: path
          }
        }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch image',
        message: `Backend returned ${response.status} for ${triedUrl}`,
        debug: {
          requestedPath: imagePath,
          backendUrl: triedUrl
        }
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
