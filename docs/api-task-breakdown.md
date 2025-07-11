# EmaPay API Development Task Breakdown

## 🎯 **Sprint Planning & Task Management**

### **Development Approach**
- **Sprint Duration**: 1-2 weeks per phase
- **Task Size**: 2-4 hours per individual task
- **Testing**: Parallel to development (TDD approach)
- **Integration**: Continuous with existing 66 database tests

---

## 📅 **Phase 1: Foundation & Authentication (Week 1)**

### **Sprint 1.1: Core Infrastructure (Day 1-2)**

#### **Task 1.1.1: Project Structure Setup**
- **Time**: 1 hour
- **Files to Create**:
  ```
  src/
  ├── lib/
  │   ├── supabase-server.ts
  │   ├── api-response.ts
  │   └── error-handler.ts
  ├── middleware/
  │   ├── auth.ts
  │   └── authorization.ts
  ├── types/
  │   ├── api.ts
  │   ├── auth.ts
  │   └── orders.ts
  └── schemas/
      └── validation.ts
  ```

#### **Task 1.1.2: Supabase Server Client**
- **Time**: 1 hour
- **Database Functions**: All 9 functions
- **Implementation**:
  ```typescript
  // lib/supabase-server.ts
  export const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  export const dbFunctions = {
    placeOrder: (params) => supabaseServer.rpc('place_order', params),
    cancelOrder: (params) => supabaseServer.rpc('cancel_order', params),
    // ... other functions
  };
  ```

#### **Task 1.1.3: API Response Standardization**
- **Time**: 1 hour
- **Implementation**:
  ```typescript
  // lib/api-response.ts
  export const successResponse = <T>(data: T, message?: string) => ({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
  
  export const errorResponse = (error: string, code: number) => ({
    success: false,
    error,
    code,
    timestamp: new Date().toISOString()
  });
  ```

### **Sprint 1.2: Authentication System (Day 3-4)**

#### **Task 1.2.1: Clerk Authentication Middleware**
- **Time**: 2 hours
- **Implementation**:
  ```typescript
  // middleware/auth.ts
  export async function authenticateRequest(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return userId;
  }
  ```

#### **Task 1.2.2: Authorization Middleware**
- **Time**: 2 hours
- **Database Functions**: User validation queries
- **Implementation**:
  ```typescript
  // middleware/authorization.ts
  export async function authorizeOrderAccess(userId: string, orderId: string) {
    const { data } = await supabaseServer.rpc('get_order_details', {
      p_order_id: orderId
    });
    
    if (data?.user_id !== userId) {
      throw new ForbiddenError('Access denied');
    }
  }
  ```

#### **Task 1.2.3: Error Handling System**
- **Time**: 1 hour
- **Implementation**:
  ```typescript
  // lib/error-handler.ts
  export class APIError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public code: string
    ) {
      super(message);
    }
  }
  
  export const handleAPIError = (error: unknown) => {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode);
    }
    // Handle other error types
  };
  ```

---

## 📅 **Phase 2: Order Management API (Week 2)**

### **Sprint 2.1: Order Placement (Day 1-3)**

#### **Task 2.1.1: Order Placement Schema**
- **Time**: 1 hour
- **Implementation**:
  ```typescript
  // schemas/order-placement.ts
  export const PlaceOrderSchema = z.object({
    side: z.enum(['buy', 'sell']),
    type: z.enum(['limit', 'market']),
    base_currency: z.enum(['EUR', 'AOA']),
    quote_currency: z.enum(['EUR', 'AOA']),
    quantity: z.number().positive().max(1000000),
    price: z.number().positive().optional()
  }).refine(data => {
    if (data.type === 'limit' && !data.price) {
      throw new Error('Price required for limit orders');
    }
    return true;
  });
  ```

#### **Task 2.1.2: Place Order Endpoint**
- **Time**: 3 hours
- **Database Functions**: `place_order`, `create_fund_reservation`
- **File**: `src/app/api/orders/place/route.ts`
- **Implementation**:
  ```typescript
  export async function POST(request: NextRequest) {
    try {
      const userId = await authenticateRequest(request);
      const body = await request.json();
      const validatedData = PlaceOrderSchema.parse(body);
      
      const { data } = await dbFunctions.placeOrder({
        p_user_id: userId,
        p_side: validatedData.side,
        p_type: validatedData.type,
        p_base_currency: validatedData.base_currency,
        p_quote_currency: validatedData.quote_currency,
        p_quantity: validatedData.quantity,
        p_price: validatedData.price
      });
      
      return NextResponse.json(successResponse(data));
    } catch (error) {
      return NextResponse.json(handleAPIError(error));
    }
  }
  ```

#### **Task 2.1.3: Order Placement Tests**
- **Time**: 2 hours
- **File**: `tests/api/orders/place.test.ts`
- **Integration**: Uses existing database test setup

### **Sprint 2.2: Order Management (Day 4-5)**

#### **Task 2.2.1: Order Cancellation Endpoint**
- **Time**: 2 hours
- **Database Functions**: `cancel_order`, `release_fund_reservation`
- **File**: `src/app/api/orders/[orderId]/route.ts`

#### **Task 2.2.2: Order History Endpoints**
- **Time**: 3 hours
- **Database Functions**: `get_user_orders`, `get_order_details`
- **Files**: 
  - `src/app/api/orders/route.ts` (GET)
  - `src/app/api/orders/[orderId]/route.ts` (GET)

#### **Task 2.2.3: Order Management Tests**
- **Time**: 2 hours
- **Files**: 
  - `tests/api/orders/cancel.test.ts`
  - `tests/api/orders/history.test.ts`

---

## 📅 **Phase 3: Market Data API (Week 3)**

### **Sprint 3.1: Price Discovery (Day 1-2)**

#### **Task 3.1.1: Best Prices Endpoint**
- **Time**: 2 hours
- **Database Functions**: `get_best_prices`
- **File**: `src/app/api/market/prices/[pair]/route.ts`

#### **Task 3.1.2: Price Discovery Tests**
- **Time**: 1 hour
- **File**: `tests/api/market/prices.test.ts`

### **Sprint 3.2: Order Book Data (Day 3-4)**

#### **Task 3.2.1: Order Book Depth Endpoint**
- **Time**: 3 hours
- **Database Functions**: `get_order_book_depth`
- **File**: `src/app/api/market/depth/[pair]/route.ts`

#### **Task 3.2.2: Trade History Endpoint**
- **Time**: 2 hours
- **Database Functions**: `get_recent_trades`
- **File**: `src/app/api/market/trades/[pair]/route.ts`

#### **Task 3.2.3: Market Data Tests**
- **Time**: 2 hours
- **Files**: 
  - `tests/api/market/depth.test.ts`
  - `tests/api/market/trades.test.ts`

---

## 📅 **Phase 4: Wallet & Balance Management (Week 4)**

### **Sprint 4.1: Balance APIs (Day 1-3)**

#### **Task 4.1.1: Balance Inquiry Endpoints**
- **Time**: 3 hours
- **Database Functions**: Wallet queries
- **Files**: 
  - `src/app/api/wallet/balances/route.ts`
  - `src/app/api/wallet/balance/[currency]/route.ts`

#### **Task 4.1.2: Transaction History API**
- **Time**: 3 hours
- **Database Functions**: Transaction queries
- **File**: `src/app/api/wallet/transactions/route.ts`

#### **Task 4.1.3: Wallet API Tests**
- **Time**: 2 hours
- **Files**: 
  - `tests/api/wallet/balances.test.ts`
  - `tests/api/wallet/transactions.test.ts`

---

## 📅 **Phase 5: Real-time Features (Week 5-6)**

### **Sprint 5.1: WebSocket Infrastructure (Day 1-3)**

#### **Task 5.1.1: WebSocket Server Setup**
- **Time**: 4 hours
- **File**: `src/lib/websocket-server.ts`
- **Implementation**: Custom WebSocket server with authentication

#### **Task 5.1.2: Connection Management**
- **Time**: 2 hours
- **File**: `src/lib/connection-manager.ts`
- **Features**: User subscriptions, cleanup, error handling

### **Sprint 5.2: Real-time Updates (Day 4-6)**

#### **Task 5.2.1: Order Book Live Updates**
- **Time**: 3 hours
- **Database Functions**: `get_order_book_depth` + Supabase real-time
- **File**: `src/lib/orderbook-updates.ts`

#### **Task 5.2.2: Trade Execution Notifications**
- **Time**: 2 hours
- **Database Functions**: Trade table subscriptions
- **File**: `src/lib/trade-notifications.ts`

#### **Task 5.2.3: Real-time Tests**
- **Time**: 3 hours
- **File**: `tests/api/websocket.test.ts`

---

## 📅 **Phase 6: Testing & Documentation (Week 7)**

### **Sprint 6.1: Comprehensive Testing (Day 1-4)**

#### **Task 6.1.1: API Integration Tests**
- **Time**: 4 hours
- **Files**: Complete test suite for all endpoints
- **Integration**: With existing 66 database tests

#### **Task 6.1.2: End-to-End Testing**
- **Time**: 3 hours
- **File**: `tests/e2e/order-flow.test.ts`
- **Scenarios**: Complete order lifecycle testing

### **Sprint 6.2: Documentation (Day 5)**

#### **Task 6.2.1: OpenAPI Specification**
- **Time**: 3 hours
- **File**: `docs/openapi.yaml`
- **Tool**: Generate with swagger-jsdoc

#### **Task 6.2.2: API Documentation**
- **Time**: 2 hours
- **File**: `docs/api-documentation.md`
- **Content**: Usage examples, authentication guide

---

## 🎯 **Success Criteria & Validation**

### **Phase Completion Checklist**

#### **Phase 1 Complete When:**
- [ ] All authentication middleware working
- [ ] Error handling standardized
- [ ] Database connection established
- [ ] Basic API structure in place

#### **Phase 2 Complete When:**
- [ ] Order placement endpoint working
- [ ] Order cancellation functional
- [ ] Order history retrievable
- [ ] All order tests passing

#### **Phase 3 Complete When:**
- [ ] Price discovery endpoints working
- [ ] Order book depth retrievable
- [ ] Trade history accessible
- [ ] Market data tests passing

#### **Phase 4 Complete When:**
- [ ] Balance inquiry working
- [ ] Transaction history accessible
- [ ] Wallet tests passing

#### **Phase 5 Complete When:**
- [ ] WebSocket connections stable
- [ ] Real-time updates working
- [ ] Live notifications functional
- [ ] Real-time tests passing

#### **Phase 6 Complete When:**
- [ ] All API tests passing (target: 90%+ coverage)
- [ ] Integration with 66 database tests successful
- [ ] OpenAPI documentation complete
- [ ] E2E scenarios validated

---

## 📊 **Resource Allocation**

### **Development Team Structure**
- **Backend Developer**: API endpoints, database integration
- **Frontend Developer**: WebSocket client, real-time features
- **QA Engineer**: Testing, validation, documentation
- **DevOps**: CI/CD integration, deployment

### **Timeline Summary**
- **Total Duration**: 7 weeks
- **Critical Path**: Phases 1-2 (authentication + orders)
- **Parallel Work**: Testing alongside development
- **Buffer Time**: 20% added for unexpected issues

This task breakdown provides a clear roadmap for implementing the EmaPay order book API with our production-ready database system.
