# EmaPay Database Schema

**Status**: ✅ PRODUCTION READY  
**Database**: Supabase PostgreSQL  
**Project ID**: kjqcfedvilcnwzfjlqtq  
**Region**: us-east-2  

## Quick Start

### Essential Commands
```bash
# Test database connection
curl http://localhost:3000/api/test-db

# Generate types after schema changes
npx supabase gen types typescript --project-id kjqcfedvilcnwzfjlqtq --schema public > src/types/database.types.ts

# Deploy schema changes
npx supabase db push
```

## Core Database Schema

### Primary Tables

#### users
**Purpose**: User profiles with KYC status tracking
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  kyc_status TEXT DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'in_progress', 'approved', 'rejected')),
  kyc_current_step INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### wallets
**Purpose**: Multi-currency balances with available/reserved balance tracking
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  currency TEXT CHECK (currency IN ('AOA', 'EUR')) NOT NULL,
  available_balance DECIMAL(15,2) DEFAULT 0.00 CHECK (available_balance >= 0),
  reserved_balance DECIMAL(15,2) DEFAULT 0.00 CHECK (reserved_balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, currency)
);
```

#### order_book
**Purpose**: Professional order management with price-time priority
```sql
CREATE TABLE order_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  order_type TEXT CHECK (order_type IN ('limit', 'market')) NOT NULL,
  side TEXT CHECK (side IN ('buy', 'sell')) NOT NULL,
  base_currency TEXT CHECK (base_currency IN ('AOA', 'EUR')) NOT NULL,
  quote_currency TEXT CHECK (quote_currency IN ('AOA', 'EUR')) NOT NULL,
  quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
  remaining_quantity DECIMAL(15,2) NOT NULL CHECK (remaining_quantity >= 0),
  filled_quantity DECIMAL(15,2) DEFAULT 0.00 CHECK (filled_quantity >= 0),
  price DECIMAL(10,6) CHECK (price > 0), -- NULL for market orders
  average_fill_price DECIMAL(10,6),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partially_filled', 'filled', 'cancelled')),
  reserved_amount DECIMAL(15,2) NOT NULL CHECK (reserved_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  filled_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);
```

#### fund_reservations
**Purpose**: Sophisticated fund management with automatic reservation and release
```sql
CREATE TABLE fund_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  order_id UUID REFERENCES order_book(id) UNIQUE NOT NULL,
  currency TEXT CHECK (currency IN ('AOA', 'EUR')) NOT NULL,
  reserved_amount DECIMAL(15,2) NOT NULL CHECK (reserved_amount >= 0),
  released_amount DECIMAL(15,2) DEFAULT 0.00 CHECK (released_amount >= 0),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'partially_released', 'fully_released')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE
);
```

#### trades
**Purpose**: Complete trade execution tracking with dual-party recording
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_order_id UUID REFERENCES order_book(id) NOT NULL,
  sell_order_id UUID REFERENCES order_book(id) NOT NULL,
  buyer_id UUID REFERENCES users(id) NOT NULL,
  seller_id UUID REFERENCES users(id) NOT NULL,
  base_currency TEXT CHECK (base_currency IN ('AOA', 'EUR')) NOT NULL,
  quote_currency TEXT CHECK (quote_currency IN ('AOA', 'EUR')) NOT NULL,
  quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,6) NOT NULL CHECK (price > 0),
  buyer_fee DECIMAL(15,2) DEFAULT 0.00 CHECK (buyer_fee >= 0),
  seller_fee DECIMAL(15,2) DEFAULT 0.00 CHECK (seller_fee >= 0),
  base_amount DECIMAL(15,2) NOT NULL CHECK (base_amount > 0),
  quote_amount DECIMAL(15,2) NOT NULL CHECK (quote_amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### transactions
**Purpose**: All financial transactions with dynamic fee calculation
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT CHECK (currency IN ('AOA', 'EUR')) NOT NULL,
  type TEXT CHECK (type IN ('buy', 'sell', 'send', 'deposit', 'withdraw', 'exchange_buy', 'exchange_sell')) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) NOT NULL,
  fee_amount DECIMAL(15,2) DEFAULT 0.00,
  net_amount DECIMAL(15,2),
  user_id UUID REFERENCES users(id) NOT NULL,
  counterparty_user_id UUID REFERENCES users(id),
  exchange_rate DECIMAL(10,6),
  exchange_id TEXT,
  display_id TEXT UNIQUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### fees
**Purpose**: Dynamic fee configuration by transaction type and currency
```sql
CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  currency TEXT CHECK (currency IN ('AOA', 'EUR')) NOT NULL,
  fee_percentage DECIMAL(5,2) DEFAULT 0.00,
  fee_fixed_amount DECIMAL(15,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### kyc_records
**Purpose**: 16-step KYC verification workflow
```sql
CREATE TABLE kyc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 16),
  step_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'skipped')),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Legacy Tables (Deprecated)

#### offers
**Purpose**: Legacy P2P exchange offers (replaced by order_book)
```sql
-- This table is deprecated and will be removed in future versions
-- All functionality has been migrated to the order_book system
```

## Database Relationships

### Primary Relationships
- **Users → Wallets**: One-to-many (one user, multiple currency wallets)
- **Users → Order Book**: One-to-many (one user, multiple orders)
- **Users → Fund Reservations**: One-to-many (one user, multiple reservations)
- **Users → Trades**: One-to-many as buyer/seller (one user, multiple trades)
- **Users → Transactions**: One-to-many (one user, multiple transactions)
- **Users → KYC Records**: One-to-many (one user, multiple KYC steps)

### Order Book Relationships
- **Order Book → Fund Reservations**: One-to-one (each order has one reservation)
- **Order Book → Trades**: One-to-many (each order can have multiple trades)
- **Trades → Order Book**: Many-to-one (each trade references buy and sell orders)

## Performance Indexes

### Order Book Indexes
```sql
-- Order matching optimization
CREATE INDEX idx_order_book_matching ON order_book(base_currency, quote_currency, side, status, price, created_at);
CREATE INDEX idx_order_book_user_orders ON order_book(user_id, status, created_at DESC);
CREATE INDEX idx_order_book_price_time ON order_book(base_currency, quote_currency, side, price, created_at);

-- Trade execution indexes
CREATE INDEX idx_trades_buyer ON trades(buyer_id, executed_at DESC);
CREATE INDEX idx_trades_seller ON trades(seller_id, executed_at DESC);
CREATE INDEX idx_trades_orders ON trades(buy_order_id, sell_order_id);
CREATE INDEX idx_trades_currency_pair ON trades(base_currency, quote_currency, executed_at DESC);

-- Fund reservation indexes
CREATE INDEX idx_fund_reservations_user ON fund_reservations(user_id, status);
CREATE INDEX idx_fund_reservations_order ON fund_reservations(order_id);
```

### General Performance Indexes
```sql
-- User and wallet indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_wallets_user_currency ON wallets(user_id, currency);

-- Transaction indexes
CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type, status, created_at DESC);
CREATE INDEX idx_transactions_display_id ON transactions(display_id);

-- KYC indexes
CREATE INDEX idx_kyc_records_user ON kyc_records(user_id, step_number);
```

## Database Functions

### Order Management Functions
- `place_order()` - Place limit or market orders with validation and fund reservation
- `cancel_order()` - Cancel orders with automatic fund release
- `get_user_orders()` - Retrieve user's order history with filtering
- `get_order_details()` - Get detailed order information with trade history

### Matching Engine Functions
- `match_order()` - Core price-time priority matching algorithm
- `get_matching_orders()` - Find compatible orders for matching
- `execute_trade()` - Atomic trade execution with balance updates
- `execute_trade_enhanced()` - Advanced trade execution with analytics

### Market Data Functions
- `get_best_prices()` - Get best bid/ask prices and spread calculation
- `get_order_book_depth()` - Get order book depth for visualization
- `get_recent_trades()` - Get recent trade history for market data

### Analytics Functions
- `get_trade_execution_analytics()` - Comprehensive trading analytics
- `get_trading_volume_stats()` - Volume and price statistics
- `optimize_trade_settlement()` - Settlement optimization and performance

### Fund Management Functions
- `create_fund_reservation()` - Create fund reservations for orders
- `release_fund_reservation()` - Release funds from reservations
- `cancel_fund_reservation()` - Cancel reservations and release all funds

### Fee and Transaction Functions
- `calculate_trade_fees()` - Enhanced fee calculation with existing system integration
- `create_transaction_record()` - Transaction record creation for compatibility

## Row Level Security (RLS)

### Security Policies
- **Users**: Users can only access their own profile data
- **Wallets**: Users can only access their own wallet balances
- **Order Book**: Users can only access their own orders
- **Fund Reservations**: Users can only access their own reservations
- **Trades**: Users can only access trades where they are buyer or seller
- **Transactions**: Users can only access their own transactions
- **KYC Records**: Users can only access their own KYC data

### Admin Access
- System administrators have read access to all tables for monitoring
- Trade execution functions have elevated permissions for atomic operations
- Matching engine functions operate with system-level permissions

## Migration History

### Completed Migrations
1. **Initial Schema** - Basic user, wallet, and transaction tables
2. **KYC System** - 16-step KYC verification workflow
3. **Fee System** - Dynamic fee configuration
4. **Order Book Foundation** - order_book, fund_reservations, trades tables
5. **Order Placement Logic** - Order management and validation functions
6. **Matching Engine** - Price-time priority matching algorithm
7. **Advanced Trade Execution** - Enhanced execution with fee integration

### Current Schema Version
**Version**: 1.0 (Production Ready)  
**Last Migration**: January 7, 2025  
**Status**: All core functionality implemented and tested

---

**Database Status**: ✅ PRODUCTION READY  
**Next Phase**: Frontend Integration
