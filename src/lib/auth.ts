import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
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
      // Mock user data for demo purposes
      if (user) {
        token.id = user.id
        token.role = 'STUDENT'
        token.isPremium = false
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.isPremium = token.isPremium as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
}