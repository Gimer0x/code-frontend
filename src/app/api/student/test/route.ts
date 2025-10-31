import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'

/**
 * Proxy test execution requests to backend
 * GET: Get test history (delegate to backend)
 * POST: Run tests (proxy to backend)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.backendAccessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/student/test${params ? `?${params}` : ''}`

    const backendRes = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.backendAccessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await backendRes.json().catch(() => null)
    return NextResponse.json(data, { status: backendRes.status })
  } catch (error) {
    console.error('Test history proxy error:', error)
    return NextResponse.json({ error: 'Failed to get test history' }, { status: 500 })
  }
}

/**
 * Proxy test execution to backend
 * Backend automatically: saves code, compiles, runs tests, returns results
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.backendAccessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.text()
    const backendUrl = `${BACKEND_URL}/api/student/test`

    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.backendAccessToken}`,
        'Content-Type': 'application/json'
      },
      body
    })

    const data = await backendRes.json().catch(() => null)
    return NextResponse.json(data, { status: backendRes.status })
  } catch (error) {
    console.error('[API /api/student/test] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run tests'
    }, { status: 500 })
  }
}
