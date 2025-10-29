'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Mock courses data
const mockCourses = [
  {
    id: '1',
    title: 'Solidity Fundamentals',
    description: 'Learn the basics of Solidity programming language',
    level: 'BEGINNER',
    language: 'Solidity',
    thumbnail: '/uploads/thumbnails/placeholder.svg',
    modules: [
      {
        id: '1',
        title: 'Introduction to Solidity',
        lessons: [
          { id: '1', title: 'What is Solidity?', type: 'INTRO' },
          { id: '2', title: 'Setting up your environment', type: 'INTRO' },
          { id: '3', title: 'Your first smart contract', type: 'CHALLENGE' },
        ]
      },
      {
        id: '2',
        title: 'Variables and Data Types',
        lessons: [
          { id: '4', title: 'Understanding data types', type: 'INTRO' },
          { id: '5', title: 'State variables', type: 'INTRO' },
          { id: '6', title: 'Local variables', type: 'CHALLENGE' },
        ]
      },
      {
        id: '3',
        title: 'Functions and Modifiers',
        lessons: [
          { id: '7', title: 'Function basics', type: 'INTRO' },
          { id: '8', title: 'Function modifiers', type: 'INTRO' },
          { id: '9', title: 'Advanced functions', type: 'CHALLENGE' },
        ]
      }
    ]
  },
  {
    id: '2',
    title: 'Advanced Smart Contract Development',
    description: 'Master advanced concepts in smart contract development',
    level: 'ADVANCED',
    language: 'Solidity',
    thumbnail: '/uploads/thumbnails/placeholder.svg',
    modules: [
      {
        id: '4',
        title: 'Security Best Practices',
        lessons: [
          { id: '10', title: 'Common vulnerabilities', type: 'INTRO' },
          { id: '11', title: 'Reentrancy attacks', type: 'INTRO' },
          { id: '12', title: 'Secure coding patterns', type: 'CHALLENGE' },
        ]
      },
      {
        id: '5',
        title: 'Gas Optimization',
        lessons: [
          { id: '13', title: 'Understanding gas', type: 'INTRO' },
          { id: '14', title: 'Optimization techniques', type: 'INTRO' },
          { id: '15', title: 'Advanced optimization', type: 'CHALLENGE' },
        ]
      }
    ]
  },
  {
    id: '3',
    title: 'DeFi Protocol Development',
    description: 'Build decentralized finance protocols from scratch',
    level: 'ADVANCED',
    language: 'Solidity',
    thumbnail: '/uploads/thumbnails/placeholder.svg',
    modules: [
      {
        id: '6',
        title: 'AMM Development',
        lessons: [
          { id: '16', title: 'Understanding AMMs', type: 'INTRO' },
          { id: '17', title: 'Building a DEX', type: 'CHALLENGE' },
          { id: '18', title: 'Liquidity pools', type: 'CHALLENGE' },
        ]
      }
    ]
  }
]

export default function CoursesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userSubscription, setUserSubscription] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/courses')
      return
    }

    if (session?.user?.email) {
      // Fetch user subscription status
      fetchUserSubscription()
      
      // Handle successful payment
      const sessionId = searchParams.get('session_id')
      if (searchParams.get('success') === 'true' && sessionId) {
        handlePaymentSuccess(sessionId)
      }
    }
  }, [session, status, router, searchParams])

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      const response = await fetch('/api/stripe/handle-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      if (response.ok) {
        // Refresh subscription status
        await fetchUserSubscription()
        console.log('Payment success handled')
      } else {
        console.error('Failed to handle payment success')
      }
    } catch (error) {
      console.error('Error handling payment success:', error)
    }
  }

  const fetchUserSubscription = async () => {
    try {
      const response = await fetch('/api/user/subscription')
      if (response.ok) {
        const data = await response.json()
        setUserSubscription(data)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    }
  }

  const canAccessLesson = (courseId: string, moduleId: string, lessonId: string) => {
    if (!userSubscription) {
      console.log('No user subscription found')
      return false
    }
    
    console.log('User subscription:', userSubscription)
    
    // Free users can only access first module of any course
    if (userSubscription.subscriptionPlan === 'FREE') {
      const course = mockCourses.find(c => c.id === courseId)
      if (course && course.modules[0]?.id === moduleId) {
        return true
      }
      return false
    }
    
    // Paid users have unlimited access (ACTIVE status only)
    const hasPaidAccess = ['MONTHLY', 'YEARLY'].includes(userSubscription.subscriptionPlan)
    const isActiveStatus = userSubscription.subscriptionStatus === 'ACTIVE'
    
    console.log('Access check:', { hasPaidAccess, isActiveStatus, plan: userSubscription.subscriptionPlan, status: userSubscription.subscriptionStatus })
    
    return hasPaidAccess && isActiveStatus
  }

  const getAccessMessage = (courseId: string, moduleId: string) => {
    if (!userSubscription) return 'Please log in to access courses'
    
    if (userSubscription.subscriptionPlan === 'FREE') {
      const course = mockCourses.find(c => c.id === courseId)
      if (course && course.modules[0]?.id === moduleId) {
        return 'Free access'
      }
      return 'Upgrade to access this module'
    }
    
    // Check if user has paid access and active status
    const hasPaidAccess = ['MONTHLY', 'YEARLY'].includes(userSubscription.subscriptionPlan)
    const isActiveStatus = userSubscription.subscriptionStatus === 'ACTIVE'
    
    if (hasPaidAccess && isActiveStatus) {
      return 'Full access'
    }
    
    return 'Upgrade to access this module'
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Courses</h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {user?.name || user?.email || 'Guest'}!
              </p>
            </div>
            <div className="text-right">
              {userSubscription && (
                <div className="text-sm text-gray-600">
                  <div className="font-medium">
                    Plan: {userSubscription.subscriptionPlan}
                  </div>
                  <div className="text-xs text-gray-500">
                    Status: {userSubscription.subscriptionStatus}
                  </div>
                  {userSubscription.subscriptionEndsAt && (
                    <div className="text-blue-600">
                      Next billing: {new Date(userSubscription.subscriptionEndsAt).toLocaleDateString()}
                    </div>
                  )}
                  <button
                    onClick={fetchUserSubscription}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Refresh Status
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success/Cancel Messages */}
      {searchParams.get('success') === 'true' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Payment Successful!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Your subscription is now active. Enjoy unlimited access to all courses!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {searchParams.get('canceled') === 'true' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Payment Canceled
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Your payment was canceled. You can try again anytime.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {course.level}
                  </span>
                  <span className="text-sm text-gray-500">{course.language}</span>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {course.title}
                </h3>
                
                <p className="text-gray-600 mb-4">{course.description}</p>
                
                <div className="space-y-3">
                  {course.modules.map((module, moduleIndex) => (
                    <div key={module.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          Module {moduleIndex + 1}: {module.title}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          canAccessLesson(course.id, module.id, module.lessons[0]?.id)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getAccessMessage(course.id, module.id)}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className={`flex items-center text-sm ${
                              canAccessLesson(course.id, module.id, lesson.id)
                                ? 'text-gray-700'
                                : 'text-gray-400'
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2">
                              {lessonIndex + 1}
                            </span>
                            <span className="flex-1">{lesson.title}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {lesson.type}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {canAccessLesson(course.id, module.id, module.lessons[0]?.id) ? (
                        <Link
                          href={`/courses/${course.id}/modules/${module.id}`}
                          className="mt-2 inline-block text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Start Module →
                        </Link>
                      ) : (
                        <Link
                          href="/pricing"
                          className="mt-2 inline-block text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Upgrade to Access →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
