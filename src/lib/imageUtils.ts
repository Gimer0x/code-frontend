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
 * Gets the image URL for a course thumbnail
 * 
 * CRITICAL: Database stores thumbnail paths like "uploads/courses/filename.webp" (no leading slash)
 * Backend serves images at:
 *   - /uploads/* → maps to uploads/ directory
 *   - /api/images/* → also maps to uploads/ directory (alias)
 * 
 * IMPORTANT: To avoid CORS issues, we use the Next.js proxy route /api/images/[...path]
 * The proxy route handles cross-origin requests server-side.
 * 
 * @param thumbnail - Path from database (e.g., "uploads/courses/filename.webp" or "/uploads/courses/filename.webp")
 * @returns Proxy URL (e.g., "/api/images/uploads/courses/filename.webp") to avoid CORS issues
 */
export function getCourseImageUrl(thumbnail: string | null | undefined): string | null {
  if (!thumbnail || thumbnail.trim() === '') {
    return null
  }

  // If already a full URL (starts with http:// or https://), check if it's same-origin
  // If it's cross-origin, we should still use the proxy to avoid CORS
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
    // Check if it's same-origin (for localhost or same domain)
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(thumbnail)
        const currentOrigin = window.location.origin
        // If same origin, return as-is; otherwise use proxy
        if (url.origin === currentOrigin) {
          return thumbnail
        }
      } catch {
        // Invalid URL, continue with normalization
      }
    } else {
      // Server-side: return as-is for full URLs
      return thumbnail
    }
  }
  
  // Normalize the thumbnail path
  // Database stores: "uploads/courses/filename.webp" (no leading slash)
  let path = thumbnail.trim()
  
  // Remove leading slash if present
  if (path.startsWith('/')) {
    path = path.slice(1)
  }
  
  // Remove "api/images/" prefix if present (we'll add it back for the proxy)
  if (path.startsWith('api/images/')) {
    path = path.replace(/^api\/images\//, '')
  }
  
  // Ensure path starts with "uploads/" (database should already have this, but handle edge cases)
  if (!path.startsWith('uploads/')) {
    path = `uploads/${path}`
  }
  
  // Use Next.js proxy route to avoid CORS issues
  // The proxy route /api/images/[...path] will forward to the backend
  // Result: /api/images/uploads/courses/filename.webp
  const proxyUrl = `/api/images/${path}`
  
  
  return proxyUrl
}

/**
 * Normalizes image URLs from backend responses to use direct backend URLs
 * This is an alias for getCourseImageUrl for backward compatibility
 * @deprecated Use getCourseImageUrl instead
 */
export function normalizeImageUrl(imageUrl: string | null | undefined): string | null {
  return getCourseImageUrl(imageUrl)
}
