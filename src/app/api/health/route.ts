import { NextRequest, NextResponse } from 'next/server'
import { getCompilationClient } from '@/lib/compilationClient'
import { getConfigurationSummary } from '@/lib/config-validator'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Health check endpoint for deployment
 * Checks Fly.io service status and optionally backend health
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        flyio: { status: 'unknown', responseTime: 0 },
        backend: { status: 'unknown', responseTime: 0 }
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      configuration: getConfigurationSummary()
    }

    // Check backend health (if available)
    try {
      const backendStart = Date.now()
      const backendResponse = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const backendTime = Date.now() - backendStart
      
      if (backendResponse.ok) {
        const backendHealth = await backendResponse.json()
        health.services.backend = {
          status: 'healthy',
          responseTime: backendTime,
          details: backendHealth
        }
      } else {
        health.services.backend = {
          status: 'unhealthy',
          responseTime: backendTime,
          error: 'Backend health check failed'
        }
        health.status = 'degraded'
      }
    } catch (error) {
      health.services.backend = {
        status: 'unknown',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Backend unavailable'
      }
      // Don't mark as degraded if backend is just unavailable
    }

    // Check Fly.io compilation service
    try {
      const flyioStart = Date.now()
      const client = getCompilationClient()
      const flyioStatus = await client.healthCheck()
      const flyioTime = Date.now() - flyioStart
      
      health.services.flyio = {
        status: 'healthy',
        responseTime: flyioTime,
        details: flyioStatus
      }
    } catch (error) {
      health.services.flyio = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Fly.io service unavailable'
      }
      health.status = 'degraded'
    }

    const totalTime = Date.now() - startTime
    health.responseTime = totalTime

    // Determine overall status
    if (health.services.flyio.status === 'unhealthy') {
      health.status = 'unhealthy'
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 503 })
  }
}

/**
 * Simple ping endpoint for load balancer health checks
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
