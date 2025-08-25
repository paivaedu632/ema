-- Fix place_order function - correct fund_reservations column name
-- Migration: 20250824000005_fix_place_order_fund_reservations.sql

-- Enhanced place_order function with correct fund_reservations schema
CREATE OR REPLACE FUNCTION place_order(
    p_user_id UUID,
    p_order_type TEXT,
    p_side TEXT,
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_quantity DECIMAL(15,2),
    p_price DECIMAL(10,6) DEFAULT NULL,
    p_dynamic_pricing_enabled BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    order_id UUID,
    status TEXT,
    reserved_amount DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE,
    message TEXT,
    dynamic_pricing_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_required_currency TEXT;
    v_required_amount DECIMAL(15,2);
    v_available_balance DECIMAL(15,2);
    v_reservation_id UUID;
    v_final_price DECIMAL(10,6);
    v_original_price DECIMAL(10,6);
    v_min_bound DECIMAL(10,6);
    v_max_bound DECIMAL(10,6);
    v_price_bounds_pct DECIMAL(5,2);
    v_dynamic_info JSONB := '{}'::JSONB;
BEGIN
    -- Validate input parameters
    IF p_order_type NOT IN ('limit', 'market') THEN
        RAISE EXCEPTION 'Invalid order type. Must be limit or market';
    END IF;
    
    IF p_side NOT IN ('buy', 'sell') THEN
        RAISE EXCEPTION 'Invalid side. Must be buy or sell';
    END IF;
    
    IF p_base_currency NOT IN ('EUR', 'AOA') OR p_quote_currency NOT IN ('EUR', 'AOA') THEN
        RAISE EXCEPTION 'Invalid currency. Must be EUR or AOA';
    END IF;
    
    IF p_base_currency = p_quote_currency THEN
        RAISE EXCEPTION 'Base and quote currencies must be different';
    END IF;
    
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;
    
    -- Validate price for limit orders
    IF p_order_type = 'limit' THEN
        IF p_price IS NULL OR p_price <= 0 THEN
            RAISE EXCEPTION 'Price is required and must be positive for limit orders';
        END IF;
    END IF;
    
    -- Dynamic pricing only applies to limit sell orders
    IF p_dynamic_pricing_enabled AND (p_order_type != 'limit' OR p_side != 'sell') THEN
        RAISE EXCEPTION 'Dynamic pricing only applies to limit sell orders';
    END IF;
    
    -- Set final price
    v_final_price := p_price;
    v_original_price := p_price;
    
    -- Calculate price bounds for dynamic pricing
    IF p_dynamic_pricing_enabled THEN
        SELECT (get_dynamic_pricing_config('price_bounds_percentage')::TEXT)::DECIMAL INTO v_price_bounds_pct;
        v_min_bound := p_price * (1 - v_price_bounds_pct / 100);
        v_max_bound := p_price * (1 + v_price_bounds_pct / 100);
        
        v_dynamic_info := jsonb_build_object(
            'enabled', true,
            'original_price', v_original_price,
            'min_bound', v_min_bound,
            'max_bound', v_max_bound,
            'bounds_percentage', v_price_bounds_pct
        );
    END IF;
    
    -- Determine required currency and amount for fund reservation
    IF p_side = 'buy' THEN
        v_required_currency := p_quote_currency;
        IF p_order_type = 'limit' THEN
            v_required_amount := p_quantity * p_price;
        ELSE
            -- For market orders, we'll need to estimate or use a maximum
            v_required_amount := p_quantity * 2000; -- Conservative estimate
        END IF;
    ELSE -- sell
        v_required_currency := p_base_currency;
        v_required_amount := p_quantity;
    END IF;
    
    -- Check available balance
    SELECT available_balance INTO v_available_balance
    FROM wallets
    WHERE user_id = p_user_id AND currency = v_required_currency;
    
    IF v_available_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for currency %', v_required_currency;
    END IF;
    
    IF v_available_balance < v_required_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', 
            v_required_amount, v_available_balance;
    END IF;
    
    -- Create fund reservation (fix column name: amount instead of reserved_amount)
    INSERT INTO fund_reservations (user_id, currency, amount, status)
    VALUES (p_user_id, v_required_currency, v_required_amount, 'active')
    RETURNING id INTO v_reservation_id;
    
    -- Update wallet balance
    UPDATE wallets
    SET 
        available_balance = available_balance - v_required_amount,
        reserved_balance = reserved_balance + v_required_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id AND currency = v_required_currency;
    
    -- Create order
    INSERT INTO order_book (
        user_id, order_type, side, base_currency, quote_currency,
        quantity, remaining_quantity, price, reserved_amount,
        dynamic_pricing_enabled, original_price, min_price_bound, max_price_bound,
        last_price_update, status
    ) VALUES (
        p_user_id, p_order_type, p_side, p_base_currency, p_quote_currency,
        p_quantity, p_quantity, v_final_price, v_required_amount,
        p_dynamic_pricing_enabled, v_original_price, v_min_bound, v_max_bound,
        CASE WHEN p_dynamic_pricing_enabled THEN NOW() ELSE NULL END,
        'pending'
    ) RETURNING id, created_at INTO v_order_id, created_at;
    
    -- Update fund reservation with order_id (fix column name: reference_id instead of order_id)
    UPDATE fund_reservations
    SET reference_id = v_order_id
    WHERE id = v_reservation_id;
    
    -- Attempt immediate matching
    PERFORM match_order(v_order_id);
    
    -- Get final order status
    SELECT status INTO status
    FROM order_book
    WHERE id = v_order_id;
    
    -- Return results
    RETURN QUERY SELECT
        v_order_id,
        status,
        v_required_amount,
        created_at,
        CASE 
            WHEN status = 'filled' THEN 'Order executed completely'
            WHEN status = 'partially_filled' THEN 'Order executed partially'
            ELSE 'Order created and pending execution'
        END::TEXT,
        v_dynamic_info;
END;
$$;
