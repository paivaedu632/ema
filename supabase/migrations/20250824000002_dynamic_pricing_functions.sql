-- Dynamic Pricing Calculation Functions
-- Migration: 20250824000002_dynamic_pricing_functions.sql

-- 1. Function to calculate VWAP for a currency pair
CREATE OR REPLACE FUNCTION calculate_vwap(
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_hours INTEGER DEFAULT 12
)
RETURNS TABLE(
    vwap DECIMAL(10,6),
    total_volume DECIMAL(15,2),
    trade_count INTEGER,
    calculation_period INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate cutoff time
    v_cutoff_time := NOW() - (p_hours || ' hours')::INTERVAL;
    
    -- Calculate VWAP from recent trades
    RETURN QUERY
    SELECT 
        CASE 
            WHEN SUM(t.quantity) > 0 THEN
                SUM(t.price * t.quantity) / SUM(t.quantity)
            ELSE NULL
        END::DECIMAL(10,6) as vwap,
        COALESCE(SUM(t.quantity), 0)::DECIMAL(15,2) as total_volume,
        COUNT(*)::INTEGER as trade_count,
        (p_hours || ' hours')::INTERVAL as calculation_period
    FROM trades t
    WHERE t.base_currency = p_base_currency
      AND t.quote_currency = p_quote_currency
      AND t.executed_at >= v_cutoff_time;
END;
$$;

-- 2. Function to calculate optimal dynamic price
CREATE OR REPLACE FUNCTION calculate_dynamic_price(
    p_order_id UUID,
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_original_price DECIMAL(10,6),
    p_current_price DECIMAL(10,6)
)
RETURNS TABLE(
    suggested_price DECIMAL(10,6),
    price_source TEXT,
    vwap_reference DECIMAL(10,6),
    competitive_margin DECIMAL(5,2),
    price_change_percentage DECIMAL(5,2),
    update_recommended BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vwap_hours INTEGER;
    v_competitive_margin DECIMAL(5,2);
    v_min_change_threshold DECIMAL(5,2);
    v_min_volume DECIMAL(15,2);
    v_price_bounds DECIMAL(5,2);
    
    v_vwap_data RECORD;
    v_calculated_price DECIMAL(10,6);
    v_best_ask DECIMAL(10,6);
    v_min_bound DECIMAL(10,6);
    v_max_bound DECIMAL(10,6);
    v_change_pct DECIMAL(5,2);
BEGIN
    -- Get configuration values
    SELECT (get_dynamic_pricing_config('vwap_calculation_hours')::TEXT)::INTEGER INTO v_vwap_hours;
    SELECT (get_dynamic_pricing_config('competitive_margin_percentage')::TEXT)::DECIMAL INTO v_competitive_margin;
    SELECT (get_dynamic_pricing_config('minimum_price_change_threshold')::TEXT)::DECIMAL INTO v_min_change_threshold;
    SELECT (get_dynamic_pricing_config('minimum_trade_volume_for_vwap')::TEXT)::DECIMAL INTO v_min_volume;
    SELECT (get_dynamic_pricing_config('price_bounds_percentage')::TEXT)::DECIMAL INTO v_price_bounds;
    
    -- Calculate price bounds
    v_min_bound := p_original_price * (1 - v_price_bounds / 100);
    v_max_bound := p_original_price * (1 + v_price_bounds / 100);
    
    -- Get VWAP data
    SELECT * INTO v_vwap_data
    FROM calculate_vwap(p_base_currency, p_quote_currency, v_vwap_hours);
    
    -- Determine pricing strategy
    IF v_vwap_data.vwap IS NOT NULL AND v_vwap_data.total_volume >= v_min_volume THEN
        -- Use VWAP-based pricing
        v_calculated_price := v_vwap_data.vwap * (1 - v_competitive_margin / 100);
        
        -- Apply bounds
        v_calculated_price := GREATEST(v_min_bound, LEAST(v_max_bound, v_calculated_price));
        
        -- Calculate change percentage
        v_change_pct := ((v_calculated_price - p_current_price) / p_current_price) * 100;
        
        RETURN QUERY SELECT
            v_calculated_price,
            'vwap_calculation'::TEXT,
            v_vwap_data.vwap,
            v_competitive_margin,
            v_change_pct,
            (ABS(v_change_pct) >= v_min_change_threshold)::BOOLEAN;
            
    ELSE
        -- Fallback to best ask pricing
        SELECT MIN(price) INTO v_best_ask
        FROM order_book
        WHERE base_currency = p_base_currency
          AND quote_currency = p_quote_currency
          AND side = 'sell'
          AND status IN ('pending', 'partially_filled')
          AND id != p_order_id;
        
        IF v_best_ask IS NOT NULL THEN
            v_calculated_price := v_best_ask * 0.99; -- 1% below best ask
            v_calculated_price := GREATEST(v_min_bound, LEAST(v_max_bound, v_calculated_price));
            v_change_pct := ((v_calculated_price - p_current_price) / p_current_price) * 100;
            
            RETURN QUERY SELECT
                v_calculated_price,
                'best_ask_adjustment'::TEXT,
                NULL::DECIMAL(10,6),
                1.0::DECIMAL(5,2),
                v_change_pct,
                (ABS(v_change_pct) >= v_min_change_threshold)::BOOLEAN;
        ELSE
            -- No market data available, keep current price
            RETURN QUERY SELECT
                p_current_price,
                'no_market_data'::TEXT,
                NULL::DECIMAL(10,6),
                0.0::DECIMAL(5,2),
                0.0::DECIMAL(5,2),
                FALSE::BOOLEAN;
        END IF;
    END IF;
END;
$$;

-- 3. Function to update dynamic order price
CREATE OR REPLACE FUNCTION update_dynamic_order_price(p_order_id UUID)
RETURNS TABLE(
    order_id UUID,
    old_price DECIMAL(10,6),
    new_price DECIMAL(10,6),
    price_change_percentage DECIMAL(5,2),
    update_reason TEXT,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_price_calc RECORD;
    v_max_change DECIMAL(5,2);
BEGIN
    -- Get configuration
    SELECT (get_dynamic_pricing_config('maximum_price_change_per_update')::TEXT)::DECIMAL INTO v_max_change;
    
    -- Get order details
    SELECT * INTO v_order
    FROM order_book
    WHERE id = p_order_id
      AND dynamic_pricing_enabled = TRUE
      AND side = 'sell'
      AND type = 'limit'
      AND status IN ('pending', 'partially_filled')
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            p_order_id,
            NULL::DECIMAL(10,6),
            NULL::DECIMAL(10,6),
            NULL::DECIMAL(5,2),
            'order_not_eligible'::TEXT,
            FALSE::BOOLEAN,
            'Order not found or not eligible for dynamic pricing'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate new price
    SELECT * INTO v_price_calc
    FROM calculate_dynamic_price(
        p_order_id,
        v_order.base_currency,
        v_order.quote_currency,
        v_order.original_price,
        v_order.price
    );
    
    -- Check if update is recommended and within bounds
    IF v_price_calc.update_recommended AND ABS(v_price_calc.price_change_percentage) <= v_max_change THEN
        -- Update the order price
        UPDATE order_book
        SET 
            price = v_price_calc.suggested_price,
            last_price_update = NOW(),
            price_update_count = price_update_count + 1,
            updated_at = NOW()
        WHERE id = p_order_id;
        
        -- Record price update
        INSERT INTO price_updates (
            order_id, user_id, old_price, new_price, price_change_percentage,
            update_reason, vwap_reference, trade_volume_reference
        ) VALUES (
            p_order_id, v_order.user_id, v_order.price, v_price_calc.suggested_price,
            v_price_calc.price_change_percentage, v_price_calc.price_source,
            v_price_calc.vwap_reference, NULL
        );
        
        RETURN QUERY SELECT
            p_order_id,
            v_order.price,
            v_price_calc.suggested_price,
            v_price_calc.price_change_percentage,
            v_price_calc.price_source,
            TRUE::BOOLEAN,
            'Price updated successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT
            p_order_id,
            v_order.price,
            v_order.price,
            0.0::DECIMAL(5,2),
            'no_update_needed'::TEXT,
            FALSE::BOOLEAN,
            'No price update needed or change exceeds maximum allowed'::TEXT;
    END IF;
END;
$$;

-- 4. Function to process all dynamic pricing updates
CREATE OR REPLACE FUNCTION process_all_dynamic_pricing_updates()
RETURNS TABLE(
    total_orders_processed INTEGER,
    orders_updated INTEGER,
    orders_unchanged INTEGER,
    processing_duration INTERVAL,
    update_summary JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_update_interval INTEGER;
    v_cutoff_time TIMESTAMP WITH TIME ZONE;
    v_order_record RECORD;
    v_update_result RECORD;
    v_total_processed INTEGER := 0;
    v_total_updated INTEGER := 0;
    v_update_details JSONB := '[]'::JSONB;
BEGIN
    v_start_time := NOW();

    -- Get update interval configuration
    SELECT (get_dynamic_pricing_config('price_update_interval_minutes')::TEXT)::INTEGER INTO v_update_interval;
    v_cutoff_time := NOW() - (v_update_interval || ' minutes')::INTERVAL;

    -- Process each eligible dynamic order
    FOR v_order_record IN
        SELECT id, user_id, base_currency, quote_currency, price, original_price, last_price_update
        FROM order_book
        WHERE dynamic_pricing_enabled = TRUE
          AND side = 'sell'
          AND type = 'limit'
          AND status IN ('pending', 'partially_filled')
          AND (last_price_update IS NULL OR last_price_update <= v_cutoff_time)
        ORDER BY last_price_update ASC NULLS FIRST
    LOOP
        v_total_processed := v_total_processed + 1;

        -- Update this order's price
        SELECT * INTO v_update_result
        FROM update_dynamic_order_price(v_order_record.id);

        IF v_update_result.success THEN
            v_total_updated := v_total_updated + 1;

            -- Add to update summary
            v_update_details := v_update_details || jsonb_build_object(
                'order_id', v_update_result.order_id,
                'old_price', v_update_result.old_price,
                'new_price', v_update_result.new_price,
                'change_percentage', v_update_result.price_change_percentage,
                'reason', v_update_result.update_reason
            );
        END IF;
    END LOOP;

    v_end_time := NOW();

    RETURN QUERY SELECT
        v_total_processed,
        v_total_updated,
        v_total_processed - v_total_updated,
        v_end_time - v_start_time,
        v_update_details;
END;
$$;

-- 5. Function to toggle dynamic pricing for an order
CREATE OR REPLACE FUNCTION toggle_dynamic_pricing(
    p_order_id UUID,
    p_user_id UUID,
    p_enable BOOLEAN
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    current_price DECIMAL(10,6),
    original_price DECIMAL(10,6)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
BEGIN
    -- Get and lock the order
    SELECT * INTO v_order
    FROM order_book
    WHERE id = p_order_id
      AND user_id = p_user_id
      AND side = 'sell'
      AND type = 'limit'
      AND status IN ('pending', 'partially_filled')
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            FALSE::BOOLEAN,
            'Order not found or not eligible for dynamic pricing'::TEXT,
            NULL::DECIMAL(10,6),
            NULL::DECIMAL(10,6);
        RETURN;
    END IF;

    -- Update dynamic pricing status
    UPDATE order_book
    SET
        dynamic_pricing_enabled = p_enable,
        last_price_update = CASE WHEN p_enable THEN NOW() ELSE last_price_update END,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Record the change
    INSERT INTO price_updates (
        order_id, user_id, old_price, new_price, price_change_percentage,
        update_reason, vwap_reference, trade_volume_reference
    ) VALUES (
        p_order_id, p_user_id, v_order.price, v_order.price, 0.0,
        CASE WHEN p_enable THEN 'dynamic_pricing_enabled' ELSE 'dynamic_pricing_disabled' END,
        NULL, NULL
    );

    RETURN QUERY SELECT
        TRUE::BOOLEAN,
        CASE WHEN p_enable THEN 'Dynamic pricing enabled' ELSE 'Dynamic pricing disabled' END::TEXT,
        v_order.price,
        v_order.original_price;
END;
$$;
