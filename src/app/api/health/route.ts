import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCompilationClient } from '@/lib/compilationClient'
import { getConfigurationSummary } from '@/lib/config-validator'

/**
 * Health check endpoint for Railway deployment
 * Checks database connectivity and Fly.io service status
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'unknown', responseTime: 0 },
        flyio: { status: 'unknown', responseTime: 0 }
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      configuration: getConfigurationSummary()
    }

    // Check database connectivity
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const dbTime = Date.now() - dbStart
      
      health.services.database = {
        status: 'healthy',
        responseTime: dbTime
      }
    } catch (error) {
      health.services.database = {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Database connection failed'
      }
      health.status = 'degraded'
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
    if (health.services.database.status === 'unhealthy') {
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
