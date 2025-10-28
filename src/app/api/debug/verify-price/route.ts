import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const priceId = searchParams.get('priceId')

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 })
    }

    try {
      // Try to retrieve the price
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
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
