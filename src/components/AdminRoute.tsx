'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/contexts/AdminAuthContext'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAdminAuth()
  const router = useRouter()

  useEffect(() => {
    // Only check and redirect after loading is complete
    if (!loading) {
      if (!isAuthenticated || !isAdmin) {
        router.replace('/admin/login')
      } else {
      }
    }
  }, [isAuthenticated, isAdmin, loading, router])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  // Don't render children if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return null
  }

  return <>{children}</>
}
