-- =====================================================================================
-- EmaPay Wallet Schema Update: 2-Balance System Migration
-- =====================================================================================
-- This migration updates the wallet schema to use a simplified 2-balance system:
-- 1. available_balance: Money users can freely spend, send, or list for trading
-- 2. reserved_balance: Money temporarily locked when users list currency for sale
-- 
-- Changes:
-- - Remove pending_balance field (no longer needed)
-- - Add reserved_balance field for exchange/trading functionality
-- - Update constraints and triggers to work with new schema
-- - Migrate any existing pending_balance data to available_balance
-- =====================================================================================

-- Step 1: Add the new reserved_balance column
ALTER TABLE wallets 
ADD COLUMN reserved_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00;

-- Step 2: Add constraint for reserved_balance (must be >= 0)
ALTER TABLE wallets 
ADD CONSTRAINT positive_reserved_balance CHECK (reserved_balance >= 0);

-- Step 3: Migrate existing pending_balance data to available_balance
-- (Add any pending balance to available balance before removing the column)
UPDATE wallets 
SET available_balance = available_balance + pending_balance
WHERE pending_balance > 0;

-- Step 4: Drop the old balance validation trigger that references pending_balance
DROP TRIGGER IF EXISTS validate_wallet_balance_trigger ON wallets;
DROP FUNCTION IF EXISTS validate_wallet_balance();

-- Step 5: Create new balance validation function for 2-balance system
CREATE OR REPLACE FUNCTION validate_wallet_balance_2_system()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate that available_balance + reserved_balance <= balance
    IF NEW.available_balance + NEW.reserved_balance > NEW.balance THEN
        RAISE EXCEPTION 'Available balance (%) + Reserved balance (%) cannot exceed total balance (%)',
            NEW.available_balance, NEW.reserved_balance, NEW.balance;
    END IF;

    -- Ensure all balances are non-negative (additional safety check)
    IF NEW.available_balance < 0 THEN
        RAISE EXCEPTION 'Available balance cannot be negative: %', NEW.available_balance;
    END IF;
    
    IF NEW.reserved_balance < 0 THEN
        RAISE EXCEPTION 'Reserved balance cannot be negative: %', NEW.reserved_balance;
    END IF;
    
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Total balance cannot be negative: %', NEW.balance;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Apply new balance validation trigger
CREATE TRIGGER validate_wallet_balance_2_system_trigger
    BEFORE INSERT OR UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION validate_wallet_balance_2_system();

-- Step 7: Update the automatic wallet creation function to use new schema
DROP TRIGGER IF EXISTS create_user_wallets_trigger ON users;
DROP FUNCTION IF EXISTS create_user_wallets();

CREATE OR REPLACE FUNCTION create_user_wallets()
RETURNS TRIGGER AS $$
BEGIN
    -- Create AOA wallet with new 2-balance system
    INSERT INTO wallets (user_id, currency, balance, available_balance, reserved_balance)
    VALUES (NEW.id, 'AOA', 0.00, 0.00, 0.00);

    -- Create EUR wallet with new 2-balance system
    INSERT INTO wallets (user_id, currency, balance, available_balance, reserved_balance)
    VALUES (NEW.id, 'EUR', 0.00, 0.00, 0.00);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reapply trigger to users table
CREATE TRIGGER create_user_wallets_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_wallets();

-- Step 8: Remove the pending_balance column and its constraint
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS positive_pending_balance;
ALTER TABLE wallets DROP COLUMN IF EXISTS pending_balance;

-- Step 9: Create utility functions for the new 2-balance system
-- Function to get user's reserved balance by currency
CREATE OR REPLACE FUNCTION get_user_reserved_balance(user_uuid UUID, currency_code TEXT)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    reserved_bal DECIMAL(15,2);
BEGIN
    SELECT reserved_balance INTO reserved_bal
    FROM wallets
    WHERE user_id = user_uuid AND currency = currency_code;

    RETURN COALESCE(reserved_bal, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Function to move money from available to reserved (for listing currency for sale)
CREATE OR REPLACE FUNCTION reserve_balance(user_uuid UUID, currency_code TEXT, amount DECIMAL(15,2))
RETURNS BOOLEAN AS $$
DECLARE
    current_available DECIMAL(15,2);
BEGIN
    -- Get current available balance
    SELECT available_balance INTO current_available
    FROM wallets
    WHERE user_id = user_uuid AND currency = currency_code;

    -- Check if user has enough available balance
    IF current_available < amount THEN
        RETURN FALSE;
    END IF;

    -- Move money from available to reserved
    UPDATE wallets
    SET 
        available_balance = available_balance - amount,
        reserved_balance = reserved_balance + amount,
        updated_at = NOW()
    WHERE user_id = user_uuid AND currency = currency_code;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to move money from reserved back to available (for cancelled sales)
CREATE OR REPLACE FUNCTION unreserve_balance(user_uuid UUID, currency_code TEXT, amount DECIMAL(15,2))
RETURNS BOOLEAN AS $$
DECLARE
    current_reserved DECIMAL(15,2);
BEGIN
    -- Get current reserved balance
    SELECT reserved_balance INTO current_reserved
    FROM wallets
    WHERE user_id = user_uuid AND currency = currency_code;

    -- Check if user has enough reserved balance
    IF current_reserved < amount THEN
        RETURN FALSE;
    END IF;

    -- Move money from reserved back to available
    UPDATE wallets
    SET 
        available_balance = available_balance + amount,
        reserved_balance = reserved_balance - amount,
        updated_at = NOW()
    WHERE user_id = user_uuid AND currency = currency_code;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Add comment to document the new schema
COMMENT ON COLUMN wallets.available_balance IS 'Money that users can freely spend, send, or list for trading';
COMMENT ON COLUMN wallets.reserved_balance IS 'Money temporarily locked when users list their currency for sale on the exchange';
COMMENT ON TABLE wallets IS 'User wallet balances with 2-balance system: available_balance (spendable) + reserved_balance (locked for sales)';

-- Migration completed successfully
-- New schema: balance = available_balance + reserved_balance
-- Available balance: for spending, sending, trading
-- Reserved balance: for locked funds during sales
