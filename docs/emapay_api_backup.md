# EmaPay API - Clean & Simple Architecture

## 📋 **Executive Summary**

This document outlines a **clean, simple API architecture** for EmaPay that focuses on core functionality without over-engineering. The API provides essential endpoints for P2P transfers, wallet management, and currency exchange using proven patterns and minimal complexity.

## 🎯 **Design Principles**

1. **Simplicity First** - Minimal functions, maximum value
2. **Security at Boundaries** - Auth middleware + input validation, not security theater
3. **Standard Patterns** - RESTful design following industry best practices
4. **Performance Focus** - Fast, efficient operations with minimal overhead
5. **Maintainable Code** - Easy to understand, debug, and extend

---

## 🏗️ **Clean Architecture**

### **Technology Stack**
- **Framework**: Next.js 14 with App Router
- **Authentication**: Clerk JWT with middleware
- **Database**: Supabase PostgreSQL with existing functions
- **Validation**: Zod schemas at API boundaries
- **Rate Limiting**: Simple Redis-based limiting

### **Core Database Functions (8 total)**
```sql
-- User Management
find_user_for_transfer(identifier)     -- Find users for transfers

-- Wallet Operations
get_wallet_balance(user_id, currency)  -- Get wallet balance

-- Security
set_transfer_pin(user_id, pin)         -- Set transfer PIN
verify_transfer_pin(user_id, pin)      -- Verify PIN

-- Transfers
send_p2p_transfer(...)                 -- Send P2P transfer with anti-fraud

-- Trading
place_limit_order(...)                 -- Place limit order
get_market_summary(...)                -- Get market data

-- History
get_transaction_history(user_id)       -- Get transaction history
```

### **Simple API Structure (15 endpoints)**
```
/api/v1/
├── auth/
│   └── me                   # GET - Current user info
├── users/
│   └── search               # GET - Find users for transfers
├── wallets/
│   ├── balance              # GET - Get all wallet balances
│   └── {currency}           # GET - Get specific currency balance
├── transfers/
│   ├── send                 # POST - Send P2P transfer
│   └── history              # GET - Transfer history
├── orders/
│   ├── limit                # POST - Place limit order
│   ├── market               # POST - Execute market order
│   └── history              # GET - Order history
├── exchange-rates/
│   └── midpoint             # GET - Midpoint exchange rates
├── market/
│   └── depth                # GET - Order book depth
├── security/
│   ├── pin                  # POST - Set/update PIN
│   └── pin/verify           # POST - Verify PIN
└── health/
    └── status               # GET - System health
```

---

## 🎯 **Core Function Mapping**

| Database Function | API Endpoint | Purpose |
|------------------|--------------|---------|
| `find_user_for_transfer` | `GET /api/v1/users/search` | Find users for transfers |
| `get_wallet_balance` | `GET /api/v1/wallets/balance` | Get all wallet balances |
| `get_wallet_balance` | `GET /api/v1/wallets/{currency}` | Get specific currency balance |
| `set_transfer_pin` | `POST /api/v1/security/pin` | Set/update transfer PIN |
| `verify_transfer_pin` | `POST /api/v1/security/pin/verify` | Verify transfer PIN |
| `send_p2p_transfer` | `POST /api/v1/transfers/send` | Send P2P transfer with anti-fraud |
| `get_transaction_history` | `GET /api/v1/transfers/history` | Get transfer history |
| `place_limit_order` | `POST /api/v1/orders/limit` | Place limit order |
| `execute_market_order` | `POST /api/v1/orders/market` | Execute market order |
| `get_user_order_history` | `GET /api/v1/orders/history` | Get order history |
| `get_market_summary` | `GET /api/v1/market/summary` | Get market data |
| `get_market_spread` | `GET /api/v1/market/depth` | Get order book depth |

**Total: 8 core functions → 15 clean endpoints**