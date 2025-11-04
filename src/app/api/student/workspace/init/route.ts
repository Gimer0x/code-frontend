import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
	try {
		const session: any = await getServerSession(authOptions)
		const authHeader = session?.backendAccessToken ? `Bearer ${session.backendAccessToken}` : request.headers.get('authorization') || undefined
		const body = await request.text()
		const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/student/workspace/init`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(authHeader ? { Authorization: authHeader } : {}),
			},
			body,
		})
		const data = await backendRes.json().catch(() => null)
		return NextResponse.json(data, { status: backendRes.status })
	} catch (error) {
		return NextResponse.json({ success: false, error: 'Workspace init failed' }, { status: 500 })
	}
}
