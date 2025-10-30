// hooks/useAuth.ts
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getTokens, clearTokens, setTokens } from '@/lib/apiClient'
import { loginUser, registerUser, getProfile, googleLoginWithIdToken } from '@/lib/authClient'

type User = { id: string; email: string; name?: string; role: 'ADMIN' | 'STUDENT'; isPremium: boolean }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    try {
      const { accessToken } = getTokens()
      if (!accessToken) {
        setUser(null); setLoading(false); return
      }
      const res = await getProfile()
      if (res.success) setUser(res.user)
      else clearTokens()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginUser({ email, password })
    if (res.success) {
      setTokens(res.accessToken, res.refreshToken)
      await loadProfile()
    }
    return res
  }, [loadProfile])

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await registerUser({ email, password, name })
    if (res.success) {
      setTokens(res.accessToken, res.refreshToken)
      await loadProfile()
    }
    return res
  }, [loadProfile])

  const loginWithGoogleIdToken = useCallback(async (idToken: string) => {
    const res = await googleLoginWithIdToken(idToken)
    if (res.success) {
      setTokens(res.accessToken, res.refreshToken)
      await loadProfile()
    }
    return res
  }, [loadProfile])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'ADMIN'
  const isAuthenticated = !!user

  return useMemo(() => ({ user, loading, login, register, logout, isAdmin, isAuthenticated, loginWithGoogleIdToken }), [user, loading, login, register, logout, isAdmin, isAuthenticated, loginWithGoogleIdToken])
}


