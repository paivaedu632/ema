-- =====================================================================================
-- Fix Dual Validation Layers Issue
-- =====================================================================================
-- 
-- ISSUE: Exchange rate validation was happening at both API and database levels
-- with different logic, causing inconsistent validation results.
--
-- API Level: Validates against market offers + Banco BAI API baseline (comprehensive)
-- DB Level:  Validates only against existing offers (limited)
--
-- SOLUTION: Remove redundant database-level validation since API layer already
-- performs comprehensive validation against multiple sources.
--
-- Date: 2025-06-20
-- =====================================================================================

-- Update the create_currency_offer function to remove duplicate validation
CREATE OR REPLACE FUNCTION create_currency_offer(
    user_uuid UUID,
    currency_code TEXT,
    amount_to_reserve DECIMAL(15,2),
    rate DECIMAL(10,6)
) RETURNS UUID AS $$
DECLARE
    user_available_balance DECIMAL(15,2);
    offer_id UUID;
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
    
    -- Exchange rate validation is handled at the API layer
    -- No need for duplicate validation at database level
    
    -- Start transaction
    BEGIN
        -- Move amount from available_balance to reserved (via offer creation)
        UPDATE wallets 
        SET available_balance = available_balance - amount_to_reserve,
            updated_at = NOW()
        WHERE user_id = user_uuid AND currency = currency_code;
        
        -- Create the offer
        INSERT INTO offers (user_id, currency_type, reserved_amount, exchange_rate)
        VALUES (user_uuid, currency_code, amount_to_reserve, rate)
        RETURNING id INTO offer_id;
        
        RETURN offer_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to the validate_exchange_rate function to indicate it's deprecated
COMMENT ON FUNCTION validate_exchange_rate(TEXT, DECIMAL) IS 
'DEPRECATED: This function is no longer used in create_currency_offer. Exchange rate validation is handled at the API layer with comprehensive market data and Banco BAI API integration.';
