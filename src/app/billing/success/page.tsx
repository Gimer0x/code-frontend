'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getTokens } from '@/lib/apiClient'

export default function BillingSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifySubscription() {
      try {
        const { accessToken } = getTokens()

        if (!accessToken) {
          setError('Authentication required. Please sign in again.')
          setLoading(false)
          setTimeout(() => router.push('/auth/signin'), 3000)
          return
        }

        // Poll subscription status (webhook may take a moment to process)
        let attempts = 0
        const maxAttempts = 10 // Try for up to 20 seconds (2s * 10)
        
        while (attempts < maxAttempts) {
          // Wait a moment before checking (first check after 1s, then every 2s)
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

          // Check subscription status
          const response = await fetch('/api/user-auth/subscription', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })

          const data = await response.json()

          if (data.success && data.subscription) {
            const sub = data.subscription

            // Check if subscription is active - multiple ways to detect
            const isActive = 
              sub.hasActivePlan === true || 
              (sub.plan && sub.plan !== 'FREE' && 
               (sub.status === 'ACTIVE' || sub.status === 'TRIALING')) ||
              (sub.plan === 'MONTHLY' || sub.plan === 'YEARLY')

            if (isActive) {
              setSubscription(sub)
              setLoading(false)
              return
            } else if (attempts >= maxAttempts - 1) {
              // On last attempt, show subscription even if not fully active yet
              // This handles cases where webhook hasn't processed yet
              setSubscription(sub)
              setLoading(false)
              return
            }
          } else if (attempts >= maxAttempts - 1) {
            // On last attempt, show error
            setError(data.error || 'Subscription may still be processing. Please check back in a few moments.')
            setLoading(false)
            return
          }

          attempts++
        }

        // If we get here, we've exhausted attempts
        setError('Subscription is still being processed. Please check back in a few moments or contact support.')
        setLoading(false)
      } catch (error) {
        console.error('Error verifying subscription:', error)
        setError('Network error. Please check your subscription status manually.')
        setLoading(false)
      }
    }

    verifySubscription()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your subscription...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/pricing"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Pricing
          </Link>
        </div>
      </div>
    )
  }

  // Check if subscription is active (multiple ways to check)
  const isActive = subscription && (
    subscription.hasActivePlan === true || 
    (subscription.plan && subscription.plan !== 'FREE' && 
     (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING')) ||
    (subscription.plan === 'MONTHLY' || subscription.plan === 'YEARLY')
  )

  // If we have subscription data, consider it valid even if not strictly "active"
  // (payment might still be processing via webhook)
  const hasSubscription = subscription && (subscription.plan || subscription.status)


  if (subscription && isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-4">
            Your {subscription.plan} subscription is now active.
          </p>
          {subscription.endsAt && (
            <p className="text-sm text-gray-500 mb-6">
              Your subscription will renew on {new Date(subscription.endsAt).toLocaleDateString()}
            </p>
          )}
          <div className="space-y-3">
            <Link
              href="/courses"
              className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Learning
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // If we have subscription data but it's not active yet, show success message
  // (payment was processed, webhook might just be delayed)
  if (hasSubscription && !isActive) {
    // Check if plan is still FREE - this indicates webhook hasn't processed
    const isWebhookDelayed = subscription.plan === 'FREE' && subscription.status === 'ACTIVE'
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            {isWebhookDelayed ? (
              <svg className="w-16 h-16 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isWebhookDelayed ? 'Payment Received!' : 'Processing...'}
          </h1>
          <p className="text-gray-600 mb-4">
            {isWebhookDelayed 
              ? 'Your payment was successful, but your subscription is still being activated on our end.'
              : 'Your payment has been received and is being processed.'}
          </p>
          {isWebhookDelayed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>Note:</strong> Your subscription activation may take a few minutes to process.
              </p>
              <p className="text-xs text-yellow-700">
                You'll receive an email confirmation once your subscription is fully active. 
                If you don't see the change within 15 minutes, please contact support.
              </p>
            </div>
          )}
          <div className="space-y-3">
            <Link
              href="/courses"
              className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue to Courses
            </Link>
            <button
              onClick={async () => {
                setLoading(true)
                const { accessToken } = getTokens()
                if (accessToken) {
                  const response = await fetch('/api/user-auth/subscription', {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                  })
                  const data = await response.json()
                  if (data.success && data.subscription) {
                    setSubscription(data.subscription)
                  }
                }
                setLoading(false)
              }}
              className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Refresh Status
            </button>
            <Link
              href="/pricing"
              className="block w-full text-gray-600 hover:text-gray-800 text-sm underline"
            >
              Back to Pricing
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Still loading
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing...</h1>
        <p className="text-gray-600 mb-6">
          Your payment is being processed. This may take a few moments.
        </p>
        <Link
          href="/pricing"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Pricing
        </Link>
      </div>
    </div>
  )
}

