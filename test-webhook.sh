#!/bin/bash

# Webhook Verification Script
# This script helps verify your Stripe webhook setup

echo "=== Stripe Webhook Verification ==="
echo ""

# Check if webhook endpoint is accessible
echo "1. Testing webhook endpoint accessibility..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')

if echo "$RESPONSE" | grep -q "Missing stripe-signature"; then
  echo "✅ Webhook endpoint is accessible and checking for signature"
else
  echo "❌ Webhook endpoint may not be working correctly"
  echo "Response: $RESPONSE"
fi

echo ""
echo "2. Checking environment variables..."
if [ -f .env.local ]; then
  if grep -q "STRIPE_WEBHOOK_SECRET" .env.local; then
    echo "✅ STRIPE_WEBHOOK_SECRET found in .env.local"
    WEBHOOK_SECRET=$(grep "STRIPE_WEBHOOK_SECRET" .env.local | cut -d '=' -f2)
    if [[ $WEBHOOK_SECRET == whsec_* ]]; then
      echo "✅ Webhook secret format looks correct (starts with whsec_)"
    else
      echo "⚠️  Webhook secret format may be incorrect"
    fi
  else
    echo "⚠️  STRIPE_WEBHOOK_SECRET not found in .env.local"
    echo "   Note: This should be configured in the BACKEND, not frontend"
  fi
  
  if grep -q "NEXT_PUBLIC_API_BASE_URL" .env.local; then
    BACKEND_URL=$(grep "NEXT_PUBLIC_API_BASE_URL" .env.local | cut -d '=' -f2)
    echo "✅ NEXT_PUBLIC_API_BASE_URL is set: $BACKEND_URL"
  else
    echo "❌ NEXT_PUBLIC_API_BASE_URL not found in .env.local"
  fi
else
  echo "⚠️  .env.local file not found"
fi

echo ""
echo "3. Webhook Configuration Summary:"
echo ""
echo "Frontend Webhook Endpoint: http://localhost:3000/api/stripe/webhook"
echo "Backend Webhook Endpoint: ${BACKEND_URL:-'NOT SET'}/api/stripe/webhook"
echo ""
echo "4. To test with Stripe CLI:"
echo "   stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo ""
echo "5. To trigger a test event:"
echo "   stripe trigger checkout.session.completed"
echo ""
echo "=== Verification Complete ==="

