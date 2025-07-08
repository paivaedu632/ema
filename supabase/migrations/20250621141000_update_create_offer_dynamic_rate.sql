-- =====================================================================================
-- Update create_currency_offer function to support dynamic rates
-- =====================================================================================
-- This migration updates the create_currency_offer function to handle dynamic rates:
-- 1. Adds dynamic_rate parameter to the function
-- 2. When dynamic_rate = true, uses VWAP rate instead of user-provided rate
-- 3. Maintains backward compatibility for manual rates
-- =====================================================================================

-- Update the create_currency_offer function to support dynamic rates
CREATE OR REPLACE FUNCTION create_currency_offer(
    user_uuid UUID,
    currency_code TEXT,
    amount_to_reserve DECIMAL(15,2),
    rate DECIMAL(10,6),
    use_dynamic_rate BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
    user_available_balance DECIMAL(15,2);
    offer_id UUID;
    effective_rate DECIMAL(10,6);
    dynamic_rate_result RECORD;
BEGIN
    -- Get user's available balance for the currency
    SELECT available_balance INTO user_available_balance
    FROM wallets
    WHERE user_id = user_uuid AND currency = currency_code;
    
    -- Check if user has sufficient available balance
    IF user_available_balance IS NULL OR user_available_balance < amount_to_reserve THEN
        RAISE EXCEPTION 'Insufficient available balance. Required: %, Available: %', 
            amount_to_reserve, COALESCE(user_available_balance, 0);
    END IF;
    
    -- Determine the effective exchange rate
    IF use_dynamic_rate THEN
        -- Get dynamic exchange rate using VWAP with fallbacks
        SELECT * INTO dynamic_rate_result 
        FROM get_dynamic_exchange_rate(currency_code, true, true) 
        LIMIT 1;
        
        IF dynamic_rate_result IS NOT NULL AND dynamic_rate_result.exchange_rate > 0 THEN
            effective_rate := dynamic_rate_result.exchange_rate;
        ELSE
            -- Fallback to user-provided rate if dynamic rate fails
            effective_rate := rate;
            use_dynamic_rate := false;
        END IF;
    ELSE
        -- Use user-provided rate
        effective_rate := rate;
    END IF;
    
    -- Exchange rate validation is handled at the API layer
    -- No need for duplicate validation at database level
    
    -- Start transaction
    BEGIN
        -- Move amount from available_balance to reserved (via offer creation)
        UPDATE wallets 
        SET available_balance = available_balance - amount_to_reserve,
            updated_at = NOW()
        WHERE user_id = user_uuid AND currency = currency_code;
        
        -- Create the offer with dynamic_rate flag
        INSERT INTO offers (user_id, currency_type, reserved_amount, exchange_rate, dynamic_rate)
        VALUES (user_uuid, currency_code, amount_to_reserve, effective_rate, use_dynamic_rate)
        RETURNING id INTO offer_id;
        
        RETURN offer_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a wrapper function for backward compatibility
CREATE OR REPLACE FUNCTION create_currency_offer_legacy(
    user_uuid UUID,
    currency_code TEXT,
    amount_to_reserve DECIMAL(15,2),
    rate DECIMAL(10,6)
) RETURNS UUID AS $$
BEGIN
    -- Call the new function with dynamic_rate = false for backward compatibility
    RETURN create_currency_offer(user_uuid, currency_code, amount_to_reserve, rate, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new function specifically for dynamic rate offers
CREATE OR REPLACE FUNCTION create_dynamic_currency_offer(
    user_uuid UUID,
    currency_code TEXT,
    amount_to_reserve DECIMAL(15,2)
) RETURNS UUID AS $$
BEGIN
    -- Call the main function with dynamic_rate = true and a placeholder rate
    -- The actual rate will be determined by the VWAP system
    RETURN create_currency_offer(user_uuid, currency_code, amount_to_reserve, 0, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
