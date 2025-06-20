-- =====================================================================================
-- EmaPay P2P Exchange: Migrate Reserved Balance to Offers Table
-- =====================================================================================
-- This migration moves reserved balance logic from wallets table to offers table:
-- 1. Migrates existing reserved balances to offers table as active offers
-- 2. Removes reserved_balance column from wallets table
-- 3. Updates wallet validation functions to work without reserved_balance
-- 4. Updates balance management functions to use offers table
-- =====================================================================================

-- Step 1: Migrate existing reserved balances to offers table
-- Create temporary offers for users with reserved balances
INSERT INTO offers (user_id, currency_type, reserved_amount, exchange_rate, status, created_at, updated_at)
SELECT 
    user_id,
    currency,
    reserved_balance,
    -- Use default exchange rates based on currency
    CASE 
        WHEN currency = 'AOA' THEN 0.001082  -- AOA to EUR rate
        WHEN currency = 'EUR' THEN 924.0     -- EUR to AOA rate
        ELSE 1.0
    END as exchange_rate,
    'active' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM wallets 
WHERE reserved_balance > 0;

-- Step 2: Drop existing triggers and functions that reference reserved_balance
DROP TRIGGER IF EXISTS validate_wallet_2_balance_system_trigger ON wallets;
DROP FUNCTION IF EXISTS validate_wallet_2_balance_system();
DROP FUNCTION IF EXISTS reserve_balance(UUID, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS unreserve_balance(UUID, TEXT, DECIMAL);

-- Step 3: Remove reserved_balance column from wallets table
ALTER TABLE wallets DROP COLUMN IF EXISTS reserved_balance;

-- Step 4: Remove reserved_balance constraint
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS positive_reserved_balance;

-- Step 5: Create new validation function for wallets (available_balance only)
CREATE OR REPLACE FUNCTION validate_wallet_available_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure available_balance is non-negative
    IF NEW.available_balance < 0 THEN
        RAISE EXCEPTION 'Available balance cannot be negative: %', NEW.available_balance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Apply new validation trigger
CREATE TRIGGER validate_wallet_available_balance_trigger
    BEFORE INSERT OR UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION validate_wallet_available_balance();

-- Step 7: Update wallet creation function (remove reserved_balance)
DROP TRIGGER IF EXISTS create_user_wallets_trigger ON users;
DROP FUNCTION IF EXISTS create_user_wallets();

CREATE OR REPLACE FUNCTION create_user_wallets()
RETURNS TRIGGER AS $$
BEGIN
    -- Create AOA wallet with available_balance only
    INSERT INTO wallets (user_id, currency, available_balance)
    VALUES (NEW.id, 'AOA', 0.00);

    -- Create EUR wallet with available_balance only
    INSERT INTO wallets (user_id, currency, available_balance)
    VALUES (NEW.id, 'EUR', 0.00);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Recreate the trigger for automatic wallet creation
CREATE TRIGGER create_user_wallets_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_wallets();

-- Step 9: Create new balance management functions that work with offers table

-- Function to get total balance (available + reserved from offers)
CREATE OR REPLACE FUNCTION get_user_total_balance(user_uuid UUID, currency_code TEXT)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    available_bal DECIMAL(15,2);
    reserved_bal DECIMAL(15,2);
BEGIN
    -- Get available balance from wallets
    SELECT available_balance INTO available_bal
    FROM wallets
    WHERE user_id = user_uuid AND currency = currency_code;
    
    -- Get reserved balance from active offers
    SELECT COALESCE(SUM(reserved_amount), 0) INTO reserved_bal
    FROM offers
    WHERE user_id = user_uuid AND currency_type = currency_code AND status = 'active';
    
    RETURN COALESCE(available_bal, 0) + COALESCE(reserved_bal, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has sufficient available balance
CREATE OR REPLACE FUNCTION check_available_balance(
    user_uuid UUID, 
    currency_code TEXT, 
    required_amount DECIMAL(15,2)
) RETURNS BOOLEAN AS $$
DECLARE
    available_bal DECIMAL(15,2);
BEGIN
    SELECT available_balance INTO available_bal
    FROM wallets
    WHERE user_id = user_uuid AND currency = currency_code;
    
    RETURN COALESCE(available_bal, 0) >= required_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to move money from available balance to offer (reserve)
CREATE OR REPLACE FUNCTION reserve_balance_for_offer(
    user_uuid UUID,
    currency_code TEXT,
    amount DECIMAL(15,2),
    rate DECIMAL(10,6)
) RETURNS UUID AS $$
DECLARE
    offer_id UUID;
BEGIN
    -- This function is now handled by create_currency_offer()
    -- which was created in the previous migration
    RETURN create_currency_offer(user_uuid, currency_code, amount, rate);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to return money from cancelled offer to available balance
CREATE OR REPLACE FUNCTION unreserve_balance_from_offer(offer_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- This function is now handled by cancel_currency_offer()
    -- which was created in the previous migration
    RETURN cancel_currency_offer(offer_uuid, user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Update wallet balance calculation view (if needed)
-- Create a view that shows both available and reserved balances for compatibility
CREATE OR REPLACE VIEW wallet_balances_with_reserved AS
SELECT 
    w.user_id,
    w.currency,
    w.available_balance,
    COALESCE(o.reserved_balance, 0.00) as reserved_balance,
    w.available_balance + COALESCE(o.reserved_balance, 0.00) as total_balance,
    w.created_at,
    w.updated_at
FROM wallets w
LEFT JOIN (
    SELECT 
        user_id,
        currency_type as currency,
        SUM(reserved_amount) as reserved_balance
    FROM offers 
    WHERE status = 'active'
    GROUP BY user_id, currency_type
) o ON w.user_id = o.user_id AND w.currency = o.currency;

-- Step 11: Update comments to document the new schema
COMMENT ON COLUMN wallets.available_balance IS 'Money that users can freely spend, send, or trade. Reserved balances are now managed in the offers table.';
COMMENT ON TABLE wallets IS 'User wallet balances with available_balance only. Reserved balances for trading are managed in the offers table.';
COMMENT ON VIEW wallet_balances_with_reserved IS 'Compatibility view showing both available and reserved balances (reserved from offers table)';

-- Step 12: Grant necessary permissions for the view
GRANT SELECT ON wallet_balances_with_reserved TO authenticated;

-- Enable RLS on the view (inherits from underlying tables)
ALTER VIEW wallet_balances_with_reserved SET (security_barrier = true);

-- Migration completed successfully
-- Reserved balance logic moved from wallets to offers table
-- Wallets table now only contains available_balance
-- Reserved balances are calculated from active offers
-- Compatibility view provided for applications that need both balances
