import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using NextAuth.js
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
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
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'thumbnails')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'jpg'
    const uniqueFilename = `thumbnail_${timestamp}_${randomId}.${extension}`
    
    // Save file
    const filePath = join(uploadsDir, uniqueFilename)
    await writeFile(filePath, Buffer.from(arrayBuffer))

    // Return the public URL
    const publicUrl = `/uploads/thumbnails/${uniqueFilename}`

    return NextResponse.json({
      success: true,
      filename: uniqueFilename,
      url: publicUrl
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to upload file'
    }, { status: 500 })
  }
}
