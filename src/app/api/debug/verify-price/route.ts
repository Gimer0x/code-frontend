import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia' as any,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const priceId = searchParams.get('priceId')

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 })
    }

    try {
      // Try to retrieve the price
      const stripe = getStripe()
      const price = await stripe.prices.retrieve(priceId)
      
      return NextResponse.json({
        success: true,
        price: {
          id: price.id,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring: price.recurring,
          product: price.product,
        }
      })
    } catch (stripeError: any) {
      return NextResponse.json({
        success: false,
        error: stripeError.message,
        code: stripeError.code,
        type: stripeError.type,
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
