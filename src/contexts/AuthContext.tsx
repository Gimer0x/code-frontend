'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getSession, signOut } from 'next-auth/react'
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

  useEffect(() => {
    // Bootstrap auth state from existing backend tokens or from NextAuth session (Google OAuth)
    async function bootstrap() {
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

      // Case 2: user just logged in via NextAuth Google, adopt backend tokens from session
      try {
        const session: any = await getSession()
        if (session?.backendAccessToken && session?.backendRefreshToken) {
          authService.setTokens(session.backendAccessToken, session.backendRefreshToken)
          const data = await authService.getProfile()
          if (data.success) {
            setUser(data.user)
          }
        }
      } catch {}
      setLoading(false)
    }

    bootstrap()
  }, [])

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
