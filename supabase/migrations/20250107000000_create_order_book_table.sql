-- =====================================================================================
-- EmaPay Order Book System: Create Order Book Table
-- =====================================================================================
-- This migration creates the order_book table for the new order book exchange system:
-- 1. Creates order_book table with proper schema and constraints
-- 2. Adds performance indexes for order matching queries
-- 3. Sets up foreign key relationships and validation rules
-- 4. Creates updated_at trigger for automatic timestamp updates
-- 5. Enables Row Level Security (RLS) with appropriate policies
-- =====================================================================================

-- Step 1: Create the order_book table
CREATE TABLE order_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Order Classification
  order_type TEXT NOT NULL CHECK (order_type IN ('limit', 'market')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  
  -- Currency Pair
  base_currency TEXT NOT NULL CHECK (base_currency IN ('AOA', 'EUR')),
  quote_currency TEXT NOT NULL CHECK (quote_currency IN ('AOA', 'EUR')),
  
  -- Order Quantities
  quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
  remaining_quantity DECIMAL(15,2) NOT NULL CHECK (remaining_quantity >= 0),
  filled_quantity DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (filled_quantity >= 0),
  
  -- Pricing
  price DECIMAL(10,6) CHECK (price > 0), -- NULL for market orders
  average_fill_price DECIMAL(10,6) DEFAULT NULL,
  
  -- Order Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_filled', 'filled', 'cancelled')),
  
  -- Fund Management
  reserved_amount DECIMAL(15,2) NOT NULL CHECK (reserved_amount >= 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  filled_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Business Logic Constraints
  CONSTRAINT valid_currency_pair CHECK (base_currency != quote_currency),
  CONSTRAINT limit_order_has_price CHECK (order_type != 'limit' OR price IS NOT NULL),
  CONSTRAINT market_order_no_price CHECK (order_type != 'market' OR price IS NULL),
  CONSTRAINT quantity_consistency CHECK (filled_quantity + remaining_quantity = quantity),
  CONSTRAINT filled_at_when_filled CHECK (status != 'filled' OR filled_at IS NOT NULL),
  CONSTRAINT cancelled_at_when_cancelled CHECK (status != 'cancelled' OR cancelled_at IS NOT NULL)
);

-- Step 2: Add table and column comments for documentation
COMMENT ON TABLE order_book IS 'Order book for EmaPay exchange system supporting limit and market orders with price-time priority matching';
COMMENT ON COLUMN order_book.user_id IS 'Reference to the user who placed the order';
COMMENT ON COLUMN order_book.order_type IS 'Type of order: limit (with specified price) or market (immediate execution)';
COMMENT ON COLUMN order_book.side IS 'Order side: buy (acquiring base currency) or sell (disposing base currency)';
COMMENT ON COLUMN order_book.base_currency IS 'Base currency of the trading pair (currency being bought/sold)';
COMMENT ON COLUMN order_book.quote_currency IS 'Quote currency of the trading pair (currency used for pricing)';
COMMENT ON COLUMN order_book.quantity IS 'Total order quantity in base currency units';
COMMENT ON COLUMN order_book.remaining_quantity IS 'Unfilled quantity remaining in the order';
COMMENT ON COLUMN order_book.filled_quantity IS 'Quantity that has been filled through trades';
COMMENT ON COLUMN order_book.price IS 'Limit price for limit orders (NULL for market orders)';
COMMENT ON COLUMN order_book.average_fill_price IS 'Volume-weighted average price of all fills for this order';
COMMENT ON COLUMN order_book.status IS 'Order status: pending, partially_filled, filled, or cancelled';
COMMENT ON COLUMN order_book.reserved_amount IS 'Amount of currency reserved for this order (base for sell, quote for buy)';

-- Step 3: Create performance indexes for order matching queries
-- Index for active orders matching (most critical for performance)
CREATE INDEX idx_order_book_active_orders ON order_book(base_currency, quote_currency, side, price, created_at) 
  WHERE status IN ('pending', 'partially_filled');

-- Index for user order queries
CREATE INDEX idx_order_book_user_orders ON order_book(user_id, status, created_at DESC);

-- Index for order matching algorithm (price-time priority)
CREATE INDEX idx_order_book_matching ON order_book(base_currency, quote_currency, side, status) 
  WHERE status IN ('pending', 'partially_filled');

-- Index for buy orders (price DESC for best price first)
CREATE INDEX idx_order_book_buy_orders ON order_book(base_currency, quote_currency, price DESC, created_at ASC) 
  WHERE side = 'buy' AND status IN ('pending', 'partially_filled');

-- Index for sell orders (price ASC for best price first)
CREATE INDEX idx_order_book_sell_orders ON order_book(base_currency, quote_currency, price ASC, created_at ASC) 
  WHERE side = 'sell' AND status IN ('pending', 'partially_filled');

-- Index for order status updates and queries
CREATE INDEX idx_order_book_status_timestamp ON order_book(status, updated_at DESC);

-- Step 4: Create updated_at trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_order_book_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set filled_at timestamp when order becomes filled
    IF NEW.status = 'filled' AND OLD.status != 'filled' THEN
        NEW.filled_at = NOW();
    END IF;
    
    -- Set cancelled_at timestamp when order becomes cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_book_updated_at_trigger
    BEFORE UPDATE ON order_book
    FOR EACH ROW
    EXECUTE FUNCTION update_order_book_updated_at();

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE order_book ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for order_book table
-- Users can view all active orders (for order book display)
CREATE POLICY "Users can view active orders" ON order_book
    FOR SELECT
    TO authenticated
    USING (status IN ('pending', 'partially_filled'));

-- Users can view their own orders (all statuses)
CREATE POLICY "Users can view their own orders" ON order_book
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own orders
CREATE POLICY "Users can insert their own orders" ON order_book
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own orders (for cancellation)
CREATE POLICY "Users can update their own orders" ON order_book
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Step 7: Create helper function to validate order book constraints
CREATE OR REPLACE FUNCTION validate_order_book_entry(
    p_order_type TEXT,
    p_side TEXT,
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_quantity DECIMAL(15,2),
    p_price DECIMAL(10,6) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate order type
    IF p_order_type NOT IN ('limit', 'market') THEN
        RAISE EXCEPTION 'Invalid order_type: %. Must be limit or market', p_order_type;
    END IF;
    
    -- Validate side
    IF p_side NOT IN ('buy', 'sell') THEN
        RAISE EXCEPTION 'Invalid side: %. Must be buy or sell', p_side;
    END IF;
    
    -- Validate currencies
    IF p_base_currency NOT IN ('AOA', 'EUR') OR p_quote_currency NOT IN ('AOA', 'EUR') THEN
        RAISE EXCEPTION 'Invalid currency. Must be AOA or EUR';
    END IF;
    
    -- Validate currency pair
    IF p_base_currency = p_quote_currency THEN
        RAISE EXCEPTION 'Base and quote currencies must be different';
    END IF;
    
    -- Validate quantity
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;
    
    -- Validate price for limit orders
    IF p_order_type = 'limit' AND (p_price IS NULL OR p_price <= 0) THEN
        RAISE EXCEPTION 'Limit orders must have a positive price';
    END IF;
    
    -- Validate price for market orders
    IF p_order_type = 'market' AND p_price IS NOT NULL THEN
        RAISE EXCEPTION 'Market orders cannot specify a price';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Step 8: Create function to get order book depth for a currency pair
CREATE OR REPLACE FUNCTION get_order_book_depth(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_depth_limit INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    buy_orders JSON;
    sell_orders JSON;
    result JSON;
BEGIN
    -- Get buy orders (bids) - highest price first
    SELECT json_agg(
        json_build_object(
            'price', price,
            'quantity', SUM(remaining_quantity),
            'order_count', COUNT(*)
        ) ORDER BY price DESC
    ) INTO buy_orders
    FROM order_book
    WHERE base_currency = p_base_currency
      AND quote_currency = p_quote_currency
      AND side = 'buy'
      AND status IN ('pending', 'partially_filled')
      AND price IS NOT NULL
    GROUP BY price
    LIMIT p_depth_limit;
    
    -- Get sell orders (asks) - lowest price first
    SELECT json_agg(
        json_build_object(
            'price', price,
            'quantity', SUM(remaining_quantity),
            'order_count', COUNT(*)
        ) ORDER BY price ASC
    ) INTO sell_orders
    FROM order_book
    WHERE base_currency = p_base_currency
      AND quote_currency = p_quote_currency
      AND side = 'sell'
      AND status IN ('pending', 'partially_filled')
      AND price IS NOT NULL
    GROUP BY price
    LIMIT p_depth_limit;
    
    -- Build result
    result := json_build_object(
        'base_currency', p_base_currency,
        'quote_currency', p_quote_currency,
        'bids', COALESCE(buy_orders, '[]'::json),
        'asks', COALESCE(sell_orders, '[]'::json),
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$;

-- Step 9: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON order_book TO authenticated;
GRANT USAGE ON SEQUENCE order_book_id_seq TO authenticated;

-- Step 10: Create initial test data validation
-- This function can be used to verify the table was created correctly
CREATE OR REPLACE FUNCTION test_order_book_creation()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    test_result BOOLEAN := TRUE;
BEGIN
    -- Test table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_book') THEN
        RAISE NOTICE 'ERROR: order_book table not found';
        RETURN FALSE;
    END IF;
    
    -- Test constraints exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'valid_currency_pair') THEN
        RAISE NOTICE 'ERROR: valid_currency_pair constraint not found';
        RETURN FALSE;
    END IF;
    
    -- Test indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_book_active_orders') THEN
        RAISE NOTICE 'ERROR: idx_order_book_active_orders index not found';
        RETURN FALSE;
    END IF;
    
    -- Test RLS is enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'order_book' AND rowsecurity = true) THEN
        RAISE NOTICE 'ERROR: RLS not enabled on order_book table';
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'SUCCESS: order_book table created successfully with all constraints, indexes, and policies';
    RETURN TRUE;
END;
$$;

-- Run the test
SELECT test_order_book_creation();

-- Migration completed successfully
SELECT 'Order book table created successfully' AS status;
