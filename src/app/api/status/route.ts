import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCompilationClient } from '@/lib/compilationClient'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Service status endpoint for deployment
 * Proxies to backend for detailed status, returns basic status if backend unavailable
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Basic status for unauthenticated users
    const basicStatus = {
      service: 'dappdojo-frontend',
      status: 'active',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      deployment: {
        platform: 'vercel',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    }

    // If not authenticated, return basic status
    if (!session) {
      return NextResponse.json(basicStatus)
    }

    // Try to get enhanced status from backend
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/api/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session.backendAccessToken ? { 'Authorization': `Bearer ${session.backendAccessToken}` } : {}),
        },
      })

      if (backendResponse.ok) {
        const backendData = await backendResponse.json()
        return NextResponse.json({
          ...basicStatus,
          ...backendData,
          service: 'dappdojo-frontend',
          deployment: {
            platform: 'vercel',
            region: process.env.VERCEL_REGION || 'unknown'
          }
        })
      }
    } catch (backendError) {
      // Backend unavailable, continue with local status
    }

    // Enhanced status without database (check Fly.io if available)
    const enhancedStatus = {
      ...basicStatus,
      services: {
        flyio: await checkFlyioStatus(),
        auth: { status: 'active' }
      },
      features: [
        'solidity-compilation',
        'foundry-testing',
        'course-management',
        'user-progress-tracking',
        'authentication'
      ],
      limits: {
        maxCompilationTime: 60000, // 60 seconds
        maxTestTime: 120000, // 2 minutes
        maxFileSize: 1024 * 1024, // 1MB
        rateLimit: '100 requests per minute'
      }
    }

    return NextResponse.json(enhancedStatus)

  } catch (error) {
    return NextResponse.json({
      service: 'dappdojo-frontend',
      status: 'error',
      error: error instanceof Error ? error.message : 'Status check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Check Fly.io compilation service status
 */
async function checkFlyioStatus() {
  try {
    const startTime = Date.now()
    const client = getCompilationClient()
    const status = await client.getStatus()
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      responseTime,
      details: status,
      url: process.env.FLY_FOUNDRY_SERVICE_URL || 'not configured'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Fly.io service error',
      url: process.env.FLY_FOUNDRY_SERVICE_URL || 'not configured'
    }
  }
}

/**
 * Get service metrics for monitoring (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.backendAccessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access metrics
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Proxy to backend for metrics
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/api/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.backendAccessToken}`,
        },
      })

      if (backendResponse.ok) {
        const data = await backendResponse.json()
        return NextResponse.json(data)
      }
    } catch (backendError) {
      // Backend unavailable
    }

    // Fallback metrics without database
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    }

    return NextResponse.json(metrics)

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get metrics'
    }, { status: 500 })
  }
}
