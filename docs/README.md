# EmaPay Backend Documentation

## Overview

EmaPay is a professional fintech application for EUR ↔ AOA currency exchange with integrated KYC verification and a professional order book trading system. This documentation covers essential backend and database integration information.

**Status**: ✅ Production Ready
**Database**: Supabase PostgreSQL (Project ID: kjqcfedvilcnwzfjlqtq)
**Authentication**: Clerk with custom UI

**🎯 SIMPLIFIED ARCHITECTURE**: Complex KYC limit system removed for cleaner codebase. Future KYC will be a simple binary gate (approved/not approved).

## Current System Architecture

### ✅ **Professional Order Book System** (January 2025)
- **Order Management**: Complete limit and market order support with price-time priority matching
- **Trade Execution**: Atomic trade execution with enhanced fee integration and transaction recording
- **Fund Management**: Sophisticated fund reservation system with automatic release
- **Real-Time Analytics**: Comprehensive trade execution analytics and market health monitoring
- **Performance Optimization**: Advanced settlement optimization and execution duration tracking

### ✅ **Legacy P2P Exchange System** (Deprecated - June 2025)
- **Sell Transactions**: User-defined rates stored in offers table (legacy)
- **Balance Management**: Available/reserved balance separation (migrated to order book)
- **Market Validation**: Banco BAI API used for reference only (sell component)
- **Order Fulfillment**: Partial order matching across multiple offers (replaced by order book)

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
- **order_book**: Professional order management with limit/market orders and price-time priority
- **fund_reservations**: Sophisticated fund management with automatic reservation and release
- **trades**: Complete trade execution tracking with dual-party transaction recording
- **transactions**: All financial transactions with dynamic fee calculation and order book integration
- **fees**: Dynamic fee configuration by transaction type and currency
- **kyc_records**: 16-step KYC verification workflow
- **offers**: Legacy P2P exchange offers (deprecated, replaced by order_book)

### Key Relationships
- Users → Wallets (1:many)
- Users → Order Book (1:many)
- Users → Fund Reservations (1:many)
- Users → Trades (1:many as buyer/seller)
- Users → Transactions (1:many)
- Users → KYC Records (1:many)
- Order Book → Fund Reservations (1:1)
- Order Book → Trades (1:many)

## API Endpoints

### Core Endpoints
- `GET /api/test-db` - Database connection test
- `GET /api/kyc/status` - User KYC status and progress
- `GET /api/wallet/balances` - Real wallet balances
- `POST /api/transactions/send` - Process money transfers

### Order Book Trading Endpoints
- `POST /api/orders/place` - Place limit or market orders with professional order book
- `DELETE /api/orders/:orderId` - Cancel pending orders with automatic fund release
- `GET /api/orders` - Get user's order history with filtering and pagination
- `GET /api/orders/:orderId` - Get detailed order information with trade history
- `GET /api/orderbook/:baseCurrency/:quoteCurrency` - Get order book depth and best prices
- `GET /api/trades/history` - Get user's trade execution history
- `GET /api/analytics/trading` - Get comprehensive trading analytics and market health

### Legacy Endpoints (Deprecated)
- `POST /api/transactions/buy` - Process EUR → AOA with order matching (replaced by order book)
- `POST /api/transactions/sell` - Create P2P exchange offers (replaced by order book)
- `POST /api/exchange/rates` - Real-time rate calculation via order matching (replaced by order book)
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

### Removed Endpoints (Simplified Architecture)
- ~~`POST /api/user/limits/check`~~ - Complex KYC limit checking (removed for simplicity)
- ~~`GET /api/user/limits`~~ - Transaction limits API (removed for simplicity)
- ~~`POST /api/transactions/deposit/instructions`~~ - Deposit instruction generation (UI preserved)
- ~~`POST /api/transactions/deposit/complete`~~ - Deposit completion (UI preserved)
- ~~`POST /api/transactions/deposit`~~ - Direct deposit processing (UI preserved)
- ~~`POST /api/admin/complete-deposit`~~ - Admin deposit completion (UI preserved)

**Note**: Deposit UI components remain intact for future implementation. Complex KYC limit system removed in favor of simple binary KYC gate for future implementation.

### Webhooks
- `POST /api/webhooks/clerk` - User registration automation

## Transaction Validation

### Basic Limits (Simplified)
- **EUR**: €1 - €10,000 per transaction
- **AOA**: 1,000 - 10,000,000 per transaction
- **Balance Checking**: Sufficient available balance required
- **Future KYC**: Simple binary gate (approved users can transact, others cannot)

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

### Core Documentation
- **[Database Schema](./database-schema.md)** - Complete database schema, relationships, functions, and migration details
- **[API Endpoints](./api-endpoints.md)** - All API endpoints organized by functional areas with request/response examples
- **[Authentication Workflow](./authentication-workflow.md)** - Clerk integration and user management

### System Documentation
- **[Order Book System](./order-book-system.md)** - Complete order book system overview and implementation guide
- **[Order Book Technical Specification](./order-book-technical-specification.md)** - Detailed technical implementation specifications

### Legacy Documentation (Deprecated)
- **[P2P Exchange System](./p2p-exchange-system.md)** - Legacy peer-to-peer marketplace architecture
- **[Order Matching System](./order-matching-system.md)** - Legacy buy transaction order matching implementation
- **[Dynamic Exchange Rate System](./dynamic-exchange-rate-system.md)** - Legacy VWAP-based rate calculation

---

**Last Updated**: January 7, 2025
**Status**: ✅ Production Ready - Professional Order Book System Complete