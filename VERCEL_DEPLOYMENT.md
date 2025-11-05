# Vercel Deployment Guide for DappDojo Frontend

This guide will help you deploy the DappDojo frontend to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Git repository (GitHub, GitLab, or Bitbucket)
3. All required environment variables configured

## Deployment Steps

### 1. Push to Git Repository

Ensure your code is pushed to your Git repository:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js framework

### 3. Configure Environment Variables

In the Vercel project settings, add the following environment variables:

#### Required Environment Variables

```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate-a-random-secret-here
DATABASE_URL=your-production-database-url
NEXT_PUBLIC_API_BASE_URL=your-backend-api-url
```

#### Optional Environment Variables

```
FOUNDRY_SERVICE_URL=your-foundry-service-url
FLY_FOUNDRY_SERVICE_URL=your-fly-foundry-service-url
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_MONTHLY_PRICE_ID=your-monthly-price-id
STRIPE_YEARLY_PRICE_ID=your-yearly-price-id
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.your-email-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email-user
EMAIL_PASSWORD=your-email-password
```

#### Generate NEXTAUTH_SECRET

You can generate a secure secret using:

```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

### 4. Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`

### 5. Configure Webhooks (if using Stripe)

If you're using Stripe webhooks:

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET` in Vercel

### 6. Deploy

Click "Deploy" and wait for the build to complete.

## Post-Deployment

### 1. Verify Deployment

- Visit your deployment URL
- Check that all pages load correctly
- Test authentication flow
- Verify API routes are working

### 2. Set Up Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### 3. Monitor Logs

- Use Vercel Dashboard → Logs to monitor errors
- Set up error tracking (e.g., Sentry) if needed

## Troubleshooting

### Build Failures

1. Check build logs in Vercel Dashboard
2. Ensure all environment variables are set
3. Verify `package.json` has correct dependencies
4. Check for TypeScript errors: `npm run build` locally

### Runtime Errors

1. Check Function logs in Vercel Dashboard
2. Verify environment variables are accessible
3. Check database connectivity
4. Verify API endpoints are reachable

### API Route Timeouts

- API routes have a 60-second timeout by default
- For longer operations, consider:
  - Using Vercel Edge Functions
  - Moving heavy operations to backend API
  - Using background jobs (e.g., Vercel Cron)

### Database Connection Issues

- Ensure `DATABASE_URL` is correct
- Check if your database allows connections from Vercel IPs
- Verify SSL is enabled if required

## Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
```

### Production
```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.vercel.app
```

## Important Notes

1. **Never commit `.env` files** - Use Vercel environment variables
2. **Database migrations** - Run migrations before or after deployment
3. **API routes** - Ensure backend API is accessible from Vercel
4. **CORS** - Configure CORS if making requests to external APIs
5. **Rate limiting** - Consider implementing rate limiting for API routes

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

