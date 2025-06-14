# EmaPay - Digital Wallet Platform

## Overview

EmaPay is a modern fintech application built for the Angolan diaspora, enabling seamless currency exchange between EUR and AOA (Angolan Kwanza) with integrated KYC verification and secure transaction processing.

**Current Status**: ✅ **Database Deployed & Verified** - Ready for frontend integration

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15.3.3 with App Router
- **Authentication**: Clerk (deployed & configured)
- **Database**: Supabase (PostgreSQL) - ✅ **Deployed**
- **Cloud Services**: AWS (S3, Textract, Rekognition) - ✅ **Configured**
- **Styling**: Tailwind CSS + ShadCN/UI
- **Language**: TypeScript
- **Development**: Turbopack

### Core Features
- ✅ Multi-currency wallet (AOA/EUR) - Database ready
- ✅ Currency exchange with 2% fee - Schema implemented
- ✅ 16-step KYC verification process - Database ready
- ✅ Document verification with AWS AI services - Integration ready
- ✅ Secure transaction processing - Database schema deployed
- ✅ User authentication and authorization - Clerk integrated

### Backend Architecture Decision
**Hybrid REST/RPC Approach**:
- **Financial Transactions**: Supabase RPC functions (atomic operations)
- **Simple CRUD**: REST API endpoints (user management, queries)
- **Form Operations**: Next.js Server Actions (KYC forms, profile updates)
- **External Services**: REST APIs (AWS integration, webhooks)

## 📊 Database Schema (✅ Deployed & Verified)

### Tables Overview
1. **users** - User profiles synced with Clerk ✅
2. **wallets** - Multi-currency balances (AOA & EUR) ✅
3. **transactions** - All transaction types with fee calculation ✅
4. **kyc_records** - 16-step KYC verification workflow ✅
5. **documents** - KYC document storage with AWS S3 integration ✅
6. **exchange_rates** - Static EUR ↔ AOA exchange rates ✅

**Database Status**: All tables deployed with RLS policies, indexes, and functions
**Project ID**: kjqcfedvilcnwzfjlqtq
**Region**: us-east-2
**Connection Test**: ✅ Verified via `/api/test-db`

### Key Relationships
- Users → Wallets (1:many) - ✅ Foreign keys implemented
- Users → Transactions (1:many) - ✅ Foreign keys implemented
- Users → KYC Records (1:many) - ✅ Foreign keys implemented
- KYC Records → Documents (1:many) - ✅ Foreign keys implemented

## 🔐 Authentication & Security (✅ Implemented)

### Clerk Integration
- ✅ Custom UI components with EmaPay branding
- ✅ Portuguese language interface
- ✅ Google OAuth integration
- ✅ Secure session management
- ✅ User profile synchronization ready

### Row Level Security (RLS)
- ✅ User-based data isolation implemented
- ✅ RLS policies deployed on all tables
- ✅ Service role configured for admin operations
- ✅ JWT integration with Clerk ready

## 💰 Transaction System

### Supported Operations
- **Buy**: Purchase AOA with EUR
- **Sell**: Convert AOA to EUR
- **Send**: Transfer money between users
- **Deposit**: Add funds to wallet
- **Withdraw**: Remove funds from wallet

### Fee Structure
- 2% transaction fee on all buy operations
- Transparent fee calculation and display

## 📋 KYC Verification Process

### 16-Step Workflow
1. Enable Notifications
2. Set Passcode/PIN
3. Personal Information
4. Document Upload
5. Document Verification
6. Biometric Verification (Selfie)
7. Occupation Details
8. Income Information
9. PEP (Politically Exposed Person) Status
10. App Usage Purpose
11-16. Additional verification steps

### Document Types Supported
- Identity Card (front/back)
- Passport
- Driver's License (front/back)
- Proof of Address
- Selfie verification

## 🌍 Internationalization

### Supported Languages
- Portuguese (primary)
- English (fallback)

### Regional Features
- Angola BI (Identity Card) validation API
- Angolan address formats
- Local currency formatting (Kz for AOA)

## 📱 User Interface

### Design System
- Clean, minimalistic design
- White backgrounds with grey cards
- Black primary buttons (48px height)
- Consistent form styling
- No borders/shadows except inputs
- Modern fintech aesthetics

### Key Components
- Currency selectors
- Phone input with international support
- Address autocomplete (Google Places)
- Document upload with camera integration
- Transaction history
- Balance display

## 🔧 Development Setup

### Environment Configuration
```bash
/.env.local          
```
## 🚀 Current Implementation Status

### ✅ Completed (Production Ready)
- **Database**: All tables, RLS policies, functions deployed
- **Authentication**: Clerk integration with custom EmaPay UI
- **AWS Integration**: S3, Textract, Rekognition configured
- **TypeScript**: Full type safety with auto-generated types
- **UI Components**: Complete dashboard and transaction flows
- **Development Environment**: Next.js 15.3.3 with Turbopack

### 🔄 Next Phase (Database Integration)
- **User Registration**: Connect Clerk signup to database
- **Dashboard Data**: Replace mock data with real database queries
- **Transaction Processing**: Implement real buy/sell/send operations
- **KYC Integration**: Connect KYC forms to database storage
- **Real-time Updates**: Add Supabase subscriptions for live data

## 📈 Immediate Next Steps

### Phase 1: Database Integration (Priority 1)
1. **User Registration Flow**: Connect Clerk webhooks to create database users
2. **Dashboard Integration**: Replace mock data with real Supabase queries
3. **Transaction Processing**: Implement buy/sell operations with database persistence
4. **Balance Management**: Add real-time wallet balance updates

### Phase 2: Advanced Features (Priority 2)
1. **KYC Database Integration**: Connect KYC forms to database storage
2. **Document Management**: Integrate AWS document verification with database
3. **Real-time Subscriptions**: Add live updates for transactions and balances
4. **API Development**: Build REST endpoints for external integrations

## 🧪 Testing

### Database Testing
- Connection verification: `/api/test-db`
- Sample data insertion
- Function testing
- Type safety validation

### Manual Testing Approach
- UI navigation testing
- Form validation testing
- Transaction flow testing
- KYC process testing

## 📞 Support & Documentation

### 📚 Essential Documentation

#### Core Documentation
- **[📊 Project Status](./project-status.md)** - Current completion status and next priorities
- **[🏗️ Database Schema](./database-schema.md)** - Deployed database structure and relationships
- **[🔌 API Reference](./api-reference.md)** - Hybrid REST/RPC API documentation
- **[⚙️ Development Guide](./development-guide.md)** - Database integration development guide
- **[🚀 Deployment Guide](./deployment-guide.md)** - Production deployment procedures

### 🔗 External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [ShadCN/UI Components](https://ui.shadcn.com)
- [AWS SDK Documentation](https://docs.aws.amazon.com/sdk-for-javascript/)

### 🆘 Quick Help
- **Database Issues**: Check `docs/database-schema.md` and test with `/api/test-db`
- **Integration Questions**: Follow `docs/development-guide.md`
- **Deployment Questions**: Follow `docs/deployment-guide.md`
- **Current Status**: Check `docs/project-status.md`

---

**Last Updated**: June 14, 2025  
**Version**: 0.1.0  
**Status**: Development Phase
