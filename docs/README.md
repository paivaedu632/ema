# Ema Backend Documentation

## Overview

Ema is a fintech application for EUR ↔ AOA currency exchange with integrated KYC verification. This documentation covers essential backend and database integration information.

**Status**: ✅ Production Ready
**Database**: Supabase PostgreSQL (Project ID: kjqcfedvilcnwzfjlqtq)
**Authentication**: Clerk with custom UI

## Current System Architecture

### ✅ **Order Matching System** (June 2025)
- **Buy Transactions**: Order matching against existing sell offers with static fallback
- **Dynamic Fee System**: Database-driven fee configuration (2% buy, 0% send/sell)
- **Real-Time Rates**: Live rate calculation based on market liquidity
- **Atomic Transactions**: Proper balance updates with rollback on failure

### ✅ **P2P Exchange System** (June 2025)
- **Sell Transactions**: User-defined rates stored in offers table
- **Balance Management**: Available/reserved balance separation
- **Market Validation**: Banco BAI API used for reference only (sell component)
- **Order Fulfillment**: Partial order matching across multiple offers

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
- **wallets**: Multi-currency balances (AOA/EUR) with available/reserved balance
- **offers**: P2P exchange offers with seller-defined rates
- **transactions**: All financial transactions with dynamic fee calculation
- **fees**: Dynamic fee configuration by transaction type and currency
- **kyc_records**: 16-step KYC verification workflow
- **user_limits**: Transaction limits (pre/post KYC)

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
- `POST /api/transactions/buy` - Process EUR → AOA with order matching
- `POST /api/transactions/sell` - Create P2P exchange offers
- `POST /api/transactions/send` - Process money transfers
- `POST /api/exchange/rates` - Real-time rate calculation via order matching
- `GET /api/exchange-rate/banco-bai` - Banco BAI API (reference only for sell component)

### KYC Endpoints
- `GET /api/kyc/status` - Get user's KYC verification status and progress
- `PUT /api/kyc/status` - Update user's KYC status (admin/system use)
- `GET /api/kyc/progress` - Get detailed KYC progress and step data
- `POST /api/kyc/progress` - Update KYC progress and step completion

### AWS KYC Processing Endpoints
- `POST /api/upload-document` - Upload KYC documents to AWS S3
- `POST /api/extract-text` - Extract text from documents using AWS Textract
- `POST /api/detect-face` - Detect faces in images using AWS Rekognition
- `POST /api/compare-faces` - Compare faces between two images
- `POST /api/liveness-check` - Perform liveness detection on selfie images
- `GET /api/validate-bi/[biNumber]` - Validate Angolan BI number format

### Removed Endpoints (Backend Functionality Removed)
- ~~`POST /api/transactions/deposit/instructions`~~ - Deposit instruction generation (UI preserved)
- ~~`POST /api/transactions/deposit/complete`~~ - Deposit completion (UI preserved)
- ~~`POST /api/transactions/deposit`~~ - Direct deposit processing (UI preserved)
- ~~`POST /api/admin/complete-deposit`~~ - Admin deposit completion (UI preserved)

**Note**: Deposit UI components remain intact for future implementation. Deposit processing will be handled via external API integration when users click "Paguei" (payment confirmation).

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
- **[Authentication Workflow](./authentication-workflow.md)** - Clerk integration and user management
- **[P2P Exchange System](./p2p-exchange-system.md)** - Peer-to-peer marketplace architecture
- **[Order Matching System](./order-matching-system.md)** - Buy transaction order matching implementation
- **[Exchange Rate Audit Report](./exchange-rate-audit-report.md)** - System verification and compliance

---

**Last Updated**: June 20, 2025
**Status**: ✅ Production Ready