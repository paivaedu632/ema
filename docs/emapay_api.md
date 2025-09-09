# EmaPay API - Clean & Simple Architecture
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

## Implementation Approach

### 1. Standard Next.js App Router Structure
```
app/api/v1/
├── auth/me/route.ts
├── users/search/route.ts
├── wallets/balance/route.ts
├── wallets/[currency]/route.ts
├── transfers/send/route.ts
├── transfers/history/route.ts
├── orders/limit/route.ts
├── orders/market/route.ts
├── orders/history/route.ts
├── market/summary/route.ts
├── market/depth/route.ts
├── security/pin/route.ts
├── security/pin/verify/route.ts
└── health/status/route.ts
```

### 2. Authentication Middleware
Create one auth middleware that:
- Validates Clerk JWT tokens
- Extracts user ID
- Passes user context to endpoints
- Handles auth failures consistently

### 3. Database Integration Pattern
Each endpoint follows the same pattern:
1. **Validate input** (Zod schema)
2. **Check authentication** (middleware)
3. **Call database function** (your existing functions)
4. **Return standardized response** (success/error format)

### 4. Error Handling Strategy
- One global error handler
- Consistent error response format
- No custom sanitization (use standard practices)
- Log errors without exposing internals

### 5. Input Validation Approach
- Zod schemas for each endpoint
- Standard validation (no custom "secure" validators)
- Sanitize at the boundary, trust internally

### 6. Response Format Standard
```typescript
// Success
{ success: true, data: {...}, message: "..." }

// Error  
{ success: false, error: "...", code: "..." }
```

### 7. Security Implementation
- **Authentication**: Clerk middleware on protected routes
- **Authorization**: User ID validation in business logic
- **Input validation**: Zod schemas
- **Rate limiting**: Simple Redis-based limiting
- **PIN verification**: Only for sensitive operations (transfers)

### 8. Database Function Usage
Each endpoint calls one of your 8 core functions:
- `create_user()`
- `find_user_for_transfer()` 
- `get_wallet_balance()`
- `place_limit_order()`
- `execute_market_order()`
- `send_p2p_transfer()`
- `get_transfer_history()`
- `get_user_order_history()`

### 9. Implementation Priority Order
1. **Auth endpoints** (me)
2. **Wallet endpoints** (balance, currency)
3. **Transfer endpoints** (send, history)
4. **Order endpoints** (limit, market, history)
5. **Market endpoints** (summary, depth)
6. **Security endpoints** (pin operations)
7. **Health endpoint** (status)

### 10. Testing Strategy
- Unit tests for each endpoint
- Integration tests for complete user flows
- Load testing for critical paths
- Manual testing with real scenarios

## Key Implementation Principles

**Keep it simple**: Each endpoint does one thing well
**Fail fast**: Validate early, return errors quickly  
**Trust your database**: Your functions handle business logic
**Standard patterns**: Use proven Next.js/TypeScript patterns
**Minimal middleware**: Only authentication and basic validation

## What NOT to implement
- Custom security validation layers
- Multiple ways to do the same thing
- Complex error sanitization
- Redundant database functions
- Over-abstracted helper utilities

# Create API Implementation Task List

## Phase 1: Foundation Setup (Day 1-2)

### 1.1 Project Structure
- [ ] Set up Next.js 15 project with App Router
- [ ] Configure TypeScript with strict settings
- [ ] Set up Supabase client configuration
- [ ] Configure environment variables (.env.local)
- [ ] Set up basic folder structure for API routes

### 1.2 Core Dependencies
- [ ] Install and configure Clerk for authentication
- [ ] Install Zod for input validation
- [ ] Install Supabase client library
- [ ] Set up error handling utilities
- [ ] Configure CORS settings

### 1.3 Database Connection
- [ ] Test Supabase connection
- [ ] Verify all database functions are deployed
- [ ] Test core functions with sample data
- [ ] Set up connection pooling if needed

## Phase 2: Authentication & Security (Day 2-3)

### 2.1 Authentication Middleware
- [ ] Create Clerk JWT validation middleware
- [ ] Implement user context extraction
- [ ] Handle authentication errors
- [ ] Test authentication flow

### 2.2 Input Validation Schemas
- [ ] Create Zod schemas for each endpoint
- [ ] Implement validation helper functions
- [ ] Test validation with edge cases
- [ ] Document validation rules

### 2.3 Error Handling System
- [ ] Create standardized error response format
- [ ] Implement global error handler
- [ ] Create error logging system
- [ ] Test error scenarios

## Phase 3: Core API Endpoints (Day 3-7)

### 3.1 Authentication Endpoints
- [ ] `GET /api/v1/auth/me` - Current user info
  - [ ] Implement endpoint logic
  - [ ] Add input validation
  - [ ] Test with valid/invalid tokens
  - [ ] Document response format

### 3.2 User Management Endpoints
- [ ] `GET /api/v1/users/search` - Find users for transfers
  - [ ] Implement user search logic
  - [ ] Add search parameter validation
  - [ ] Test with email/phone/name searches
  - [ ] Handle privacy concerns (limit returned data)

### 3.3 Wallet Endpoints
- [ ] `GET /api/v1/wallets/balance` - Get all wallet balances
  - [ ] Call get_wallet_balance() for each currency
  - [ ] Format response with both currencies
  - [ ] Test with users having different wallet states
  
- [ ] `GET /api/v1/wallets/{currency}` - Get specific currency balance
  - [ ] Validate currency parameter (EUR/AOA only)
  - [ ] Call database function
  - [ ] Handle non-existent wallets
  - [ ] Test with both currencies

### 3.4 Transfer Endpoints
- [ ] `POST /api/v1/transfers/send` - Send P2P transfer
  - [ ] Implement input validation (recipient, amount, currency)
  - [ ] Call send_p2p_transfer() function
  - [ ] Handle all error cases (insufficient funds, invalid recipient)
  - [ ] Test with various scenarios
  
- [ ] `GET /api/v1/transfers/history` - Transfer history
  - [ ] Implement pagination
  - [ ] Call get_transfer_history() function
  - [ ] Format response for frontend consumption
  - [ ] Test with different history lengths

### 3.5 Order Endpoints
- [ ] `POST /api/v1/orders/limit` - Place limit order
  - [ ] Validate order parameters
  - [ ] Call place_limit_order() function
  - [ ] Handle insufficient balance errors
  - [ ] Test with various order scenarios
  
- [ ] `POST /api/v1/orders/market` - Execute market order
  - [ ] Validate market order parameters
  - [ ] Call execute_market_order() function
  - [ ] Handle slippage protection
  - [ ] Test with different liquidity conditions
  
- [ ] `GET /api/v1/orders/history` - Order history
  - [ ] Implement pagination
  - [ ] Call get_user_order_history() function
  - [ ] Include order status and fill information
  - [ ] Test with various order states

### 3.6 Market Data Endpoints
- [ ] `GET /api/v1/market/summary` - Market summary
  - [ ] Get current best bid/ask
  - [ ] Calculate 24h volume and price change
  - [ ] Return market statistics
  - [ ] Test with different market conditions
  
- [ ] `GET /api/v1/market/depth` - Order book depth
  - [ ] Get active orders grouped by price level
  - [ ] Format for order book visualization
  - [ ] Include volume at each level
  - [ ] Test with thin and deep order books

### 3.7 Security Endpoints
- [ ] `POST /api/v1/security/pin` - Set/update PIN
  - [ ] Validate PIN format (6 digits)
  - [ ] Hash PIN before storage
  - [ ] Update user PIN in database
  - [ ] Test PIN update scenarios
  
- [ ] `POST /api/v1/security/pin/verify` - Verify PIN
  - [ ] Validate PIN input
  - [ ] Verify against stored hash
  - [ ] Return verification result
  - [ ] Handle rate limiting for PIN attempts

### 3.8 Health Endpoint
- [ ] `GET /api/v1/health/status` - System health
  - [ ] Check database connectivity
  - [ ] Return system status
  - [ ] Include version information
  - [ ] Test monitoring integration

## Phase 4: Integration & Testing (Day 8-10)

### 4.1 Integration Testing
- [ ] Test complete user registration flow
- [ ] Test wallet creation and funding
- [ ] Test P2P transfer flow end-to-end
- [ ] Test order placement and execution
- [ ] Test error handling across all endpoints

### 4.2 Performance Testing
- [ ] Load test critical endpoints
- [ ] Measure response times
- [ ] Test concurrent user scenarios
- [ ] Identify bottlenecks
- [ ] Optimize slow queries

### 4.3 Security Testing
- [ ] Test authentication bypass attempts
- [ ] Verify input validation effectiveness
- [ ] Test rate limiting
- [ ] Check for information leakage
- [ ] Validate authorization controls

### 4.4 Documentation
- [ ] Document all API endpoints
- [ ] Create request/response examples
- [ ] Document error codes and meanings
- [ ] Create API usage guide
- [ ] Set up API documentation site

## Phase 5: Production Preparation (Day 11-12)

### 5.1 Environment Configuration
- [ ] Set up production environment variables
- [ ] Configure production database connections
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting in production
- [ ] Test production deployment

### 5.2 Monitoring & Alerting
- [ ] Set up API performance monitoring
- [ ] Configure error alerting
- [ ] Set up database monitoring
- [ ] Create health check dashboards
- [ ] Test alert systems

### 5.3 Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite on staging
- [ ] Deploy to production
- [ ] Verify all endpoints work in production
- [ ] Monitor initial production usage

## Daily Checkpoints

### Day 1 Milestone
- [ ] Project setup complete
- [ ] Database connection working
- [ ] Basic middleware implemented

### Day 3 Milestone
- [ ] Authentication working
- [ ] Wallet endpoints functional
- [ ] Transfer endpoints working

### Day 5 Milestone
- [ ] Order endpoints complete
- [ ] Market data endpoints working
- [ ] Basic error handling implemented

### Day 7 Milestone
- [ ] All endpoints implemented
- [ ] Basic testing complete
- [ ] Security features working

### Day 10 Milestone
- [ ] Integration testing complete
- [ ] Performance testing done
- [ ] Documentation finished

### Day 12 Milestone
- [ ] Production deployment complete
- [ ] Monitoring set up
- [ ] API ready for use

## Success Criteria

### Functionality
- [ ] All 15 endpoints work correctly
- [ ] Complete user flows function end-to-end
- [ ] Error handling works properly
- [ ] Database functions integrate correctly

### Performance
- [ ] Response times under 500ms for all endpoints
- [ ] System handles 100 concurrent users
- [ ] Database queries optimized
- [ ] No memory leaks or connection issues

### Security
- [ ] Authentication required for protected endpoints
- [ ] Input validation prevents malicious inputs
- [ ] User data is properly isolated
- [ ] Sensitive operations require PIN verification

### Maintainability
- [ ] Code is well-structured and documented
- [ ] Tests cover critical functionality
- [ ] Error messages are helpful for debugging
- [ ] API documentation is complete and accurate

## Risk Mitigation

### Technical Risks
- [ ] Database performance under load
- [ ] Authentication token expiry handling
- [ ] Concurrent user scenarios
- [ ] Edge cases in business logic

### Security Risks
- [ ] Unauthorized access to user data
- [ ] Input validation bypass
- [ ] PIN brute force attacks
- [ ] Information leakage in errors

### Business Risks
- [ ] Incorrect financial calculations
- [ ] Balance inconsistencies
- [ ] Failed transactions
- [ ] User data privacy concerns

## Testing Strategy

### Unit Tests
- [ ] Test each endpoint individually
- [ ] Mock database responses
- [ ] Test error conditions
- [ ] Validate input/output formats

### Integration Tests
- [ ] Test complete user workflows
- [ ] Test database integration
- [ ] Test authentication flow
- [ ] Test error propagation

### Load Tests
- [ ] Test with 100+ concurrent users
- [ ] Test database connection limits
- [ ] Test memory usage under load
- [ ] Test response time consistency

### Security Tests
- [ ] Test authentication bypass
- [ ] Test input validation
- [ ] Test authorization controls
- [ ] Test information disclosure