-- =====================================================================================
-- Transaction Processing Functions Migration
-- =====================================================================================
-- This migration creates RPC functions for processing buy, sell, and send transactions
-- with proper atomic operations, balance updates, and error handling.
-- =====================================================================================

-- Function to process buy transactions (EUR -> AOA)
CREATE OR REPLACE FUNCTION process_buy_transaction(
    user_uuid UUID,
    amount_eur DECIMAL(15,2),
    exchange_rate_value DECIMAL(15,6) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    transaction_id UUID;
    current_rate DECIMAL(15,6);
    aoa_amount DECIMAL(15,2);
    fee_amount DECIMAL(15,2);
    net_amount DECIMAL(15,2);
    eur_wallet_balance DECIMAL(15,2);
    result JSON;
BEGIN
    -- Validate input
    IF amount_eur <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    -- Get current exchange rate if not provided
    IF exchange_rate_value IS NULL THEN
        SELECT rate INTO current_rate 
        FROM exchange_rates 
        WHERE from_currency = 'EUR' AND to_currency = 'AOA' 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        IF current_rate IS NULL THEN
            RAISE EXCEPTION 'Exchange rate not available';
        END IF;
    ELSE
        current_rate := exchange_rate_value;
    END IF;

    -- Calculate amounts
    fee_amount := amount_eur * 0.02; -- 2% fee
    net_amount := amount_eur - fee_amount;
    aoa_amount := net_amount * current_rate;

    -- Check EUR wallet balance
    SELECT balance INTO eur_wallet_balance
    FROM wallets
    WHERE user_id = user_uuid AND currency = 'EUR';

    IF eur_wallet_balance IS NULL THEN
        RAISE EXCEPTION 'EUR wallet not found';
    END IF;

    IF eur_wallet_balance < amount_eur THEN
        RAISE EXCEPTION 'Insufficient EUR balance';
    END IF;

    -- Start transaction
    BEGIN
        -- Create transaction record
        INSERT INTO transactions (
            user_id, type, amount, currency, fee_amount, net_amount,
            exchange_rate, status, metadata
        ) VALUES (
            user_uuid, 'buy', amount_eur, 'EUR', fee_amount, net_amount,
            current_rate, 'completed',
            jsonb_build_object(
                'aoa_amount', aoa_amount,
                'exchange_rate', current_rate,
                'fee_percentage', 0.02
            )
        ) RETURNING id INTO transaction_id;

        -- Update EUR wallet (deduct)
        UPDATE wallets 
        SET balance = balance - amount_eur,
            available_balance = available_balance - amount_eur,
            updated_at = NOW()
        WHERE user_id = user_uuid AND currency = 'EUR';

        -- Update AOA wallet (add)
        UPDATE wallets 
        SET balance = balance + aoa_amount,
            available_balance = available_balance + aoa_amount,
            updated_at = NOW()
        WHERE user_id = user_uuid AND currency = 'AOA';

        -- Build result
        result := jsonb_build_object(
            'transaction_id', transaction_id,
            'status', 'completed',
            'amount_eur', amount_eur,
            'aoa_amount', aoa_amount,
            'fee_amount', fee_amount,
            'exchange_rate', current_rate,
            'timestamp', NOW()
        );

        RETURN result;

    EXCEPTION
        WHEN OTHERS THEN
            -- Update transaction status to failed
            UPDATE transactions 
            SET status = 'failed', 
                metadata = metadata || jsonb_build_object('error', SQLERRM)
            WHERE id = transaction_id;
            
            RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
    END;
END;
$$;

-- Function to process sell transactions (AOA -> EUR)
CREATE OR REPLACE FUNCTION process_sell_transaction(
    user_uuid UUID,
    amount_aoa DECIMAL(15,2),
    exchange_rate_value DECIMAL(15,6) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    transaction_id UUID;
    current_rate DECIMAL(15,6);
    eur_amount DECIMAL(15,2);
    fee_amount DECIMAL(15,2);
    net_amount DECIMAL(15,2);
    aoa_wallet_balance DECIMAL(15,2);
    result JSON;
BEGIN
    -- Validate input
    IF amount_aoa <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    -- Get current exchange rate if not provided (AOA -> EUR)
    IF exchange_rate_value IS NULL THEN
        SELECT rate INTO current_rate 
        FROM exchange_rates 
        WHERE from_currency = 'AOA' AND to_currency = 'EUR' 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        IF current_rate IS NULL THEN
            RAISE EXCEPTION 'Exchange rate not available';
        END IF;
    ELSE
        current_rate := exchange_rate_value;
    END IF;

    -- Calculate amounts
    eur_amount := amount_aoa * current_rate;
    fee_amount := eur_amount * 0.02; -- 2% fee on EUR amount
    net_amount := eur_amount - fee_amount;

    -- Check AOA wallet balance
    SELECT balance INTO aoa_wallet_balance
    FROM wallets
    WHERE user_id = user_uuid AND currency = 'AOA';

    IF aoa_wallet_balance IS NULL THEN
        RAISE EXCEPTION 'AOA wallet not found';
    END IF;

    IF aoa_wallet_balance < amount_aoa THEN
        RAISE EXCEPTION 'Insufficient AOA balance';
    END IF;

    -- Start transaction
    BEGIN
        -- Create transaction record
        INSERT INTO transactions (
            user_id, type, amount, currency, fee_amount, net_amount,
            exchange_rate, status, metadata
        ) VALUES (
            user_uuid, 'sell', amount_aoa, 'AOA', fee_amount, net_amount,
            current_rate, 'completed',
            jsonb_build_object(
                'eur_amount', eur_amount,
                'exchange_rate', current_rate,
                'fee_percentage', 0.02
            )
        ) RETURNING id INTO transaction_id;

        -- Update AOA wallet (deduct)
        UPDATE wallets 
        SET balance = balance - amount_aoa,
            available_balance = available_balance - amount_aoa,
            updated_at = NOW()
        WHERE user_id = user_uuid AND currency = 'AOA';

        -- Update EUR wallet (add net amount)
        UPDATE wallets 
        SET balance = balance + net_amount,
            available_balance = available_balance + net_amount,
            updated_at = NOW()
        WHERE user_id = user_uuid AND currency = 'EUR';

        -- Build result
        result := jsonb_build_object(
            'transaction_id', transaction_id,
            'status', 'completed',
            'amount_aoa', amount_aoa,
            'eur_amount', eur_amount,
            'net_amount', net_amount,
            'fee_amount', fee_amount,
            'exchange_rate', current_rate,
            'timestamp', NOW()
        );

        RETURN result;

    EXCEPTION
        WHEN OTHERS THEN
            -- Update transaction status to failed
            UPDATE transactions 
            SET status = 'failed', 
                metadata = metadata || jsonb_build_object('error', SQLERRM)
            WHERE id = transaction_id;
            
            RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
    END;
END;
$$;

-- Function to process send transactions
CREATE OR REPLACE FUNCTION process_send_transaction(
    sender_uuid UUID,
    recipient_info JSONB,
    amount_value DECIMAL(15,2),
    currency_code VARCHAR(3)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    transaction_id UUID;
    fee_amount DECIMAL(15,2);
    net_amount DECIMAL(15,2);
    sender_balance DECIMAL(15,2);
    result JSON;
BEGIN
    -- Validate input
    IF amount_value <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    IF currency_code NOT IN ('AOA', 'EUR') THEN
        RAISE EXCEPTION 'Invalid currency code';
    END IF;

    -- Calculate amounts
    fee_amount := amount_value * 0.02; -- 2% fee
    net_amount := amount_value - fee_amount;

    -- Check sender wallet balance
    SELECT balance INTO sender_balance
    FROM wallets
    WHERE user_id = sender_uuid AND currency = currency_code;

    IF sender_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for currency %', currency_code;
    END IF;

    IF sender_balance < amount_value THEN
        RAISE EXCEPTION 'Insufficient % balance', currency_code;
    END IF;

    -- Start transaction
    BEGIN
        -- Create transaction record
        INSERT INTO transactions (
            user_id, type, amount, currency, fee_amount, net_amount,
            status, recipient_info, metadata
        ) VALUES (
            sender_uuid, 'send', amount_value, currency_code, fee_amount, net_amount,
            'completed', recipient_info,
            jsonb_build_object(
                'fee_percentage', 0.02,
                'recipient_name', recipient_info->>'name',
                'recipient_email', recipient_info->>'email'
            )
        ) RETURNING id INTO transaction_id;

        -- Update sender wallet (deduct)
        UPDATE wallets
        SET balance = balance - amount_value,
            available_balance = available_balance - amount_value,
            updated_at = NOW()
        WHERE user_id = sender_uuid AND currency = currency_code;

        -- Build result
        result := jsonb_build_object(
            'transaction_id', transaction_id,
            'status', 'completed',
            'amount', amount_value,
            'currency', currency_code,
            'net_amount', net_amount,
            'fee_amount', fee_amount,
            'recipient', recipient_info,
            'timestamp', NOW()
        );

        RETURN result;

    EXCEPTION
        WHEN OTHERS THEN
            -- Update transaction status to failed
            UPDATE transactions
            SET status = 'failed',
                metadata = metadata || jsonb_build_object('error', SQLERRM)
            WHERE id = transaction_id;

            RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
    END;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION process_buy_transaction(UUID, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION process_sell_transaction(UUID, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION process_send_transaction(UUID, JSONB, DECIMAL, VARCHAR) TO authenticated;

-- Migration completed successfully
SELECT 'Transaction processing functions created successfully' AS status;
