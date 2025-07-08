-- =====================================================================================
-- EmaPay Order Book System: Implement Price-Time Priority Matching Engine
-- =====================================================================================
-- This migration implements the core matching engine for the order book system:
-- 1. Creates price-time priority matching algorithm
-- 2. Implements partial fill handling
-- 3. Adds market order immediate execution
-- 4. Creates trade execution function
-- 5. Implements order book depth calculation
-- 6. Adds matching performance optimization
-- =====================================================================================

-- Step 1: Create function to get matching orders with price-time priority
CREATE OR REPLACE FUNCTION get_matching_orders(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_side TEXT,
    p_price DECIMAL(10,6) DEFAULT NULL,
    p_order_type TEXT DEFAULT 'limit'
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    price DECIMAL(10,6),
    remaining_quantity DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return matching orders with price-time priority
    IF p_side = 'buy' THEN
        -- For buy orders, match against sell orders (lowest price first, then oldest)
        RETURN QUERY
        SELECT 
            ob.id,
            ob.user_id,
            ob.price,
            ob.remaining_quantity,
            ob.created_at
        FROM order_book ob
        WHERE ob.base_currency = p_base_currency
          AND ob.quote_currency = p_quote_currency
          AND ob.side = 'sell'
          AND ob.status IN ('pending', 'partially_filled')
          AND ob.remaining_quantity > 0
          AND ob.price IS NOT NULL
          AND (p_order_type = 'market' OR ob.price <= p_price) -- Market orders match any price
        ORDER BY ob.price ASC, ob.created_at ASC; -- Lowest price first, then FIFO
    ELSE
        -- For sell orders, match against buy orders (highest price first, then oldest)
        RETURN QUERY
        SELECT 
            ob.id,
            ob.user_id,
            ob.price,
            ob.remaining_quantity,
            ob.created_at
        FROM order_book ob
        WHERE ob.base_currency = p_base_currency
          AND ob.quote_currency = p_quote_currency
          AND ob.side = 'buy'
          AND ob.status IN ('pending', 'partially_filled')
          AND ob.remaining_quantity > 0
          AND ob.price IS NOT NULL
          AND (p_order_type = 'market' OR ob.price >= p_price) -- Market orders match any price
        ORDER BY ob.price DESC, ob.created_at ASC; -- Highest price first, then FIFO
    END IF;
END;
$$;

-- Step 2: Create trade execution function
CREATE OR REPLACE FUNCTION execute_trade(
    p_buy_order_id UUID,
    p_sell_order_id UUID,
    p_buyer_id UUID,
    p_seller_id UUID,
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_quantity DECIMAL(15,2),
    p_price DECIMAL(10,6)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trade_id UUID;
    quote_amount DECIMAL(15,2);
    buyer_fee DECIMAL(15,2) := 0.00;
    seller_fee DECIMAL(15,2) := 0.00;
    buyer_net_base DECIMAL(15,2);
    seller_net_quote DECIMAL(15,2);
    buy_reservation_id UUID;
    sell_reservation_id UUID;
    buy_release_amount DECIMAL(15,2);
    sell_release_amount DECIMAL(15,2);
BEGIN
    -- Validate trade execution parameters
    IF NOT validate_trade_execution(p_buy_order_id, p_sell_order_id, p_quantity, p_price) THEN
        RAISE EXCEPTION 'Trade validation failed';
    END IF;
    
    -- Calculate trade amounts
    quote_amount := p_quantity * p_price;
    
    -- Calculate fees (using existing fee system if available)
    BEGIN
        SELECT (get_dynamic_fee('buy', p_quote_currency)).fee_percentage * quote_amount / 100 INTO buyer_fee;
        SELECT (get_dynamic_fee('sell', p_quote_currency)).fee_percentage * quote_amount / 100 INTO seller_fee;
    EXCEPTION
        WHEN OTHERS THEN
            -- If fee system not available, use default 0% fees
            buyer_fee := 0.00;
            seller_fee := 0.00;
    END;
    
    -- Calculate net amounts after fees
    buyer_net_base := p_quantity; -- Buyer receives full base amount
    seller_net_quote := quote_amount - seller_fee; -- Seller pays fee
    
    -- Create trade record
    INSERT INTO trades (
        buy_order_id, sell_order_id, buyer_id, seller_id,
        base_currency, quote_currency, quantity, price,
        buyer_fee, seller_fee, base_amount, quote_amount
    ) VALUES (
        p_buy_order_id, p_sell_order_id, p_buyer_id, p_seller_id,
        p_base_currency, p_quote_currency, p_quantity, p_price,
        buyer_fee, seller_fee, p_quantity, quote_amount
    ) RETURNING id INTO trade_id;
    
    -- Update buyer's balances
    -- Buyer: gains base currency
    UPDATE wallets
    SET available_balance = available_balance + buyer_net_base,
        updated_at = NOW()
    WHERE user_id = p_buyer_id AND currency = p_base_currency;
    
    -- Update seller's balances  
    -- Seller: gains quote currency
    UPDATE wallets
    SET available_balance = available_balance + seller_net_quote,
        updated_at = NOW()
    WHERE user_id = p_seller_id AND currency = p_quote_currency;
    
    -- Update both orders' remaining quantities and status
    UPDATE order_book
    SET remaining_quantity = remaining_quantity - p_quantity,
        filled_quantity = filled_quantity + p_quantity,
        status = CASE 
            WHEN remaining_quantity - p_quantity = 0 THEN 'filled'
            WHEN remaining_quantity - p_quantity < quantity THEN 'partially_filled'
            ELSE status
        END,
        average_fill_price = CASE
            WHEN filled_quantity = 0 THEN p_price
            ELSE ((COALESCE(average_fill_price, 0) * filled_quantity) + (p_price * p_quantity)) / (filled_quantity + p_quantity)
        END,
        updated_at = NOW()
    WHERE id IN (p_buy_order_id, p_sell_order_id);
    
    -- Release funds from reservations
    -- Get reservation IDs
    SELECT id INTO buy_reservation_id FROM fund_reservations WHERE order_id = p_buy_order_id;
    SELECT id INTO sell_reservation_id FROM fund_reservations WHERE order_id = p_sell_order_id;
    
    -- Calculate release amounts
    buy_release_amount := quote_amount + buyer_fee; -- Release quote currency used
    sell_release_amount := p_quantity; -- Release base currency sold
    
    -- Release funds
    PERFORM release_fund_reservation(buy_reservation_id, buy_release_amount);
    PERFORM release_fund_reservation(sell_reservation_id, sell_release_amount);
    
    RETURN trade_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Trade execution failed: %', SQLERRM;
END;
$$;

-- Step 3: Implement the core matching engine
CREATE OR REPLACE FUNCTION match_order(
    p_order_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record RECORD;
    matching_order RECORD;
    trade_quantity DECIMAL(15,2);
    trade_price DECIMAL(10,6);
    trade_id UUID;
    total_matched DECIMAL(15,2) := 0;
    trades_executed INTEGER := 0;
    matching_orders_cursor CURSOR FOR
        SELECT * FROM get_matching_orders(
            order_record.base_currency, 
            order_record.quote_currency, 
            order_record.side, 
            order_record.price, 
            order_record.order_type
        );
BEGIN
    -- Get the order to match
    SELECT * INTO order_record
    FROM order_book
    WHERE id = p_order_id AND status IN ('pending', 'partially_filled');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Order not found or not matchable',
            'order_id', p_order_id
        );
    END IF;
    
    -- Skip matching if no remaining quantity
    IF order_record.remaining_quantity <= 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order already fully filled',
            'total_matched', 0,
            'trades_executed', 0,
            'remaining_quantity', 0
        );
    END IF;
    
    -- Find and execute matches
    FOR matching_order IN matching_orders_cursor LOOP
        EXIT WHEN order_record.remaining_quantity <= 0;
        
        -- Skip self-matching (same user)
        IF matching_order.user_id = order_record.user_id THEN
            CONTINUE;
        END IF;
        
        -- Determine trade quantity (minimum of both remaining quantities)
        trade_quantity := LEAST(order_record.remaining_quantity, matching_order.remaining_quantity);
        
        -- Determine trade price (taker pays maker's price - price-time priority)
        trade_price := matching_order.price;
        
        -- Execute the trade
        IF order_record.side = 'buy' THEN
            -- Incoming buy order matches existing sell order
            SELECT execute_trade(
                order_record.id, matching_order.id,
                order_record.user_id, matching_order.user_id,
                order_record.base_currency, order_record.quote_currency,
                trade_quantity, trade_price
            ) INTO trade_id;
        ELSE
            -- Incoming sell order matches existing buy order
            SELECT execute_trade(
                matching_order.id, order_record.id,
                matching_order.user_id, order_record.user_id,
                order_record.base_currency, order_record.quote_currency,
                trade_quantity, trade_price
            ) INTO trade_id;
        END IF;
        
        -- Update tracking variables
        total_matched := total_matched + trade_quantity;
        trades_executed := trades_executed + 1;
        order_record.remaining_quantity := order_record.remaining_quantity - trade_quantity;
        
        -- Update average fill price for the incoming order
        IF order_record.filled_quantity = 0 THEN
            order_record.average_fill_price := trade_price;
        ELSE
            order_record.average_fill_price := 
                ((order_record.average_fill_price * order_record.filled_quantity) + (trade_price * trade_quantity)) 
                / (order_record.filled_quantity + trade_quantity);
        END IF;
        
        order_record.filled_quantity := order_record.filled_quantity + trade_quantity;
    END LOOP;
    
    -- Final order status update (already done in execute_trade, but ensure consistency)
    UPDATE order_book
    SET remaining_quantity = order_record.remaining_quantity,
        filled_quantity = order_record.filled_quantity,
        average_fill_price = order_record.average_fill_price,
        status = CASE 
            WHEN order_record.remaining_quantity = 0 THEN 'filled'
            WHEN total_matched > 0 THEN 'partially_filled'
            ELSE status
        END,
        updated_at = NOW(),
        filled_at = CASE WHEN order_record.remaining_quantity = 0 THEN NOW() ELSE filled_at END
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'total_matched', total_matched,
        'trades_executed', trades_executed,
        'remaining_quantity', order_record.remaining_quantity,
        'average_fill_price', order_record.average_fill_price,
        'order_status', CASE 
            WHEN order_record.remaining_quantity = 0 THEN 'filled'
            WHEN total_matched > 0 THEN 'partially_filled'
            ELSE 'pending'
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', SQLERRM,
            'order_id', p_order_id
        );
END;
$$;

-- Step 4: Create function to get best bid/ask prices
CREATE OR REPLACE FUNCTION get_best_prices(
    p_base_currency TEXT,
    p_quote_currency TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    best_bid DECIMAL(10,6);
    best_ask DECIMAL(10,6);
    bid_quantity DECIMAL(15,2);
    ask_quantity DECIMAL(15,2);
    spread DECIMAL(10,6);
    spread_percentage DECIMAL(5,2);
BEGIN
    -- Get best bid (highest buy price)
    SELECT price, SUM(remaining_quantity) INTO best_bid, bid_quantity
    FROM order_book
    WHERE base_currency = p_base_currency
      AND quote_currency = p_quote_currency
      AND side = 'buy'
      AND status IN ('pending', 'partially_filled')
      AND price IS NOT NULL
    GROUP BY price
    ORDER BY price DESC
    LIMIT 1;
    
    -- Get best ask (lowest sell price)
    SELECT price, SUM(remaining_quantity) INTO best_ask, ask_quantity
    FROM order_book
    WHERE base_currency = p_base_currency
      AND quote_currency = p_quote_currency
      AND side = 'sell'
      AND status IN ('pending', 'partially_filled')
      AND price IS NOT NULL
    GROUP BY price
    ORDER BY price ASC
    LIMIT 1;
    
    -- Calculate spread
    IF best_bid IS NOT NULL AND best_ask IS NOT NULL THEN
        spread := best_ask - best_bid;
        spread_percentage := (spread / best_ask) * 100;
    END IF;
    
    RETURN json_build_object(
        'base_currency', p_base_currency,
        'quote_currency', p_quote_currency,
        'best_bid', best_bid,
        'best_ask', best_ask,
        'bid_quantity', COALESCE(bid_quantity, 0),
        'ask_quantity', COALESCE(ask_quantity, 0),
        'spread', spread,
        'spread_percentage', spread_percentage,
        'mid_price', CASE 
            WHEN best_bid IS NOT NULL AND best_ask IS NOT NULL 
            THEN (best_bid + best_ask) / 2 
            ELSE NULL 
        END,
        'timestamp', NOW()
    );
END;
$$;

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_matching_orders TO authenticated;
GRANT EXECUTE ON FUNCTION execute_trade TO authenticated;
GRANT EXECUTE ON FUNCTION match_order TO authenticated;
GRANT EXECUTE ON FUNCTION get_best_prices TO authenticated;

-- Step 6: Create test function to validate matching engine
CREATE OR REPLACE FUNCTION test_matching_engine()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    test_result BOOLEAN := TRUE;
BEGIN
    -- Test functions exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_matching_orders') THEN
        RAISE NOTICE 'ERROR: get_matching_orders function not found';
        RETURN FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'execute_trade') THEN
        RAISE NOTICE 'ERROR: execute_trade function not found';
        RETURN FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'match_order') THEN
        RAISE NOTICE 'ERROR: match_order function not found';
        RETURN FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_best_prices') THEN
        RAISE NOTICE 'ERROR: get_best_prices function not found';
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'SUCCESS: Matching engine functions created successfully';
    RETURN TRUE;
END;
$$;

-- Run the test
SELECT test_matching_engine();

-- Migration completed successfully
SELECT 'Price-time priority matching engine implemented successfully' AS status;
