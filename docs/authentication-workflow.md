# EmaPay Authentication System Workflow

## Overview

EmaPay uses **Clerk** for authentication and **Supabase** for user data storage. This document outlines the complete user creation workflow, current system status, and setup instructions for both development and production environments.

## 🔄 User Creation Flow

### Ideal Production Flow (With Webhooks)
```
1. User Signs Up/Registers
2. Clerk Creates User Account
3. Clerk Sends Webhook Event (user.created)
4. EmaPay Webhook Handler (/api/webhooks/clerk)
5. Creates User in Supabase Database
6. Database Triggers Auto-Execute:
   - Creates AOA & EUR Wallets (0.00 balance)
   - Creates KYC Record (not_started status)
   - Creates User Limits (pre-KYC limits)
7. User Can Login and Access Dashboard
```

### Current Development Flow (Manual Sync)
```
1. User Signs Up/Registers
2. Clerk Creates User Account
3. ❌ No Webhook (Not Configured)
4. Manual Sync Required: POST /api/sync-users
5. Creates User in Supabase Database
6. Database Triggers Auto-Execute:
   - ✅ Creates AOA & EUR Wallets (0.00 balance)
   - ✅ Creates KYC Record (not_started status)
   - ✅ Creates User Limits (pre-KYC limits)
7. User Can Login and Access Dashboard
```

## 📊 Current System Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Clerk Authentication** | ✅ Working | User creation, login, logout functional |
| **Supabase Database** | ✅ Working | All tables, constraints, triggers active |
| **Database Triggers** | ✅ Working | Auto-creates wallets, KYC, limits |
| **Manual User Sync** | ✅ Working | `/api/sync-users` endpoint functional |
| **Test User Creation** | ✅ Working | `/api/create-test-users` endpoint functional |
| **Webhook Auto-Sync** | ❌ Not Configured | Requires webhook secret setup |
| **User Login Flow** | ✅ Ready | Test users can authenticate successfully |

## 🧪 Development Workflow

### Creating Test Users
```bash
# Create 3 test users in Clerk with Supabase sync
curl -X POST http://localhost:3000/api/create-test-users

# Check current sync status
curl http://localhost:3000/api/create-test-users
```

### Manual User Sync
```bash
# Sync all Clerk users to Supabase
curl -X POST http://localhost:3000/api/sync-users

# Check sync status
curl http://localhost:3000/api/sync-users
```

### Verifying User Creation
After sync, each user should have:
- ✅ Record in `public.users` table
- ✅ AOA wallet (0.00 balance)
- ✅ EUR wallet (0.00 balance)
- ✅ KYC record (not_started, step 1)
- ✅ User limits (pre-KYC values)

## 🧑‍💻 Test User Credentials

### Available Test Users
| Name | Email | Password | Phone | Status |
|------|-------|----------|-------|--------|
| **Maria Santos** | maria.santos.emapay@gmail.com | EmaPay2025!Test | +244923456789 | ✅ Ready |
| **João Pereira** | joao.pereira.emapay@gmail.com | EmaPay2025!Test | +244934567890 | ✅ Ready |
| **Ana Silva** | ana.silva.emapay@gmail.com | EmaPay2025!Test | +244945678901 | ✅ Ready |

### Login Instructions
1. Navigate to `/login` page
2. Enter email and password from table above
3. Clerk will authenticate and redirect to dashboard
4. Verify wallets display with 0.00 AOA and 0.00 EUR balances

## 🚀 Production Setup Steps

### Step 1: Configure Clerk Webhooks
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** section
3. Add new endpoint: `https://yourdomain.com/api/webhooks/clerk`
4. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy the webhook signing secret

### Step 2: Update Environment Variables
```bash
# Replace in .env.local or production environment
CLERK_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here

# Ensure Supabase credentials are set
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 3: Test Webhook Functionality
```bash
# Test webhook endpoint is active
curl https://yourdomain.com/api/webhooks/clerk

# Create test user in Clerk Dashboard
# Verify automatic sync to Supabase
curl https://yourdomain.com/api/create-test-users
```

## 🔧 API Endpoints

### User Management Endpoints

#### GET /api/create-test-users
**Purpose**: Check current sync status between Clerk and Supabase
```json
{
  "success": true,
  "data": {
    "clerk_users_count": 5,
    "supabase_users_count": 5,
    "matched_users": [...],
    "sync_status": {
      "total_clerk_users": 5,
      "synced_to_supabase": 5,
      "not_synced": 0
    }
  }
}
```

#### POST /api/create-test-users
**Purpose**: Create 3 test users in Clerk and sync to Supabase
```json
{
  "success": true,
  "message": "Successfully created 3 test users",
  "data": {
    "users_created": 3,
    "users": [...],
    "errors": []
  }
}
```

#### GET /api/sync-users
**Purpose**: Check sync status with detailed user matching
```json
{
  "success": true,
  "data": {
    "clerk_users_count": 5,
    "supabase_users_count": 5,
    "synced_count": 5,
    "not_synced_count": 0,
    "users": [...]
  }
}
```

#### POST /api/sync-users
**Purpose**: Manually sync all Clerk users to Supabase
```json
{
  "success": true,
  "message": "Manual sync completed. 5 users processed.",
  "data": {
    "total_clerk_users": 5,
    "synced_users": 5,
    "errors": 0,
    "results": [...]
  }
}
```

## 🗄️ Database Trigger Functionality

### Automatic User Setup Trigger
When a user is created in `public.users`, the following triggers execute:

#### 1. Wallet Creation
```sql
-- Creates AOA and EUR wallets with 0.00 balance
INSERT INTO wallets (user_id, currency, balance, available_balance, pending_balance)
VALUES 
  (NEW.id, 'AOA', 0, 0, 0),
  (NEW.id, 'EUR', 0, 0, 0);
```

#### 2. KYC Record Creation
```sql
-- Creates initial KYC record
INSERT INTO kyc_records (user_id, status, current_step, data)
VALUES (NEW.id, 'not_started', 1, '{}');
```

#### 3. User Limits Creation
```sql
-- Creates transaction limits (pre-KYC values)
INSERT INTO user_limits (user_id, currency, current_transaction_limit)
VALUES 
  (NEW.id, 'EUR', 100.00),    -- €100 pre-KYC limit
  (NEW.id, 'AOA', 85000.00);  -- 85,000 AOA pre-KYC limit
```

### Trigger Dependencies
- ✅ `kyc_records_user_id_unique` constraint
- ✅ `user_limits_user_id_currency_key` constraint
- ✅ KYC status includes 'not_started' value
- ✅ All foreign key relationships properly configured

## 🔍 Troubleshooting

### Common Issues

#### 1. "User not found" Error on Dashboard
**Cause**: User exists in Clerk but not in Supabase
**Solution**: 
```bash
curl -X POST http://localhost:3000/api/sync-users
```

#### 2. "ON CONFLICT" Database Errors
**Cause**: Missing unique constraints in database
**Solution**: Constraints have been fixed, but if issues persist:
```sql
-- Check constraints exist
SELECT conname FROM pg_constraint WHERE conrelid = 'public.kyc_records'::regclass;
```

#### 3. Webhook Not Receiving Events
**Cause**: Webhook secret not configured or endpoint not set in Clerk
**Solution**: Follow production setup steps above

#### 4. Database Connection Errors
**Cause**: Supabase credentials incorrect or service unavailable
**Solution**: Verify environment variables:
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### 5. KYC Status Constraint Violations
**Cause**: Database constraint doesn't include 'not_started' status
**Solution**: Already fixed, but verify with:
```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint 
WHERE conname = 'kyc_records_status_check';
```

### Debug Commands

#### Check User Sync Status
```bash
# Quick status check
curl http://localhost:3000/api/create-test-users | jq '.data.sync_status'

# Detailed user matching
curl http://localhost:3000/api/sync-users | jq '.data.users'
```

#### Verify Database State
```bash
# Check user count in Supabase
npx supabase db remote query "SELECT COUNT(*) FROM users;"

# Check wallets created
npx supabase db remote query "SELECT user_id, currency, balance FROM wallets;"

# Check KYC records
npx supabase db remote query "SELECT user_id, status, current_step FROM kyc_records;"
```

## 📝 Notes

- **Development**: Manual sync required after creating users in Clerk
- **Production**: Configure webhooks for automatic sync
- **Database**: All triggers and constraints are properly configured
- **Security**: Webhook signature verification implemented
- **Testing**: 3 test users ready for immediate login testing

---

**Last Updated**: June 19, 2025  
**System Status**: ✅ Fully Functional (Manual Sync Mode)  
**Next Step**: Configure Clerk webhooks for production deployment
