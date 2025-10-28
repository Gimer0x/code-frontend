import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user,
      accessInfo: {
        canAccessAllModules: ['MONTHLY', 'YEARLY'].includes(user.subscriptionPlan),
        canAccessFirstModule: user.subscriptionPlan === 'FREE' || ['MONTHLY', 'YEARLY'].includes(user.subscriptionPlan),
        isTrialActive: user.subscriptionStatus === 'TRIALING',
        isSubscriptionActive: ['ACTIVE', 'TRIALING'].includes(user.subscriptionStatus),
      }
    })
  } catch (error) {
    console.error('Error fetching user status:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
