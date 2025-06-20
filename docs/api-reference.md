# EmaPay API Reference

## Overview

EmaPay API provides endpoints for user management, transactions, and KYC verification. All endpoints require Clerk authentication unless otherwise specified.

**Database Integration**: See `docs/database-integration.md` for database setup and patterns.

## Base URL
```
Development: http://localhost:3000/api
Production: https://emapay.com/api
```

## Response Format

All API responses follow a consistent format:

```typescript
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp?: string
}
```

## API Endpoints

### System Endpoints (REST)

#### GET /api/test-db
**Purpose**: Test database connection and verify schema
**Authentication**: None required
**Response**:
```json
{
  "success": true,
  "message": "Database connection and tests successful!",
  "timestamp": "2025-06-14T20:53:21.476Z"
}
```

#### GET /api/health
**Purpose**: Health check endpoint
**Authentication**: None required
**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-06-14T20:53:21.476Z"
}
```

#### GET /api/verify-webhook
**Purpose**: Verify webhook implementation and database state
**Authentication**: None required
**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_users": 3,
      "total_wallets": 6,
      "wallet_user_ratio": 2
    },
    "verification": {
      "webhook_endpoint_exists": true,
      "database_connection": true,
      "user_creation_working": true,
      "wallet_creation_working": true
    }
  }
}
```

#### POST /api/test-webhook
**Purpose**: Test webhook functionality without Clerk
**Authentication**: None required
**Response**:
```json
{
  "success": true,
  "message": "Test user created successfully",
  "data": {
    "user_id": "uuid",
    "wallets_created": 2
  }
}
```

#### GET /api/kyc/status ✅ **NEW**
**Purpose**: Get user's KYC verification status and progress
**Authentication**: Clerk JWT required
**Response**:
```json
{
  "success": true,
  "data": {
    "status": "not_started",
    "current_step": 1,
    "total_steps": 16,
    "completion_percentage": 0.00,
    "last_updated": "2025-06-14T23:23:44.499Z",
    "next_step_url": "/kyc/notifications",
    "benefits": ["Increase transaction limits", "Access all features"]
  }
}
```

#### PUT /api/kyc/status ✅ **NEW**
**Purpose**: Update user's KYC status (admin/system use)
**Authentication**: Clerk JWT required
**Request Body**:
```json
{
  "status": "in_progress",
  "current_step": 5,
  "completion_percentage": 31.25
}
```

#### GET /api/user/limits ✅ **NEW**
**Purpose**: Get user's transaction limits and usage
**Authentication**: Clerk JWT required
**Query Parameters**: `currency` (EUR|AOA, default: EUR)
**Response**:
```json
{
  "success": true,
  "data": {
    "current_currency": "EUR",
    "limits": {
      "EUR": {
        "daily_limit": 500.00,
        "monthly_limit": 2000.00,
        "transaction_limit": 100.00,
        "daily_used": 0.00,
        "monthly_used": 0.00,
        "daily_remaining": 500.00,
        "monthly_remaining": 2000.00
      },
      "AOA": {
        "daily_limit": 42500.00,
        "monthly_limit": 170000.00,
        "transaction_limit": 8500.00
      }
    },
    "kyc_status": "not_started",
    "upgrade_benefits": {
      "transaction_limit": {"current": "€100", "after_kyc": "€5,000"}
    }
  }
}
```

#### POST /api/user/limits/check ✅ **NEW**
**Purpose**: Check if transaction amount is within user limits
**Authentication**: Clerk JWT required
**Request Body**:
```json
{
  "amount": 150.00,
  "currency": "EUR",
  "transaction_type": "send_money"
}
```
**Response (Within Limits)**:
```json
{
  "success": true,
  "data": {
    "within_limits": true,
    "amount_requested": 150.00,
    "currency": "EUR",
    "requires_kyc": false,
    "suggested_action": {
      "action": "proceed",
      "message": "Transaction can proceed"
    }
  }
}
```
**Response (Exceeds Limits)**:
```json
{
  "success": true,
  "data": {
    "within_limits": false,
    "limit_check": {
      "limit_type": "transaction",
      "current_limit": 100.00,
      "would_exceed_by": 50.00
    },
    "requires_kyc": true,
    "suggested_action": {
      "action": "verify_identity",
      "message": "Complete identity verification to proceed",
      "kyc_url": "/kyc/notifications"
    }
  }
}
```

### User Management

#### GET /api/user/profile
**Purpose**: Get current user's profile information
**Authentication**: Required
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clerk_user_id": "user_xxx",
    "email": "user@example.com",
    "full_name": "João Silva",
    "phone_number": "+244900000000",
    "profile_image_url": "https://...",
    "created_at": "2025-06-14T20:53:21.476Z",
    "updated_at": "2025-06-14T20:53:21.476Z"
  }
}
```

#### PUT /api/user/profile
**Purpose**: Update current user's profile
**Authentication**: Required
**Body**:
```json
{
  "full_name": "João Silva",
  "phone_number": "+244900000000"
}
```

#### POST /api/user/register
**Purpose**: Register new user (called after Clerk signup)
**Authentication**: Required
**Body**:
```json
{
  "email": "user@example.com",
  "full_name": "João Silva",
  "phone_number": "+244900000000"
}
```

### Wallet Management

#### GET /api/wallet/balances
**Purpose**: Get user's wallet balances for all currencies
**Authentication**: Required
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "currency": "AOA",
      "balance": 85000.00,
      "available_balance": 80000.00,
      "reserved_balance": 5000.00
    },
    {
      "currency": "EUR",
      "balance": 100.00,
      "available_balance": 100.00,
      "reserved_balance": 0.00
    }
  ]
}
```

#### GET /api/wallet/balance/:currency
**Purpose**: Get balance for specific currency
**Authentication**: Required
**Parameters**: `currency` - AOA or EUR
**Response**:
```json
{
  "success": true,
  "data": {
    "currency": "AOA",
    "balance": 85000.00,
    "available_balance": 80000.00,
    "reserved_balance": 5000.00
  }
}
```

#### POST /api/test-deposit ⚠️ **TESTING ONLY**
**Purpose**: Add money to user wallets for testing purposes (simulates deposit functionality)
**Authentication**: Clerk JWT required
**⚠️ Note**: This is a temporary endpoint for testing only. Will be replaced with actual payment gateway integration.
**Request Body**:
```json
{
  "amount": 100.00,
  "currency": "EUR"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Depósito de teste processado com sucesso",
  "data": {
    "wallet": {
      "currency": "EUR",
      "balance": 200.00,
      "available_balance": 200.00,
      "last_updated": "2025-06-19T10:30:00.000Z"
    },
    "deposit": {
      "amount": 100.00,
      "currency": "EUR",
      "timestamp": "2025-06-19T10:30:00.000Z"
    }
  },
  "timestamp": "2025-06-19T10:30:00.000Z"
}
```

### Transaction Management

#### GET /api/transactions
**Purpose**: Get user's transaction history
**Authentication**: Required
**Query Parameters**:
- `limit` (optional): Number of transactions (default: 10, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `type` (optional): Filter by transaction type
- `status` (optional): Filter by status
- `currency` (optional): Filter by currency

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "buy",
      "amount": 100.00,
      "currency": "EUR",
      "fee_amount": 2.00,
      "net_amount": 98.00,
      "exchange_rate": 850.00,
      "status": "completed",
      "created_at": "2025-06-14T20:53:21.476Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

## Supabase RPC Functions (Financial Operations)

### Transaction Processing Functions

#### process_buy_transaction_with_matching(user_uuid, amount_eur, use_order_matching, max_rate)
**Purpose**: Process EUR to AOA purchase with order matching and dynamic fees
**Authentication**: Required (via Supabase client)
**Parameters**:
```typescript
{
  user_uuid: string,           // User UUID
  amount_eur: number,          // EUR amount to spend
  use_order_matching: boolean, // Whether to use order matching (default: true)
  max_rate: number            // Maximum acceptable rate (optional)
}
```
**Returns**:
```json
{
  "transaction_id": "uuid",
  "status": "completed",
  "aoa_received": 83300.00,
  "fee_amount": 2.00
}
```

#### create_currency_offer(user_uuid, currency_code, amount_to_reserve, rate)
**Purpose**: Create P2P exchange offer with reserved balance
**Authentication**: Required
**Parameters**:
```typescript
{
  user_uuid: string,        // User UUID
  currency_code: string,    // Currency being offered (AOA or EUR)
  amount_to_reserve: number, // Amount to reserve for offer
  rate: number              // Exchange rate for offer
}
```
**Returns**: `UUID` - Offer ID

#### process_send_transaction(p_sender_id, p_recipient_id, p_amount, p_currency)
**Purpose**: Transfer money between users atomically
**Authentication**: Required
**Parameters**:
```typescript
{
  p_sender_id: string,    // Sender UUID
  p_recipient_id: string, // Recipient UUID
  p_amount: number,       // Amount to send
  p_currency: string      // Currency (AOA or EUR)
}
```

### Balance Functions

#### get_user_balance(user_uuid, currency_code)
**Purpose**: Get user's total balance for specific currency
**Returns**: `number` - Total balance

#### get_user_available_balance(user_uuid, currency_code)
**Purpose**: Get user's available balance for transactions
**Returns**: `number` - Available balance

#### cancel_currency_offer(offer_uuid, user_uuid)
**Purpose**: Cancel P2P exchange offer and return reserved balance
**Returns**: `boolean` - Success status

#### validate_exchange_rate(currency_code, proposed_rate)
**Purpose**: Validate exchange rate against market offers or API baseline
**Returns**: `boolean` - Validation result

#### Exchange Rate System (Current)
**Note**: Exchange rates are now handled via:
- Order matching system for buy transactions (match_buy_order_aoa)
- Seller-defined rates in offers table for sell transactions
- Static fallback rate (924.0675 AOA per EUR) when insufficient liquidity
- Banco BAI API for reference only (sell component validation)

#### GET /api/transactions/:id
**Purpose**: Get specific transaction details
**Authentication**: Required
**Parameters**: `id` - Transaction UUID
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "buy",
    "amount": 100.00,
    "currency": "EUR",
    "fee_amount": 2.00,
    "net_amount": 98.00,
    "exchange_rate": 850.00,
    "status": "completed",
    "recipient_info": null,
    "metadata": {
      "description": "Currency exchange",
      "processing_time": "2 minutes"
    },
    "created_at": "2025-06-14T20:53:21.476Z",
    "updated_at": "2025-06-14T20:53:21.476Z"
  }
}
```

### Exchange Rates

#### GET /api/exchange-rate/banco-bai ✅ **NEW**
**Purpose**: Get real-time exchange rates from Banco BAI API
**Authentication**: None required
**Response**:
```json
{
  "success": true,
  "data": {
    "sellValue": 1100.0124,
    "buyValue": 1078.4435,
    "currency": "EUR",
    "quotationDate": "2025-06-20T11:00:00.000Z"
  },
  "timestamp": "2025-06-20T11:30:57.709Z"
}
```

#### POST /api/exchange/rates ✅ **NEW**
**Purpose**: Calculate real-time exchange rates using order matching
**Authentication**: Required
**Request**:
```json
{
  "amount": 100.00,
  "currency": "AOA",
  "type": "buy"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "amount_eur": 100.00,
    "fee_amount": 2.00,
    "net_amount": 98.00,
    "aoa_amount": 105717.40,
    "exchange_rate": 1078.7487,
    "fee_percentage": 0.02,
    "order_matching": {
      "success": true,
      "matches": [...],
      "match_count": 1
    },
    "rate_source": "order_matching"
  }
}
```

### KYC Management

#### GET /api/kyc/status
**Purpose**: Get user's KYC verification status
**Authentication**: Required
**Response**:
```json
{
  "success": true,
  "data": {
    "status": "in_progress",
    "current_step": 5,
    "total_steps": 16,
    "completion_percentage": 31.25,
    "last_updated": "2025-06-14T20:53:21.476Z"
  }
}
```

#### GET /api/kyc/data
**Purpose**: Get user's KYC form data
**Authentication**: Required
**Response**:
```json
{
  "success": true,
  "data": {
    "personal_info": {
      "full_name": "João Silva",
      "date_of_birth": "1990-01-01",
      "nationality": "Angola"
    },
    "documents": {
      "identity_card_front": "uploaded",
      "identity_card_back": "uploaded"
    }
  }
}
```

#### PUT /api/kyc/data
**Purpose**: Update KYC form data
**Authentication**: Required
**Body**:
```json
{
  "step": 3,
  "data": {
    "full_name": "João Silva",
    "date_of_birth": "1990-01-01",
    "nationality": "Angola"
  }
}
```

### Document Management

#### POST /api/documents/upload
**Purpose**: Upload KYC document
**Authentication**: Required
**Content-Type**: multipart/form-data
**Body**:
- `file`: Document file
- `document_type`: Type of document
- `kyc_record_id`: Associated KYC record

**Response**:
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "upload_url": "https://s3.amazonaws.com/...",
    "verification_status": "pending"
  }
}
```

#### GET /api/documents
**Purpose**: Get user's uploaded documents
**Authentication**: Required
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "document_type": "identity_card_front",
      "file_name": "id_front.jpg",
      "verification_status": "verified",
      "created_at": "2025-06-14T20:53:21.476Z"
    }
  ]
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid currency code provided",
  "timestamp": "2025-06-14T20:53:21.476Z"
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED` - Missing or invalid authentication
- `AUTHORIZATION_FAILED` - User not authorized for this action
- `VALIDATION_ERROR` - Request validation failed
- `INSUFFICIENT_FUNDS` - Not enough balance for transaction
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error
- `KYC_REQUIRED` - KYC verification required
- `DOCUMENT_UPLOAD_FAILED` - Document upload error

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

## Rate Limiting

- **General endpoints**: 100 requests per minute per user
- **Transaction endpoints**: 10 requests per minute per user
- **Document upload**: 5 requests per minute per user

## Webhooks

### Clerk User Registration Webhook ✅ **IMPLEMENTED**
**URL**: `/api/webhooks/clerk`
**Method**: POST
**Purpose**: Automatically create users and wallets when new users register via Clerk
**Authentication**: Webhook signature verification (svix)
**Events Supported**:
- `user.created` - Creates user and initializes AOA/EUR wallets
- `user.updated` - Logs event (processing not implemented)
- `user.deleted` - Logs event (processing not implemented)

**Payload Example**:
```json
{
  "type": "user.created",
  "data": {
    "id": "user_xxx",
    "email_addresses": [{"email_address": "user@example.com"}],
    "first_name": "João",
    "last_name": "Silva",
    "image_url": "https://..."
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user_id": "uuid",
    "wallets_created": ["AOA", "EUR"]
  }
}
```

### Transaction Status Updates
**URL**: Configured in environment
**Method**: POST
**Payload**:
```json
{
  "event": "transaction.status_changed",
  "data": {
    "transaction_id": "uuid",
    "user_id": "uuid",
    "old_status": "pending",
    "new_status": "completed",
    "timestamp": "2025-06-14T20:53:21.476Z"
  }
}
```

---

**Last Updated**: June 14, 2025  
**API Version**: 1.0.0
