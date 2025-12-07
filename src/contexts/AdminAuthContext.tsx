'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { authService } from '@/lib/auth-service'

interface AdminUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'STUDENT'
  isPremium: boolean
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

interface AdminAuthContextType {
  user: AdminUser | null
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; message?: string; error?: string; user?: AdminUser }>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Bootstrap admin auth from existing tokens
  const bootstrap = useCallback(async () => {

    if (!authService.isAuthenticated()) {
      setLoading(false)
      return
    }

    try {
      const data = await authService.getProfile()
      if (data.success && data.user) {
        // Only set user if they are admin
        if (data.user.role === 'ADMIN') {
          setUser(data.user as AdminUser)
        } else {
          // Not admin - clear tokens
          authService.logout()
        }
      } else {
        // Profile fetch failed - clear tokens
        authService.logout()
      }
    } catch (error) {
      // Error fetching profile - clear tokens
      authService.logout()
      if (process.env.NODE_ENV === 'development') {
        console.error('AdminAuth: Error fetching profile', error)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Bootstrap on mount
  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const result = await authService.login(credentials)
      if (result.success) {
        // Fetch profile to get user data including role
        try {
          const profileData = await authService.getProfile()
          if (profileData.success && profileData.user) {
            // Only allow admin users
            if (profileData.user.role === 'ADMIN') {
              setUser(profileData.user as AdminUser)
              return { success: true, user: profileData.user as AdminUser }
            } else {
              // Not admin - clear tokens and return error
              authService.logout()
              return { success: false, error: 'Admin access required. Please contact an administrator.' }
            }
          } else {
            // Profile fetch failed
            authService.logout()
            return { success: false, error: 'Failed to fetch user profile. Please try again.' }
          }
        } catch (error) {
          authService.logout()
          return { success: false, error: 'Failed to fetch user profile. Please try again.' }
        }
      }
      return result
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' }
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const refreshUser = async () => {
    if (!authService.isAuthenticated()) {
      setUser(null)
      return
    }

    try {
      const data = await authService.getProfile()
      if (data.success && data.user && data.user.role === 'ADMIN') {
        setUser(data.user as AdminUser)
      } else {
        // Not admin or fetch failed - logout
        logout()
      }
    } catch {
      logout()
    }
  }

  const isAuthenticated = !!user && user.role === 'ADMIN'
  const isAdmin = !!user && user.role === 'ADMIN'

  const value: AdminAuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    refreshUser
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

