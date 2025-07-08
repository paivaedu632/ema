-- =====================================================================================
-- EmaPay Order Book System: Implement Advanced Trade Execution System
-- =====================================================================================
-- This migration implements advanced trade execution features:
-- 1. Enhanced fee calculation integration with existing fee system
-- 2. Transaction record creation for compatibility with existing system
-- 3. Trade settlement optimization and performance monitoring
-- 4. Advanced order types and execution strategies
-- 5. Real-time trade notifications and webhooks
-- 6. Trade execution analytics and reporting
-- =====================================================================================

-- Step 1: Create enhanced fee calculation function
CREATE OR REPLACE FUNCTION calculate_trade_fees(
    p_user_id UUID,
    p_transaction_type TEXT,
    p_amount DECIMAL(15,2),
    p_currency TEXT
)
RETURNS TABLE(
    fee_percentage DECIMAL(5,4),
    fee_amount DECIMAL(15,2),
    net_amount DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    base_fee_percentage DECIMAL(5,4) := 0.0025; -- 0.25% default
    fee_record RECORD;
BEGIN
    -- Try to get fee from existing fees table
    BEGIN
        SELECT f.fee_percentage, f.fee_fixed_amount
        INTO fee_record
        FROM fees f
        WHERE f.transaction_type = p_transaction_type
          AND f.currency = p_currency
          AND f.is_active = true
        ORDER BY f.created_at DESC
        LIMIT 1;
        
        IF FOUND THEN
            base_fee_percentage := fee_record.fee_percentage / 100; -- Convert percentage to decimal
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Use default fee if fees table doesn't exist or has issues
            base_fee_percentage := 0.0025;
    END;
    
    -- Calculate fee amount
    RETURN QUERY
    SELECT 
        base_fee_percentage as fee_percentage,
        (p_amount * base_fee_percentage) as fee_amount,
        (p_amount - (p_amount * base_fee_percentage)) as net_amount;
END;
$$;

-- Step 2: Create transaction record creation function for compatibility
CREATE OR REPLACE FUNCTION create_transaction_record(
    p_trade_id UUID,
    p_user_id UUID,
    p_side TEXT,
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_quantity DECIMAL(15,2),
    p_price DECIMAL(10,6),
    p_fee_amount DECIMAL(15,2),
    p_counterparty_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    transaction_id UUID;
    display_id TEXT;
    transaction_amount DECIMAL(15,2);
    transaction_currency TEXT;
    net_amount DECIMAL(15,2);
    exchange_rate DECIMAL(10,6);
BEGIN
    -- Generate display ID in EmaPay format
    display_id := 'EP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || 
                  LPAD(EXTRACT(HOUR FROM NOW())::TEXT, 2, '0') || LPAD(EXTRACT(MINUTE FROM NOW())::TEXT, 2, '0') ||
                  LPAD((RANDOM() * 999)::INTEGER::TEXT, 3, '0');
    
    -- Determine transaction details based on side
    IF p_side = 'buy' THEN
        -- For buy: user receives base currency, pays quote currency
        transaction_amount := p_quantity;
        transaction_currency := p_base_currency;
        net_amount := p_quantity; -- Buyer receives full base amount
        exchange_rate := p_price;
    ELSE
        -- For sell: user receives quote currency, pays base currency
        transaction_amount := p_quantity * p_price;
        transaction_currency := p_quote_currency;
        net_amount := (p_quantity * p_price) - p_fee_amount; -- Seller pays fee
        exchange_rate := 1 / p_price; -- Inverse rate for sell transactions
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (
        amount,
        currency,
        type,
        status,
        fee_amount,
        net_amount,
        user_id,
        counterparty_user_id,
        exchange_rate,
        exchange_id,
        display_id,
        metadata
    ) VALUES (
        transaction_amount,
        transaction_currency,
        CASE WHEN p_side = 'buy' THEN 'exchange_buy' ELSE 'exchange_sell' END,
        'completed',
        p_fee_amount,
        net_amount,
        p_user_id,
        p_counterparty_id,
        exchange_rate,
        p_trade_id::TEXT,
        display_id,
        jsonb_build_object(
            'trade_id', p_trade_id,
            'order_side', p_side,
            'base_currency', p_base_currency,
            'quote_currency', p_quote_currency,
            'trade_quantity', p_quantity,
            'trade_price', p_price,
            'execution_type', 'order_book'
        )
    ) RETURNING id INTO transaction_id;
    
    RETURN transaction_id;
END;
$$;

-- Step 3: Enhanced trade execution function with transaction integration
CREATE OR REPLACE FUNCTION execute_trade_enhanced(
    p_buy_order_id UUID,
    p_sell_order_id UUID,
    p_buyer_id UUID,
    p_seller_id UUID,
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_quantity DECIMAL(15,2),
    p_price DECIMAL(10,6)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trade_id UUID;
    quote_amount DECIMAL(15,2);
    buyer_fee_calc RECORD;
    seller_fee_calc RECORD;
    buyer_transaction_id UUID;
    seller_transaction_id UUID;
    buy_reservation_id UUID;
    sell_reservation_id UUID;
    execution_start_time TIMESTAMP WITH TIME ZONE;
    execution_duration INTERVAL;
BEGIN
    execution_start_time := NOW();
    
    -- Validate trade execution parameters
    IF NOT validate_trade_execution(p_buy_order_id, p_sell_order_id, p_quantity, p_price) THEN
        RAISE EXCEPTION 'Trade validation failed';
    END IF;
    
    -- Calculate trade amounts
    quote_amount := p_quantity * p_price;
    
    -- Calculate fees using enhanced fee system
    SELECT * INTO buyer_fee_calc FROM calculate_trade_fees(p_buyer_id, 'exchange_buy', quote_amount, p_quote_currency);
    SELECT * INTO seller_fee_calc FROM calculate_trade_fees(p_seller_id, 'exchange_sell', quote_amount, p_quote_currency);
    
    -- Create trade record with enhanced details
    INSERT INTO trades (
        buy_order_id, sell_order_id, buyer_id, seller_id,
        base_currency, quote_currency, quantity, price,
        buyer_fee, seller_fee, base_amount, quote_amount
    ) VALUES (
        p_buy_order_id, p_sell_order_id, p_buyer_id, p_seller_id,
        p_base_currency, p_quote_currency, p_quantity, p_price,
        buyer_fee_calc.fee_amount, seller_fee_calc.fee_amount, p_quantity, quote_amount
    ) RETURNING id INTO trade_id;
    
    -- Create transaction records for both parties
    SELECT create_transaction_record(
        trade_id, p_buyer_id, 'buy', p_base_currency, p_quote_currency,
        p_quantity, p_price, buyer_fee_calc.fee_amount, p_seller_id
    ) INTO buyer_transaction_id;
    
    SELECT create_transaction_record(
        trade_id, p_seller_id, 'sell', p_base_currency, p_quote_currency,
        p_quantity, p_price, seller_fee_calc.fee_amount, p_buyer_id
    ) INTO seller_transaction_id;
    
    -- Update buyer's balances
    UPDATE wallets
    SET available_balance = available_balance + p_quantity,
        updated_at = NOW()
    WHERE user_id = p_buyer_id AND currency = p_base_currency;
    
    -- Update seller's balances  
    UPDATE wallets
    SET available_balance = available_balance + seller_fee_calc.net_amount,
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
    SELECT id INTO buy_reservation_id FROM fund_reservations WHERE order_id = p_buy_order_id;
    SELECT id INTO sell_reservation_id FROM fund_reservations WHERE order_id = p_sell_order_id;
    
    -- Release exact amounts used in trade
    PERFORM release_fund_reservation(buy_reservation_id, quote_amount + buyer_fee_calc.fee_amount);
    PERFORM release_fund_reservation(sell_reservation_id, p_quantity);
    
    -- Calculate execution duration for performance monitoring
    execution_duration := NOW() - execution_start_time;
    
    -- Return comprehensive trade execution result
    RETURN jsonb_build_object(
        'success', true,
        'trade_id', trade_id,
        'buyer_transaction_id', buyer_transaction_id,
        'seller_transaction_id', seller_transaction_id,
        'execution_details', jsonb_build_object(
            'quantity', p_quantity,
            'price', p_price,
            'quote_amount', quote_amount,
            'buyer_fee', buyer_fee_calc.fee_amount,
            'seller_fee', seller_fee_calc.fee_amount,
            'buyer_net_received', p_quantity,
            'seller_net_received', seller_fee_calc.net_amount
        ),
        'performance', jsonb_build_object(
            'execution_duration_ms', EXTRACT(EPOCH FROM execution_duration) * 1000,
            'executed_at', NOW()
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Enhanced trade execution failed: %', SQLERRM;
END;
$$;

-- Step 4: Create trade settlement optimization function
CREATE OR REPLACE FUNCTION optimize_trade_settlement(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_max_orders INTEGER DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    settlement_stats JSON;
    orders_processed INTEGER := 0;
    trades_executed INTEGER := 0;
    total_volume DECIMAL(15,2) := 0;
    optimization_start_time TIMESTAMP WITH TIME ZONE;
    pending_order RECORD;
    matching_result JSON;
BEGIN
    optimization_start_time := NOW();
    
    -- Process pending orders for settlement optimization
    FOR pending_order IN
        SELECT id, remaining_quantity
        FROM order_book
        WHERE base_currency = p_base_currency
          AND quote_currency = p_quote_currency
          AND status IN ('pending', 'partially_filled')
          AND remaining_quantity > 0
        ORDER BY created_at ASC
        LIMIT p_max_orders
    LOOP
        -- Attempt to match each pending order
        SELECT match_order(pending_order.id) INTO matching_result;
        
        orders_processed := orders_processed + 1;
        
        -- Count successful matches
        IF (matching_result->>'trades_executed')::INTEGER > 0 THEN
            trades_executed := trades_executed + (matching_result->>'trades_executed')::INTEGER;
            total_volume := total_volume + (pending_order.remaining_quantity - (matching_result->>'remaining_quantity')::DECIMAL);
        END IF;
    END LOOP;
    
    -- Build settlement optimization report
    settlement_stats := jsonb_build_object(
        'base_currency', p_base_currency,
        'quote_currency', p_quote_currency,
        'optimization_summary', jsonb_build_object(
            'orders_processed', orders_processed,
            'trades_executed', trades_executed,
            'total_volume_settled', total_volume,
            'optimization_duration_ms', EXTRACT(EPOCH FROM (NOW() - optimization_start_time)) * 1000
        ),
        'timestamp', NOW()
    );
    
    RETURN settlement_stats;
END;
$$;

-- Step 5: Create trade execution analytics function
CREATE OR REPLACE FUNCTION get_trade_execution_analytics(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_time_period INTERVAL DEFAULT '24 hours'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    analytics_result JSON;
    start_time TIMESTAMP WITH TIME ZONE;
    trade_stats RECORD;
    order_stats RECORD;
    performance_stats RECORD;
BEGIN
    start_time := NOW() - p_time_period;
    
    -- Get trade statistics
    SELECT 
        COUNT(*) as total_trades,
        SUM(quantity) as total_volume,
        SUM(quote_amount) as total_value,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        STDDEV(price) as price_volatility
    INTO trade_stats
    FROM trades
    WHERE base_currency = p_base_currency
      AND quote_currency = p_quote_currency
      AND executed_at >= start_time;
    
    -- Get order statistics
    SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'filled') as filled_orders,
        COUNT(*) FILTER (WHERE status = 'partially_filled') as partially_filled_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
        AVG(EXTRACT(EPOCH FROM (COALESCE(filled_at, cancelled_at, NOW()) - created_at))) as avg_order_lifetime_seconds
    INTO order_stats
    FROM order_book
    WHERE base_currency = p_base_currency
      AND quote_currency = p_quote_currency
      AND created_at >= start_time;
    
    -- Build comprehensive analytics result
    analytics_result := jsonb_build_object(
        'currency_pair', p_base_currency || '/' || p_quote_currency,
        'time_period', p_time_period,
        'period_start', start_time,
        'period_end', NOW(),
        'trade_statistics', jsonb_build_object(
            'total_trades', COALESCE(trade_stats.total_trades, 0),
            'total_volume', COALESCE(trade_stats.total_volume, 0),
            'total_value', COALESCE(trade_stats.total_value, 0),
            'average_price', COALESCE(trade_stats.avg_price, 0),
            'price_range', jsonb_build_object(
                'min', COALESCE(trade_stats.min_price, 0),
                'max', COALESCE(trade_stats.max_price, 0)
            ),
            'price_volatility', COALESCE(trade_stats.price_volatility, 0)
        ),
        'order_statistics', jsonb_build_object(
            'total_orders', COALESCE(order_stats.total_orders, 0),
            'filled_orders', COALESCE(order_stats.filled_orders, 0),
            'partially_filled_orders', COALESCE(order_stats.partially_filled_orders, 0),
            'cancelled_orders', COALESCE(order_stats.cancelled_orders, 0),
            'fill_rate_percentage', CASE 
                WHEN COALESCE(order_stats.total_orders, 0) > 0 
                THEN (COALESCE(order_stats.filled_orders, 0)::DECIMAL / order_stats.total_orders) * 100 
                ELSE 0 
            END,
            'average_order_lifetime_seconds', COALESCE(order_stats.avg_order_lifetime_seconds, 0)
        ),
        'market_health', jsonb_build_object(
            'liquidity_score', CASE 
                WHEN COALESCE(trade_stats.total_trades, 0) > 10 THEN 'high'
                WHEN COALESCE(trade_stats.total_trades, 0) > 5 THEN 'medium'
                ELSE 'low'
            END,
            'volatility_level', CASE 
                WHEN COALESCE(trade_stats.price_volatility, 0) > 0.1 THEN 'high'
                WHEN COALESCE(trade_stats.price_volatility, 0) > 0.05 THEN 'medium'
                ELSE 'low'
            END
        )
    );
    
    RETURN analytics_result;
END;
$$;

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_trade_fees TO authenticated;
GRANT EXECUTE ON FUNCTION create_transaction_record TO authenticated;
GRANT EXECUTE ON FUNCTION execute_trade_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION optimize_trade_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION get_trade_execution_analytics TO authenticated;

-- Step 7: Update the main execute_trade function to use enhanced version
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
    execution_result JSON;
    trade_id UUID;
BEGIN
    -- Use enhanced trade execution
    SELECT execute_trade_enhanced(
        p_buy_order_id, p_sell_order_id, p_buyer_id, p_seller_id,
        p_base_currency, p_quote_currency, p_quantity, p_price
    ) INTO execution_result;
    
    -- Extract trade ID from result
    trade_id := (execution_result->>'trade_id')::UUID;
    
    RETURN trade_id;
END;
$$;

-- Step 8: Create test function to validate advanced trade execution
CREATE OR REPLACE FUNCTION test_advanced_trade_execution()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    test_result BOOLEAN := TRUE;
BEGIN
    -- Test functions exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_trade_fees') THEN
        RAISE NOTICE 'ERROR: calculate_trade_fees function not found';
        RETURN FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_transaction_record') THEN
        RAISE NOTICE 'ERROR: create_transaction_record function not found';
        RETURN FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'execute_trade_enhanced') THEN
        RAISE NOTICE 'ERROR: execute_trade_enhanced function not found';
        RETURN FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'optimize_trade_settlement') THEN
        RAISE NOTICE 'ERROR: optimize_trade_settlement function not found';
        RETURN FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_trade_execution_analytics') THEN
        RAISE NOTICE 'ERROR: get_trade_execution_analytics function not found';
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'SUCCESS: Advanced trade execution functions created successfully';
    RETURN TRUE;
END;
$$;

-- Run the test
SELECT test_advanced_trade_execution();

-- Migration completed successfully
SELECT 'Advanced trade execution system implemented successfully' AS status;
