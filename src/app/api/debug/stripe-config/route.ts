import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const config = {
      hasStripePublishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasMonthlyPriceId: !!process.env.STRIPE_MONTHLY_PRICE_ID,
      hasYearlyPriceId: !!process.env.STRIPE_YEARLY_PRICE_ID,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      nodeEnv: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      
      // Show partial keys for verification (first 10 chars)
      stripePublishableKeyPrefix: process.env.STRIPE_PUBLISHABLE_KEY?.substring(0, 10) + '...',
      stripeSecretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10) + '...',
      monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
      yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID,
    }

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get config', details: error.message },
      { status: 500 }
    )
  }
}
