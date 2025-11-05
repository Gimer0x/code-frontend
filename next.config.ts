import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Force cache busting for development
  generateBuildId: async () => {
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
  // Development CSP: allow eval for Next.js source maps and allow Google Identity scripts
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    if (!isDev) return []
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