// Client-side validation only - no Sharp imports
export interface ImageValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates image file for thumbnail upload (client-side only)
 */
export function validateImage(file: File): ImageValidationResult {
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image size must be less than 5MB'
    }
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only JPG and PNG images are allowed'
    }
  }

  return { isValid: true }
}

/**
 * Generates a unique filename for the thumbnail
 */
export function generateThumbnailFilename(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  return `thumbnail_${timestamp}_${randomString}.${extension}`
}

/**
 * Gets the public URL for a thumbnail
 */
export function getThumbnailUrl(filename: string): string {
  return `/uploads/thumbnails/${filename}`
}
