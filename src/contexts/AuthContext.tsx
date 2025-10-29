'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    if (authService.isAuthenticated()) {
      authService.getProfile()
        .then(data => {
          if (data.success) {
            setUser(data.user)
          } else {
            authService.logout()
            setUser(null)
          }
        })
        .catch(() => {
          authService.logout()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
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

  const logout = () => {
    authService.logout()
    setUser(null)
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
