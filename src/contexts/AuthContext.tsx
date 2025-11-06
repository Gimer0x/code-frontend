'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { signOut, useSession } from 'next-auth/react'
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
  register: (userData: { email: string; password: string; name: string; role?: 'ADMIN' | 'STUDENT' }) => Promise<{ success: boolean; message?: string; error?: string }>
  loginWithGoogle: (idToken: string) => Promise<{ success: boolean; message?: string; error?: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session, status } = useSession()
  
  // Wrapper to log when user is set/cleared
  const setUser = React.useCallback((newUser: User | null) => {
    if (process.env.NODE_ENV === 'development') {
      const stack = new Error().stack
      console.log('setUser called:', {
        newUser: newUser ? { role: newUser.role, email: newUser.email } : null,
        stack: stack?.split('\n').slice(2, 5).join('\n')
      })
    }
    setUserState(newUser)
  }, [])

  // Bootstrap auth state from existing backend tokens or from NextAuth session
  // Use a ref to check current user state to avoid dependency issues
  const userRef = React.useRef(user)
  useEffect(() => {
    userRef.current = user
    if (process.env.NODE_ENV === 'development') {
      console.log('userRef updated:', { user: user ? { role: user.role, email: user.email } : null })
    }
  }, [user])
  
  const bootstrap = React.useCallback(async () => {
    // Only bootstrap from NextAuth session - users authenticate via NextAuth
    // Admin authentication is handled by AdminAuthContext
    if (status === 'loading') {
      return // Wait for session to load
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('UserAuth: Bootstrap - checking NextAuth session', { status })
    }
    
    try {
      const currentSession: any = session
      if (currentSession?.backendAccessToken && currentSession?.backendRefreshToken) {
        // User logged in via NextAuth (Google or credentials) - adopt backend tokens from session
        authService.setTokens(currentSession.backendAccessToken, currentSession.backendRefreshToken)
        const data = await authService.getProfile()
        if (data.success) {
          setUser(data.user)
          if (process.env.NODE_ENV === 'development') {
            console.log('UserAuth: User loaded from NextAuth session', { userRole: data.user.role })
          }
        }
      } else if (currentSession?.user) {
        // Session exists but no backend tokens - use NextAuth user data
        // This might happen if backend auth failed during sign-in
        if (process.env.NODE_ENV === 'development') {
          console.log('UserAuth: Using NextAuth user without backend tokens')
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('UserAuth: Bootstrap error', error)
      }
    } finally {
      setLoading(false)
    }
  }, [session, status])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // Listen for session changes (when user signs in/out via NextAuth)
  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Session is available, refresh auth state
      bootstrap()
    } else if (status === 'unauthenticated') {
      // No NextAuth session - clear user
      // Users authenticate via NextAuth, so if session is gone, user should be cleared
      if (process.env.NODE_ENV === 'development') {
        console.log('UserAuth: Session unauthenticated, clearing user')
      }
      setUser(null)
      setLoading(false)
    }
  }, [status, session, bootstrap])

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

  // Compute isAuthenticated and isAdmin from user state
  // This ensures they update immediately when user changes
  const isAuthenticated = !!user
  const isAdmin = user?.role === 'ADMIN'
  
  const value: AuthContextType = {
    user,
    loading,
    register,
    loginWithGoogle,
    logout,
    isAuthenticated,
    isAdmin,
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
