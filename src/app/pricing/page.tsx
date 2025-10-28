'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handlePlanSelect = async (plan: string) => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin?callbackUrl=/pricing')
      return
    }

    if (plan === 'FREE') {
      // For free plan, just redirect to courses
      router.push('/courses')
      return
    }

    setLoading(plan)
    
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan === 'MONTHLY' ? 'price_monthly' : 'price_yearly',
          plan: plan,
        }),
      })

      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

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
