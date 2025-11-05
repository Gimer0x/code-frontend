import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Generate stable build ID for production (required for Vercel)
  generateBuildId: async () => {
    // In production/Vercel, use a stable build ID
    // In development, use timestamp for cache busting
    if (process.env.NODE_ENV === 'production') {
      return process.env.VERCEL_GIT_COMMIT_SHA || `build-${Date.now()}`
    }
    return `build-${Date.now()}`
  },
  // Proxy uploads to backend (fallback - primary method is /api/images/[...path])
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!backendUrl) {
      return [];
    }
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  // Production headers for security
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    
    // Production headers
    if (!isDev) {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'DENY'
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin'
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block'
            }
          ]
        }
      ]
    }
    
    // Development CSP: allow eval for Next.js source maps and allow Google Identity scripts
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' data: blob:",
              // Allow eval only in dev for Next.js
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://ssl.gstatic.com https://cdn.jsdelivr.net",
              "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://ssl.gstatic.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "connect-src 'self' ws: wss: http: https:",
              "frame-src https://accounts.google.com",
              "worker-src 'self' blob: data:"
            ].join('; ')
          }
        ]
      }
    ]
  }
};

export default nextConfig;