import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan

  if (!userId || !plan) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Update user subscription status (no trial period)
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan as 'MONTHLY' | 'YEARLY',
      subscriptionStatus: 'ACTIVE',
      stripeSubscriptionId: session.subscription as string,
      trialEndsAt: null, // No trial period
    },
  })

  console.log(`User ${userId} started ${plan} subscription (immediate activation)`)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const plan = subscription.metadata?.plan

  if (!userId || !plan) {
    console.error('Missing metadata in subscription')
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan as 'MONTHLY' | 'YEARLY',
      subscriptionStatus: 'ACTIVE', // Immediate activation, no trial
      stripeSubscriptionId: subscription.id,
      trialEndsAt: null, // No trial period
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
    },
  })

  console.log(`Subscription created for user ${userId} (immediate activation)`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING'> = {
    active: 'ACTIVE',
    canceled: 'CANCELED',
    past_due: 'PAST_DUE',
    trialing: 'TRIALING',
    incomplete: 'INACTIVE',
    incomplete_expired: 'INACTIVE',
    unpaid: 'INACTIVE',
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: statusMap[subscription.status] || 'INACTIVE',
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
    },
  })

  console.log(`Subscription updated for user ${userId}: ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: 'FREE',
      subscriptionStatus: 'CANCELED',
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
    },
  })

  console.log(`Subscription canceled for user ${userId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'ACTIVE',
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
    },
  })

  console.log(`Payment succeeded for user ${userId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'PAST_DUE',
    },
  })

  console.log(`Payment failed for user ${userId}`)
}
