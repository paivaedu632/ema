# EmaPay Backend Documentation

## Overview

EmaPay is a fintech application for EUR ↔ AOA currency exchange with integrated KYC verification. This documentation covers essential backend and database integration information.

**Status**: ✅ Production Ready
**Database**: Supabase PostgreSQL (Project ID: kjqcfedvilcnwzfjlqtq)
**Authentication**: Clerk with custom UI

## Quick Start

### Database Connection Test
```bash
curl http://localhost:3000/api/test-db
```

### Environment Variables
```bash
# Database (Supabase)
SUPABASE_PROJECT_ID=kjqcfedvilcnwzfjlqtq
NEXT_PUBLIC_SUPABASE_URL=https://kjqcfedvilcnwzfjlqtq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# AWS Services
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=emapay-kyc-documents
```

## Database Schema

### Core Tables
- **users**: User profiles with KYC status tracking
- **wallets**: Multi-currency balances (AOA/EUR)
- **transactions**: All financial transactions with fee calculation
- **kyc_records**: 16-step KYC verification workflow
- **user_limits**: Transaction limits (pre/post KYC)
- **exchange_rates**: Static EUR ↔ AOA conversion rates

### Key Relationships
- Users → Wallets (1:many)
- Users → Transactions (1:many)
- Users → KYC Records (1:many)

## API Endpoints

### Core Endpoints
- `GET /api/test-db` - Database connection test
- `GET /api/kyc/status` - User KYC status and progress
- `GET /api/user/limits` - Current transaction limits
- `POST /api/user/limits/check` - Validate transaction amount
- `GET /api/wallet/balances` - Real wallet balances
- `POST /api/transactions/buy` - Process EUR → AOA transactions
- `POST /api/transactions/sell` - Process AOA → EUR transactions
- `POST /api/transactions/send` - Process money transfers

### Webhooks
- `POST /api/webhooks/clerk` - User registration automation

## Transaction Limits

### Pre-KYC Limits
- **EUR**: €100 transaction, €500 daily, €2,000 monthly
- **AOA**: 85,000 transaction, 425,000 daily, 1,700,000 monthly

### Post-KYC Limits
- **EUR**: €5,000 transaction, €10,000 daily, €50,000 monthly
- **AOA**: 4,250,000 transaction, 8,500,000 daily, 42,500,000 monthly

## Security

### Row Level Security (RLS)
- All tables have RLS policies
- Users access only their own data
- Service role for admin operations
- JWT integration with Clerk

## Essential Commands

```bash
# Generate types after schema changes
npx supabase gen types typescript --project-id kjqcfedvilcnwzfjlqtq --schema public > src/types/database.types.ts

# Deploy schema changes
npx supabase db push

# Test system status
curl http://localhost:3000/api/verify-webhook
```

## Documentation

- **[Database Integration](./database-integration.md)** - Complete database setup and patterns
- **[API Reference](./api-reference.md)** - Detailed API endpoints and usage
- **[Test Deposit Guide](./test-deposit-guide.md)** - Temporary testing endpoint documentation

---

**Last Updated**: June 19, 2025
**Status**: ✅ Production Ready