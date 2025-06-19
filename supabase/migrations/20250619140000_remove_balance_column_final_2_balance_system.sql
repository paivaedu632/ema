-- =====================================================================================
-- EmaPay Final 2-Balance System Migration
-- =====================================================================================
-- This migration completes the transition to a pure 2-balance system by removing
-- the 'balance' column entirely, leaving only:
-- 1. available_balance: Money users can freely spend, send, or list for trading
-- 2. reserved_balance: Money temporarily locked when users list currency for sale
-- 
-- This matches the remote database schema that was updated manually.
-- =====================================================================================

-- Step 1: Drop the existing balance validation trigger and function
DROP TRIGGER IF EXISTS validate_wallet_balance_2_system_trigger ON wallets;
DROP FUNCTION IF EXISTS validate_wallet_balance_2_system();

-- Step 2: Drop the balance constraint
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS positive_balance;

-- Step 3: Remove the balance column entirely
ALTER TABLE wallets DROP COLUMN IF EXISTS balance;

-- Step 4: Create new validation function for pure 2-balance system
CREATE OR REPLACE FUNCTION validate_wallet_2_balance_system()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure available_balance is non-negative
    IF NEW.available_balance < 0 THEN
        RAISE EXCEPTION 'Available balance cannot be negative: %', NEW.available_balance;
    END IF;
    
    -- Ensure reserved_balance is non-negative
    IF NEW.reserved_balance < 0 THEN
        RAISE EXCEPTION 'Reserved balance cannot be negative: %', NEW.reserved_balance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Apply new validation trigger
CREATE TRIGGER validate_wallet_2_balance_system_trigger
    BEFORE INSERT OR UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION validate_wallet_2_balance_system();

-- Step 6: Update the wallet creation function to work with 2-balance system
DROP TRIGGER IF EXISTS create_user_wallets_trigger ON users;
DROP FUNCTION IF EXISTS create_user_wallets();

CREATE OR REPLACE FUNCTION create_user_wallets()
RETURNS TRIGGER AS $$
BEGIN
    -- Create AOA wallet with 2-balance system
    INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
    VALUES (NEW.id, 'AOA', 0.00, 0.00);

    -- Create EUR wallet with 2-balance system
    INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
    VALUES (NEW.id, 'EUR', 0.00, 0.00);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Recreate the trigger for automatic wallet creation
CREATE TRIGGER create_user_wallets_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_wallets();

-- Step 8: Update existing balance management functions to work with 2-balance system

-- Function to get reserved balance (no changes needed)
-- get_user_reserved_balance() already works with reserved_balance column

-- Function to reserve balance (update to remove balance column references)
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

-- Function to unreserve balance (update to remove balance column references)
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

-- Step 9: Add comments to document the final schema
COMMENT ON COLUMN wallets.available_balance IS 'Money that users can freely spend, send, or list for trading';
COMMENT ON COLUMN wallets.reserved_balance IS 'Money temporarily locked when users list their currency for sale on the exchange';
COMMENT ON TABLE wallets IS 'User wallet balances with pure 2-balance system: available_balance (spendable) + reserved_balance (locked for sales)';

-- Migration completed successfully
-- Final schema: Pure 2-balance system
-- Available balance: for spending, sending, trading
-- Reserved balance: for locked funds during sales
-- Total user balance = available_balance + reserved_balance (calculated when needed)
