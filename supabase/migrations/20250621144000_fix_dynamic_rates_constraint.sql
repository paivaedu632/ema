-- =====================================================================================
-- Fix dynamic_rates table to add unique constraint for ON CONFLICT
-- =====================================================================================

-- Add unique constraint on currency_pair for ON CONFLICT functionality
ALTER TABLE dynamic_rates ADD CONSTRAINT unique_currency_pair UNIQUE (currency_pair);

-- Update the get_dynamic_exchange_rate function to handle the constraint properly
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
    input_currency_type TEXT := currency_type; -- Store input parameter to avoid ambiguity
BEGIN
    -- Determine currency pair based on input
    IF input_currency_type = 'EUR' THEN
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
        -- Store the calculated VWAP rate (now with proper unique constraint)
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
        WHERE o.currency_type = input_currency_type
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
