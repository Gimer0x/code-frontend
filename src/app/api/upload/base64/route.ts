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

    // Parse JSON body
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid JSON data' 
      }, { status: 400 })
    }

    const { fileName, fileType, fileData } = body

    if (!fileName || !fileType || !fileData) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileName, fileType, fileData' 
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ 
        error: 'Only JPG and PNG images are allowed' 
      }, { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    const base64Data = fileData.replace(/^data:image\/[a-z]+;base64,/, '')
    const fileSize = (base64Data.length * 3) / 4 // Approximate size
    
    if (fileSize > maxSize) {
      return NextResponse.json({ 
        error: 'File size must be less than 5MB' 
      }, { status: 400 })
    }

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'thumbnails')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const extension = fileName.split('.').pop() || 'jpg'
    const uniqueFilename = `thumbnail_${timestamp}_${randomId}.${extension}`
    
    // Convert base64 to buffer and save file
    const buffer = Buffer.from(base64Data, 'base64')
    const filePath = join(uploadsDir, uniqueFilename)
    await writeFile(filePath, buffer)

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
