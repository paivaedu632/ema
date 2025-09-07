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
├── market/
│   ├── summary              # GET - Market summary
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

---

## 🔐 **Security Strategy**

### **Security at Boundaries**
1. **Auth Middleware** - Clerk JWT validation for all protected routes
2. **Input Validation** - Zod schemas at API entry points
3. **Rate Limiting** - Simple Redis-based per-user limits
4. **Database Security** - Parameterized queries (built-in SQL injection prevention)

### **Anti-Fraud System**
- **PIN Verification** - Required for all transfers (handled by `send_p2p_transfer`)
- **Daily Limits** - Built into transfer function
- **Account Lockout** - Built into PIN verification function

### **Simple Error Handling**
```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}
```

---

## 🚀 **Simple Implementation Plan**

### **Week 1: Core Setup**
- [ ] Next.js API routes setup
- [ ] Clerk authentication middleware
- [ ] Database connection
- [ ] Basic error handling
- [ ] Health check endpoint

### **Week 2: Core Features**
- [ ] User search endpoint
- [ ] Wallet balance endpoints
- [ ] PIN management (set/verify)
- [ ] Basic rate limiting

### **Week 3: Transfers & Trading**
- [ ] P2P transfer endpoint (using existing `send_p2p_transfer`)
- [ ] Transfer history
- [ ] Order placement (limit/market)
- [ ] Order history

### **Week 4: Market Data & Polish**
- [ ] Market summary endpoint
- [ ] Order book depth
- [ ] API documentation
- [ ] Testing and bug fixes

**Total: 4 weeks, 15 endpoints, 8 database functions**

---

## 📝 **Clean API Specifications**

### **1. Authentication**

#### **GET /api/v1/auth/me**
```typescript
Response: {
  success: true
  data: {
    id: string
    email: string
    name: string
  }
}
```

### **2. User Search**

#### **GET /api/v1/users/search**
```typescript
Query: ?q=email@example.com

Response: {
  success: true
  data: {
    found: boolean
    user?: {
      name: string
      email: string
    }
  }
}
```

### **3. Wallet Balance**

#### **GET /api/v1/wallets/balance**
```typescript
Response: {
  success: true
  data: {
    AOA: number
    EUR: number
  }
}
```

#### **GET /api/v1/wallets/{currency}**
```typescript
Response: {
  success: true
  data: {
    currency: 'AOA' | 'EUR'
    balance: number
  }
}
```

### **4. Security**

#### **POST /api/v1/security/pin**
```typescript
Request: {
  pin: string  // 6 digits
}

Response: {
  success: true
  data: { pinSet: true }
}
```

#### **POST /api/v1/security/pin/verify**
```typescript
Request: {
  pin: string
}

Response: {
  success: true
  data: { valid: boolean }
}
```

### **5. Transfers**

#### **POST /api/v1/transfers/send**
```typescript
Request: {
  recipientEmail: string
  currency: 'AOA' | 'EUR'
  amount: number
  pin: string
  description?: string
}

Response: {
  success: true
  data: {
    transferId: string
    status: 'completed'
    recipient: { name: string, email: string }
  }
}
```

#### **GET /api/v1/transfers/history**
```typescript
Query: ?limit=50&currency=EUR

Response: {
  success: true
  data: {
    transfers: Array<{
      id: string
      type: 'sent' | 'received'
      amount: number
      currency: string
      counterparty: { name: string, email: string }
      timestamp: string
    }>
  }
}
```

### **6. Trading**

#### **POST /api/v1/orders/limit**
```typescript
Request: {
  side: 'buy' | 'sell'
  baseCurrency: 'EUR'
  quoteCurrency: 'AOA'
  quantity: number
  price: number
}

Response: {
  success: true
  data: {
    orderId: string
    status: 'pending'
  }
}
```

#### **POST /api/v1/orders/market**
```typescript
Request: {
  side: 'buy' | 'sell'
  baseCurrency: 'EUR'
  quoteCurrency: 'AOA'
  quantity: number
}

Response: {
  success: true
  data: {
    orderId: string
    status: 'completed'
    filledPrice: number
  }
}
```

#### **GET /api/v1/orders/history**
```typescript
Response: {
  success: true
  data: {
    orders: Array<{
      id: string
      side: string
      quantity: number
      price: number
      status: string
      timestamp: string
    }>
  }
}
```

### **7. Market Data**

#### **GET /api/v1/market/summary**
```typescript
Response: {
  success: true
  data: {
    currentPrice: number
    change24h: number
    volume24h: number
  }
}
```

#### **GET /api/v1/market/depth**
```typescript
Response: {
  success: true
  data: {
    bids: Array<[price: number, quantity: number]>
    asks: Array<[price: number, quantity: number]>
  }
}
```

### **8. Health**

#### **GET /api/v1/health/status**
```typescript
Response: {
  status: 'healthy'
  timestamp: string
}
```

---

## 🔧 **Implementation Details**

### **Middleware Stack**
1. **CORS** - Basic CORS handling
2. **Auth** - Clerk JWT validation
3. **Rate Limiting** - Simple Redis-based limiting
4. **Validation** - Zod schema validation
5. **Error Handling** - Clean error responses

### **Database Integration**
- **Direct Function Calls** - Call existing secure functions directly
- **Connection Pooling** - Standard Supabase connection pooling
- **Error Handling** - Convert database errors to clean API responses

### **Security Approach**
- **Authentication** - Clerk JWT at API boundaries
- **Input Validation** - Zod schemas for all inputs
- **Rate Limiting** - Prevent abuse
- **Database Security** - Leverage existing secure functions (PIN verification, daily limits, etc.)

---

## 🎯 **Success Criteria**

### **Functional Requirements**
- ✅ 15 clean, focused endpoints
- ✅ 8 core database functions properly integrated
- ✅ PIN verification for transfers (built into `send_p2p_transfer`)
- ✅ Daily limits enforced (built into transfer function)
- ✅ Clean error handling

### **Performance Requirements**
- ✅ < 200ms average response time
- ✅ Support for 100+ concurrent users
- ✅ < 1% error rate

### **Security Requirements**
- ✅ Proper authentication on all protected endpoints
- ✅ Input validation on all endpoints
- ✅ Rate limiting to prevent abuse
- ✅ Leverage existing anti-fraud system

### **Quality Requirements**
- ✅ Clean, maintainable code
- ✅ Simple API documentation
- ✅ Basic monitoring and health checks

---

## 📋 **Next Steps**

### **Week 1: Setup**
1. **Review and approve** this simplified plan
2. **Set up development environment** with Next.js and Supabase
3. **Configure Clerk authentication**
4. **Create basic project structure**

### **Week 2-4: Implementation**
5. **Implement 15 core endpoints** using existing database functions
6. **Add proper error handling and validation**
7. **Set up basic rate limiting**
8. **Write API documentation**
9. **Test all endpoints**

### **Production Ready**
- **15 clean endpoints** serving real user needs
- **8 proven database functions** handling all core operations
- **Simple, maintainable codebase** that can be easily extended
- **Fast development cycle** - 4 weeks vs 16 weeks

---

## 💡 **Key Lessons**

### **What We Learned**
- **More functions ≠ better security** - Parameterized queries already prevent SQL injection
- **Simplicity wins** - 15 endpoints can handle all user needs
- **Focus on users** - Build what people actually need, not what sounds impressive
- **Maintenance matters** - Simple code is easier to debug, extend, and maintain

### **The Right Approach**
1. **Start with user needs** - What do people actually want to do?
2. **Use proven patterns** - Standard REST APIs, not custom abstractions
3. **Leverage existing security** - Don't reinvent the wheel
4. **Keep it simple** - Complexity is the enemy of reliability

This clean architecture serves real users efficiently while remaining maintainable and secure.