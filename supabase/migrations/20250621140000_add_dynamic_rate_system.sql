-- =====================================================================================
-- EmaPay Dynamic Exchange Rate System: VWAP Implementation
-- =====================================================================================
-- This migration implements a dynamic exchange rate system with VWAP calculation:
-- 1. Adds dynamic_rate column to existing offers table
-- 2. Creates dynamic_rates table for storing calculated VWAP rates
-- 3. Creates VWAP calculation function with 60-minute rolling window
-- 4. Implements fallback mechanisms (VWAP → User rates → Banco BAI API)
-- 5. Adds helper functions for rate retrieval and caching
-- =====================================================================================

-- Step 1: Add dynamic_rate column to existing offers table
ALTER TABLE offers 
ADD COLUMN dynamic_rate BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the new column
COMMENT ON COLUMN offers.dynamic_rate IS 'Whether this offer uses dynamic VWAP rates (true) or manual user-set rates (false)';

-- Create index for performance on dynamic_rate queries
CREATE INDEX idx_offers_dynamic_rate ON offers (dynamic_rate);
CREATE INDEX idx_offers_dynamic_active ON offers (dynamic_rate, status) WHERE status = 'active';

-- Step 2: Create dynamic_rates table for storing calculated VWAP rates
CREATE TABLE dynamic_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair TEXT NOT NULL CHECK (currency_pair IN ('EUR_AOA', 'AOA_EUR')),
  vwap_rate DECIMAL(10,6) NOT NULL CHECK (vwap_rate > 0),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  transaction_count INTEGER NOT NULL CHECK (transaction_count >= 0),
  total_volume DECIMAL(15,2) NOT NULL CHECK (total_volume >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add comments to document the dynamic_rates table
COMMENT ON TABLE dynamic_rates IS 'Stores calculated VWAP (Volume Weighted Average Price) rates for dynamic exchange rate system';
COMMENT ON COLUMN dynamic_rates.currency_pair IS 'Currency pair for the rate (EUR_AOA or AOA_EUR)';
COMMENT ON COLUMN dynamic_rates.vwap_rate IS 'Calculated VWAP rate from completed transactions';
COMMENT ON COLUMN dynamic_rates.calculated_at IS 'Timestamp when the VWAP rate was calculated';
COMMENT ON COLUMN dynamic_rates.transaction_count IS 'Number of transactions used in VWAP calculation';
COMMENT ON COLUMN dynamic_rates.total_volume IS 'Total volume used in VWAP calculation';

-- Create indexes for performance optimization
CREATE INDEX idx_dynamic_rates_currency_pair ON dynamic_rates (currency_pair);
CREATE INDEX idx_dynamic_rates_calculated_at ON dynamic_rates (calculated_at DESC);
CREATE INDEX idx_dynamic_rates_currency_calculated ON dynamic_rates (currency_pair, calculated_at DESC);

-- Step 3: Create trigger for auto-updating timestamps
CREATE TRIGGER update_dynamic_rates_updated_at
    BEFORE UPDATE ON dynamic_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Create VWAP calculation function
CREATE OR REPLACE FUNCTION calculate_vwap_rate(
    target_currency_pair TEXT,
    time_window_minutes INTEGER DEFAULT 60,
    minimum_transactions INTEGER DEFAULT 3
)
RETURNS TABLE (
    vwap_rate DECIMAL(10,6),
    transaction_count INTEGER,
    total_volume DECIMAL(15,2),
    calculation_successful BOOLEAN
) AS $$
DECLARE
    calculated_vwap DECIMAL(10,6);
    tx_count INTEGER;
    total_vol DECIMAL(15,2);
    time_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate time threshold for rolling window
    time_threshold := NOW() - INTERVAL '1 minute' * time_window_minutes;
    
    -- Calculate VWAP from completed transactions in the time window
    -- VWAP = Σ(Price × Volume) / Σ(Volume)
    SELECT 
        CASE 
            WHEN SUM(t.amount) > 0 THEN 
                SUM(t.exchange_rate * t.amount) / SUM(t.amount)
            ELSE 0
        END,
        COUNT(*),
        COALESCE(SUM(t.amount), 0)
    INTO calculated_vwap, tx_count, total_vol
    FROM transactions t
    WHERE t.status = 'completed'
        AND t.exchange_rate IS NOT NULL
        AND t.exchange_rate > 0
        AND t.created_at >= time_threshold
        AND (
            (target_currency_pair = 'EUR_AOA' AND t.type IN ('buy', 'sell') AND t.currency = 'EUR') OR
            (target_currency_pair = 'AOA_EUR' AND t.type IN ('buy', 'sell') AND t.currency = 'AOA')
        );
    
    -- Check if we have sufficient data for reliable VWAP
    IF tx_count >= minimum_transactions AND calculated_vwap > 0 THEN
        RETURN QUERY SELECT 
            calculated_vwap,
            tx_count,
            total_vol,
            true;
    ELSE
        -- Insufficient data for VWAP calculation
        RETURN QUERY SELECT 
            0::DECIMAL(10,6),
            COALESCE(tx_count, 0),
            COALESCE(total_vol, 0),
            false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create function to get current dynamic rate with fallback
CREATE OR REPLACE FUNCTION get_dynamic_exchange_rate(
    currency_type TEXT,
    fallback_to_user_rates BOOLEAN DEFAULT true,
    fallback_to_api_rate BOOLEAN DEFAULT true
)
RETURNS TABLE (
    exchange_rate DECIMAL(10,6),
    rate_source TEXT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    target_pair TEXT;
    vwap_result RECORD;
    user_rate DECIMAL(10,6);
    api_fallback_rate DECIMAL(10,6);
BEGIN
    -- Determine currency pair based on input
    IF currency_type = 'EUR' THEN
        target_pair := 'EUR_AOA';
        api_fallback_rate := 924.0675; -- Default EUR to AOA rate
    ELSE
        target_pair := 'AOA_EUR';
        api_fallback_rate := 0.001082; -- Default AOA to EUR rate
    END IF;
    
    -- Try to get VWAP rate first
    SELECT * INTO vwap_result 
    FROM calculate_vwap_rate(target_pair);
    
    IF vwap_result.calculation_successful THEN
        -- Store the calculated VWAP rate
        INSERT INTO dynamic_rates (currency_pair, vwap_rate, calculated_at, transaction_count, total_volume)
        VALUES (target_pair, vwap_result.vwap_rate, NOW(), vwap_result.transaction_count, vwap_result.total_volume)
        ON CONFLICT (currency_pair) DO UPDATE SET
            vwap_rate = EXCLUDED.vwap_rate,
            calculated_at = EXCLUDED.calculated_at,
            transaction_count = EXCLUDED.transaction_count,
            total_volume = EXCLUDED.total_volume,
            updated_at = NOW();
        
        RETURN QUERY SELECT 
            vwap_result.vwap_rate,
            'vwap'::TEXT,
            NOW();
        RETURN;
    END IF;
    
    -- Fallback to user-set rates from offers
    IF fallback_to_user_rates THEN
        SELECT AVG(o.exchange_rate) INTO user_rate
        FROM offers o
        WHERE o.currency_type = currency_type
            AND o.status = 'active'
            AND o.dynamic_rate = false
            AND o.exchange_rate > 0;
        
        IF user_rate IS NOT NULL AND user_rate > 0 THEN
            RETURN QUERY SELECT 
                user_rate,
                'user_offers'::TEXT,
                NOW();
            RETURN;
        END IF;
    END IF;
    
    -- Final fallback to API rate
    IF fallback_to_api_rate THEN
        RETURN QUERY SELECT 
            api_fallback_rate,
            'api_fallback'::TEXT,
            NOW();
        RETURN;
    END IF;
    
    -- No rate available
    RETURN QUERY SELECT 
        0::DECIMAL(10,6),
        'no_rate_available'::TEXT,
        NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to refresh VWAP rates (for scheduled updates)
CREATE OR REPLACE FUNCTION refresh_all_vwap_rates()
RETURNS TABLE (
    currency_pair TEXT,
    new_rate DECIMAL(10,6),
    transaction_count INTEGER,
    success BOOLEAN
) AS $$
DECLARE
    pair_record RECORD;
    vwap_result RECORD;
BEGIN
    -- Refresh rates for both currency pairs
    FOR pair_record IN SELECT UNNEST(ARRAY['EUR_AOA', 'AOA_EUR']) AS pair LOOP
        SELECT * INTO vwap_result 
        FROM calculate_vwap_rate(pair_record.pair);
        
        IF vwap_result.calculation_successful THEN
            -- Update or insert the new rate
            INSERT INTO dynamic_rates (currency_pair, vwap_rate, calculated_at, transaction_count, total_volume)
            VALUES (pair_record.pair, vwap_result.vwap_rate, NOW(), vwap_result.transaction_count, vwap_result.total_volume)
            ON CONFLICT (currency_pair) DO UPDATE SET
                vwap_rate = EXCLUDED.vwap_rate,
                calculated_at = EXCLUDED.calculated_at,
                transaction_count = EXCLUDED.transaction_count,
                total_volume = EXCLUDED.total_volume,
                updated_at = NOW();
        END IF;
        
        RETURN QUERY SELECT 
            pair_record.pair,
            COALESCE(vwap_result.vwap_rate, 0::DECIMAL(10,6)),
            COALESCE(vwap_result.transaction_count, 0),
            vwap_result.calculation_successful;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Add RLS policies for dynamic_rates table
ALTER TABLE dynamic_rates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read dynamic rates
CREATE POLICY "Allow authenticated users to read dynamic rates" ON dynamic_rates
    FOR SELECT TO authenticated USING (true);

-- Only allow system functions to insert/update dynamic rates
CREATE POLICY "Allow system to manage dynamic rates" ON dynamic_rates
    FOR ALL TO service_role USING (true);

-- Step 8: Create initial VWAP calculation
SELECT refresh_all_vwap_rates();
