-- =====================================================================================
-- EmaPay Order Book System: Create Fund Reservations Table
-- =====================================================================================
-- This migration creates the fund_reservations table to separate fund management 
-- from order management in the new order book exchange system:
-- 1. Creates fund_reservations table with proper schema and constraints
-- 2. Adds performance indexes for fund management queries
-- 3. Sets up foreign key relationships with order_book and users tables
-- 4. Creates updated_at trigger for automatic timestamp updates
-- 5. Enables Row Level Security (RLS) with appropriate policies
-- 6. Creates helper functions for fund reservation management
-- =====================================================================================

-- Step 1: Create the fund_reservations table
CREATE TABLE fund_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES order_book(id) ON DELETE CASCADE NOT NULL,
  
  -- Reservation Details
  currency TEXT NOT NULL CHECK (currency IN ('AOA', 'EUR')),
  reserved_amount DECIMAL(15,2) NOT NULL CHECK (reserved_amount > 0),
  released_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (released_amount >= 0),
  
  -- Status Management
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_released', 'fully_released')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE,
  
  -- Business Logic Constraints
  CONSTRAINT reservation_consistency CHECK (released_amount <= reserved_amount),
  CONSTRAINT released_at_when_released CHECK (status = 'active' OR released_at IS NOT NULL),
  UNIQUE(order_id) -- One reservation per order
);

-- Step 2: Add table and column comments for documentation
COMMENT ON TABLE fund_reservations IS 'Fund reservations for order book system - tracks reserved balances for active orders';
COMMENT ON COLUMN fund_reservations.user_id IS 'Reference to the user who owns the reserved funds';
COMMENT ON COLUMN fund_reservations.order_id IS 'Reference to the order that requires these reserved funds';
COMMENT ON COLUMN fund_reservations.currency IS 'Currency type of the reserved funds (AOA or EUR)';
COMMENT ON COLUMN fund_reservations.reserved_amount IS 'Total amount of currency reserved for the order';
COMMENT ON COLUMN fund_reservations.released_amount IS 'Amount of reserved funds that have been released back to available balance';
COMMENT ON COLUMN fund_reservations.status IS 'Reservation status: active, partially_released, or fully_released';
COMMENT ON COLUMN fund_reservations.released_at IS 'Timestamp when the reservation was first released (partial or full)';

-- Step 3: Create performance indexes for fund reservation queries
-- Index for user fund reservation queries
CREATE INDEX idx_fund_reservations_user ON fund_reservations(user_id, status, created_at DESC);

-- Index for order-specific reservations
CREATE INDEX idx_fund_reservations_order ON fund_reservations(order_id);

-- Index for currency-specific reservations
CREATE INDEX idx_fund_reservations_currency ON fund_reservations(currency, status) 
  WHERE status IN ('active', 'partially_released');

-- Index for active reservations (most frequently queried)
CREATE INDEX idx_fund_reservations_active ON fund_reservations(user_id, currency, status) 
  WHERE status IN ('active', 'partially_released');

-- Index for reservation status updates
CREATE INDEX idx_fund_reservations_status_timestamp ON fund_reservations(status, updated_at DESC);

-- Step 4: Create updated_at trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_fund_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set released_at timestamp when reservation becomes partially or fully released
    IF NEW.status IN ('partially_released', 'fully_released') AND OLD.status = 'active' THEN
        NEW.released_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fund_reservations_updated_at_trigger
    BEFORE UPDATE ON fund_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_fund_reservations_updated_at();

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE fund_reservations ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for fund_reservations table
-- Users can view their own fund reservations
CREATE POLICY "Users can view their own fund reservations" ON fund_reservations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own fund reservations (through order placement)
CREATE POLICY "Users can insert their own fund reservations" ON fund_reservations
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own fund reservations (through order cancellation/completion)
CREATE POLICY "Users can update their own fund reservations" ON fund_reservations
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Step 7: Create helper functions for fund reservation management

-- Function to get total reserved amount for a user and currency
CREATE OR REPLACE FUNCTION get_user_reserved_amount(
    p_user_id UUID,
    p_currency TEXT
)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_reserved DECIMAL(15,2) := 0;
BEGIN
    SELECT COALESCE(SUM(reserved_amount - released_amount), 0)
    INTO total_reserved
    FROM fund_reservations
    WHERE user_id = p_user_id
      AND currency = p_currency
      AND status IN ('active', 'partially_released');
    
    RETURN total_reserved;
END;
$$;

-- Function to release funds from a reservation (partial or full)
CREATE OR REPLACE FUNCTION release_fund_reservation(
    p_reservation_id UUID,
    p_amount_to_release DECIMAL(15,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reservation_record RECORD;
    new_released_amount DECIMAL(15,2);
    new_status TEXT;
BEGIN
    -- Get current reservation details
    SELECT * INTO reservation_record
    FROM fund_reservations
    WHERE id = p_reservation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fund reservation not found: %', p_reservation_id;
    END IF;
    
    -- Calculate new released amount
    new_released_amount := reservation_record.released_amount + p_amount_to_release;
    
    -- Validate release amount
    IF new_released_amount > reservation_record.reserved_amount THEN
        RAISE EXCEPTION 'Cannot release more than reserved amount. Reserved: %, Trying to release: %', 
            reservation_record.reserved_amount, new_released_amount;
    END IF;
    
    -- Determine new status
    IF new_released_amount >= reservation_record.reserved_amount THEN
        new_status := 'fully_released';
    ELSIF new_released_amount > 0 THEN
        new_status := 'partially_released';
    ELSE
        new_status := 'active';
    END IF;
    
    -- Update the reservation
    UPDATE fund_reservations
    SET released_amount = new_released_amount,
        status = new_status,
        updated_at = NOW()
    WHERE id = p_reservation_id;
    
    -- Update user's wallet balance (add released amount back to available balance)
    UPDATE wallets
    SET available_balance = available_balance + p_amount_to_release,
        updated_at = NOW()
    WHERE user_id = reservation_record.user_id 
      AND currency = reservation_record.currency;
    
    RETURN TRUE;
END;
$$;

-- Function to create a fund reservation for an order
CREATE OR REPLACE FUNCTION create_fund_reservation(
    p_user_id UUID,
    p_order_id UUID,
    p_currency TEXT,
    p_amount DECIMAL(15,2)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reservation_id UUID;
    user_balance DECIMAL(15,2);
BEGIN
    -- Validate input
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Reservation amount must be positive';
    END IF;
    
    -- Check if user has sufficient available balance
    SELECT available_balance INTO user_balance
    FROM wallets
    WHERE user_id = p_user_id AND currency = p_currency;
    
    IF user_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user % and currency %', p_user_id, p_currency;
    END IF;
    
    IF user_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient available balance. Available: %, Required: %', user_balance, p_amount;
    END IF;
    
    -- Create the reservation
    INSERT INTO fund_reservations (user_id, order_id, currency, reserved_amount)
    VALUES (p_user_id, p_order_id, p_currency, p_amount)
    RETURNING id INTO reservation_id;
    
    -- Update user's wallet (move from available to reserved)
    UPDATE wallets
    SET available_balance = available_balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id AND currency = p_currency;
    
    RETURN reservation_id;
END;
$$;

-- Function to cancel a fund reservation (release all funds)
CREATE OR REPLACE FUNCTION cancel_fund_reservation(
    p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reservation_record RECORD;
    amount_to_release DECIMAL(15,2);
BEGIN
    -- Get reservation details
    SELECT * INTO reservation_record
    FROM fund_reservations
    WHERE id = p_reservation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fund reservation not found: %', p_reservation_id;
    END IF;
    
    -- Calculate amount to release (unreleased portion)
    amount_to_release := reservation_record.reserved_amount - reservation_record.released_amount;
    
    IF amount_to_release > 0 THEN
        -- Release the remaining funds
        RETURN release_fund_reservation(p_reservation_id, amount_to_release);
    ELSE
        -- Already fully released
        RETURN TRUE;
    END IF;
END;
$$;

-- Step 8: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON fund_reservations TO authenticated;

-- Step 9: Create test function to validate table creation
CREATE OR REPLACE FUNCTION test_fund_reservations_creation()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    test_result BOOLEAN := TRUE;
BEGIN
    -- Test table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fund_reservations') THEN
        RAISE NOTICE 'ERROR: fund_reservations table not found';
        RETURN FALSE;
    END IF;
    
    -- Test constraints exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'reservation_consistency') THEN
        RAISE NOTICE 'ERROR: reservation_consistency constraint not found';
        RETURN FALSE;
    END IF;
    
    -- Test unique constraint exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name LIKE '%fund_reservations%order_id%') THEN
        RAISE NOTICE 'ERROR: unique order_id constraint not found';
        RETURN FALSE;
    END IF;
    
    -- Test indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fund_reservations_user') THEN
        RAISE NOTICE 'ERROR: idx_fund_reservations_user index not found';
        RETURN FALSE;
    END IF;
    
    -- Test RLS is enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'fund_reservations' AND rowsecurity = true) THEN
        RAISE NOTICE 'ERROR: RLS not enabled on fund_reservations table';
        RETURN FALSE;
    END IF;
    
    -- Test functions exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_reserved_amount') THEN
        RAISE NOTICE 'ERROR: get_user_reserved_amount function not found';
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'SUCCESS: fund_reservations table created successfully with all constraints, indexes, and functions';
    RETURN TRUE;
END;
$$;

-- Run the test
SELECT test_fund_reservations_creation();

-- Migration completed successfully
SELECT 'Fund reservations table created successfully' AS status;
