# EmaPay API Quick Reference Guide

## 🚀 **Getting Started**

### **Prerequisites**
- ✅ EmaPay order book database deployed (66/66 tests passing)
- ✅ Supabase project 'ema' configured
- ✅ Clerk authentication set up
- ✅ Next.js 15.3.3 project structure

### **Database Functions Available**
```typescript
// 9 Production-Ready Functions
const dbFunctions = {
  // Order Management
  place_order(userId, side, type, baseCurrency, quoteCurrency, quantity, price?)
  cancel_order(userId, orderId)
  match_order(orderId) // Automatic on placement
  
  // Trade Execution
  execute_trade_enhanced(buyOrderId, sellOrderId, quantity, price)
  
  // Fund Management
  create_fund_reservation(userId, currency, amount, purpose, referenceId?)
  release_fund_reservation(reservationId)
  
  // Market Data
  get_best_prices(baseCurrency, quoteCurrency)
  get_order_book_depth(baseCurrency, quoteCurrency, limit)
  get_recent_trades(baseCurrency, quoteCurrency, limit)
}
```

---

## 📡 **API Endpoint Reference**

### **Authentication**
```bash
# All protected endpoints require Clerk JWT
Authorization: Bearer <clerk_jwt_token>
```

### **Order Management**
```bash
# Place Order
POST /api/orders/place
{
  "side": "buy|sell",
  "type": "limit|market", 
  "base_currency": "EUR|AOA",
  "quote_currency": "EUR|AOA",
  "quantity": 100,
  "price": 1200 // Optional for market orders
}

# Cancel Order
DELETE /api/orders/{orderId}

# Get Orders
GET /api/orders?limit=20&offset=0&status=pending

# Get Order Details
GET /api/orders/{orderId}
```

### **Market Data**
```bash
# Best Prices
GET /api/market/prices/EUR-AOA

# Order Book Depth
GET /api/market/depth/EUR-AOA?limit=10

# Recent Trades
GET /api/market/trades/EUR-AOA?limit=50

# Market Statistics
GET /api/market/stats/EUR-AOA
```

### **Wallet & Balances**
```bash
# All Balances
GET /api/wallet/balances

# Specific Currency
GET /api/wallet/balance/EUR

# Transaction History
GET /api/wallet/transactions?limit=50&type=trade
```

---

## 🔄 **WebSocket Real-time**

### **Connection**
```javascript
const ws = new WebSocket('wss://api.emapay.com/ws', {
  headers: { 'Authorization': `Bearer ${clerkToken}` }
});
```

### **Subscriptions**
```javascript
// Order Book Updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'orderbook',
  pair: 'EUR/AOA'
}));

// Trade Notifications
ws.send(JSON.stringify({
  type: 'subscribe', 
  channel: 'trades',
  pair: 'EUR/AOA'
}));

// Personal Order Updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'orders'
}));
```

---

## 🧪 **Testing Integration**

### **Database Test Integration**
```typescript
// Use existing test setup
import { setupTestDatabase, createTestUser } from '../database/setup';

beforeEach(async () => {
  await setupTestDatabase(); // Leverages 66 existing tests
  testUserId = await createTestUser();
});
```

### **API Test Example**
```typescript
describe('Order Placement API', () => {
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
  });
});
```

---

## 🔧 **Development Commands**

### **Database Operations**
```bash
# Test database functions
npm run test:database

# Reset local database
node scripts/reset-database.js

# Apply migrations
node scripts/apply-migrations.js

# Test remote database
node scripts/test-remote-database.js
```

### **API Development**
```bash
# Start development server
npm run dev

# Run API tests
npm run test:api

# Run all tests
npm test

# Type checking
npx tsc --noEmit
```

---

## 🔍 **Debugging & Monitoring**

### **Database Function Debugging**
```typescript
// Test individual functions
const result = await supabase.rpc('place_order', {
  p_user_id: 'test-user-id',
  p_side: 'buy',
  p_type: 'limit',
  p_base_currency: 'EUR',
  p_quote_currency: 'AOA',
  p_quantity: 100,
  p_price: 1200
});

console.log('Function result:', result);
```

### **API Response Debugging**
```typescript
// Standard error handling
try {
  const result = await dbFunctions.placeOrder(params);
  return successResponse(result);
} catch (error) {
  console.error('API Error:', error);
  return errorResponse(error.message, 500);
}
```

---

## 📊 **Performance Guidelines**

### **Response Time Targets**
- **Order Placement**: < 200ms
- **Market Data**: < 100ms  
- **WebSocket Updates**: < 50ms
- **Database Functions**: < 100ms

### **Optimization Tips**
```typescript
// Cache frequently accessed data
const cacheKey = `orderbook:${pair}:${limit}`;
const cached = await redis.get(cacheKey);

// Use database indexes effectively
// Our schema includes optimized indexes for:
// - Order book matching (price, time)
// - User orders (user_id, status)
// - Trade history (currency_pair, executed_at)

// Batch operations when possible
const orders = await Promise.all([
  dbFunctions.getUserOrders(userId),
  dbFunctions.getWalletBalances(userId)
]);
```

---

## 🔐 **Security Checklist**

### **Authentication & Authorization**
- [ ] All protected routes require valid Clerk JWT
- [ ] User can only access their own data
- [ ] Order ownership validated before operations
- [ ] Proper error messages (no data leakage)

### **Input Validation**
- [ ] All inputs validated with Zod schemas
- [ ] SQL injection prevention (parameterized queries)
- [ ] Rate limiting implemented
- [ ] CORS properly configured

### **Data Protection**
- [ ] Sensitive data not logged
- [ ] Database credentials secured
- [ ] API keys in environment variables
- [ ] HTTPS enforced in production

---

## 🎯 **Common Patterns**

### **Standard API Route Structure**
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const userId = await authenticateRequest(request);
    
    // 2. Validate input
    const body = await request.json();
    const validatedData = Schema.parse(body);
    
    // 3. Authorize operation (if needed)
    await authorizeOperation(userId, validatedData);
    
    // 4. Execute database function
    const result = await dbFunctions.someFunction(params);
    
    // 5. Return success response
    return NextResponse.json(successResponse(result));
  } catch (error) {
    // 6. Handle errors
    return NextResponse.json(handleAPIError(error));
  }
}
```

### **Database Function Call Pattern**
```typescript
const callDatabaseFunction = async (functionName: string, params: object) => {
  const { data, error } = await supabase.rpc(functionName, params);
  
  if (error) {
    throw new DatabaseError(`${functionName} failed: ${error.message}`);
  }
  
  return data;
};
```

---

## 📚 **Additional Resources**

### **Documentation Files**
- `docs/api-development-roadmap.md` - Complete development plan
- `docs/api-technical-specification.md` - Technical details
- `docs/api-task-breakdown.md` - Sprint planning
- `docs/github-actions-setup.md` - CI/CD configuration

### **Database Documentation**
- `docs/database-schema.md` - Complete schema reference
- `tests/database/` - 66 passing database tests
- `supabase/migrations/` - Production migration files

### **External Links**
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk Authentication](https://clerk.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Zod Validation](https://zod.dev/)

This quick reference provides everything needed to start developing the EmaPay order book API efficiently! 🚀
