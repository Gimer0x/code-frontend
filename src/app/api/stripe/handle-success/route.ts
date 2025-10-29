import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (!checkoutSession.subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
    }

    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription as string)
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user subscription status
    const plan = checkoutSession.metadata?.plan as 'MONTHLY' | 'YEARLY'
    const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING'> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      canceled: 'CANCELED',
      past_due: 'PAST_DUE',
      incomplete: 'INACTIVE',
      incomplete_expired: 'INACTIVE',
      unpaid: 'INACTIVE',
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: plan || 'MONTHLY',
        subscriptionStatus: 'ACTIVE', // Immediate activation, no trial
        stripeCustomerId: checkoutSession.customer as string,
        stripeSubscriptionId: subscription.id,
        trialEndsAt: null, // No trial period
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription updated successfully',
      subscription: {
        plan: plan,
        status: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
