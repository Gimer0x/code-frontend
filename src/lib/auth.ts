import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

// In development, always use http://localhost:3000 for NEXTAUTH_URL
// This ensures the OAuth redirect URI matches what's configured in Google Cloud Console
// The redirect URI format is: {NEXTAUTH_URL}/api/auth/callback/google
if (process.env.NODE_ENV === 'development') {
  // Force http (not https) for localhost
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
      authorization: { params: { scope: 'openid email profile' } },
      idToken: true,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Authenticate with backend first
          const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
          const res = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          })
          const data = await res.json()
          
          if (data?.success) {
            // Return user with backend tokens stored in user object
            return {
              id: data.user?.id || 'unknown',
              email: data.user?.email || credentials.email,
              name: data.user?.name || 'User',
              role: data.user?.role || 'STUDENT',
              isPremium: !!data.user?.isPremium,
              backendAccessToken: data.accessToken,
              backendRefreshToken: data.refreshToken,
            }
          } else {
            // Authentication failed
            return null
          }
        } catch (error) {
          // Network error or other exception
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow all sign-ins for demo purposes
      return true
    },
    async jwt({ token, user, account, trigger, session }) {
      // Handle credentials sign-in - backend tokens are already in user object from authorize
      if (account?.provider === 'credentials' && user && (user as any).backendAccessToken) {
        token.backendAccessToken = (user as any).backendAccessToken
        token.backendRefreshToken = (user as any).backendRefreshToken
        token.id = (user as any).id || token.sub
        token.role = (user as any).role || 'STUDENT'
        token.isPremium = !!(user as any).isPremium
        token.user = user
        token.backendAuthStatus = 'ok'
      }

      // On first sign-in with Google, exchange id_token with backend for app tokens
      if (account?.provider === 'google' && (account as any).id_token) {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
          const res = await fetch(`${backendUrl}/api/user-auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: (account as any).id_token })
          })
          const data = await res.json()
          if (data?.success) {
            token.backendAccessToken = data.accessToken
            token.backendRefreshToken = data.refreshToken
            token.id = data.user?.id || token.sub
            token.role = data.user?.role || 'STUDENT'
            token.isPremium = !!data.user?.isPremium
            token.user = data.user || null
            token.backendAuthStatus = 'ok'
          }
          else {
            token.backendAuthStatus = 'error'
            token.backendAuthError = data?.error || `status_${res.status}`
          }
        } catch (e) {
          // swallow and proceed with NextAuth session only
          token.backendAuthStatus = 'exception'
          token.backendAuthError = (e as Error)?.message || 'unknown_error'
        }
      } else if (account?.provider === 'google' && !(account as any).id_token) {
        // Diagnostics if id_token is missing from Google account payload
        token.backendAuthStatus = 'missing_id_token'
        token.backendAuthError = 'Google account.id_token not present'
      }

      // Ensure defaults
      if (user && !token.user) {
        token.id = (user as any).id || token.sub
        token.role = (user as any).role || 'STUDENT'
        token.isPremium = (user as any).isPremium || false
        token.user = user
      }

      return token as any
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.isPremium = token.isPremium as boolean
        ;(session as any).backendAccessToken = (token as any).backendAccessToken
        ;(session as any).backendRefreshToken = (token as any).backendRefreshToken
        ;(session as any).backendAuthStatus = (token as any).backendAuthStatus
        ;(session as any).backendAuthError = (token as any).backendAuthError
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // In development, ensure we always redirect to localhost (not production)
      const isDevelopment = process.env.NODE_ENV === 'development'
      const localBaseUrl = 'http://localhost:3000'
      
      // If url is the baseUrl or signin page, redirect to home
      if (url === baseUrl || url === `${baseUrl}/auth/signin` || url === `${baseUrl}/auth/signin?error=OAuthCallback`) {
        return isDevelopment ? `${localBaseUrl}/` : `${baseUrl}/`
      }
      
      // If url is a relative path, make it absolute using the correct base URL
      if (url.startsWith('/')) {
        return isDevelopment ? `${localBaseUrl}${url}` : `${baseUrl}${url}`
      }
      
      // If url is an absolute URL, check if we need to replace the origin
      try {
        const urlObj = new URL(url)
        // In development, replace any production URL with localhost
        if (isDevelopment && urlObj.origin !== localBaseUrl) {
          return `${localBaseUrl}${urlObj.pathname}${urlObj.search}${urlObj.hash}`
        }
        // If same origin, allow it
        if (urlObj.origin === baseUrl || urlObj.origin === localBaseUrl) {
          return url
        }
      } catch {
        // Invalid URL, fall through to default
      }
      
      // Default: send users to home
      return isDevelopment ? `${localBaseUrl}/` : `${baseUrl}/`
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
}