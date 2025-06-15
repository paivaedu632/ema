# EmaPay Deployment Guide

## Overview

This guide covers the complete deployment process for EmaPay, from local development to production deployment on various platforms.

**Current Status**: ✅ **Database Deployed & Verified** - Ready for frontend deployment

## Prerequisites

### Required Accounts
- **Supabase**: Database hosting
- **Clerk**: Authentication service
- **AWS**: S3, Textract, Rekognition services
- **Vercel/Netlify**: Frontend hosting (recommended)
- **Domain Provider**: For custom domain

### Required Tools
- Node.js 18+
- Git
- Supabase CLI
- AWS CLI
- Vercel CLI (if using Vercel)

## Environment Configuration

### Development (.env.local)
```bash
# Application Configuration
NEXT_PUBLIC_APP_NAME=EmaPay
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPPORTED_CURRENCIES=AOA,EUR
NEXT_PUBLIC_TRANSACTION_FEE=0.02

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Database (Supabase)
SUPABASE_PROJECT_ID=kjqcfedvilcnwzfjlqtq
SUPABASE_REGION=us-east-2
NEXT_PUBLIC_SUPABASE_URL=https://kjqcfedvilcnwzfjlqtq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:password@db.kjqcfedvilcnwzfjlqtq.supabase.co:5432/postgres

# AWS Services
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=emapay-kyc-documents

# External APIs
ANGOLA_BI_API_URL=https://angolaapi.onrender.com/api/v1/validate/bi/
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### Production Environment Variables
```bash
# Application Configuration
NEXT_PUBLIC_APP_NAME=EmaPay
NEXT_PUBLIC_APP_URL=https://emapay.com
NEXT_PUBLIC_SUPPORTED_CURRENCIES=AOA,EUR
NEXT_PUBLIC_TRANSACTION_FEE=0.02

# Authentication (Clerk - Production Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Database (Supabase - Production)
SUPABASE_PROJECT_ID=your_prod_project_id
SUPABASE_REGION=us-east-1
NEXT_PUBLIC_SUPABASE_URL=https://your_prod_project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:password@db.your_prod_project.supabase.co:5432/postgres

# AWS Services (Production)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=emapay-prod-kyc-documents

# External APIs
ANGOLA_BI_API_URL=https://angolaapi.onrender.com/api/v1/validate/bi/
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# Additional Production Variables
NODE_ENV=production
NEXTAUTH_URL=https://emapay.com
```

## Database Deployment

**Note**: For detailed database setup and integration, see `docs/database-integration.md`

### Quick Database Setup
```bash
# Deploy to production
npx supabase link --project-ref your_prod_project_id
npx supabase db push

# Verify deployment
curl https://your-domain.com/api/test-db
```

## AWS Services Setup

### S3 Bucket Configuration

1. **Create S3 Bucket**
```bash
aws s3 mb s3://emapay-prod-kyc-documents --region us-east-1
```

2. **Configure Bucket Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EmapayKYCAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT:user/emapay-service"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::emapay-prod-kyc-documents/*"
    }
  ]
}
```

3. **Configure CORS**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://emapay.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### IAM User Setup

1. **Create IAM User**
```bash
aws iam create-user --user-name emapay-service
```

2. **Attach Policies**
```bash
# S3 access
aws iam attach-user-policy --user-name emapay-service --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Textract access
aws iam attach-user-policy --user-name emapay-service --policy-arn arn:aws:iam::aws:policy/AmazonTextractFullAccess

# Rekognition access
aws iam attach-user-policy --user-name emapay-service --policy-arn arn:aws:iam::aws:policy/AmazonRekognitionFullAccess
```

3. **Generate Access Keys**
```bash
aws iam create-access-key --user-name emapay-service
```

## Frontend Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Login and Deploy**
```bash
vercel login
vercel --prod
```

3. **Configure Environment Variables**
```bash
# Set production environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... add all other environment variables
```

4. **Custom Domain Setup**
```bash
vercel domains add emapay.com
vercel domains add www.emapay.com
```

### Alternative: Netlify Deployment

1. **Build Configuration (netlify.toml)**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. **Deploy**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=.next
```

### Docker Deployment

1. **Dockerfile**
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

2. **Build and Deploy**
```bash
# Build image
docker build -t emapay .

# Run container
docker run -p 3000:3000 --env-file .env.production emapay
```

## Authentication Setup

### Clerk Production Configuration

1. **Create Production Instance**
- Go to Clerk Dashboard
- Create new application for production
- Configure allowed origins: `https://emapay.com`

2. **Configure OAuth Providers**
```javascript
// Google OAuth configuration
{
  "client_id": "your_google_client_id",
  "client_secret": "your_google_client_secret",
  "redirect_uri": "https://emapay.com/api/auth/callback/google"
}
```

3. **Webhook Configuration**
```javascript
// Configure webhooks for user events
{
  "endpoint_url": "https://emapay.com/api/webhooks/clerk",
  "events": ["user.created", "user.updated", "user.deleted"]
}
```

## Monitoring and Logging

### Application Monitoring

1. **Vercel Analytics**
```bash
# Enable Vercel Analytics
vercel env add NEXT_PUBLIC_VERCEL_ANALYTICS_ID production
```

2. **Supabase Monitoring**
- Monitor database performance in Supabase Dashboard
- Set up alerts for high CPU/memory usage
- Monitor API request patterns

3. **AWS CloudWatch**
```bash
# Monitor S3 usage
aws logs create-log-group --log-group-name /aws/s3/emapay-kyc-documents

# Monitor Lambda functions (if used)
aws logs create-log-group --log-group-name /aws/lambda/emapay-functions
```

### Error Tracking

1. **Sentry Integration** (Optional)
```bash
npm install @sentry/nextjs

# Configure Sentry
npx @sentry/wizard -i nextjs
```

## Security Checklist

### Pre-Deployment Security

- [ ] All environment variables secured
- [ ] No hardcoded secrets in code
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Supabase RLS)
- [ ] XSS prevention (React built-in + CSP headers)

### Post-Deployment Security

- [ ] Security headers configured
- [ ] SSL certificate valid
- [ ] Database access restricted
- [ ] AWS IAM permissions minimal
- [ ] Regular security updates scheduled
- [ ] Backup and recovery tested

## Performance Optimization

### Build Optimization

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    domains: ['kjqcfedvilcnwzfjlqtq.supabase.co'],
  },
  compress: true,
  poweredByHeader: false,
}

module.exports = nextConfig
```

### Database Optimization

- Indexes on frequently queried columns
- Connection pooling via Supabase
- Query optimization using EXPLAIN ANALYZE
- Regular VACUUM and ANALYZE operations

## Rollback Strategy

### Database Rollback

```bash
# Rollback to previous migration
npx supabase db reset --to-migration 20250614000000

# Restore from backup
npx supabase db reset --file backup-20250614.sql
```

### Application Rollback

```bash
# Vercel rollback
vercel rollback [deployment-url]

# Docker rollback
docker run -p 3000:3000 emapay:previous-tag
```

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied successfully
- [ ] Authentication working correctly
- [ ] File uploads to S3 working
- [ ] Exchange rates populated
- [ ] API endpoints responding correctly
- [ ] SSL certificate valid
- [ ] Domain pointing to correct deployment
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] Performance metrics baseline established

---

**Last Updated**: June 14, 2025  
**Deployment Guide Version**: 1.0.0
