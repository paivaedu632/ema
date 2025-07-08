-- =====================================================================================
-- EmaPay Order Book System: Create Trades Table
-- =====================================================================================
-- This migration creates the trades table to track all trade executions in the 
-- new order book exchange system:
-- 1. Creates trades table with proper schema and constraints
-- 2. Adds performance indexes for trade history and reporting queries
-- 3. Sets up foreign key relationships with order_book and users tables
-- 4. Creates updated_at trigger for automatic timestamp updates
-- 5. Enables Row Level Security (RLS) with appropriate policies
-- 6. Creates helper functions for trade execution and reporting
-- =====================================================================================

-- Step 1: Create the trades table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order References
  buy_order_id UUID REFERENCES order_book(id) ON DELETE RESTRICT NOT NULL,
  sell_order_id UUID REFERENCES order_book(id) ON DELETE RESTRICT NOT NULL,
  
  -- Participant References
  buyer_id UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
  seller_id UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
  
  -- Trade Details
  base_currency TEXT NOT NULL CHECK (base_currency IN ('AOA', 'EUR')),
  quote_currency TEXT NOT NULL CHECK (quote_currency IN ('AOA', 'EUR')),
  quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,6) NOT NULL CHECK (price > 0),
  
  -- Fee Information
  buyer_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (buyer_fee >= 0),
  seller_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (seller_fee >= 0),
  
  -- Trade Value Calculations
  base_amount DECIMAL(15,2) NOT NULL CHECK (base_amount > 0), -- quantity in base currency
  quote_amount DECIMAL(15,2) NOT NULL CHECK (quote_amount > 0), -- quantity * price in quote currency
  
  -- Trade Execution Details
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Business Logic Constraints
  CONSTRAINT valid_trade_currency_pair CHECK (base_currency != quote_currency),
  CONSTRAINT different_participants CHECK (buyer_id != seller_id),
  CONSTRAINT different_orders CHECK (buy_order_id != sell_order_id),
  CONSTRAINT valid_trade_calculation CHECK (ABS(quote_amount - (quantity * price)) < 0.01),
  CONSTRAINT valid_base_amount CHECK (ABS(base_amount - quantity) < 0.01)
);

-- Step 2: Add table and column comments for documentation
COMMENT ON TABLE trades IS 'Trade execution records for order book system - tracks all completed trades between buy and sell orders';
COMMENT ON COLUMN trades.buy_order_id IS 'Reference to the buy order that was matched in this trade';
COMMENT ON COLUMN trades.sell_order_id IS 'Reference to the sell order that was matched in this trade';
COMMENT ON COLUMN trades.buyer_id IS 'Reference to the user who placed the buy order';
COMMENT ON COLUMN trades.seller_id IS 'Reference to the user who placed the sell order';
COMMENT ON COLUMN trades.base_currency IS 'Base currency of the trading pair (currency being bought/sold)';
COMMENT ON COLUMN trades.quote_currency IS 'Quote currency of the trading pair (currency used for pricing)';
COMMENT ON COLUMN trades.quantity IS 'Quantity of base currency traded';
COMMENT ON COLUMN trades.price IS 'Execution price per unit of base currency';
COMMENT ON COLUMN trades.buyer_fee IS 'Fee charged to the buyer for this trade';
COMMENT ON COLUMN trades.seller_fee IS 'Fee charged to the seller for this trade';
COMMENT ON COLUMN trades.base_amount IS 'Total amount of base currency exchanged (should equal quantity)';
COMMENT ON COLUMN trades.quote_amount IS 'Total amount of quote currency exchanged (quantity * price)';
COMMENT ON COLUMN trades.executed_at IS 'Timestamp when the trade was executed';

-- Step 3: Create performance indexes for trade queries
-- Index for buyer trade history
CREATE INDEX idx_trades_buyer ON trades(buyer_id, executed_at DESC);

-- Index for seller trade history
CREATE INDEX idx_trades_seller ON trades(seller_id, executed_at DESC);

-- Index for order-specific trades
CREATE INDEX idx_trades_orders ON trades(buy_order_id, sell_order_id);

-- Index for currency pair trading history
CREATE INDEX idx_trades_currency_pair ON trades(base_currency, quote_currency, executed_at DESC);

-- Index for trade execution time (for reporting and analytics)
CREATE INDEX idx_trades_execution_time ON trades(executed_at DESC);

-- Index for trade volume analysis
CREATE INDEX idx_trades_volume ON trades(base_currency, quote_currency, quantity, executed_at DESC);

-- Index for price analysis
CREATE INDEX idx_trades_price_analysis ON trades(base_currency, quote_currency, price, executed_at DESC);

-- Step 4: Create updated_at trigger (trades are immutable, but for consistency)
CREATE OR REPLACE FUNCTION update_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Trades should be immutable after creation, but allow updates for corrections
    NEW.created_at = OLD.created_at; -- Preserve original creation time
    NEW.executed_at = OLD.executed_at; -- Preserve original execution time
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We don't create an UPDATE trigger for trades as they should be immutable
-- If updates are needed for corrections, they should be done manually with proper audit trail

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for trades table
-- Users can view trades where they are either buyer or seller
CREATE POLICY "Users can view their own trades" ON trades
    FOR SELECT
    TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Only the system can insert trades (through trade execution functions)
-- Users cannot directly insert trades
CREATE POLICY "System can insert trades" ON trades
    FOR INSERT
    TO authenticated
    WITH CHECK (false); -- Prevent direct inserts, only through functions

-- Trades are immutable - no updates allowed
CREATE POLICY "Trades are immutable" ON trades
    FOR UPDATE
    TO authenticated
    USING (false); -- Prevent all updates

-- Trades cannot be deleted
CREATE POLICY "Trades cannot be deleted" ON trades
    FOR DELETE
    TO authenticated
    USING (false); -- Prevent all deletions

-- Step 7: Create helper functions for trade management

-- Function to get trade history for a user
CREATE OR REPLACE FUNCTION get_user_trade_history(
    p_user_id UUID,
    p_currency_pair TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trade_history JSON;
    base_curr TEXT;
    quote_curr TEXT;
BEGIN
    -- Parse currency pair if provided
    IF p_currency_pair IS NOT NULL THEN
        base_curr := split_part(p_currency_pair, '/', 1);
        quote_curr := split_part(p_currency_pair, '/', 2);
        
        IF base_curr NOT IN ('AOA', 'EUR') OR quote_curr NOT IN ('AOA', 'EUR') THEN
            RAISE EXCEPTION 'Invalid currency pair format. Use AOA/EUR or EUR/AOA';
        END IF;
    END IF;
    
    SELECT json_agg(
        json_build_object(
            'id', t.id,
            'side', CASE WHEN t.buyer_id = p_user_id THEN 'buy' ELSE 'sell' END,
            'base_currency', t.base_currency,
            'quote_currency', t.quote_currency,
            'quantity', t.quantity,
            'price', t.price,
            'total_amount', t.quote_amount,
            'fee', CASE WHEN t.buyer_id = p_user_id THEN t.buyer_fee ELSE t.seller_fee END,
            'counterparty_id', CASE WHEN t.buyer_id = p_user_id THEN t.seller_id ELSE t.buyer_id END,
            'executed_at', t.executed_at,
            'buy_order_id', t.buy_order_id,
            'sell_order_id', t.sell_order_id
        ) ORDER BY t.executed_at DESC
    ) INTO trade_history
    FROM trades t
    WHERE (t.buyer_id = p_user_id OR t.seller_id = p_user_id)
      AND (p_currency_pair IS NULL OR (t.base_currency = base_curr AND t.quote_currency = quote_curr))
    ORDER BY t.executed_at DESC
    LIMIT p_limit
    OFFSET p_offset;
    
    RETURN COALESCE(trade_history, '[]'::json);
END;
$$;

-- Function to get trading volume statistics
CREATE OR REPLACE FUNCTION get_trading_volume_stats(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_time_period INTERVAL DEFAULT '24 hours'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    volume_stats JSON;
    start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    start_time := NOW() - p_time_period;
    
    SELECT json_build_object(
        'base_currency', p_base_currency,
        'quote_currency', p_quote_currency,
        'time_period', p_time_period,
        'total_trades', COUNT(*),
        'total_base_volume', COALESCE(SUM(quantity), 0),
        'total_quote_volume', COALESCE(SUM(quote_amount), 0),
        'avg_price', COALESCE(AVG(price), 0),
        'min_price', COALESCE(MIN(price), 0),
        'max_price', COALESCE(MAX(price), 0),
        'first_price', COALESCE((
            SELECT price FROM trades 
            WHERE base_currency = p_base_currency 
              AND quote_currency = p_quote_currency 
              AND executed_at >= start_time
            ORDER BY executed_at ASC 
            LIMIT 1
        ), 0),
        'last_price', COALESCE((
            SELECT price FROM trades 
            WHERE base_currency = p_base_currency 
              AND quote_currency = p_quote_currency 
              AND executed_at >= start_time
            ORDER BY executed_at DESC 
            LIMIT 1
        ), 0),
        'period_start', start_time,
        'period_end', NOW()
    ) INTO volume_stats
    FROM trades
    WHERE base_currency = p_base_currency
      AND quote_currency = p_quote_currency
      AND executed_at >= start_time;
    
    RETURN volume_stats;
END;
$$;

-- Function to get recent trades for order book display
CREATE OR REPLACE FUNCTION get_recent_trades(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recent_trades JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', id,
            'price', price,
            'quantity', quantity,
            'total', quote_amount,
            'executed_at', executed_at,
            'side', 'neutral' -- For public display, don't show which side initiated
        ) ORDER BY executed_at DESC
    ) INTO recent_trades
    FROM trades
    WHERE base_currency = p_base_currency
      AND quote_currency = p_quote_currency
    ORDER BY executed_at DESC
    LIMIT p_limit;
    
    RETURN COALESCE(recent_trades, '[]'::json);
END;
$$;

-- Function to validate trade execution data
CREATE OR REPLACE FUNCTION validate_trade_execution(
    p_buy_order_id UUID,
    p_sell_order_id UUID,
    p_quantity DECIMAL(15,2),
    p_price DECIMAL(10,6)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    buy_order RECORD;
    sell_order RECORD;
BEGIN
    -- Get order details
    SELECT * INTO buy_order FROM order_book WHERE id = p_buy_order_id;
    SELECT * INTO sell_order FROM order_book WHERE id = p_sell_order_id;
    
    -- Validate orders exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'One or both orders not found';
    END IF;
    
    -- Validate order types and sides
    IF buy_order.side != 'buy' OR sell_order.side != 'sell' THEN
        RAISE EXCEPTION 'Invalid order sides for trade execution';
    END IF;
    
    -- Validate currency pairs match
    IF buy_order.base_currency != sell_order.base_currency OR 
       buy_order.quote_currency != sell_order.quote_currency THEN
        RAISE EXCEPTION 'Currency pairs do not match between orders';
    END IF;
    
    -- Validate quantity
    IF p_quantity <= 0 OR 
       p_quantity > buy_order.remaining_quantity OR 
       p_quantity > sell_order.remaining_quantity THEN
        RAISE EXCEPTION 'Invalid trade quantity';
    END IF;
    
    -- Validate price (for limit orders)
    IF buy_order.order_type = 'limit' AND p_price > buy_order.price THEN
        RAISE EXCEPTION 'Trade price exceeds buy order limit price';
    END IF;
    
    IF sell_order.order_type = 'limit' AND p_price < sell_order.price THEN
        RAISE EXCEPTION 'Trade price below sell order limit price';
    END IF;
    
    -- Validate different users
    IF buy_order.user_id = sell_order.user_id THEN
        RAISE EXCEPTION 'Cannot trade with yourself';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Step 8: Grant necessary permissions
GRANT SELECT ON trades TO authenticated;
-- Note: INSERT/UPDATE/DELETE are restricted by RLS policies

-- Step 9: Create test function to validate table creation
CREATE OR REPLACE FUNCTION test_trades_creation()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    test_result BOOLEAN := TRUE;
BEGIN
    -- Test table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades') THEN
        RAISE NOTICE 'ERROR: trades table not found';
        RETURN FALSE;
    END IF;
    
    -- Test constraints exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'valid_trade_currency_pair') THEN
        RAISE NOTICE 'ERROR: valid_trade_currency_pair constraint not found';
        RETURN FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'different_participants') THEN
        RAISE NOTICE 'ERROR: different_participants constraint not found';
        RETURN FALSE;
    END IF;
    
    -- Test indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trades_buyer') THEN
        RAISE NOTICE 'ERROR: idx_trades_buyer index not found';
        RETURN FALSE;
    END IF;
    
    -- Test foreign keys exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'trades' AND constraint_name LIKE '%buy_order_id%') THEN
        RAISE NOTICE 'ERROR: buy_order_id foreign key not found';
        RETURN FALSE;
    END IF;
    
    -- Test RLS is enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'trades' AND rowsecurity = true) THEN
        RAISE NOTICE 'ERROR: RLS not enabled on trades table';
        RETURN FALSE;
    END IF;
    
    -- Test functions exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_trade_history') THEN
        RAISE NOTICE 'ERROR: get_user_trade_history function not found';
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'SUCCESS: trades table created successfully with all constraints, indexes, and functions';
    RETURN TRUE;
END;
$$;

-- Run the test
SELECT test_trades_creation();

-- Migration completed successfully
SELECT 'Trades table created successfully' AS status;
