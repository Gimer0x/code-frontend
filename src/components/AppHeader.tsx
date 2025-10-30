'use client'

import Navigation from '@/components/Navigation'
import { usePathname } from 'next/navigation'

export default function AppHeader() {
  const pathname = usePathname()

  // Hide header on lesson/challenge pages
  // Matches: /courses/[id]/modules/[moduleId]/lessons/[lessonId]
  const hideOnLessonPage = /^\/courses\/[^/]+\/modules\/[^/]+\/lessons\/[^/]+/.test(pathname || '')

  if (hideOnLessonPage) return null

  return <Navigation />
}


