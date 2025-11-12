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
 * 
 * CRITICAL: Database stores thumbnail paths like "uploads/courses/filename.webp" (no leading slash)
 * Backend serves images at:
 *   - /uploads/* → maps to uploads/ directory
 *   - /api/images/* → also maps to uploads/ directory (alias)
 * 
 * IMPORTANT: Do NOT use /api/images/uploads/ - this is incorrect!
 * The /api/images/ path already maps to uploads/, so adding /uploads/ creates /api/images/uploads/
 * which looks for uploads/uploads/ (WRONG!)
 * 
 * This function always uses /uploads/ path directly.
 * 
 * @param thumbnail - Path from database (e.g., "uploads/courses/filename.webp" or "/uploads/courses/filename.webp")
 * @returns Full backend URL (e.g., "https://code-backend.fly.dev/uploads/courses/filename.webp")
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
  // Database stores: "uploads/courses/filename.webp" (no leading slash)
  let path = thumbnail.trim()
  
  // Remove leading slash if present
  if (path.startsWith('/')) {
    path = path.slice(1)
  }
  
  // Remove "api/images/" prefix if present (incorrect format)
  // The /api/images/ path already maps to uploads/, so we don't need both
  // Handle cases like "api/images/uploads/courses/file.webp" → "uploads/courses/file.webp"
  if (path.startsWith('api/images/')) {
    path = path.replace(/^api\/images\//, '')
    // If after removing "api/images/" it still starts with "uploads/", that's correct
    // If it doesn't, we'll add "uploads/" below
  }
  
  // Ensure path starts with "uploads/" (database should already have this, but handle edge cases)
  if (!path.startsWith('uploads/')) {
    path = `uploads/${path}`
  }
  
  // Construct full URL using /uploads/ path directly (NOT /api/images/uploads/)
  // Result: https://code-backend.fly.dev/uploads/courses/filename.webp
  const fullUrl = `${apiBaseUrl}/${path}`
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Course image URL constructed:', { 
      original: thumbnail, 
      normalized: path, 
      fullUrl,
      apiBaseUrl 
    })
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
