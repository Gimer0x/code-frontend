import { NextRequest } from 'next/server'

interface JWTPayload {
  userId: string
  email: string
  role: 'ADMIN' | 'STUDENT'
  iat: number
  exp: number
}

export async function verifyJWT(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    
    // In a real implementation, you would verify the JWT signature here
    // For now, we'll make a request to the backend to verify the token
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (!data.success) {
      return null
    }

    return {
      userId: data.user.id,
      email: data.user.email,
      role: data.user.role,
      iat: 0, // Not needed for our use case
      exp: 0  // Not needed for our use case
    }
  } catch (error) {
    return null
  }
}

export async function requireAuth(request: NextRequest): Promise<{ success: boolean; user?: JWTPayload; error?: string }> {
  const user = await verifyJWT(request)
  
  if (!user) {
    return {
      success: false,
      error: 'Authentication required'
    }
  }

  return {
    success: true,
    user
  }
}

export async function requireAdmin(request: NextRequest): Promise<{ success: boolean; user?: JWTPayload; error?: string }> {
  const authResult = await requireAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  if (authResult.user?.role !== 'ADMIN') {
    return {
      success: false,
      error: 'Admin access required'
    }
  }

  return authResult
}
