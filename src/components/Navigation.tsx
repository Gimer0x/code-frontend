"use client"

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from 'next-auth/react'

export default function Navigation() {
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = async () => {
    try {
      // Clear backend tokens and NextAuth session
      logout()
      await signOut({ redirect: false })
    } catch {}
  }
  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              DappDojo
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              href="/pricing"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Pricing
            </Link>
            {!isAuthenticated ? (
              <>
                <Link
                  href="/auth/signin"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user?.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
