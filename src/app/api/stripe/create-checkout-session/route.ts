import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Price IDs from environment variables
const PRICE_IDS = {
  MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly_mock',
  YEARLY: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly_mock',
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, plan } = await request.json()

    if (!priceId || !plan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has an active subscription
    if (user.subscriptionPlan !== 'FREE' && user.subscriptionStatus === 'ACTIVE') {
      return NextResponse.json({ 
        error: 'User already has an active subscription' 
      }, { status: 400 })
    }

    let stripeCustomerId = user.stripeCustomerId

    // Create Stripe customer if doesn't exist or if existing customer is invalid
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      })
      stripeCustomerId = customer.id

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId }
      })
    } else {
      // Verify the existing customer exists in Stripe
      try {
        await stripe.customers.retrieve(stripeCustomerId)
      } catch (error) {
        console.log('Existing customer not found, creating new one:', stripeCustomerId)
        // Customer doesn't exist, create a new one
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            userId: user.id,
          },
        })
        stripeCustomerId = customer.id

        // Update user with new Stripe customer ID
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId }
        })
      }
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[plan as keyof typeof PRICE_IDS],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/courses?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: plan,
        },
      },
      metadata: {
        userId: user.id,
        plan: plan,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
