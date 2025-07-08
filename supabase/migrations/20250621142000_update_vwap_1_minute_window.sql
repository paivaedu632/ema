-- =====================================================================================
-- Update VWAP calculation to use 1-minute rolling window
-- =====================================================================================
-- This migration updates the VWAP calculation system to use a 1-minute rolling window
-- instead of 60 minutes for more responsive rate updates
-- =====================================================================================

-- Update the calculate_vwap_rate function to use 1-minute default window
CREATE OR REPLACE FUNCTION calculate_vwap_rate(
    target_currency_pair TEXT,
    time_window_minutes INTEGER DEFAULT 1,
    minimum_transactions INTEGER DEFAULT 2
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
    
    -- Check if we have sufficient data for reliable VWAP (reduced minimum for 1-minute window)
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

-- Update the get_dynamic_exchange_rate function to use 1-minute window
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
    
    -- Try to get VWAP rate first (using 1-minute window)
    SELECT * INTO vwap_result 
    FROM calculate_vwap_rate(target_pair, 1, 2);
    
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

-- Update the refresh_all_vwap_rates function to use 1-minute window
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
    -- Refresh rates for both currency pairs using 1-minute window
    FOR pair_record IN SELECT UNNEST(ARRAY['EUR_AOA', 'AOA_EUR']) AS pair LOOP
        SELECT * INTO vwap_result 
        FROM calculate_vwap_rate(pair_record.pair, 1, 2);
        
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
