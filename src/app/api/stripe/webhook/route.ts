import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Proxy Stripe webhook to backend
 * The backend will verify the signature and handle the webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // Forward webhook to backend
    // Backend will verify signature and handle events
    // Important: Forward raw body (not JSON) to preserve Stripe signature verification
    const backendResponse = await fetch(`${BACKEND_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Backend expects JSON, but body is raw text
        'stripe-signature': signature,
      },
      body: body, // Raw body as received from Stripe
    })

    const data = await backendResponse.json().catch(() => ({ received: true }))

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status })
    }

    return NextResponse.json(data)

  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
