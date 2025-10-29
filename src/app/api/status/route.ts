import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCompilationClient } from '@/lib/compilationClient'

/**
 * Service status endpoint for Railway deployment
 * Provides detailed information about all services and their status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Basic status for unauthenticated users
    const basicStatus = {
      service: 'dappdojo-api',
      status: 'active',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      deployment: {
        platform: 'railway',
        region: process.env.RAILWAY_REGION || 'unknown'
      }
    }

    // If not authenticated, return basic status
    if (!session) {
      return NextResponse.json(basicStatus)
    }

    // Enhanced status for authenticated users
    const enhancedStatus = {
      ...basicStatus,
      services: {
        database: await checkDatabaseStatus(),
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
      service: 'dappdojo-api',
      status: 'error',
      error: error instanceof Error ? error.message : 'Status check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Check database status and performance
 */
async function checkDatabaseStatus() {
  try {
    const startTime = Date.now()
    
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1`
    
    // Get some basic stats
    const [courseCount, userCount, progressCount] = await Promise.all([
      prisma.course.count(),
      prisma.user.count(),
      prisma.studentProgress.count()
    ])
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      responseTime,
      stats: {
        courses: courseCount,
        users: userCount,
        progressEntries: progressCount
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database error'
    }
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
 * Get service metrics for monitoring
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access metrics
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      database: await getDatabaseMetrics(),
      flyio: await getFlyioMetrics(),
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

/**
 * Get database metrics
 */
async function getDatabaseMetrics() {
  try {
    const [
      courseCount,
      userCount,
      progressCount,
      activeUsers,
      recentProgress
    ] = await Promise.all([
      prisma.course.count(),
      prisma.user.count(),
      prisma.studentProgress.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.studentProgress.count({
        where: {
          lastSavedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ])

    return {
      courses: courseCount,
      users: userCount,
      progressEntries: progressCount,
      activeUsers24h: activeUsers,
      recentProgress24h: recentProgress
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Database metrics failed' }
  }
}

/**
 * Get Fly.io service metrics
 */
async function getFlyioMetrics() {
  try {
    const client = getCompilationClient()
    const status = await client.getStatus()
    
    return {
      status: status.status,
      environment: status.environment,
      features: status.features,
      url: process.env.FLY_FOUNDRY_SERVICE_URL || 'not configured'
    }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Fly.io metrics failed',
      url: process.env.FLY_FOUNDRY_SERVICE_URL || 'not configured'
    }
  }
}
