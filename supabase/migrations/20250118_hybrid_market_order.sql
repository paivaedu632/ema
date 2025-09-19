-- Create hybrid market order execution function
-- This function implements partial execution + automatic limit order creation for insufficient liquidity

CREATE OR REPLACE FUNCTION execute_hybrid_market_order(
    p_user_id UUID,
    p_side TEXT,
    p_base_currency TEXT,
    p_quote_currency TEXT,
    p_quantity DECIMAL(15,2),
    p_max_slippage_percent DECIMAL(5,2) DEFAULT 5.0
)
RETURNS TABLE(
    market_order_id UUID,
    limit_order_id UUID,
    market_status TEXT,
    limit_status TEXT,
    market_filled_quantity DECIMAL(15,2),
    limit_quantity DECIMAL(15,2),
    market_avg_price DECIMAL(10,6),
    limit_price DECIMAL(10,6),
    market_total_cost DECIMAL(15,2),
    slippage_percent DECIMAL(5,2),
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_market_order_id UUID;
    v_limit_order_id UUID;
    v_remaining_qty DECIMAL(15,2) := p_quantity;
    v_market_filled DECIMAL(15,2) := 0;
    v_market_cost DECIMAL(15,2) := 0;
    v_market_avg_price DECIMAL(10,6) := 0;
    v_limit_qty DECIMAL(15,2) := 0;
    v_limit_price DECIMAL(10,6) := 0;
    v_slippage DECIMAL(5,2) := 0;
    v_best_price DECIMAL(10,6);
    v_worst_price DECIMAL(10,6);
    v_available_qty DECIMAL(15,2) := 0;
    v_match_record RECORD;
    v_match_qty DECIMAL(15,2);
    v_quote_amount DECIMAL(15,2);
    v_buyer_fee DECIMAL(15,2);
    v_seller_fee DECIMAL(15,2);
    v_market_status TEXT := 'rejected';
    v_limit_status TEXT := 'pending';
    v_message TEXT;
    v_current_market_rate DECIMAL(10,6);
BEGIN
    -- ========================================================================
    -- STEP 1: CHECK AVAILABLE LIQUIDITY
    -- ========================================================================
    
    -- Get available liquidity with price-time priority
    WITH ordered_liquidity AS (
        SELECT 
            ob.price,
            ob.remaining_quantity,
            SUM(ob.remaining_quantity) OVER (
                ORDER BY 
                    CASE WHEN p_side = 'buy' THEN ob.price END ASC,      -- Buy: cheapest sells first
                    CASE WHEN p_side = 'sell' THEN ob.price END DESC,    -- Sell: match highest buys first
                    ob.created_at ASC                                     -- Time priority (FIFO)
            ) as cumulative_qty
        FROM order_book ob
        WHERE ob.base_currency = p_base_currency
          AND ob.quote_currency = p_quote_currency
          AND ob.side = CASE WHEN p_side = 'buy' THEN 'sell' ELSE 'buy' END
          AND ob.status IN ('pending', 'partially_filled')
          AND ob.user_id != p_user_id
    )
    SELECT 
        MIN(price) as best_price,
        MAX(CASE WHEN cumulative_qty >= p_quantity THEN price END) as worst_price,
        MAX(cumulative_qty) as total_available
    INTO v_best_price, v_worst_price, v_available_qty
    FROM ordered_liquidity;
    
    -- If no liquidity at all, reject completely
    IF v_best_price IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, 'rejected'::TEXT, 'rejected'::TEXT,
            0::DECIMAL(15,2), 0::DECIMAL(15,2), 0::DECIMAL(10,6), 0::DECIMAL(10,6),
            0::DECIMAL(15,2), 0::DECIMAL(5,2),
            'No liquidity available for this currency pair'::TEXT;
        RETURN;
    END IF;
    
    -- Get current market rate for limit order pricing
    v_current_market_rate := v_best_price;
    
    -- ========================================================================
    -- STEP 2: EXECUTE MARKET PORTION (AVAILABLE LIQUIDITY)
    -- ========================================================================
    
    -- Determine how much we can execute immediately
    v_market_filled := LEAST(p_quantity, v_available_qty);
    v_limit_qty := p_quantity - v_market_filled;
    
    -- Create market order record for the executable portion
    IF v_market_filled > 0 THEN
        INSERT INTO order_book (user_id, order_type, side, base_currency, quote_currency, quantity, remaining_quantity, status)
        VALUES (p_user_id, 'market', p_side, p_base_currency, p_quote_currency, v_market_filled, 0, 'filled')
        RETURNING id INTO v_market_order_id;
        
        -- Execute matching for the market portion
        FOR v_match_record IN (
            SELECT ob.id, ob.user_id, ob.remaining_quantity, ob.price
            FROM order_book ob
            WHERE ob.base_currency = p_base_currency 
              AND ob.quote_currency = p_quote_currency
              AND ob.side = CASE WHEN p_side = 'buy' THEN 'sell' ELSE 'buy' END
              AND ob.status IN ('pending', 'partially_filled') 
              AND ob.user_id != p_user_id
              AND ob.id != v_market_order_id
            ORDER BY 
                CASE WHEN p_side = 'buy' THEN ob.price END ASC,      -- Buy: match cheapest sells first
                CASE WHEN p_side = 'sell' THEN ob.price END DESC,    -- Sell: match highest buys first
                ob.created_at ASC                                     -- Time priority (FIFO)
            FOR UPDATE SKIP LOCKED
        ) LOOP
            EXIT WHEN v_remaining_qty <= 0;
            
            v_match_qty := LEAST(v_remaining_qty, v_match_record.remaining_quantity);
            v_quote_amount := v_match_qty * v_match_record.price;
            
            -- Calculate fees
            SELECT buyer_fee, seller_fee INTO v_buyer_fee, v_seller_fee
            FROM calculate_trading_fees(p_side, v_match_qty, v_match_record.price);
            
            -- Update balances
            IF p_side = 'buy' THEN
                UPDATE wallets SET available_balance = available_balance - v_quote_amount WHERE user_id = p_user_id AND currency = p_quote_currency;
                UPDATE wallets SET available_balance = available_balance + v_match_qty - v_buyer_fee WHERE user_id = p_user_id AND currency = p_base_currency;
                UPDATE wallets SET reserved_balance = reserved_balance - v_match_qty WHERE user_id = v_match_record.user_id AND currency = p_base_currency;
                UPDATE wallets SET available_balance = available_balance + v_quote_amount - v_seller_fee WHERE user_id = v_match_record.user_id AND currency = p_quote_currency;
            ELSE
                UPDATE wallets SET available_balance = available_balance - v_match_qty WHERE user_id = p_user_id AND currency = p_base_currency;
                UPDATE wallets SET available_balance = available_balance + v_quote_amount - v_seller_fee WHERE user_id = p_user_id AND currency = p_quote_currency;
                UPDATE wallets SET reserved_balance = reserved_balance - v_quote_amount WHERE user_id = v_match_record.user_id AND currency = p_quote_currency;
                UPDATE wallets SET available_balance = available_balance + v_match_qty - v_buyer_fee WHERE user_id = v_match_record.user_id AND currency = p_base_currency;
            END IF;
            
            -- Update matched order
            UPDATE order_book SET 
                remaining_quantity = remaining_quantity - v_match_qty,
                filled_at = CASE WHEN remaining_quantity - v_match_qty = 0 THEN NOW() ELSE NULL END,
                status = CASE WHEN remaining_quantity - v_match_qty = 0 THEN 'filled' ELSE 'partially_filled' END
            WHERE id = v_match_record.id;
            
            -- Update tracking
            v_remaining_qty := v_remaining_qty - v_match_qty;
            v_market_cost := v_market_cost + v_quote_amount;
            
            -- Create trade record
            INSERT INTO trades (buy_order_id, sell_order_id, buyer_id, seller_id, base_currency, quote_currency, quantity, price, quote_amount, buyer_fee, seller_fee)
            VALUES (
                CASE WHEN p_side = 'buy' THEN v_market_order_id ELSE v_match_record.id END,
                CASE WHEN p_side = 'sell' THEN v_market_order_id ELSE v_match_record.id END,
                CASE WHEN p_side = 'buy' THEN p_user_id ELSE v_match_record.user_id END,
                CASE WHEN p_side = 'sell' THEN p_user_id ELSE v_match_record.user_id END,
                p_base_currency, p_quote_currency, v_match_qty, v_match_record.price, v_quote_amount, v_buyer_fee, v_seller_fee
            );
        END LOOP;
        
        -- Finalize market order
        IF v_market_filled > 0 THEN 
            v_market_avg_price := v_market_cost / v_market_filled; 
            v_market_status := 'filled';
        END IF;
        
        -- Update market order record
        UPDATE order_book SET 
            remaining_quantity = 0,
            status = v_market_status,
            average_fill_price = v_market_avg_price,
            filled_at = NOW()
        WHERE id = v_market_order_id;
    END IF;
    
    -- ========================================================================
    -- STEP 3: CREATE LIMIT ORDER FOR REMAINING QUANTITY
    -- ========================================================================
    
    IF v_limit_qty > 0 THEN
        -- Use current market rate for the limit order price
        v_limit_price := v_current_market_rate;
        
        -- Call the existing place_limit_order function for the remaining quantity
        SELECT order_id, status INTO v_limit_order_id, v_limit_status
        FROM place_limit_order(
            p_user_id,
            p_side,
            p_base_currency,
            p_quote_currency,
            v_limit_qty,
            v_limit_price
        );
    END IF;
    
    -- ========================================================================
    -- STEP 4: PREPARE RESPONSE
    -- ========================================================================
    
    IF v_market_filled > 0 AND v_limit_qty > 0 THEN
        v_message := FORMAT('Hybrid execution: %s %s executed immediately, %s %s pending as limit order', 
                           v_market_filled, p_base_currency, v_limit_qty, p_base_currency);
    ELSIF v_market_filled > 0 THEN
        v_message := FORMAT('Market order executed completely: %s %s', v_market_filled, p_base_currency);
    ELSE
        v_message := FORMAT('Order placed as limit order: %s %s', v_limit_qty, p_base_currency);
    END IF;
    
    RETURN QUERY SELECT 
        v_market_order_id,
        v_limit_order_id,
        v_market_status,
        v_limit_status,
        v_market_filled,
        v_limit_qty,
        v_market_avg_price,
        v_limit_price,
        v_market_cost,
        v_slippage,
        v_message;
END;
$$;
