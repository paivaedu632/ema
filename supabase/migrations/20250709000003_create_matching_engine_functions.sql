-- EmaPay Order Book System - Matching Engine Functions
-- This migration creates the order matching and trade execution functions
-- Based on documentation: docs/emapay_backend.md
-- Status: Production Ready

-- =====================================================
-- ORDER MATCHING ENGINE FUNCTIONS
-- =====================================================

-- Function to match orders using price-time priority
CREATE OR REPLACE FUNCTION match_order(
    p_order_id UUID
)
RETURNS TABLE(trade_id UUID, matched_quantity DECIMAL(15,2))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_matching_order RECORD;
    v_trade_id UUID;
    v_trade_quantity DECIMAL(15,2);
    v_trade_price DECIMAL(10,6);
    v_remaining_quantity DECIMAL(15,2);
BEGIN
    -- Get the order to match
    SELECT * INTO v_order
    FROM order_book
    WHERE id = p_order_id AND status IN ('pending', 'partially_filled')
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    v_remaining_quantity := v_order.remaining_quantity;
    
    -- Find matching orders with price-time priority
    FOR v_matching_order IN
        SELECT *
        FROM order_book
        WHERE base_currency = v_order.base_currency
        AND quote_currency = v_order.quote_currency
        AND side != v_order.side
        AND user_id != v_order.user_id  -- Prevent self-matching
        AND status IN ('pending', 'partially_filled')
        AND (
            (v_order.side = 'buy' AND v_order.order_type = 'limit' AND side = 'sell' AND (order_type = 'market' OR price <= v_order.price)) OR
            (v_order.side = 'sell' AND v_order.order_type = 'limit' AND side = 'buy' AND (order_type = 'market' OR price >= v_order.price)) OR
            (v_order.order_type = 'market')
        )
        ORDER BY 
            CASE WHEN order_type = 'market' THEN 0 ELSE 1 END,  -- Market orders first
            CASE WHEN v_order.side = 'buy' THEN price ELSE -price END,  -- Best price first
            created_at  -- Time priority
        FOR UPDATE
    LOOP
        EXIT WHEN v_remaining_quantity <= 0;
        
        -- Calculate trade quantity (minimum of remaining quantities)
        v_trade_quantity := LEAST(v_remaining_quantity, v_matching_order.remaining_quantity);
        
        -- Determine trade price (taker pays maker's price)
        IF v_matching_order.order_type = 'market' THEN
            v_trade_price := v_order.price;
        ELSE
            v_trade_price := v_matching_order.price;
        END IF;
        
        -- Execute the trade
        SELECT execute_trade(
            CASE WHEN v_order.side = 'buy' THEN p_order_id ELSE v_matching_order.id END,
            CASE WHEN v_order.side = 'sell' THEN p_order_id ELSE v_matching_order.id END,
            v_trade_quantity,
            v_trade_price
        ) INTO v_trade_id;
        
        -- Update remaining quantities
        v_remaining_quantity := v_remaining_quantity - v_trade_quantity;
        
        -- Return trade information
        trade_id := v_trade_id;
        matched_quantity := v_trade_quantity;
        RETURN NEXT;
        
        -- Update matching order
        UPDATE order_book
        SET 
            remaining_quantity = remaining_quantity - v_trade_quantity,
            filled_quantity = filled_quantity + v_trade_quantity,
            status = CASE 
                WHEN remaining_quantity - v_trade_quantity <= 0 THEN 'filled'
                ELSE 'partially_filled'
            END,
            filled_at = CASE 
                WHEN remaining_quantity - v_trade_quantity <= 0 THEN NOW()
                ELSE filled_at
            END,
            updated_at = NOW()
        WHERE id = v_matching_order.id;
    END LOOP;
    
    -- Update the original order
    UPDATE order_book
    SET 
        remaining_quantity = v_remaining_quantity,
        filled_quantity = quantity - v_remaining_quantity,
        status = CASE 
            WHEN v_remaining_quantity <= 0 THEN 'filled'
            WHEN filled_quantity > 0 THEN 'partially_filled'
            ELSE status
        END,
        filled_at = CASE 
            WHEN v_remaining_quantity <= 0 THEN NOW()
            ELSE filled_at
        END,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN;
END;
$$;

-- Function to execute individual trades
CREATE OR REPLACE FUNCTION execute_trade(
    p_buy_order_id UUID,
    p_sell_order_id UUID,
    p_quantity DECIMAL(15,2),
    p_price DECIMAL(10,6)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trade_id UUID;
    v_buy_order RECORD;
    v_sell_order RECORD;
    v_base_amount DECIMAL(15,2);
    v_quote_amount DECIMAL(15,2);
    v_buyer_fee DECIMAL(15,2) := 0.00;
    v_seller_fee DECIMAL(15,2) := 0.00;
BEGIN
    -- Get order details
    SELECT * INTO v_buy_order FROM order_book WHERE id = p_buy_order_id;
    SELECT * INTO v_sell_order FROM order_book WHERE id = p_sell_order_id;
    
    -- Calculate amounts
    v_base_amount := p_quantity;
    v_quote_amount := p_quantity * p_price;
    
    -- Calculate fees (2% for buy transactions)
    SELECT fee_percentage INTO v_buyer_fee
    FROM fees
    WHERE transaction_type = 'buy' AND currency = v_buy_order.quote_currency AND is_active = true
    LIMIT 1;
    
    v_buyer_fee := COALESCE(v_buyer_fee, 0) * v_quote_amount / 100;
    
    -- Create trade record
    INSERT INTO trades (
        buy_order_id, sell_order_id, buyer_id, seller_id,
        base_currency, quote_currency, quantity, price, total_amount,
        buyer_fee, seller_fee, base_amount, quote_amount
    ) VALUES (
        p_buy_order_id, p_sell_order_id, v_buy_order.user_id, v_sell_order.user_id,
        v_buy_order.base_currency, v_buy_order.quote_currency, p_quantity, p_price, v_quote_amount,
        v_buyer_fee, v_seller_fee, v_base_amount, v_quote_amount
    ) RETURNING id INTO v_trade_id;
    
    -- Update buyer's balances
    -- Buyer receives base currency, pays quote currency + fee
    UPDATE wallets
    SET 
        available_balance = available_balance + v_base_amount,
        updated_at = NOW()
    WHERE user_id = v_buy_order.user_id AND currency = v_buy_order.base_currency;
    
    UPDATE wallets
    SET
        reserved_balance = GREATEST(0, reserved_balance - (v_quote_amount + v_buyer_fee)),
        updated_at = NOW()
    WHERE user_id = v_buy_order.user_id AND currency = v_buy_order.quote_currency;
    
    -- Update seller's balances
    -- Seller receives quote currency, pays base currency
    UPDATE wallets
    SET 
        available_balance = available_balance + v_quote_amount,
        updated_at = NOW()
    WHERE user_id = v_sell_order.user_id AND currency = v_sell_order.quote_currency;
    
    UPDATE wallets
    SET
        reserved_balance = GREATEST(0, reserved_balance - v_base_amount),
        updated_at = NOW()
    WHERE user_id = v_sell_order.user_id AND currency = v_sell_order.base_currency;
    
    -- Note: Fund reservations are managed by order completion/cancellation
    -- Individual trade executions don't update reservations directly
    
    -- Create transaction records for both parties
    INSERT INTO transactions (
        user_id, amount, currency, type, status, fee_amount, net_amount,
        counterparty_user_id, exchange_rate, metadata
    ) VALUES 
    (
        v_buy_order.user_id, v_base_amount, v_buy_order.base_currency, 'exchange_buy', 'completed',
        v_buyer_fee, v_base_amount, v_sell_order.user_id, p_price,
        jsonb_build_object('trade_id', v_trade_id, 'order_id', p_buy_order_id)
    ),
    (
        v_sell_order.user_id, v_quote_amount, v_sell_order.quote_currency, 'exchange_sell', 'completed',
        v_seller_fee, v_quote_amount, v_buy_order.user_id, p_price,
        jsonb_build_object('trade_id', v_trade_id, 'order_id', p_sell_order_id)
    );
    
    RETURN v_trade_id;
END;
$$;

-- Enhanced trade execution function with analytics
CREATE OR REPLACE FUNCTION execute_trade_enhanced(
    p_buy_order_id UUID,
    p_sell_order_id UUID,
    p_quantity DECIMAL(15,2),
    p_price DECIMAL(10,6)
)
RETURNS TABLE(
    trade_id UUID,
    execution_time_ms INTEGER,
    buyer_balance_after JSONB,
    seller_balance_after JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_trade_id UUID;
    v_buy_order RECORD;
    v_sell_order RECORD;
    v_buyer_balances JSONB;
    v_seller_balances JSONB;
BEGIN
    v_start_time := clock_timestamp();

    -- Execute the trade
    SELECT execute_trade(p_buy_order_id, p_sell_order_id, p_quantity, p_price) INTO v_trade_id;

    -- Get order details
    SELECT * INTO v_buy_order FROM order_book WHERE id = p_buy_order_id;
    SELECT * INTO v_sell_order FROM order_book WHERE id = p_sell_order_id;

    -- Get updated balances
    SELECT jsonb_build_object(
        v_buy_order.base_currency,
        (SELECT available_balance FROM wallets WHERE user_id = v_buy_order.user_id AND currency = v_buy_order.base_currency),
        v_buy_order.quote_currency,
        (SELECT available_balance FROM wallets WHERE user_id = v_buy_order.user_id AND currency = v_buy_order.quote_currency)
    ) INTO v_buyer_balances;

    SELECT jsonb_build_object(
        v_sell_order.base_currency,
        (SELECT available_balance FROM wallets WHERE user_id = v_sell_order.user_id AND currency = v_sell_order.base_currency),
        v_sell_order.quote_currency,
        (SELECT available_balance FROM wallets WHERE user_id = v_sell_order.user_id AND currency = v_sell_order.quote_currency)
    ) INTO v_seller_balances;

    v_end_time := clock_timestamp();

    -- Return results
    trade_id := v_trade_id;
    execution_time_ms := EXTRACT(MILLISECONDS FROM v_end_time - v_start_time)::INTEGER;
    buyer_balance_after := v_buyer_balances;
    seller_balance_after := v_seller_balances;

    RETURN NEXT;
END;
$$;
