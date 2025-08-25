-- Add Dynamic Pricing Feature to Order Book System
-- Migration: 20250824000001_add_dynamic_pricing.sql

-- 1. Add dynamic pricing fields to order_book table
ALTER TABLE order_book 
ADD COLUMN dynamic_pricing_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN original_price DECIMAL(10,6),
ADD COLUMN last_price_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN price_update_count INTEGER DEFAULT 0,
ADD COLUMN min_price_bound DECIMAL(10,6),
ADD COLUMN max_price_bound DECIMAL(10,6);

-- 2. Create price_updates table for audit trail
CREATE TABLE price_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES order_book(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    old_price DECIMAL(10,6) NOT NULL,
    new_price DECIMAL(10,6) NOT NULL,
    price_change_percentage DECIMAL(5,2) NOT NULL,
    update_reason TEXT NOT NULL CHECK (update_reason IN ('vwap_calculation', 'market_adjustment', 'user_disabled', 'bounds_adjustment')),
    vwap_reference DECIMAL(10,6),
    trade_volume_reference DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create dynamic_pricing_config table for system settings
CREATE TABLE dynamic_pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default dynamic pricing configuration
INSERT INTO dynamic_pricing_config (config_key, config_value, description) VALUES
('vwap_calculation_hours', '12', 'Hours of trade history to use for VWAP calculation'),
('competitive_margin_percentage', '3.0', 'Percentage below VWAP to set competitive price'),
('price_update_interval_minutes', '5', 'Minutes between price update calculations'),
('minimum_price_change_threshold', '1.0', 'Minimum percentage change required to update price'),
('maximum_price_change_per_update', '10.0', 'Maximum percentage change allowed per update'),
('minimum_trade_volume_for_vwap', '100', 'Minimum trade volume required for VWAP calculation'),
('price_bounds_percentage', '20.0', 'Percentage bounds around original price');

-- 5. Add indexes for performance
CREATE INDEX idx_order_book_dynamic_pricing ON order_book(dynamic_pricing_enabled, last_price_update) WHERE dynamic_pricing_enabled = TRUE;
CREATE INDEX idx_price_updates_order ON price_updates(order_id, created_at DESC);
CREATE INDEX idx_price_updates_user ON price_updates(user_id, created_at DESC);
CREATE INDEX idx_trades_vwap_calculation ON trades(base_currency, quote_currency, executed_at DESC);

-- 6. Add comments for documentation
COMMENT ON COLUMN order_book.dynamic_pricing_enabled IS 'Whether this order uses automatic price updates based on market conditions';
COMMENT ON COLUMN order_book.original_price IS 'User-specified original price before any dynamic adjustments';
COMMENT ON COLUMN order_book.last_price_update IS 'Timestamp of the last automatic price update';
COMMENT ON COLUMN order_book.price_update_count IS 'Number of times price has been automatically updated';
COMMENT ON COLUMN order_book.min_price_bound IS 'Minimum allowed price for dynamic updates';
COMMENT ON COLUMN order_book.max_price_bound IS 'Maximum allowed price for dynamic updates';

COMMENT ON TABLE price_updates IS 'Audit trail of all automatic price updates for dynamic orders';
COMMENT ON TABLE dynamic_pricing_config IS 'System configuration for dynamic pricing parameters';

-- 7. Create function to get dynamic pricing configuration
CREATE OR REPLACE FUNCTION get_dynamic_pricing_config(p_config_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config_value JSONB;
BEGIN
    SELECT config_value INTO v_config_value
    FROM dynamic_pricing_config
    WHERE config_key = p_config_key AND is_active = TRUE;
    
    RETURN COALESCE(v_config_value, '{}');
END;
$$;
