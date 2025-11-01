'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getSession, signOut, useSession } from 'next-auth/react'
import { authService } from '@/lib/auth-service'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'STUDENT'
  isPremium: boolean
  photoUrl?: string
  createdAt: string
  updatedAt: string
  subscriptionPlan?: string
  subscriptionStatus?: string
  trialEndsAt?: string | null
  subscriptionEndsAt?: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; message?: string; error?: string }>
  register: (userData: { email: string; password: string; name: string; role?: 'ADMIN' | 'STUDENT' }) => Promise<{ success: boolean; message?: string; error?: string }>
  loginWithGoogle: (idToken: string) => Promise<{ success: boolean; message?: string; error?: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session, status } = useSession()

  // Bootstrap auth state from existing backend tokens or from NextAuth session
  const bootstrap = React.useCallback(async () => {
    // Case 1: tokens already exist locally
    if (authService.isAuthenticated()) {
      try {
        const data = await authService.getProfile()
        if (data.success) {
          setUser(data.user)
          setLoading(false)
          return
        }
      } catch {}
      authService.logout()
    }

    // Case 2: user logged in via NextAuth (Google or credentials), adopt backend tokens from session
    try {
      const currentSession: any = session || await getSession()
      if (currentSession?.backendAccessToken && currentSession?.backendRefreshToken) {
        authService.setTokens(currentSession.backendAccessToken, currentSession.backendRefreshToken)
        const data = await authService.getProfile()
        if (data.success) {
          setUser(data.user)
        }
      } else if (currentSession?.user && !authService.isAuthenticated()) {
        // Session exists but no backend tokens - might be credentials sign-in without backend auth
        // In this case, we'd need to authenticate with backend, but for now just show NextAuth user
        // For credentials sign-in, backend tokens should be set during sign-in
        // If tokens aren't there, we should handle it differently
      }
    } catch {}
    setLoading(false)
  }, [session])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // Listen for session changes (when user signs in/out)
  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Session is available, refresh auth state
      bootstrap()
    } else if (status === 'unauthenticated') {
      // No session, clear user if not authenticated via tokens
      if (!authService.isAuthenticated()) {
        setUser(null)
        setLoading(false)
      }
    }
  }, [status, session, bootstrap])

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const result = await authService.login(credentials)
      if (result.success) {
        setUser(result.user)
      }
      return result
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' }
    }
  }

  const register = async (userData: { email: string; password: string; name: string; role?: 'ADMIN' | 'STUDENT' }) => {
    try {
      const result = await authService.register(userData)
      if (result.success) {
        setUser(result.user)
      }
      return result
    } catch (error) {
      return { success: false, error: 'Registration failed. Please try again.' }
    }
  }

  const loginWithGoogle = async (idToken: string) => {
    try {
      const result = await authService.googleLogin(idToken)
      if (result.success) {
        setUser(result.user)
      }
      return result
    } catch (error) {
      return { success: false, error: 'Google login failed. Please try again.' }
    }
  }

  const logout = async () => {
    authService.logout()
    setUser(null)
    
    // Also clear NextAuth session if it exists
    try {
      await signOut({ redirect: false })
    } catch {}
    
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.disableAutoSelect()
      } catch {}
    }
  }

  const refreshUser = async () => {
    if (authService.isAuthenticated()) {
      try {
        const data = await authService.getProfile()
        if (data.success) {
          setUser(data.user)
        } else {
          logout()
        }
      } catch {
        logout()
      }
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
