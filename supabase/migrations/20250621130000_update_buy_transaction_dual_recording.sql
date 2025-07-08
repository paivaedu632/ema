-- =====================================================================================
-- EmaPay Buy Transaction Dual Recording Update
-- =====================================================================================
-- This migration updates the buy transaction processing to use dual transaction recording
-- when matching against seller offers, creating both buyer and seller transaction records
-- =====================================================================================

-- Step 1: Update the process_buy_transaction_with_matching function to use dual recording
CREATE OR REPLACE FUNCTION process_buy_transaction_with_matching(
    user_uuid UUID,
    amount_eur DECIMAL(15,2),
    use_order_matching BOOLEAN DEFAULT true,
    max_rate DECIMAL(15,6) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    transaction_id UUID;
    buyer_balance DECIMAL(15,2);
    fee_info RECORD;
    fee_amount DECIMAL(15,2);
    net_amount DECIMAL(15,2);
    aoa_amount DECIMAL(15,2);
    effective_rate DECIMAL(15,6);
    order_match_result JSON;
    result JSON;
    match_record RECORD;
    seller_transactions JSON[] := '{}';
    exchange_uuid UUID;
    current_seller_transaction JSON;
BEGIN
    -- Validate input
    IF amount_eur <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    -- Check buyer EUR wallet balance
    SELECT available_balance INTO buyer_balance
    FROM wallets
    WHERE user_id = user_uuid AND currency = 'EUR';

    IF buyer_balance IS NULL THEN
        RAISE EXCEPTION 'EUR wallet not found';
    END IF;

    IF buyer_balance < amount_eur THEN
        RAISE EXCEPTION 'Insufficient EUR balance';
    END IF;

    -- Get dynamic fee information
    SELECT fee_percentage, fee_fixed_amount
    INTO fee_info
    FROM fees
    WHERE transaction_type = 'buy' AND currency = 'EUR' AND is_active = true
    LIMIT 1;

    -- Calculate fee (fallback to 2% if no fee config found)
    fee_amount := amount_eur * COALESCE(fee_info.fee_percentage, 0.02);
    net_amount := amount_eur - fee_amount;

    -- Try order matching if enabled
    IF use_order_matching THEN
        SELECT match_buy_order_aoa(amount_eur, max_rate) INTO order_match_result;
        
        -- Check if we have successful matches
        IF (order_match_result->>'success')::boolean AND 
           (order_match_result->>'is_fully_matched')::boolean THEN
            
            aoa_amount := (order_match_result->>'total_aoa')::DECIMAL(15,2);
            effective_rate := (order_match_result->>'average_rate')::DECIMAL(15,6);
            
            -- Generate exchange ID for linking all transactions
            exchange_uuid := gen_random_uuid();
            
            -- Process each matched offer and create seller transactions
            FOR match_record IN 
                SELECT 
                    (match_data->>'offer_id')::UUID as offer_id,
                    (match_data->>'seller_id')::UUID as seller_id,
                    (match_data->>'eur_amount')::DECIMAL(15,2) as eur_amount,
                    (match_data->>'aoa_amount')::DECIMAL(15,2) as aoa_amount,
                    (match_data->>'rate')::DECIMAL(15,6) as rate
                FROM json_array_elements(order_match_result->'matches') as match_data
            LOOP
                -- Create dual transactions for this match
                SELECT create_dual_exchange_transactions(
                    user_uuid,                    -- buyer_user_id
                    match_record.seller_id,       -- seller_user_id
                    match_record.eur_amount,      -- buyer_amount (EUR spent)
                    'EUR',                        -- buyer_currency
                    match_record.aoa_amount,      -- seller_amount (AOA sold)
                    'AOA',                        -- seller_currency
                    match_record.rate,            -- exchange_rate
                    match_record.eur_amount * COALESCE(fee_info.fee_percentage, 0.02), -- buyer fee
                    0.00,                         -- seller fee (sellers don't pay fees)
                    jsonb_build_object(
                        'order_matching', true,
                        'offer_id', match_record.offer_id,
                        'exchange_id', exchange_uuid,
                        'match_sequence', array_length(seller_transactions, 1) + 1
                    )
                ) INTO current_seller_transaction;
                
                -- Store seller transaction info for response
                seller_transactions := seller_transactions || current_seller_transaction;
                
                -- Update the matched offer (reduce or complete)
                UPDATE offers 
                SET 
                    reserved_amount = reserved_amount - match_record.aoa_amount,
                    status = CASE 
                        WHEN reserved_amount - match_record.aoa_amount <= 0 THEN 'completed'
                        ELSE 'active'
                    END,
                    updated_at = NOW()
                WHERE id = match_record.offer_id;
                
                -- Update seller's wallet balances
                -- Deduct AOA from seller's available balance (already reserved)
                UPDATE wallets
                SET available_balance = available_balance + match_record.eur_amount,
                    updated_at = NOW()
                WHERE user_id = match_record.seller_id AND currency = 'EUR';
                
            END LOOP;
            
            -- Update buyer's wallet balances
            UPDATE wallets
            SET available_balance = available_balance - amount_eur,
                updated_at = NOW()
            WHERE user_id = user_uuid AND currency = 'EUR';
            
            UPDATE wallets
            SET available_balance = available_balance + aoa_amount,
                updated_at = NOW()
            WHERE user_id = user_uuid AND currency = 'AOA';
            
            -- Get the buyer transaction ID from the first seller transaction
            transaction_id := (seller_transactions[1]->>'buyer_transaction_id')::UUID;
            
        ELSE
            -- Fallback to static rate if order matching fails
            effective_rate := 924.0675; -- Static fallback rate
            aoa_amount := amount_eur * effective_rate;
            
            -- Create single buyer transaction (no seller match)
            INSERT INTO transactions (
                user_id, type, amount, currency, fee_amount, net_amount,
                exchange_rate, status, metadata
            ) VALUES (
                user_uuid, 'buy', amount_eur, 'EUR', fee_amount, net_amount,
                effective_rate, 'completed',
                jsonb_build_object(
                    'aoa_amount', aoa_amount,
                    'exchange_rate', effective_rate,
                    'fee_percentage', COALESCE(fee_info.fee_percentage, 0.02),
                    'order_matching', false,
                    'fallback_reason', 'insufficient_liquidity'
                )
            ) RETURNING id INTO transaction_id;
            
            -- Update buyer wallets
            UPDATE wallets
            SET available_balance = available_balance - amount_eur,
                updated_at = NOW()
            WHERE user_id = user_uuid AND currency = 'EUR';
            
            UPDATE wallets
            SET available_balance = available_balance + aoa_amount,
                updated_at = NOW()
            WHERE user_id = user_uuid AND currency = 'AOA';
        END IF;
    ELSE
        -- Direct transaction without order matching (legacy mode)
        effective_rate := 924.0675; -- Static rate
        aoa_amount := amount_eur * effective_rate;
        
        INSERT INTO transactions (
            user_id, type, amount, currency, fee_amount, net_amount,
            exchange_rate, status, metadata
        ) VALUES (
            user_uuid, 'buy', amount_eur, 'EUR', fee_amount, net_amount,
            effective_rate, 'completed',
            jsonb_build_object(
                'aoa_amount', aoa_amount,
                'exchange_rate', effective_rate,
                'fee_percentage', COALESCE(fee_info.fee_percentage, 0.02),
                'order_matching', false
            )
        ) RETURNING id INTO transaction_id;
        
        -- Update buyer wallets
        UPDATE wallets
        SET available_balance = available_balance - amount_eur,
            updated_at = NOW()
        WHERE user_id = user_uuid AND currency = 'EUR';
        
        UPDATE wallets
        SET available_balance = available_balance + aoa_amount,
            updated_at = NOW()
        WHERE user_id = user_uuid AND currency = 'AOA';
    END IF;

    -- Build comprehensive response
    result := jsonb_build_object(
        'transaction_id', transaction_id,
        'status', 'completed',
        'amount_eur', amount_eur,
        'aoa_amount', aoa_amount,
        'fee_amount', fee_amount,
        'net_amount', net_amount,
        'exchange_rate', effective_rate,
        'order_matching', use_order_matching AND (order_match_result->>'success')::boolean,
        'seller_transactions', array_to_json(seller_transactions),
        'exchange_id', exchange_uuid,
        'timestamp', NOW()
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Handle transaction failure
        IF transaction_id IS NOT NULL THEN
            UPDATE transactions
            SET status = 'failed',
                metadata = metadata || jsonb_build_object('error', SQLERRM)
            WHERE id = transaction_id;
        END IF;

        RAISE EXCEPTION 'Buy transaction failed: %', SQLERRM;
END;
$$;
