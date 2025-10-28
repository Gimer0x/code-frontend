import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Force cache busting for development
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Proxy uploads to backend
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3002/uploads/:path*',
      },
    ];
  },
  // Temporarily disable CSP for development
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'Content-Security-Policy',
  //           value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; style-src 'self' 'unsafe-inline' https: data: blob:; worker-src 'self' blob: data: 'unsafe-eval' 'unsafe-inline' https:; connect-src 'self' ws: wss: http: https:; img-src 'self' data: blob: https:; font-src 'self' data: https:;"
  //         }
  //       ]
  //     }
  //   ];
  // }
};

export default nextConfig;