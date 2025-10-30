import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

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
        // For frontend demo purposes, accept any credentials
        // In a real app, this would validate against a database
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Mock user for demo purposes
        return {
          id: 'demo-user-id',
          email: credentials.email,
          name: 'Demo User',
          role: 'STUDENT',
          isPremium: false,
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
    async jwt({ token, user, account }) {
      // On first sign-in with Google, exchange id_token with backend for app tokens
      if (account?.provider === 'google' && (account as any).id_token) {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'
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
      // Default: send users to home to pick a course; admins can navigate to dashboard
      return '/'
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
}