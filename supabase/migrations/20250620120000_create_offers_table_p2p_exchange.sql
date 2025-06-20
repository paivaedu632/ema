-- =====================================================================================
-- EmaPay Peer-to-Peer Exchange System: Offers Table Migration
-- =====================================================================================
-- This migration creates the offers table for peer-to-peer currency exchange system:
-- 1. Creates offers table with proper schema and constraints
-- 2. Moves reserved_balance logic from wallets to offers table
-- 3. Adds proper indexes for performance optimization
-- 4. Sets up foreign key relationships and RLS policies
-- 5. Creates helper functions for offer management
-- =====================================================================================

-- Step 1: Create the offers table
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  currency_type TEXT NOT NULL CHECK (currency_type IN ('AOA', 'EUR')),
  reserved_amount DECIMAL(15,2) NOT NULL CHECK (reserved_amount > 0),
  exchange_rate DECIMAL(10,6) NOT NULL CHECK (exchange_rate > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Step 2: Add comments to document the table structure
COMMENT ON TABLE offers IS 'Peer-to-peer currency exchange offers with reserved balance management';
COMMENT ON COLUMN offers.user_id IS 'Reference to the user who created the offer';
COMMENT ON COLUMN offers.currency_type IS 'Currency being offered for sale (AOA or EUR)';
COMMENT ON COLUMN offers.reserved_amount IS 'Amount of currency reserved for this offer';
COMMENT ON COLUMN offers.exchange_rate IS 'Exchange rate set by the seller (e.g., 0.001082 for AOA->EUR)';
COMMENT ON COLUMN offers.status IS 'Offer status: active (available), completed (sold), cancelled (withdrawn)';

-- Step 3: Create indexes for performance optimization
CREATE INDEX idx_offers_user_id ON offers (user_id);
CREATE INDEX idx_offers_currency_type ON offers (currency_type);
CREATE INDEX idx_offers_status ON offers (status);
CREATE INDEX idx_offers_created_at ON offers (created_at DESC);
CREATE INDEX idx_offers_exchange_rate ON offers (exchange_rate);

-- Composite indexes for common query patterns
CREATE INDEX idx_offers_currency_status ON offers (currency_type, status);
CREATE INDEX idx_offers_user_currency ON offers (user_id, currency_type);
CREATE INDEX idx_offers_active_by_rate ON offers (currency_type, exchange_rate) WHERE status = 'active';

-- Step 4: Create updated_at trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER offers_updated_at_trigger
    BEFORE UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_offers_updated_at();

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for offers table
-- Users can view all active offers (for marketplace browsing)
CREATE POLICY "Users can view active offers" ON offers
    FOR SELECT
    TO authenticated
    USING (status = 'active');

-- Users can view their own offers regardless of status
CREATE POLICY "Users can view own offers" ON offers
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own offers
CREATE POLICY "Users can create offers" ON offers
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own offers (for cancellation)
CREATE POLICY "Users can update own offers" ON offers
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users cannot delete offers (for audit trail)
-- Offers should be cancelled, not deleted

-- Step 7: Create helper function to get total reserved balance by currency
CREATE OR REPLACE FUNCTION get_user_reserved_balance(user_uuid UUID, currency_code TEXT)
RETURNS DECIMAL(15,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(reserved_amount) 
         FROM offers 
         WHERE user_id = user_uuid 
           AND currency_type = currency_code 
           AND status = 'active'),
        0.00
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to validate exchange rate against existing offers
CREATE OR REPLACE FUNCTION validate_exchange_rate(
    currency_code TEXT,
    proposed_rate DECIMAL(10,6)
) RETURNS BOOLEAN AS $$
DECLARE
    market_rate DECIMAL(10,6);
    min_rate DECIMAL(10,6);
    max_rate DECIMAL(10,6);
BEGIN
    -- Get the current market rate from existing active offers
    SELECT AVG(exchange_rate) INTO market_rate
    FROM offers 
    WHERE currency_type = currency_code 
      AND status = 'active'
      AND created_at >= NOW() - INTERVAL '24 hours';
    
    IF market_rate IS NOT NULL THEN
        -- If market offers exist, allow 20% margin
        min_rate := market_rate * 0.8;
        max_rate := market_rate * 1.2;
        
        RETURN proposed_rate BETWEEN min_rate AND max_rate;
    ELSE
        -- If no market offers exist, we'll validate against Banco BAI API
        -- This will be handled in the application layer
        -- For now, allow any positive rate
        RETURN proposed_rate > 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create function to create an offer with balance validation
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
    
    -- Validate exchange rate
    IF NOT validate_exchange_rate(currency_code, rate) THEN
        RAISE EXCEPTION 'Exchange rate % is outside acceptable range for %', rate, currency_code;
    END IF;
    
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

-- Step 10: Create function to cancel an offer
CREATE OR REPLACE FUNCTION cancel_currency_offer(offer_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    offer_record RECORD;
BEGIN
    -- Get offer details and verify ownership
    SELECT * INTO offer_record
    FROM offers
    WHERE id = offer_uuid AND user_id = user_uuid AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer not found or not owned by user';
    END IF;
    
    -- Start transaction
    BEGIN
        -- Return reserved amount to available balance
        UPDATE wallets 
        SET available_balance = available_balance + offer_record.reserved_amount,
            updated_at = NOW()
        WHERE user_id = user_uuid AND currency = offer_record.currency_type;
        
        -- Mark offer as cancelled
        UPDATE offers 
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE id = offer_uuid;
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration completed successfully
-- New offers table created with proper schema, indexes, RLS policies, and helper functions
-- Ready for peer-to-peer currency exchange implementation
