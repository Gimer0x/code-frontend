import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resizeImageToThumbnail } from '@/lib/serverImageUtils'
import { generateThumbnailFilename } from '@/lib/imageUtils'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using NextAuth.js
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to parse form data with error handling
    let data: FormData
    try {
      data = await request.formData()
    } catch (error) {
      console.error('FormData parsing failed:', error)
      return NextResponse.json({ 
        error: 'Failed to parse form data. Please try again.' 
      }, { status: 400 })
    }

    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Only JPG and PNG images are allowed' 
      }, { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size must be less than 5MB' 
      }, { status: 400 })
    }

    // Convert file to buffer with error handling
    let buffer: Buffer
    try {
      const bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
    } catch (error) {
      console.error('File buffer conversion failed:', error)
      return NextResponse.json({ 
        error: 'Failed to process file. Please try again.' 
      }, { status: 400 })
    }

    // Resize image to thumbnail dimensions
    const resizeResult = await resizeImageToThumbnail(buffer)
    if (!resizeResult.success) {
      return NextResponse.json({ 
        error: resizeResult.error || 'Failed to process image' 
      }, { status: 500 })
    }

    // Generate unique filename
    const filename = generateThumbnailFilename(file.name)
    const path = join(process.cwd(), 'public', 'uploads', 'thumbnails', filename)

    // Save the resized image
    await writeFile(path, resizeResult.resizedBuffer!)

    // Return the public URL
    const publicUrl = `/uploads/thumbnails/${filename}`

    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl
    })

  } catch (error) {
    console.error('Thumbnail upload error:', error)
    return NextResponse.json({
      error: 'Failed to upload thumbnail'
    }, { status: 500 })
  }
}
