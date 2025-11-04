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

/**
 * Normalizes image URLs from backend responses to use the frontend proxy
 * Handles various formats:
 * - `uploads/courses/...` -> `/api/images/uploads/courses/...`
 * - `http://uploads/...` -> `/api/images/uploads/...`
  * - Already normalized `/api/images/...` -> unchanged
 */
export function normalizeImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  
  // Already using the proxy, return as-is
  if (imageUrl.startsWith('/api/images/')) {
    return imageUrl
  }
  
  // Remove protocol if present (http:// or https://)
  let normalized = imageUrl.replace(/^https?:\/\//, '')
  
  normalized = normalized.replace(/^[^\/]+\//, '')
  
  // Remove leading slash if present
  normalized = normalized.replace(/^\//, '')
  
  // Ensure it starts with 'uploads/'
  if (!normalized.startsWith('uploads/')) {
    // If it starts with 'courses/', prepend 'uploads/'
    if (normalized.startsWith('courses/')) {
      normalized = `uploads/${normalized}`
    } else {
      // Try to extract the path - look for 'uploads/' in the string
      const uploadsIndex = normalized.indexOf('uploads/')
      if (uploadsIndex !== -1) {
        normalized = normalized.substring(uploadsIndex)
      } else {
        // If no uploads path found, try to infer from common patterns
        // If it looks like a filename with extension, assume it's in uploads/courses/
        if (normalized.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
          normalized = `uploads/courses/${normalized}`
        } else {
          // Fallback: if it's a path without extension, assume uploads/courses/
          normalized = `uploads/courses/${normalized}`
        }
      }
    }
  }
  
  // Convert to proxy URL
  return `/api/images/${normalized}`
}
