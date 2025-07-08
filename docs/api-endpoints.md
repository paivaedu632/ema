# EmaPay API Endpoints

**Status**: ✅ PRODUCTION READY  
**Authentication**: Clerk with custom UI  
**Database**: See `docs/database-schema.md` for database integration details  

## Base URLs
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

## Authentication

### Headers Required
```typescript
{
  "Authorization": "Bearer <clerk_session_token>",
  "Content-Type": "application/json"
}
```

### User Context
All authenticated endpoints automatically receive user context from Clerk session.

## Order Book Trading APIs

### Order Management

#### POST /api/orders/place
**Purpose**: Place limit or market orders with professional order book
**Authentication**: Required
**Request Body**:
```typescript
{
  "orderType": "limit" | "market",
  "side": "buy" | "sell",
  "baseCurrency": "EUR" | "AOA",
  "quoteCurrency": "AOA" | "EUR",
  "quantity": number,
  "price"?: number // Required for limit orders, optional for market orders
}
```
**Response**:
```typescript
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "reservation_id": "uuid",
    "status": "placed",
    "reserved_amount": number,
    "reserved_currency": "EUR" | "AOA",
    "matching_result": {
      "total_matched": number,
      "trades_executed": number,
      "remaining_quantity": number
    }
  }
}
```

#### DELETE /api/orders/:orderId
**Purpose**: Cancel pending orders with automatic fund release
**Authentication**: Required
**Response**:
```typescript
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "status": "cancelled",
    "released_amount": number,
    "released_currency": "EUR" | "AOA"
  }
}
```

#### GET /api/orders
**Purpose**: Get user's order history with filtering and pagination
**Authentication**: Required
**Query Parameters**:
- `status`: "pending" | "partially_filled" | "filled" | "cancelled"
- `currency_pair`: "EUR/AOA" | "AOA/EUR"
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response**:
```typescript
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_type": "limit" | "market",
      "side": "buy" | "sell",
      "base_currency": "EUR" | "AOA",
      "quote_currency": "AOA" | "EUR",
      "quantity": number,
      "remaining_quantity": number,
      "filled_quantity": number,
      "price": number,
      "average_fill_price": number,
      "status": "pending" | "partially_filled" | "filled" | "cancelled",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

#### GET /api/orders/:orderId
**Purpose**: Get detailed order information with trade history
**Authentication**: Required
**Response**:
```typescript
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "order_type": "limit" | "market",
      "side": "buy" | "sell",
      "base_currency": "EUR" | "AOA",
      "quote_currency": "AOA" | "EUR",
      "quantity": number,
      "remaining_quantity": number,
      "filled_quantity": number,
      "price": number,
      "average_fill_price": number,
      "status": "pending" | "partially_filled" | "filled" | "cancelled",
      "fund_reservation": {
        "reserved_amount": number,
        "released_amount": number,
        "status": "active" | "partially_released" | "fully_released"
      },
      "trades": [
        {
          "id": "uuid",
          "quantity": number,
          "price": number,
          "total": number,
          "fee": number,
          "executed_at": "timestamp"
        }
      ]
    }
  }
}
```

### Market Data

#### GET /api/orderbook/:baseCurrency/:quoteCurrency
**Purpose**: Get order book depth and best prices
**Authentication**: Required
**Response**:
```typescript
{
  "success": true,
  "data": {
    "base_currency": "EUR" | "AOA",
    "quote_currency": "AOA" | "EUR",
    "best_bid": number,
    "best_ask": number,
    "bid_quantity": number,
    "ask_quantity": number,
    "spread": number,
    "spread_percentage": number,
    "mid_price": number,
    "timestamp": "timestamp"
  }
}
```

#### GET /api/trades/history
**Purpose**: Get user's trade execution history
**Authentication**: Required
**Query Parameters**:
- `currency_pair`: "EUR/AOA" | "AOA/EUR"
- `limit`: number (default: 100)
- `offset`: number (default: 0)

**Response**:
```typescript
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "side": "buy" | "sell",
      "base_currency": "EUR" | "AOA",
      "quote_currency": "AOA" | "EUR",
      "quantity": number,
      "price": number,
      "total": number,
      "fee": number,
      "executed_at": "timestamp",
      "counterparty_order_id": "uuid"
    }
  ]
}
```

#### GET /api/analytics/trading
**Purpose**: Get comprehensive trading analytics and market health
**Authentication**: Required
**Query Parameters**:
- `currency_pair`: "EUR/AOA" | "AOA/EUR"
- `period`: "1h" | "24h" | "7d" | "30d" (default: "24h")

**Response**:
```typescript
{
  "success": true,
  "data": {
    "currency_pair": "EUR/AOA",
    "time_period": "24 hours",
    "trade_statistics": {
      "total_trades": number,
      "total_volume": number,
      "total_value": number,
      "average_price": number,
      "price_range": {
        "min": number,
        "max": number
      },
      "price_volatility": number
    },
    "order_statistics": {
      "total_orders": number,
      "filled_orders": number,
      "fill_rate_percentage": number,
      "average_order_lifetime_seconds": number
    },
    "market_health": {
      "liquidity_score": "high" | "medium" | "low",
      "volatility_level": "high" | "medium" | "low"
    }
  }
}
```

## Core System APIs

### System Health

#### GET /api/test-db
**Purpose**: Test database connection and verify schema
**Authentication**: None required
**Response**:
```typescript
{
  "success": true,
  "message": "Database connection and tests successful!",
  "timestamp": "timestamp"
}
```

#### GET /api/health
**Purpose**: Health check endpoint
**Authentication**: None required
**Response**:
```typescript
{
  "success": true,
  "status": "healthy",
  "timestamp": "timestamp"
}
```

### User Management

#### GET /api/user/profile
**Purpose**: Get current user profile
**Authentication**: Required
**Response**:
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "clerk_user_id": "string",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "kyc_status": "not_started" | "in_progress" | "approved" | "rejected",
    "kyc_current_step": number,
    "created_at": "timestamp"
  }
}
```

#### GET /api/wallet/balances
**Purpose**: Get real wallet balances
**Authentication**: Required
**Response**:
```typescript
{
  "success": true,
  "data": {
    "AOA": {
      "available_balance": number,
      "reserved_balance": number,
      "total_balance": number
    },
    "EUR": {
      "available_balance": number,
      "reserved_balance": number,
      "total_balance": number
    }
  }
}
```

### Transaction Management

#### POST /api/transactions/send
**Purpose**: Process money transfers
**Authentication**: Required
**Request Body**:
```typescript
{
  "amount": number,
  "currency": "EUR" | "AOA",
  "recipient_email": "string",
  "description"?: "string"
}
```
**Response**:
```typescript
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "display_id": "string",
    "status": "completed",
    "amount": number,
    "currency": "EUR" | "AOA",
    "fee_amount": number,
    "net_amount": number
  }
}
```

#### GET /api/transactions/history
**Purpose**: Get user's transaction history
**Authentication**: Required
**Query Parameters**:
- `type`: "buy" | "sell" | "send" | "deposit" | "withdraw" | "exchange_buy" | "exchange_sell"
- `currency`: "EUR" | "AOA"
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response**:
```typescript
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "display_id": "string",
      "amount": number,
      "currency": "EUR" | "AOA",
      "type": "string",
      "status": "completed" | "pending" | "failed",
      "fee_amount": number,
      "net_amount": number,
      "created_at": "timestamp"
    }
  ]
}
```

## KYC APIs

### KYC Status

#### GET /api/kyc/status
**Purpose**: Get user KYC status and progress
**Authentication**: Required
**Response**:
```typescript
{
  "success": true,
  "data": {
    "kyc_status": "not_started" | "in_progress" | "approved" | "rejected",
    "current_step": number,
    "total_steps": 16,
    "completed_steps": number,
    "progress_percentage": number,
    "steps": [
      {
        "step_number": number,
        "step_name": "string",
        "status": "pending" | "completed" | "failed" | "skipped",
        "updated_at": "timestamp"
      }
    ]
  }
}
```

#### POST /api/kyc/submit-step
**Purpose**: Submit KYC step data
**Authentication**: Required
**Request Body**:
```typescript
{
  "step_number": number,
  "step_data": object // Step-specific data structure
}
```

## Webhook APIs

### Clerk Integration

#### POST /api/webhooks/clerk
**Purpose**: Handle Clerk user events (user.created, user.updated)
**Authentication**: Clerk webhook signature verification
**Request Body**: Clerk webhook payload

## Legacy APIs (Deprecated)

### ⚠️ These endpoints are deprecated and will be removed in future versions

#### POST /api/transactions/buy
**Purpose**: Process EUR → AOA with order matching (replaced by order book)
**Status**: DEPRECATED - Use `/api/orders/place` instead

#### POST /api/transactions/sell
**Purpose**: Create P2P exchange offers (replaced by order book)
**Status**: DEPRECATED - Use `/api/orders/place` instead

#### POST /api/exchange/rates
**Purpose**: Real-time rate calculation via order matching (replaced by order book)
**Status**: DEPRECATED - Use `/api/orderbook/:baseCurrency/:quoteCurrency` instead

#### GET /api/exchange-rate/banco-bai
**Purpose**: Banco BAI API (reference only for sell component)
**Status**: DEPRECATED - No longer used in order book system

---

**API Status**: ✅ PRODUCTION READY  
**Next Phase**: Frontend Integration
