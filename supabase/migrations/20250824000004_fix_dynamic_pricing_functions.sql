-- Fix Dynamic Pricing Functions - Column Name Corrections
-- Migration: 20250824000004_fix_dynamic_pricing_functions.sql

-- Fix update_dynamic_order_price function - correct column names
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
    
    -- Get order details (fix column name from 'type' to 'order_type')
    SELECT * INTO v_order
    FROM order_book
    WHERE id = p_order_id
      AND dynamic_pricing_enabled = TRUE
      AND side = 'sell'
      AND order_type = 'limit'
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

-- Fix toggle_dynamic_pricing function - correct column names
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
    -- Get and lock the order (fix column name from 'type' to 'order_type')
    SELECT * INTO v_order
    FROM order_book
    WHERE id = p_order_id
      AND user_id = p_user_id
      AND side = 'sell'
      AND order_type = 'limit'
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

-- Fix process_all_dynamic_pricing_updates function - correct column names
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
    
    -- Process each eligible dynamic order (fix column name from 'type' to 'order_type')
    FOR v_order_record IN
        SELECT id, user_id, base_currency, quote_currency, price, original_price, last_price_update
        FROM order_book
        WHERE dynamic_pricing_enabled = TRUE
          AND side = 'sell'
          AND order_type = 'limit'
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
