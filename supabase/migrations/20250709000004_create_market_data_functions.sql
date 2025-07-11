-- EmaPay Order Book System - Market Data and Analytics Functions
-- This migration creates market data, analytics, and utility functions
-- Based on documentation: docs/emapay_backend.md
-- Status: Production Ready

-- =====================================================
-- MARKET DATA FUNCTIONS
-- =====================================================

-- Function to get best bid/ask prices
CREATE OR REPLACE FUNCTION get_best_prices(
    p_base_currency TEXT,
    p_quote_currency TEXT
)
RETURNS TABLE(
    best_bid DECIMAL(10,6),
    best_ask DECIMAL(10,6),
    spread DECIMAL(10,6),
    spread_percentage DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_best_bid DECIMAL(10,6);
    v_best_ask DECIMAL(10,6);
BEGIN
    -- Get best bid (highest buy price)
    SELECT price INTO v_best_bid
    FROM order_book
    WHERE base_currency = p_base_currency
    AND quote_currency = p_quote_currency
    AND side = 'buy'
    AND status IN ('pending', 'partially_filled')
    AND order_type = 'limit'
    ORDER BY price DESC
    LIMIT 1;
    
    -- Get best ask (lowest sell price)
    SELECT price INTO v_best_ask
    FROM order_book
    WHERE base_currency = p_base_currency
    AND quote_currency = p_quote_currency
    AND side = 'sell'
    AND status IN ('pending', 'partially_filled')
    AND order_type = 'limit'
    ORDER BY price ASC
    LIMIT 1;
    
    best_bid := v_best_bid;
    best_ask := v_best_ask;
    
    IF v_best_bid IS NOT NULL AND v_best_ask IS NOT NULL THEN
        spread := v_best_ask - v_best_bid;
        spread_percentage := (spread / v_best_ask) * 100;
    ELSE
        spread := NULL;
        spread_percentage := NULL;
    END IF;
    
    RETURN NEXT;
END;
$$;

-- Function to get order book depth
CREATE OR REPLACE FUNCTION get_order_book_depth(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_depth_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    side TEXT,
    price DECIMAL(10,6),
    quantity DECIMAL(15,2),
    total DECIMAL(15,2),
    order_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return buy orders (bids) - highest price first
    RETURN QUERY
    SELECT 
        'buy'::TEXT as side,
        o.price,
        SUM(o.remaining_quantity) as quantity,
        SUM(o.remaining_quantity * o.price) as total,
        COUNT(*)::INTEGER as order_count
    FROM order_book o
    WHERE o.base_currency = p_base_currency
    AND o.quote_currency = p_quote_currency
    AND o.side = 'buy'
    AND o.status IN ('pending', 'partially_filled')
    AND o.order_type = 'limit'
    GROUP BY o.price
    ORDER BY o.price DESC
    LIMIT p_depth_limit;
    
    -- Return sell orders (asks) - lowest price first
    RETURN QUERY
    SELECT 
        'sell'::TEXT as side,
        o.price,
        SUM(o.remaining_quantity) as quantity,
        SUM(o.remaining_quantity * o.price) as total,
        COUNT(*)::INTEGER as order_count
    FROM order_book o
    WHERE o.base_currency = p_base_currency
    AND o.quote_currency = p_quote_currency
    AND o.side = 'sell'
    AND o.status IN ('pending', 'partially_filled')
    AND o.order_type = 'limit'
    GROUP BY o.price
    ORDER BY o.price ASC
    LIMIT p_depth_limit;
END;
$$;

-- Function to get recent trades
CREATE OR REPLACE FUNCTION get_recent_trades(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    trade_id UUID,
    price DECIMAL(10,6),
    quantity DECIMAL(15,2),
    base_amount DECIMAL(15,2),
    quote_amount DECIMAL(15,2),
    executed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as trade_id,
        t.price,
        t.quantity,
        t.base_amount,
        t.quote_amount,
        t.executed_at
    FROM trades t
    WHERE t.base_currency = p_base_currency
    AND t.quote_currency = p_quote_currency
    ORDER BY t.executed_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- USER QUERY FUNCTIONS
-- =====================================================

-- Function to get user orders
CREATE OR REPLACE FUNCTION get_user_orders(
    p_user_id UUID,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    order_id UUID,
    order_type TEXT,
    side TEXT,
    base_currency TEXT,
    quote_currency TEXT,
    quantity DECIMAL(15,2),
    remaining_quantity DECIMAL(15,2),
    filled_quantity DECIMAL(15,2),
    price DECIMAL(10,6),
    average_fill_price DECIMAL(10,6),
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    filled_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as order_id,
        o.order_type,
        o.side,
        o.base_currency,
        o.quote_currency,
        o.quantity,
        o.remaining_quantity,
        o.filled_quantity,
        o.price,
        o.average_fill_price,
        o.status,
        o.created_at,
        o.filled_at
    FROM order_book o
    WHERE o.user_id = p_user_id
    AND (p_status IS NULL OR o.status = p_status)
    ORDER BY o.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function to get order details with trade history
CREATE OR REPLACE FUNCTION get_order_details(
    p_order_id UUID
)
RETURNS TABLE(
    order_id UUID,
    user_id UUID,
    order_type TEXT,
    side TEXT,
    base_currency TEXT,
    quote_currency TEXT,
    quantity DECIMAL(15,2),
    remaining_quantity DECIMAL(15,2),
    filled_quantity DECIMAL(15,2),
    price DECIMAL(10,6),
    average_fill_price DECIMAL(10,6),
    status TEXT,
    reserved_amount DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    filled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    trades JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_trades JSONB;
BEGIN
    -- Get order details
    SELECT * INTO v_order
    FROM order_book o
    WHERE o.id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get associated trades
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'trade_id', t.id,
                'quantity', t.quantity,
                'price', t.price,
                'base_amount', t.base_amount,
                'quote_amount', t.quote_amount,
                'executed_at', t.executed_at,
                'counterparty_id', CASE 
                    WHEN t.buy_order_id = p_order_id THEN t.seller_id 
                    ELSE t.buyer_id 
                END
            )
        ),
        '[]'::jsonb
    ) INTO v_trades
    FROM trades t
    WHERE t.buy_order_id = p_order_id OR t.sell_order_id = p_order_id;
    
    -- Return order with trades
    order_id := v_order.id;
    user_id := v_order.user_id;
    order_type := v_order.order_type;
    side := v_order.side;
    base_currency := v_order.base_currency;
    quote_currency := v_order.quote_currency;
    quantity := v_order.quantity;
    remaining_quantity := v_order.remaining_quantity;
    filled_quantity := v_order.filled_quantity;
    price := v_order.price;
    average_fill_price := v_order.average_fill_price;
    status := v_order.status;
    reserved_amount := v_order.reserved_amount;
    created_at := v_order.created_at;
    updated_at := v_order.updated_at;
    filled_at := v_order.filled_at;
    cancelled_at := v_order.cancelled_at;
    trades := v_trades;
    
    RETURN NEXT;
END;
$$;
