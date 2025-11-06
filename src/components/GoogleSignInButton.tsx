'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

declare global {
  interface Window {
    google?: any
  }
}

interface GoogleSignInButtonProps {
  className?: string
  text?: 'signin_with' | 'continue_with' | 'signup_with'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
}

export default function GoogleSignInButton({
  className,
  text = 'signin_with',
  theme = 'outline',
  size = 'large'
}: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuth()
  const btnRef = useRef<HTMLDivElement | null>(null)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  const initializedRef = useRef(false)
  const [isExchanging, setIsExchanging] = useState(false)

  useEffect(() => {
    if (!clientId) return

    function init() {
      if (!window.google?.accounts?.id) return
      if (initializedRef.current || (window as any).__gisInitialized) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          const idToken = response?.credential
          if (!idToken) return
          if (isExchanging) return
          try {
            setIsExchanging(true)
            await loginWithGoogle(idToken)
          } finally {
            setIsExchanging(false)
          }
        }
      })

      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          type: 'standard',
          theme,
          size,
          text,
          shape: 'rectangular'
        })
      }
      // Optional One Tap: avoid multiple concurrent prompts
      try {
        window.google.accounts.id.prompt((notification: any) => {
          // Only allow prompt if not displayed elsewhere
          if (notification?.isNotDisplayed() || notification?.isSkippedMoment()) {
            // no-op
          }
        })
      } catch {}

      initializedRef.current = true
      ;(window as any).__gisInitialized = true
    }

    // If script already loaded
    if (window.google?.accounts?.id) {
      init()
      return
    }

    // Fallback: wait for script
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval)
        init()
      }
    }, 200)

    return () => clearInterval(interval)
  }, [clientId, loginWithGoogle, isExchanging])

  return (
    <div className={className}>
      <div ref={btnRef} id="googleSignInDiv" />
    </div>
  )
}


