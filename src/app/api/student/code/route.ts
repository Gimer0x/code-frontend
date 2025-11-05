import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/auth-utils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


/**
 * Save student code
 */
export async function POST(request: NextRequest) {
  // Backward compatibility: forward POST as PUT to backend
  try {
    const session: any = await getServerSession(authOptions)
    const authHeader = session?.backendAccessToken ? `Bearer ${session.backendAccessToken}` : request.headers.get('authorization') || undefined
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Missing Authorization' }, { status: 401 })
    }
    const body = await request.text()
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/code`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body,
    })
    const text = await backendRes.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
    return NextResponse.json(data ?? {}, { status: backendRes.status })
  } catch (error) {
    return createErrorResponse('Failed to save code', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    const authHeader = session?.backendAccessToken ? `Bearer ${session.backendAccessToken}` : request.headers.get('authorization') || undefined
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Missing Authorization' }, { status: 401 })
    }
    const body = await request.text()
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/code`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body,
    })
    const text = await backendRes.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
    return NextResponse.json(data ?? {}, { status: backendRes.status })
  } catch (error) {
    return createErrorResponse('Failed to save code', 500)
  }
}

/**
 * Load student code
 */
export async function GET(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    const authHeader = session?.backendAccessToken ? `Bearer ${session.backendAccessToken}` : request.headers.get('authorization') || undefined
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Missing Authorization' }, { status: 401 })
    }
    const url = new URL(request.url)
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/code${url.search}`, {
      headers: { Authorization: authHeader },
    })
    const text = await backendRes.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
    return NextResponse.json(data ?? {}, { status: backendRes.status })
  } catch (error) {
    return createErrorResponse('Failed to load code', 500)
  }
}

/**
 * Delete student code
 */
export async function DELETE(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    const authHeader = session?.backendAccessToken ? `Bearer ${session.backendAccessToken}` : request.headers.get('authorization') || undefined
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Missing Authorization' }, { status: 401 })
    }
    const url = new URL(request.url)
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/code${url.search}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    })
    const text = await backendRes.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
    return NextResponse.json(data ?? {}, { status: backendRes.status })
  } catch (error) {
    return createErrorResponse('Failed to delete code', 500)
  }
}
