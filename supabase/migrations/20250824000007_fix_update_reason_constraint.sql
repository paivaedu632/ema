-- Fix update_reason constraint to include all valid reasons
-- Migration: 20250824000007_fix_update_reason_constraint.sql

-- Drop the existing constraint
ALTER TABLE price_updates DROP CONSTRAINT IF EXISTS price_updates_update_reason_check;

-- Add the updated constraint with all valid reasons
ALTER TABLE price_updates ADD CONSTRAINT price_updates_update_reason_check 
CHECK (update_reason IN (
    'vwap_calculation', 
    'market_adjustment', 
    'user_disabled', 
    'bounds_adjustment',
    'best_ask_adjustment',
    'no_market_data',
    'dynamic_pricing_enabled',
    'dynamic_pricing_disabled'
));

-- Update the dynamic pricing functions to use correct reason values
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
    v_mapped_reason TEXT;
BEGIN
    -- Get configuration
    SELECT (get_dynamic_pricing_config('maximum_price_change_per_update')::TEXT)::DECIMAL INTO v_max_change;
    
    -- Get order details
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
    
    -- Map price source to valid constraint values
    v_mapped_reason := CASE v_price_calc.price_source
        WHEN 'vwap_calculation' THEN 'vwap_calculation'
        WHEN 'best_ask_adjustment' THEN 'best_ask_adjustment'
        WHEN 'no_market_data' THEN 'no_market_data'
        ELSE 'market_adjustment'
    END;
    
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
        
        -- Record price update with mapped reason
        INSERT INTO price_updates (
            order_id, user_id, old_price, new_price, price_change_percentage,
            update_reason, vwap_reference, trade_volume_reference
        ) VALUES (
            p_order_id, v_order.user_id, v_order.price, v_price_calc.suggested_price,
            v_price_calc.price_change_percentage, v_mapped_reason,
            v_price_calc.vwap_reference, NULL
        );
        
        RETURN QUERY SELECT
            p_order_id,
            v_order.price,
            v_price_calc.suggested_price,
            v_price_calc.price_change_percentage,
            v_mapped_reason,
            TRUE::BOOLEAN,
            'Price updated successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT
            p_order_id,
            v_order.price,
            v_order.price,
            0.0::DECIMAL(5,2),
            'no_market_data'::TEXT,
            FALSE::BOOLEAN,
            'No price update needed or change exceeds maximum allowed'::TEXT;
    END IF;
END;
$$;
