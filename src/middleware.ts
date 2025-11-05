import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Fix port mismatch for authentication (only in development)
  // Skip in production/Vercel where port is handled automatically
  if (process.env.NODE_ENV === 'development' && 
      request.nextUrl.port === '3001' && 
      request.nextUrl.pathname.startsWith('/api/auth/')) {
    const correctUrl = new URL(request.url)
    correctUrl.port = '3000'
    return NextResponse.redirect(correctUrl)
  }

  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Content Security Policy - Temporarily disabled for development
  // const isDevelopment = process.env.NODE_ENV === 'development'
  // const cspDirective = isDevelopment
  //   ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;"
  //   : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';"
  
  // Debug logging removed for cleaner terminal output
  
  // Set CSP headers with cache control - TEMPORARILY DISABLED
  // response.headers.set('Content-Security-Policy', cspDirective)
  // response.headers.set('X-Content-Security-Policy', cspDirective) // For older browsers
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate') // Prevent caching

  // Rate limiting headers (basic)
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
  response.headers.set('X-RateLimit-Limit', '100')
  response.headers.set('X-RateLimit-Remaining', '99') // This would be dynamic in production

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/image|favicon.ico).*)',
  ],
}
