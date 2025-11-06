'use client'

import React from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { getTokens } from '@/lib/apiClient'

interface Lesson {
  id: string
  type: string
  title: string
  order: number
}

interface Module {
  id: string
  title: string
  description?: string
  order: number
  lessons: Lesson[]
}

interface Subscription {
  subscriptionPlan: string
  subscriptionStatus: string
}

export default function ModuleLessonsList({
  courseId,
  modules,
}: {
  courseId: string
  modules: Module[]
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set<string>(modules.length ? [modules[0].id] : []))
  const [subscription, setSubscription] = React.useState<Subscription | null>(null)
  const [loadingSubscription, setLoadingSubscription] = React.useState(true)
  const { data: session } = useSession()

  // Fetch subscription status from backend (only once)
  React.useEffect(() => {
    let cancelled = false
    
    async function fetchSubscription() {
      try {
        // Get backend access token
        const { accessToken } = getTokens()
        const sessionAny = session as any
        
        if (!accessToken && sessionAny?.backendAccessToken) {
          // Try to use session token if available
          const response = await fetch('/api/user-auth/subscription', {
            headers: {
              'Authorization': `Bearer ${sessionAny.backendAccessToken}`,
            },
          })
          
          if (response.ok && !cancelled) {
            const data = await response.json()
            if (data.success && data.subscription) {
              setSubscription({
                subscriptionPlan: data.subscription.plan || 'FREE',
                subscriptionStatus: data.subscription.status || 'INACTIVE',
              })
            }
          }
        } else if (accessToken) {
          const response = await fetch('/api/user/subscription', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })
          
          if (response.ok && !cancelled) {
            const data = await response.json()
            setSubscription(data)
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching subscription:', error)
        }
      } finally {
        if (!cancelled) {
          setLoadingSubscription(false)
        }
      }
    }

    fetchSubscription()
    
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(session as any)?.backendAccessToken]) // Only depend on token, not entire session object

  const toggle = (id: string) => {
    setExpanded(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  // Placeholder for completion gating if needed later
  const completedLessons = new Set<string>()

  // Check if user has paid subscription with active status
  const hasPaidAccess = subscription && 
    ['MONTHLY', 'YEARLY'].includes(subscription.subscriptionPlan) &&
    subscription.subscriptionStatus === 'ACTIVE'

  // Free users can only access first module
  const canAccessModule = (moduleIndex: number) => {
    if (loadingSubscription) return false // Don't show access until we know subscription status
    if (hasPaidAccess) return true // Paid users can access all modules
    return moduleIndex === 0 // Free users can only access first module
  }

  return (
    <div className="space-y-4">
      {modules.map((module, index) => {
        const completedInModule = module.lessons.filter(lesson => completedLessons.has(lesson.id)).length
        const totalLessons = module.lessons.length
        const isExpanded = expanded.has(module.id)
        const isFirstModule = index === 0
        const canAccess = canAccessModule(index)
        const needsUpgrade = !canAccess && !loadingSubscription

        return (
          <div key={module.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between p-4 cursor-pointer select-none" onClick={() => toggle(module.id)}>
              <div className="flex items-center gap-3">
                <button type="button" aria-label={isExpanded ? 'Collapse' : 'Expand'} className="text-gray-500 dark:text-gray-300">
                  {isExpanded ? '▼' : '▶'}
                </button>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Module {index + 1}: {module.title}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {completedInModule} of {totalLessons} completed
                </span>
                {needsUpgrade && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded-full">
                    Upgrade Required
                  </span>
                )}
                
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pt-0 pb-4">
                <div className="space-y-2">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const isCompleted = completedLessons.has(lesson.id)
                    const isLessonBlocked = !canAccess

                    const lessonContent = (
                      <div className={`flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded ${isLessonBlocked ? 'opacity-60' : ''}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-green-500'
                            : isLessonBlocked
                            ? 'bg-gray-200 dark:bg-gray-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}>
                          <span className={`text-xs ${
                            isCompleted
                              ? 'text-white'
                              : isLessonBlocked
                              ? 'text-gray-400 dark:text-gray-600'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}>
                            {lessonIndex + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${isLessonBlocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                            {lesson.title}
                          </span>
                          <span className={`ml-2 text-xs capitalize ${isLessonBlocked ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                            ({lesson.type})
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {lesson.type === 'intro' ? '📖' : lesson.type === 'quiz' ? '❓' : '💻'}
                        </div>
                      </div>
                    )

                    if (!isLessonBlocked) {
                      return (
                        <Link
                          key={lesson.id}
                          href={`/courses/${courseId}/modules/${module.id}/lessons/${lesson.id}`}
                          className="block hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors rounded"
                        >
                          {lessonContent}
                        </Link>
                      )
                    }

                    return (
                      <div key={lesson.id}>
                        {lessonContent}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


