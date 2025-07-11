-- EmaPay Order Book System - Complete Database Functions
-- This migration creates all database functions for the professional order book trading system
-- Based on documentation: docs/emapay_backend.md
-- Status: Production Ready

-- =====================================================
-- FUND MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create fund reservation
CREATE OR REPLACE FUNCTION create_fund_reservation(
    p_user_id UUID,
    p_currency VARCHAR(3),
    p_amount DECIMAL(15, 2),
    p_purpose VARCHAR(100),
    p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reservation_id UUID;
    v_current_balance DECIMAL(15, 2);
BEGIN
    -- Validate inputs
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    IF p_currency NOT IN ('EUR', 'AOA') THEN
        RAISE EXCEPTION 'Invalid currency: %', p_currency;
    END IF;

    -- Lock the wallet row for update
    SELECT available_balance INTO v_current_balance
    FROM wallets
    WHERE user_id = p_user_id AND currency = p_currency
    FOR UPDATE;

    -- Check if wallet exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user % and currency %', p_user_id, p_currency;
    END IF;

    -- Check sufficient balance
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_current_balance, p_amount;
    END IF;

    -- Create reservation
    INSERT INTO fund_reservations (user_id, currency, amount, reference_id, status)
    VALUES (p_user_id, p_currency, p_amount, p_reference_id, 'active')
    RETURNING id INTO v_reservation_id;

    -- Update wallet balances
    UPDATE wallets
    SET
        available_balance = available_balance - p_amount,
        reserved_balance = reserved_balance + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id AND currency = p_currency;

    RETURN v_reservation_id;
END;
$$;

-- Function to release fund reservation
CREATE OR REPLACE FUNCTION release_fund_reservation(
    p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reservation RECORD;
BEGIN
    -- Get and lock reservation
    SELECT * INTO v_reservation
    FROM fund_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;
    
    -- Check if reservation exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found: %', p_reservation_id;
    END IF;
    
    -- Check if already released or cancelled
    IF v_reservation.status != 'active' THEN
        RAISE EXCEPTION 'Reservation is not active. Status: %', v_reservation.status;
    END IF;
    
    -- Update reservation status
    UPDATE fund_reservations
    SET 
        status = 'released',
        updated_at = NOW()
    WHERE id = p_reservation_id;
    
    -- Update wallet balances (move from reserved back to available)
    UPDATE wallets
    SET 
        available_balance = available_balance + v_reservation.amount,
        reserved_balance = reserved_balance - v_reservation.amount,
        updated_at = NOW()
    WHERE user_id = v_reservation.user_id AND currency = v_reservation.currency;
    
    RETURN TRUE;
END;
$$;

-- Function to cancel fund reservation (same as release but different status)
CREATE OR REPLACE FUNCTION cancel_fund_reservation(
    p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reservation RECORD;
BEGIN
    -- Get and lock reservation
    SELECT * INTO v_reservation
    FROM fund_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;
    
    -- Check if reservation exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found: %', p_reservation_id;
    END IF;
    
    -- Check if already released or cancelled
    IF v_reservation.status != 'active' THEN
        RAISE EXCEPTION 'Reservation is not active. Status: %', v_reservation.status;
    END IF;
    
    -- Update reservation status
    UPDATE fund_reservations
    SET 
        status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_reservation_id;
    
    -- Update wallet balances (move from reserved back to available)
    UPDATE wallets
    SET 
        available_balance = available_balance + v_reservation.amount,
        reserved_balance = reserved_balance - v_reservation.amount,
        updated_at = NOW()
    WHERE user_id = v_reservation.user_id AND currency = v_reservation.currency;
    
    RETURN TRUE;
END;
$$;

-- Function to get wallet balance
CREATE OR REPLACE FUNCTION get_wallet_balance(
    p_user_id UUID,
    p_currency VARCHAR(3)
)
RETURNS TABLE(
    available_balance DECIMAL(20, 2),
    reserved_balance DECIMAL(20, 2),
    total_balance DECIMAL(20, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.available_balance,
        w.reserved_balance,
        (w.available_balance + w.reserved_balance) as total_balance
    FROM wallets w
    WHERE w.user_id = p_user_id AND w.currency = p_currency;
END;
$$;

-- Function to create or update wallet
CREATE OR REPLACE FUNCTION upsert_wallet(
    p_user_id UUID,
    p_currency VARCHAR(3),
    p_available_balance DECIMAL(20, 2) DEFAULT 0.00,
    p_reserved_balance DECIMAL(20, 2) DEFAULT 0.00
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    -- Validate inputs
    IF p_available_balance < 0 THEN
        RAISE EXCEPTION 'Available balance cannot be negative';
    END IF;
    
    IF p_reserved_balance < 0 THEN
        RAISE EXCEPTION 'Reserved balance cannot be negative';
    END IF;
    
    IF p_currency NOT IN ('EUR', 'AOA') THEN
        RAISE EXCEPTION 'Invalid currency: %', p_currency;
    END IF;
    
    -- Insert or update wallet
    INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
    VALUES (p_user_id, p_currency, p_available_balance, p_reserved_balance)
    ON CONFLICT (user_id, currency)
    DO UPDATE SET
        available_balance = EXCLUDED.available_balance,
        reserved_balance = EXCLUDED.reserved_balance,
        updated_at = NOW()
    RETURNING id INTO v_wallet_id;
    
    RETURN v_wallet_id;
END;
$$;

-- =====================================================
-- ORDER PLACEMENT FUNCTIONS
-- =====================================================

-- Function to place orders (limit or market)
CREATE OR REPLACE FUNCTION place_order(
    p_user_id UUID,
    p_order_type TEXT,
    p_side TEXT,
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_quantity DECIMAL(15,2),
    p_price DECIMAL(10,6) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_reserved_amount DECIMAL(15,2);
    v_reservation_currency TEXT;
    v_available_balance DECIMAL(15,2);
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    IF p_base_currency NOT IN ('EUR', 'AOA') OR p_quote_currency NOT IN ('EUR', 'AOA') THEN
        RAISE EXCEPTION 'Invalid currency pair';
    END IF;

    IF p_base_currency = p_quote_currency THEN
        RAISE EXCEPTION 'Base and quote currencies must be different';
    END IF;

    IF p_order_type = 'limit' AND (p_price IS NULL OR p_price <= 0) THEN
        RAISE EXCEPTION 'Limit orders require a positive price';
    END IF;

    IF p_side NOT IN ('buy', 'sell') THEN
        RAISE EXCEPTION 'Side must be buy or sell';
    END IF;

    -- Calculate reserved amount and currency
    IF p_side = 'buy' THEN
        v_reservation_currency := p_quote_currency;
        IF p_order_type = 'limit' THEN
            v_reserved_amount := p_quantity * p_price;
        ELSE
            -- For market orders, we'll reserve a large amount and adjust later
            v_reserved_amount := p_quantity * 2000; -- Assume max price of 2000
        END IF;
    ELSE -- sell
        v_reservation_currency := p_base_currency;
        v_reserved_amount := p_quantity;
    END IF;

    -- Check available balance
    SELECT available_balance INTO v_available_balance
    FROM wallets
    WHERE user_id = p_user_id AND currency = v_reservation_currency;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for currency %', v_reservation_currency;
    END IF;

    IF v_available_balance < v_reserved_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_available_balance, v_reserved_amount;
    END IF;

    -- Create order
    INSERT INTO order_book (
        user_id, order_type, side, base_currency, quote_currency,
        quantity, remaining_quantity, price, reserved_amount, status
    ) VALUES (
        p_user_id, p_order_type, p_side, p_base_currency, p_quote_currency,
        p_quantity, p_quantity, p_price, v_reserved_amount, 'pending'
    ) RETURNING id INTO v_order_id;

    -- Reserve funds
    UPDATE wallets
    SET
        available_balance = available_balance - v_reserved_amount,
        reserved_balance = reserved_balance + v_reserved_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id AND currency = v_reservation_currency;

    -- Create fund reservation record
    INSERT INTO fund_reservations (user_id, currency, amount, reference_id, status)
    VALUES (p_user_id, v_reservation_currency, v_reserved_amount, v_order_id, 'active');

    -- Try to match the order immediately
    PERFORM match_order(v_order_id);

    RETURN v_order_id;
END;
$$;

-- Function to cancel orders
CREATE OR REPLACE FUNCTION cancel_order(
    p_order_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_reservation RECORD;
BEGIN
    -- Get order details
    SELECT * INTO v_order
    FROM order_book
    WHERE id = p_order_id AND user_id = p_user_id AND status IN ('pending', 'partially_filled')
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or cannot be cancelled';
    END IF;

    -- Get reservation details
    SELECT * INTO v_reservation
    FROM fund_reservations
    WHERE reference_id = p_order_id AND status = 'active';

    -- Update order status
    UPDATE order_book
    SET
        status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Release reserved funds
    IF FOUND THEN
        UPDATE wallets
        SET
            available_balance = available_balance + v_reservation.amount,
            reserved_balance = reserved_balance - v_reservation.amount,
            updated_at = NOW()
        WHERE user_id = p_user_id AND currency = v_reservation.currency;

        -- Update reservation status
        UPDATE fund_reservations
        SET
            status = 'released',
            updated_at = NOW()
        WHERE reference_id = p_order_id;
    END IF;

    RETURN TRUE;
END;
$$;
