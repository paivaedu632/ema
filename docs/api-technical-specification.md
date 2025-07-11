# EmaPay Order Book API Technical Specification

## 🏗️ **Architecture Overview**

### **Technology Stack**
- **Framework**: Next.js 15.3.3 with App Router
- **Database**: Supabase PostgreSQL with 9 deployed functions
- **Authentication**: Clerk JWT-based authentication
- **Validation**: Zod schemas for type-safe validation
- **Real-time**: Supabase real-time + WebSocket
- **Testing**: Jest with 66 existing database tests

### **Database Integration**
The API leverages our production-deployed database functions:

| Function | Purpose | API Usage |
|----------|---------|-----------|
| `place_order` | Order placement | POST /api/orders/place |
| `cancel_order` | Order cancellation | DELETE /api/orders/{id} |
| `match_order` | Order matching | Automatic on placement |
| `execute_trade_enhanced` | Trade execution | Automatic matching |
| `create_fund_reservation` | Fund locking | Automatic on orders |
| `release_fund_reservation` | Fund release | Automatic on cancel |
| `get_best_prices` | Price discovery | GET /api/market/prices |
| `get_order_book_depth` | Order book data | GET /api/market/depth |
| `get_recent_trades` | Trade history | GET /api/market/trades |

---

## 🔐 **Authentication & Authorization**

### **Authentication Flow**
```typescript
// middleware/auth.ts
export async function authenticateUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const { userId } = await verifyToken(token);
  return userId;
}
```

### **Authorization Patterns**
```typescript
// middleware/authorization.ts
export async function authorizeOrderAccess(userId: string, orderId: string) {
  const order = await supabase.rpc('get_order_details', { p_order_id: orderId });
  if (order.user_id !== userId) {
    throw new UnauthorizedError('Order access denied');
  }
}
```

---

## 📡 **API Endpoint Specifications**

### **Order Management Endpoints**

#### **POST /api/orders/place**
```typescript
// Request Schema
const PlaceOrderSchema = z.object({
  side: z.enum(['buy', 'sell']),
  type: z.enum(['limit', 'market']),
  base_currency: z.enum(['EUR', 'AOA']),
  quote_currency: z.enum(['EUR', 'AOA']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(), // Required for limit orders
});

// Response
{
  success: true,
  data: {
    order_id: "uuid",
    status: "pending" | "filled" | "partially_filled",
    created_at: "timestamp",
    reserved_amount: number
  }
}
```

#### **DELETE /api/orders/{orderId}**
```typescript
// Response
{
  success: true,
  data: {
    order_id: "uuid",
    status: "cancelled",
    released_amount: number,
    cancelled_at: "timestamp"
  }
}
```

#### **GET /api/orders**
```typescript
// Query Parameters
{
  limit?: number = 20,
  offset?: number = 0,
  status?: 'pending' | 'filled' | 'partially_filled' | 'cancelled',
  currency_pair?: 'EUR/AOA' | 'AOA/EUR',
  from_date?: string,
  to_date?: string
}

// Response
{
  success: true,
  data: {
    orders: Order[],
    total_count: number,
    has_more: boolean
  }
}
```

### **Market Data Endpoints**

#### **GET /api/market/prices/{pair}**
```typescript
// Response
{
  success: true,
  data: {
    currency_pair: "EUR/AOA",
    best_bid: number | null,
    best_ask: number | null,
    spread: number | null,
    last_updated: "timestamp"
  }
}
```

#### **GET /api/market/depth/{pair}**
```typescript
// Query Parameters
{
  limit?: number = 10 // Number of price levels
}

// Response
{
  success: true,
  data: {
    currency_pair: "EUR/AOA",
    bids: [{ price: number, quantity: number, count: number }],
    asks: [{ price: number, quantity: number, count: number }],
    timestamp: "timestamp"
  }
}
```

#### **GET /api/market/trades/{pair}**
```typescript
// Query Parameters
{
  limit?: number = 50,
  from_date?: string,
  to_date?: string
}

// Response
{
  success: true,
  data: {
    trades: [{
      trade_id: "uuid",
      price: number,
      quantity: number,
      side: "buy" | "sell",
      executed_at: "timestamp"
    }],
    total_count: number
  }
}
```

### **Wallet Endpoints**

#### **GET /api/wallet/balances**
```typescript
// Response
{
  success: true,
  data: {
    balances: [{
      currency: "EUR" | "AOA",
      available_balance: number,
      reserved_balance: number,
      total_balance: number
    }],
    last_updated: "timestamp"
  }
}
```

---

## 🔄 **Real-time Features**

### **WebSocket Connection**
```typescript
// WebSocket Authentication
const ws = new WebSocket('wss://api.emapay.com/ws', {
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  }
});

// Subscription Messages
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'orderbook',
  pair: 'EUR/AOA'
}));
```

### **Real-time Events**
```typescript
// Order Book Updates
{
  type: 'orderbook_update',
  data: {
    currency_pair: 'EUR/AOA',
    bids: [{ price: number, quantity: number }],
    asks: [{ price: number, quantity: number }],
    timestamp: 'timestamp'
  }
}

// Trade Execution
{
  type: 'trade_executed',
  data: {
    trade_id: 'uuid',
    user_id: 'uuid', // Only sent to involved users
    price: number,
    quantity: number,
    side: 'buy' | 'sell',
    executed_at: 'timestamp'
  }
}

// Order Status Update
{
  type: 'order_status',
  data: {
    order_id: 'uuid',
    status: 'filled' | 'partially_filled' | 'cancelled',
    filled_quantity: number,
    remaining_quantity: number,
    updated_at: 'timestamp'
  }
}
```

---

## ⚡ **Performance Optimizations**

### **Database Query Optimization**
```typescript
// Efficient order book queries with caching
const getOrderBookDepth = async (pair: string, limit: number) => {
  const cacheKey = `orderbook:${pair}:${limit}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) return JSON.parse(cached);
  
  const result = await supabase.rpc('get_order_book_depth', {
    p_base_currency: pair.split('/')[0],
    p_quote_currency: pair.split('/')[1],
    p_limit: limit
  });
  
  await redis.setex(cacheKey, 5, JSON.stringify(result)); // 5 second cache
  return result;
};
```

### **Rate Limiting**
```typescript
// Rate limiting by user and endpoint
const rateLimiter = {
  'POST /api/orders/place': { requests: 10, window: 60 }, // 10 orders per minute
  'GET /api/market/depth': { requests: 100, window: 60 }, // 100 requests per minute
  'WebSocket': { connections: 5, window: 300 } // 5 connections per 5 minutes
};
```

---

## 🧪 **Testing Strategy**

### **API Test Structure**
```typescript
// tests/api/orders.test.ts
describe('Order Management API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await createTestUser();
  });

  test('should place valid limit order', async () => {
    const response = await request(app)
      .post('/api/orders/place')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        side: 'buy',
        type: 'limit',
        base_currency: 'EUR',
        quote_currency: 'AOA',
        quantity: 100,
        price: 1200
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.order_id).toBeDefined();
  });
});
```

### **Integration with Database Tests**
```typescript
// Leverage existing 66 database tests
import { setupTestDatabase } from '../database/setup';

beforeAll(async () => {
  await setupTestDatabase(); // Uses same setup as database tests
});
```

---

## 🔒 **Security Measures**

### **Input Validation**
```typescript
// All inputs validated with Zod schemas
const validateOrderPlacement = (data: unknown) => {
  return PlaceOrderSchema.parse(data); // Throws on invalid input
};
```

### **SQL Injection Prevention**
```typescript
// All database calls use parameterized functions
await supabase.rpc('place_order', {
  p_user_id: userId,
  p_side: side,
  p_type: type,
  // ... other parameters
});
```

### **Authorization Checks**
```typescript
// Every protected endpoint checks user authorization
const authorizeRequest = async (userId: string, resourceId: string) => {
  const hasAccess = await checkResourceAccess(userId, resourceId);
  if (!hasAccess) {
    throw new ForbiddenError('Access denied');
  }
};
```

---

## 📊 **Monitoring & Observability**

### **API Metrics**
- Request/response times per endpoint
- Error rates and types
- Database function execution times
- WebSocket connection counts
- Order placement/execution rates

### **Health Checks**
```typescript
// GET /api/health
{
  status: 'healthy',
  database: 'connected',
  functions: 'operational',
  websocket: 'active',
  timestamp: 'timestamp'
}
```

This specification provides the technical foundation for implementing the API roadmap with our production-ready database system.
