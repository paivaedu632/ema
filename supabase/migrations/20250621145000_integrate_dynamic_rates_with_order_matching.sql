-- =====================================================================================
-- Integrate Dynamic Rates with Order Matching System
-- =====================================================================================
-- This migration updates the order matching system to integrate with dynamic VWAP rates:
-- 1. Updates match_buy_order_aoa to handle dynamic rate offers
-- 2. Creates enhanced order matching that uses current VWAP rates
-- 3. Maintains backward compatibility with manual rate offers
-- 4. Updates transaction processing to handle dynamic rates
-- =====================================================================================

-- Update the match_buy_order_aoa function to integrate with dynamic rates
CREATE OR REPLACE FUNCTION match_buy_order_aoa(
    buy_amount_eur DECIMAL(15,2),
    max_rate DECIMAL(15,6) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    total_aoa DECIMAL(15,2) := 0;
    remaining_eur DECIMAL(15,2) := buy_amount_eur;
    weighted_rate_sum DECIMAL(20,6) := 0;
    total_eur_matched DECIMAL(15,2) := 0;
    matches JSONB := '[]'::jsonb;
    current_match JSONB;
    offer_record RECORD;
    offer_eur_equivalent DECIMAL(15,2);
    eur_to_use DECIMAL(15,2);
    aoa_to_get DECIMAL(15,2);
    effective_rate DECIMAL(10,6);
    dynamic_rate_result RECORD;
BEGIN
    -- Algorithm: Match against AOA sell offers, handling both dynamic and manual rates
    -- For dynamic rate offers, get current VWAP rate instead of stored rate
    FOR offer_record IN
        SELECT
            id,
            user_id,
            reserved_amount,
            exchange_rate,
            dynamic_rate,
            (1.0 / exchange_rate) as stored_eur_to_aoa_rate
        FROM offers
        WHERE currency_type = 'AOA'
          AND status = 'active'
        ORDER BY 
            -- Prioritize dynamic rate offers first (they get best current rates)
            dynamic_rate DESC,
            -- Then sort by rate (best rates first for buyers)
            exchange_rate ASC
    LOOP
        EXIT WHEN remaining_eur <= 0;

        -- Determine effective exchange rate for this offer
        IF offer_record.dynamic_rate THEN
            -- Get current dynamic rate for AOA offers
            SELECT * INTO dynamic_rate_result 
            FROM get_dynamic_exchange_rate('AOA', true, true) 
            LIMIT 1;
            
            IF dynamic_rate_result IS NOT NULL AND dynamic_rate_result.exchange_rate > 0 THEN
                effective_rate := dynamic_rate_result.exchange_rate;
            ELSE
                -- Fallback to stored rate if dynamic rate fails
                effective_rate := offer_record.exchange_rate;
            END IF;
        ELSE
            -- Use stored manual rate
            effective_rate := offer_record.exchange_rate;
        END IF;

        -- Check max_rate constraint (convert to EUR->AOA format for comparison)
        IF max_rate IS NOT NULL AND (1.0 / effective_rate) > max_rate THEN
            CONTINUE; -- Skip this offer if rate exceeds maximum
        END IF;

        -- Calculate how much EUR this offer can absorb
        offer_eur_equivalent := offer_record.reserved_amount * effective_rate;

        -- Use minimum of what we need and what offer provides
        eur_to_use := LEAST(remaining_eur, offer_eur_equivalent);

        -- Calculate AOA received for this EUR amount
        aoa_to_get := eur_to_use / effective_rate;

        -- Update running totals
        total_aoa := total_aoa + aoa_to_get;
        total_eur_matched := total_eur_matched + eur_to_use;
        weighted_rate_sum := weighted_rate_sum + ((1.0 / effective_rate) * eur_to_use);
        remaining_eur := remaining_eur - eur_to_use;

        -- Record this match for audit trail
        current_match := jsonb_build_object(
            'offer_id', offer_record.id,
            'seller_id', offer_record.user_id,
            'eur_amount', eur_to_use,
            'aoa_amount', aoa_to_get,
            'rate', (1.0 / effective_rate), -- EUR to AOA rate
            'offer_rate', offer_record.exchange_rate, -- Original stored rate
            'effective_rate', effective_rate, -- Actual rate used
            'is_dynamic', offer_record.dynamic_rate,
            'rate_source', CASE 
                WHEN offer_record.dynamic_rate THEN 
                    COALESCE(dynamic_rate_result.rate_source, 'dynamic_fallback')
                ELSE 'manual'
            END
        );

        matches := matches || current_match;
    END LOOP;

    -- Calculate final results
    RETURN jsonb_build_object(
        'success', true,
        'is_fully_matched', remaining_eur <= 0.01, -- Allow small rounding differences
        'total_aoa', total_aoa,
        'total_eur_matched', total_eur_matched,
        'remaining_eur', remaining_eur,
        'average_rate', CASE 
            WHEN total_eur_matched > 0 THEN weighted_rate_sum / total_eur_matched 
            ELSE 0 
        END,
        'matches', matches,
        'match_count', jsonb_array_length(matches)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced function for EUR buy orders (buying EUR with AOA)
CREATE OR REPLACE FUNCTION match_buy_order_eur(
    buy_amount_aoa DECIMAL(15,2),
    max_rate DECIMAL(15,6) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    total_eur DECIMAL(15,2) := 0;
    remaining_aoa DECIMAL(15,2) := buy_amount_aoa;
    weighted_rate_sum DECIMAL(20,6) := 0;
    total_aoa_matched DECIMAL(15,2) := 0;
    matches JSONB := '[]'::jsonb;
    current_match JSONB;
    offer_record RECORD;
    offer_aoa_equivalent DECIMAL(15,2);
    aoa_to_use DECIMAL(15,2);
    eur_to_get DECIMAL(15,2);
    effective_rate DECIMAL(10,6);
    dynamic_rate_result RECORD;
BEGIN
    -- Algorithm: Match against EUR sell offers, handling both dynamic and manual rates
    FOR offer_record IN
        SELECT
            id,
            user_id,
            reserved_amount,
            exchange_rate,
            dynamic_rate
        FROM offers
        WHERE currency_type = 'EUR'
          AND status = 'active'
        ORDER BY 
            -- Prioritize dynamic rate offers first
            dynamic_rate DESC,
            -- Then sort by rate (best rates first for buyers)
            exchange_rate DESC  -- Higher EUR->AOA rate is better for AOA->EUR buyers
    LOOP
        EXIT WHEN remaining_aoa <= 0;

        -- Determine effective exchange rate for this offer
        IF offer_record.dynamic_rate THEN
            -- Get current dynamic rate for EUR offers
            SELECT * INTO dynamic_rate_result 
            FROM get_dynamic_exchange_rate('EUR', true, true) 
            LIMIT 1;
            
            IF dynamic_rate_result IS NOT NULL AND dynamic_rate_result.exchange_rate > 0 THEN
                effective_rate := dynamic_rate_result.exchange_rate;
            ELSE
                -- Fallback to stored rate if dynamic rate fails
                effective_rate := offer_record.exchange_rate;
            END IF;
        ELSE
            -- Use stored manual rate
            effective_rate := offer_record.exchange_rate;
        END IF;

        -- Check max_rate constraint (AOA per EUR)
        IF max_rate IS NOT NULL AND effective_rate > max_rate THEN
            CONTINUE; -- Skip this offer if rate exceeds maximum
        END IF;

        -- Calculate how much AOA this offer can absorb
        offer_aoa_equivalent := offer_record.reserved_amount * effective_rate;

        -- Use minimum of what we need and what offer provides
        aoa_to_use := LEAST(remaining_aoa, offer_aoa_equivalent);

        -- Calculate EUR received for this AOA amount
        eur_to_get := aoa_to_use / effective_rate;

        -- Update running totals
        total_eur := total_eur + eur_to_get;
        total_aoa_matched := total_aoa_matched + aoa_to_use;
        weighted_rate_sum := weighted_rate_sum + (effective_rate * aoa_to_use);
        remaining_aoa := remaining_aoa - aoa_to_use;

        -- Record this match for audit trail
        current_match := jsonb_build_object(
            'offer_id', offer_record.id,
            'seller_id', offer_record.user_id,
            'aoa_amount', aoa_to_use,
            'eur_amount', eur_to_get,
            'rate', effective_rate, -- AOA per EUR rate
            'offer_rate', offer_record.exchange_rate, -- Original stored rate
            'effective_rate', effective_rate, -- Actual rate used
            'is_dynamic', offer_record.dynamic_rate,
            'rate_source', CASE 
                WHEN offer_record.dynamic_rate THEN 
                    COALESCE(dynamic_rate_result.rate_source, 'dynamic_fallback')
                ELSE 'manual'
            END
        );

        matches := matches || current_match;
    END LOOP;

    -- Calculate final results
    RETURN jsonb_build_object(
        'success', true,
        'is_fully_matched', remaining_aoa <= 1.0, -- Allow small rounding differences
        'total_eur', total_eur,
        'total_aoa_matched', total_aoa_matched,
        'remaining_aoa', remaining_aoa,
        'average_rate', CASE 
            WHEN total_aoa_matched > 0 THEN weighted_rate_sum / total_aoa_matched 
            ELSE 0 
        END,
        'matches', matches,
        'match_count', jsonb_array_length(matches)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
