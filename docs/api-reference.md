# EmaPay API Reference

## Overview

EmaPay uses a **hybrid REST/RPC architecture** optimized for different use cases:

- **Financial Transactions**: Supabase RPC functions for atomic operations
- **Simple CRUD**: REST API endpoints for user management and queries
- **Form Operations**: Next.js Server Actions for KYC and profile updates
- **External Services**: REST APIs for AWS integration and webhooks

All endpoints require authentication via Clerk unless otherwise specified.

## Base URL
```
Development: http://localhost:3000/api
Production: https://emapay.com/api
```

## Architecture Patterns

### 1. Supabase RPC Functions (Financial Operations)
```typescript
// Direct database function calls for atomic operations
const { data, error } = await supabase.rpc('process_buy_transaction', {
  p_user_id: userId,
  p_eur_amount: 100.00,
  p_exchange_rate: 850.00
})
```

### 2. REST API Endpoints (CRUD Operations)
```http
Authorization: Bearer <clerk_session_token>
```

### 3. Server Actions (Form Operations)
```typescript
// Direct form submission without API layer
async function updateKYCStep(formData: FormData) {
  'use server'
  // Direct database operations
}
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
      "pending_balance": 5000.00
    },
    {
      "currency": "EUR",
      "balance": 100.00,
      "available_balance": 100.00,
      "pending_balance": 0.00
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
    "pending_balance": 5000.00
  }
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

#### process_buy_transaction(p_user_id, p_eur_amount, p_exchange_rate)
**Purpose**: Process EUR to AOA purchase atomically
**Authentication**: Required (via Supabase client)
**Parameters**:
```typescript
{
  p_user_id: string,      // User UUID
  p_eur_amount: number,   // EUR amount to spend
  p_exchange_rate: number // Current EUR to AOA rate
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

#### process_sell_transaction(p_user_id, p_aoa_amount, p_exchange_rate)
**Purpose**: Process AOA to EUR sale atomically
**Authentication**: Required
**Parameters**:
```typescript
{
  p_user_id: string,      // User UUID
  p_aoa_amount: number,   // AOA amount to sell
  p_exchange_rate: number // Current AOA to EUR rate
}
```

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

#### get_active_exchange_rate(from_curr, to_curr)
**Purpose**: Get current active exchange rate
**Returns**: `number` - Exchange rate

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

#### GET /api/exchange-rates
**Purpose**: Get current active exchange rates
**Authentication**: None required
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "from_currency": "EUR",
      "to_currency": "AOA",
      "rate": 850.00,
      "rate_type": "automatic",
      "is_active": true,
      "updated_at": "2025-06-14T20:53:21.476Z"
    },
    {
      "from_currency": "AOA",
      "to_currency": "EUR",
      "rate": 0.00118,
      "rate_type": "automatic",
      "is_active": true,
      "updated_at": "2025-06-14T20:53:21.476Z"
    }
  ]
}
```

#### GET /api/exchange-rates/:from/:to
**Purpose**: Get specific exchange rate
**Authentication**: None required
**Parameters**: 
- `from` - Source currency (AOA or EUR)
- `to` - Target currency (AOA or EUR)
**Response**:
```json
{
  "success": true,
  "data": {
    "rate": 850.00,
    "from_currency": "EUR",
    "to_currency": "AOA",
    "rate_type": "automatic"
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
