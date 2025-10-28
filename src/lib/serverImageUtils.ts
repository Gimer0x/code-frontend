import sharp from 'sharp'

export interface ImageResizeResult {
  success: boolean
  error?: string
  resizedBuffer?: Buffer
}

/**
 * Resizes image to thumbnail dimensions (300x200px) - Server-side only
 */
export async function resizeImageToThumbnail(
  buffer: Buffer,
  format: 'jpeg' | 'png' = 'jpeg'
): Promise<ImageResizeResult> {
  try {
    const resizedBuffer = await sharp(buffer)
      .resize(300, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toBuffer()

    return {
      success: true,
      resizedBuffer
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to resize image'
    }
  }
}

