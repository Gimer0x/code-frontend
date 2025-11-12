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
 * Gets the full backend URL for a course image
 * According to backend guidelines:
 * - Database stores: "uploads/courses/filename.webp" (no leading slash)
 * - Backend serves at: /uploads/* or /api/images/* (both map to same directory)
 * - IMPORTANT: Do NOT use /api/images/uploads/ - this is incorrect!
 * 
 * Handles various formats:
 * - `uploads/courses/...` -> `https://code-backend.fly.dev/uploads/courses/...`
 * - `/uploads/courses/...` -> `https://code-backend.fly.dev/uploads/courses/...`
 * - `api/images/courses/...` -> `https://code-backend.fly.dev/uploads/courses/...` (removes api/images prefix)
 * - Already full URL -> return as-is
 */
export function getCourseImageUrl(thumbnail: string | null | undefined): string | null {
  if (!thumbnail || thumbnail.trim() === '') {
    return null
  }

  // Get backend base URL from environment
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'
  
  // If already a full URL (starts with http:// or https://), return as-is
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
    return thumbnail
  }
  
  // Normalize the thumbnail path
  // Database may store: "uploads/courses/filename.webp" or "/uploads/courses/filename.webp"
  let cleanPath = thumbnail.trim()
  
  // Remove leading slash if present
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.slice(1)
  }
  
  // IMPORTANT: If path starts with "api/images/", remove that prefix
  // The /api/images/ path already maps to uploads/, so we don't need both
  if (cleanPath.startsWith('api/images/')) {
    // Remove the "api/images/" prefix since we'll use /uploads/ directly
    cleanPath = cleanPath.replace(/^api\/images\//, '')
  }
  
  // Ensure path starts with "uploads/" (database may or may not have it)
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`
  }
  
  // Construct full URL using /uploads/ path directly (NOT /api/images/uploads/)
  const fullUrl = `${apiBaseUrl}/${cleanPath}`
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Course image URL constructed:', { original: thumbnail, cleanPath, fullUrl })
  }
  
  return fullUrl
}

/**
 * Normalizes image URLs from backend responses to use direct backend URLs
 * This is an alias for getCourseImageUrl for backward compatibility
 * @deprecated Use getCourseImageUrl instead
 */
export function normalizeImageUrl(imageUrl: string | null | undefined): string | null {
  return getCourseImageUrl(imageUrl)
}
