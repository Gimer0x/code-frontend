'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getTokens } from '@/lib/apiClient'

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started with Web3 development',
    features: [
      'Access to first module of all courses',
      'Basic learning materials',
      'Community support',
      'Limited lesson access'
    ],
    buttonText: 'Get Started Free',
    buttonVariant: 'outline',
    popular: false,
    plan: 'FREE'
  },
  {
    name: 'Monthly',
    price: '$19.99',
    period: 'per month',
    description: 'Unlimited access to all courses and features',
    features: [
      'Unlimited access to all courses',
      'All lessons and challenges',
      'Priority support',
      'Cancel anytime'
    ],
    buttonText: 'Subscribe Now',
    buttonVariant: 'default',
    popular: true,
    plan: 'MONTHLY'
  },
  {
    name: 'Yearly',
    price: '$199.99',
    period: 'per year',
    description: 'Best value with 2 months free',
    features: [
      'Unlimited access to all courses',
      'All lessons and challenges',
      'Priority support',
      'Save $40 compared to monthly',
      'Cancel anytime'
    ],
    buttonText: 'Subscribe Now',
    buttonVariant: 'default',
    popular: false,
    plan: 'YEARLY'
  }
]

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if user came back from canceled payment
  const canceled = searchParams?.get('canceled') === 'true'

  const handlePlanSelect = async (plan: string) => {
    if (authLoading) return

    setError(null)

    // If user not authenticated, redirect to signup
    if (!user) {
      // Store the selected plan in localStorage or URL param to continue after signup
      const returnUrl = `/pricing?plan=${plan}`
      router.push(`/auth/signup?returnUrl=${encodeURIComponent(returnUrl)}`)
      return
    }

    if (plan === 'FREE') {
      // For free plan, just redirect to courses
      router.push('/courses')
      return
    }

    setLoading(plan)
    
    try {
      // Get backend access token
      const { accessToken } = getTokens()

      if (!accessToken) {
        setError('Authentication required. Please sign in again.')
        setLoading(null)
        router.push('/auth/signin?callbackUrl=/pricing')
        return
      }

      // Start subscription checkout using new backend endpoint
      const response = await fetch('/api/user-auth/subscribe/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan: plan === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
          successUrl: `${window.location.origin}/billing/success`,
          cancelUrl: `${window.location.origin}/billing/cancel`,
        }),
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        // If JSON parsing fails, get text response
        const errorText = await response.text().catch(() => 'Unknown error')
        setError(`Server error: ${errorText}`)
        console.error('Failed to parse response:', errorText)
        return
      }


      if (!data.success) {
        // Handle different error codes
        switch (data.code) {
          case 'STRIPE_NOT_CONFIGURED':
            setError('Payment system is not configured. Please contact support.')
            console.error('Stripe not configured on backend. Check backend environment variables: STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY')
            break
          case 'USER_NOT_FOUND':
            setError('User session expired. Please log in again.')
            router.push('/auth/signin?callbackUrl=/pricing')
            break
          case 'AUTH_REQUIRED':
            setError('Authentication required. Please sign in again.')
            router.push('/auth/signin?callbackUrl=/pricing')
            break
          default:
            setError(data.error || 'Failed to start checkout. Please try again.')
            console.error('Unknown error code:', data.code, data)
        }
        return
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError('No checkout URL received. Please try again.')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(null)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Check if user returned from signup with a plan
  const planFromUrl = searchParams?.get('plan')

  // Auto-select plan after signup if user is now authenticated and plan is in URL
  useEffect(() => {
    if (!authLoading && user && planFromUrl && planFromUrl !== 'FREE') {
      // Small delay to ensure page is fully rendered
      setTimeout(() => {
        handlePlanSelect(planFromUrl)
      }, 500)
    }
  }, [user, authLoading, planFromUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Learning Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start your Web3 development journey with our comprehensive courses. 
            Get immediate access to all content with paid subscriptions.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="max-w-6xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Canceled message */}
        {canceled && (
          <div className="max-w-6xl mx-auto mb-6">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Payment was canceled. You can try again anytime.</span>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                plan.popular ? 'ring-2 ring-blue-600 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelect(plan.plan)}
                disabled={loading === plan.plan}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  plan.buttonVariant === 'outline'
                    ? 'border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : ''
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.plan ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What's included in the free plan?
              </h3>
              <p className="text-gray-600">
                The free plan gives you access to the first module of all courses, 
                allowing you to explore our content before committing to a paid plan.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can cancel your subscription at any time. 
                You'll continue to have access until the end of your billing period.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                When will I be charged?
              </h3>
              <p className="text-gray-600">
                You'll be charged immediately when you subscribe. 
                Your subscription will renew automatically at the end of each billing period.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee for all paid plans. 
                If you're not satisfied, contact us for a full refund.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
