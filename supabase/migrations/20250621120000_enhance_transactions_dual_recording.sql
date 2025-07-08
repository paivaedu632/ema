-- =====================================================================================
-- EmaPay Enhanced Transaction System: Dual Recording & Wise-Style Transaction IDs
-- =====================================================================================
-- This migration enhances the transaction system to support:
-- 1. Dual transaction recording for buy/sell exchanges (buyer + seller records)
-- 2. Wise-style transaction IDs (EP-2025-XXXXXX format)
-- 3. Linked transaction references for exchange operations
-- 4. Sequential transaction numbering system
-- =====================================================================================

-- Step 1: Create sequence for transaction numbering
CREATE SEQUENCE IF NOT EXISTS transaction_sequence
    START WITH 1
    INCREMENT BY 1
    NO MAXVALUE
    NO MINVALUE
    CACHE 1;

-- Step 2: Add new columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES transactions(id),
ADD COLUMN IF NOT EXISTS exchange_id UUID,
ADD COLUMN IF NOT EXISTS counterparty_user_id UUID REFERENCES users(id);

-- Step 3: Create index for performance on new columns
CREATE INDEX IF NOT EXISTS idx_transactions_display_id ON transactions(display_id);
CREATE INDEX IF NOT EXISTS idx_transactions_linked_transaction_id ON transactions(linked_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_exchange_id ON transactions(exchange_id);
CREATE INDEX IF NOT EXISTS idx_transactions_counterparty_user_id ON transactions(counterparty_user_id);

-- Step 4: Function to generate Wise-style transaction IDs
CREATE OR REPLACE FUNCTION generate_transaction_display_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    sequence_number INTEGER;
    year_part TEXT;
    formatted_id TEXT;
BEGIN
    -- Get next sequence number
    sequence_number := nextval('transaction_sequence');
    
    -- Get current year
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Format as EP-YYYY-XXXXXX (6 digits with leading zeros)
    formatted_id := 'EP-' || year_part || '-' || LPAD(sequence_number::TEXT, 6, '0');
    
    RETURN formatted_id;
END;
$$;

-- Step 5: Function to create dual transactions for exchanges
CREATE OR REPLACE FUNCTION create_dual_exchange_transactions(
    buyer_user_id UUID,
    seller_user_id UUID,
    buyer_amount DECIMAL(15,2),
    buyer_currency TEXT,
    seller_amount DECIMAL(15,2),
    seller_currency TEXT,
    exchange_rate_value DECIMAL(10,6),
    fee_amount_buyer DECIMAL(15,2) DEFAULT 0.00,
    fee_amount_seller DECIMAL(15,2) DEFAULT 0.00,
    exchange_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    exchange_uuid UUID;
    buyer_transaction_id UUID;
    seller_transaction_id UUID;
    buyer_display_id TEXT;
    seller_display_id TEXT;
    buyer_net_amount DECIMAL(15,2);
    seller_net_amount DECIMAL(15,2);
    result JSON;
BEGIN
    -- Generate unique exchange ID
    exchange_uuid := gen_random_uuid();
    
    -- Calculate net amounts
    buyer_net_amount := buyer_amount - fee_amount_buyer;
    seller_net_amount := seller_amount - fee_amount_seller;
    
    -- Generate display IDs
    buyer_display_id := generate_transaction_display_id();
    seller_display_id := generate_transaction_display_id();
    
    -- Create buyer transaction (buy type)
    INSERT INTO transactions (
        user_id, type, amount, currency, fee_amount, net_amount,
        exchange_rate, status, display_id, exchange_id, counterparty_user_id,
        metadata
    ) VALUES (
        buyer_user_id, 'buy', buyer_amount, buyer_currency, fee_amount_buyer, buyer_net_amount,
        exchange_rate_value, 'completed', buyer_display_id, exchange_uuid, seller_user_id,
        exchange_metadata || jsonb_build_object(
            'exchange_type', 'p2p_buy',
            'received_amount', seller_amount,
            'received_currency', seller_currency,
            'counterparty_type', 'seller'
        )
    ) RETURNING id INTO buyer_transaction_id;
    
    -- Create seller transaction (sell type)
    INSERT INTO transactions (
        user_id, type, amount, currency, fee_amount, net_amount,
        exchange_rate, status, display_id, exchange_id, counterparty_user_id,
        metadata
    ) VALUES (
        seller_user_id, 'sell', seller_amount, seller_currency, fee_amount_seller, seller_net_amount,
        exchange_rate_value, 'completed', seller_display_id, exchange_uuid, buyer_user_id,
        exchange_metadata || jsonb_build_object(
            'exchange_type', 'p2p_sell',
            'received_amount', buyer_amount,
            'received_currency', buyer_currency,
            'counterparty_type', 'buyer'
        )
    ) RETURNING id INTO seller_transaction_id;
    
    -- Update transactions to link to each other
    UPDATE transactions 
    SET linked_transaction_id = seller_transaction_id 
    WHERE id = buyer_transaction_id;
    
    UPDATE transactions 
    SET linked_transaction_id = buyer_transaction_id 
    WHERE id = seller_transaction_id;
    
    -- Return result
    result := jsonb_build_object(
        'exchange_id', exchange_uuid,
        'buyer_transaction_id', buyer_transaction_id,
        'seller_transaction_id', seller_transaction_id,
        'buyer_display_id', buyer_display_id,
        'seller_display_id', seller_display_id,
        'status', 'completed'
    );
    
    RETURN result;
END;
$$;

-- Step 6: Function to backfill display IDs for existing transactions
CREATE OR REPLACE FUNCTION backfill_transaction_display_ids()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    transaction_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Update existing transactions that don't have display_id
    FOR transaction_record IN 
        SELECT id FROM transactions WHERE display_id IS NULL ORDER BY created_at ASC
    LOOP
        UPDATE transactions 
        SET display_id = generate_transaction_display_id()
        WHERE id = transaction_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$;

-- Step 7: Add trigger to auto-generate display_id for new transactions
CREATE OR REPLACE FUNCTION trigger_generate_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.display_id IS NULL THEN
        NEW.display_id := generate_transaction_display_id();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_display_id_trigger
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_display_id();

-- Step 8: Backfill existing transactions with display IDs
SELECT backfill_transaction_display_ids();

-- Step 9: Add comments for documentation
COMMENT ON COLUMN transactions.display_id IS 'Human-readable transaction ID in EP-YYYY-XXXXXX format (Wise-style)';
COMMENT ON COLUMN transactions.linked_transaction_id IS 'Reference to the counterpart transaction in dual recording (for exchanges)';
COMMENT ON COLUMN transactions.exchange_id IS 'Unique identifier linking buyer and seller transactions in the same exchange';
COMMENT ON COLUMN transactions.counterparty_user_id IS 'User ID of the counterparty in exchange transactions (buyer/seller)';
COMMENT ON FUNCTION generate_transaction_display_id() IS 'Generates Wise-style transaction IDs (EP-YYYY-XXXXXX format)';
COMMENT ON FUNCTION create_dual_exchange_transactions IS 'Creates linked buyer and seller transactions for P2P exchanges';
