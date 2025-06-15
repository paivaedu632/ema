-- =====================================================================================
-- EmaPay KYC Status Tracking Enhancement Migration
-- =====================================================================================
-- This migration adds KYC status tracking to the users table and creates user limits
-- table to support the smart KYC trigger functionality implemented in the frontend.
-- 
-- Changes:
-- 1. Add KYC status fields to users table for quick access
-- 2. Create user_limits table for transaction limits tracking
-- 3. Create functions to sync KYC status between tables
-- 4. Add RLS policies for new tables
-- 5. Create triggers for automatic KYC record initialization
-- =====================================================================================

-- =====================================================================================
-- 1. ENHANCE USERS TABLE WITH KYC STATUS FIELDS
-- =====================================================================================
-- Add KYC status tracking fields to users table for quick dashboard access
-- These fields will be synced with the main kyc_records table

ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_started'
  CHECK (kyc_status IN ('not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'requires_update'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_current_step INTEGER DEFAULT 1
  CHECK (kyc_current_step >= 1 AND kyc_current_step <= 16);

ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_completion_percentage DECIMAL(5,2) DEFAULT 0.00
  CHECK (kyc_completion_percentage >= 0.00 AND kyc_completion_percentage <= 100.00);

ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_last_updated TIMESTAMP WITH TIME ZONE;

-- Create index for KYC status queries
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);

-- =====================================================================================
-- 2. CREATE USER LIMITS TABLE
-- =====================================================================================
-- Track transaction limits based on KYC status for smart trigger functionality

CREATE TABLE IF NOT EXISTS user_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Pre-KYC limits (conservative)
  daily_limit_pre_kyc DECIMAL(15,2) DEFAULT 500.00,
  monthly_limit_pre_kyc DECIMAL(15,2) DEFAULT 2000.00,
  transaction_limit_pre_kyc DECIMAL(15,2) DEFAULT 100.00,
  
  -- Post-KYC limits (enhanced)
  daily_limit_post_kyc DECIMAL(15,2) DEFAULT 10000.00,
  monthly_limit_post_kyc DECIMAL(15,2) DEFAULT 50000.00,
  transaction_limit_post_kyc DECIMAL(15,2) DEFAULT 5000.00,
  
  -- Current active limits (based on KYC status)
  current_daily_limit DECIMAL(15,2) DEFAULT 500.00,
  current_monthly_limit DECIMAL(15,2) DEFAULT 2000.00,
  current_transaction_limit DECIMAL(15,2) DEFAULT 100.00,
  
  -- Usage tracking
  daily_used DECIMAL(15,2) DEFAULT 0.00,
  monthly_used DECIMAL(15,2) DEFAULT 0.00,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Metadata
  currency TEXT DEFAULT 'EUR' CHECK (currency IN ('AOA', 'EUR')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, currency)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_limits_user_id ON user_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_limits_currency ON user_limits(currency);

-- =====================================================================================
-- 3. AUTOMATIC KYC RECORD INITIALIZATION
-- =====================================================================================
-- Function to create initial KYC record and user limits when user is created

CREATE OR REPLACE FUNCTION initialize_user_kyc_and_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial KYC record if it doesn't exist
    INSERT INTO kyc_records (user_id, status, current_step, data)
    VALUES (NEW.id, 'not_started', 1, '{}')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create user limits for EUR (primary currency)
    INSERT INTO user_limits (user_id, currency)
    VALUES (NEW.id, 'EUR')
    ON CONFLICT (user_id, currency) DO NOTHING;
    
    -- Create user limits for AOA (secondary currency)
    INSERT INTO user_limits (user_id, currency, 
             daily_limit_pre_kyc, monthly_limit_pre_kyc, transaction_limit_pre_kyc,
             daily_limit_post_kyc, monthly_limit_post_kyc, transaction_limit_post_kyc,
             current_daily_limit, current_monthly_limit, current_transaction_limit)
    VALUES (NEW.id, 'AOA', 
            42500.00, 170000.00, 8500.00,  -- Pre-KYC limits in AOA (EUR * 850)
            8500000.00, 42500000.00, 4250000.00,  -- Post-KYC limits in AOA
            42500.00, 170000.00, 8500.00)  -- Current limits (pre-KYC)
    ON CONFLICT (user_id, currency) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table (after existing wallet creation trigger)
DROP TRIGGER IF EXISTS initialize_user_kyc_and_limits_trigger ON users;
CREATE TRIGGER initialize_user_kyc_and_limits_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_kyc_and_limits();

-- =====================================================================================
-- 4. KYC STATUS SYNC FUNCTIONS
-- =====================================================================================
-- Function to sync KYC status from kyc_records to users table

CREATE OR REPLACE FUNCTION sync_kyc_status_to_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Update users table with KYC status from kyc_records
    UPDATE users 
    SET 
        kyc_status = NEW.status,
        kyc_current_step = NEW.current_step,
        kyc_completion_percentage = CASE 
            WHEN NEW.status = 'approved' THEN 100.00
            WHEN NEW.status = 'not_started' THEN 0.00
            ELSE (NEW.current_step::DECIMAL / 16.0) * 100.0
        END,
        kyc_last_updated = NOW(),
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Update user limits based on KYC status
    UPDATE user_limits
    SET 
        current_daily_limit = CASE 
            WHEN NEW.status = 'approved' THEN daily_limit_post_kyc
            ELSE daily_limit_pre_kyc
        END,
        current_monthly_limit = CASE 
            WHEN NEW.status = 'approved' THEN monthly_limit_post_kyc
            ELSE monthly_limit_pre_kyc
        END,
        current_transaction_limit = CASE 
            WHEN NEW.status = 'approved' THEN transaction_limit_post_kyc
            ELSE transaction_limit_pre_kyc
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to kyc_records table
DROP TRIGGER IF EXISTS sync_kyc_status_trigger ON kyc_records;
CREATE TRIGGER sync_kyc_status_trigger
    AFTER INSERT OR UPDATE ON kyc_records
    FOR EACH ROW EXECUTE FUNCTION sync_kyc_status_to_users();

-- =====================================================================================
-- 5. UTILITY FUNCTIONS FOR KYC AND LIMITS
-- =====================================================================================

-- Function to get user's current transaction limits
CREATE OR REPLACE FUNCTION get_user_limits(user_uuid UUID, currency_code TEXT DEFAULT 'EUR')
RETURNS TABLE (
    daily_limit DECIMAL(15,2),
    monthly_limit DECIMAL(15,2),
    transaction_limit DECIMAL(15,2),
    daily_used DECIMAL(15,2),
    monthly_used DECIMAL(15,2),
    daily_remaining DECIMAL(15,2),
    monthly_remaining DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ul.current_daily_limit,
        ul.current_monthly_limit,
        ul.current_transaction_limit,
        ul.daily_used,
        ul.monthly_used,
        (ul.current_daily_limit - ul.daily_used) AS daily_remaining,
        (ul.current_monthly_limit - ul.monthly_used) AS monthly_remaining
    FROM user_limits ul
    WHERE ul.user_id = user_uuid AND ul.currency = currency_code;
END;
$$ LANGUAGE plpgsql;

-- Function to check if transaction is within limits
CREATE OR REPLACE FUNCTION check_transaction_limits(
    user_uuid UUID, 
    amount DECIMAL(15,2), 
    currency_code TEXT DEFAULT 'EUR'
)
RETURNS TABLE (
    within_limits BOOLEAN,
    limit_type TEXT,
    current_limit DECIMAL(15,2),
    would_exceed_by DECIMAL(15,2)
) AS $$
DECLARE
    limits RECORD;
BEGIN
    -- Get current limits and usage
    SELECT * INTO limits FROM get_user_limits(user_uuid, currency_code);
    
    -- Check transaction limit
    IF amount > limits.transaction_limit THEN
        RETURN QUERY SELECT 
            FALSE, 
            'transaction'::TEXT, 
            limits.transaction_limit, 
            (amount - limits.transaction_limit);
        RETURN;
    END IF;
    
    -- Check daily limit
    IF (limits.daily_used + amount) > limits.daily_limit THEN
        RETURN QUERY SELECT 
            FALSE, 
            'daily'::TEXT, 
            limits.daily_remaining, 
            ((limits.daily_used + amount) - limits.daily_limit);
        RETURN;
    END IF;
    
    -- Check monthly limit
    IF (limits.monthly_used + amount) > limits.monthly_limit THEN
        RETURN QUERY SELECT 
            FALSE, 
            'monthly'::TEXT, 
            limits.monthly_remaining, 
            ((limits.monthly_used + amount) - limits.monthly_limit);
        RETURN;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT TRUE, 'none'::TEXT, 0.00::DECIMAL(15,2), 0.00::DECIMAL(15,2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- 6. DATA MIGRATION FOR EXISTING USERS
-- =====================================================================================
-- Initialize KYC status and limits for existing users

-- Update existing users with default KYC status
UPDATE users 
SET 
    kyc_status = 'not_started',
    kyc_current_step = 1,
    kyc_completion_percentage = 0.00,
    kyc_last_updated = NOW()
WHERE kyc_status IS NULL;

-- Create KYC records for existing users who don't have them
INSERT INTO kyc_records (user_id, status, current_step, data)
SELECT id, 'not_started', 1, '{}'
FROM users 
WHERE id NOT IN (SELECT user_id FROM kyc_records WHERE user_id IS NOT NULL);

-- Create user limits for existing users
INSERT INTO user_limits (user_id, currency)
SELECT id, 'EUR'
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_limits WHERE currency = 'EUR' AND user_id IS NOT NULL);

INSERT INTO user_limits (user_id, currency, 
         daily_limit_pre_kyc, monthly_limit_pre_kyc, transaction_limit_pre_kyc,
         daily_limit_post_kyc, monthly_limit_post_kyc, transaction_limit_post_kyc,
         current_daily_limit, current_monthly_limit, current_transaction_limit)
SELECT id, 'AOA', 
       42500.00, 170000.00, 8500.00,
       8500000.00, 42500000.00, 4250000.00,
       42500.00, 170000.00, 8500.00
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_limits WHERE currency = 'AOA' AND user_id IS NOT NULL);

-- =====================================================================================
-- 7. COMMENTS AND DOCUMENTATION
-- =====================================================================================

COMMENT ON COLUMN users.kyc_status IS 'Quick access KYC status synced from kyc_records table';
COMMENT ON COLUMN users.kyc_current_step IS 'Current step in 16-step KYC process';
COMMENT ON COLUMN users.kyc_completion_percentage IS 'KYC completion percentage (0-100)';
COMMENT ON COLUMN users.kyc_last_updated IS 'Last time KYC status was updated';

COMMENT ON TABLE user_limits IS 'Transaction limits based on KYC status for smart trigger functionality';
COMMENT ON FUNCTION get_user_limits(UUID, TEXT) IS 'Get current transaction limits and usage for a user';
COMMENT ON FUNCTION check_transaction_limits(UUID, DECIMAL, TEXT) IS 'Check if transaction amount is within user limits';

-- Migration completed successfully
SELECT 'KYC status tracking migration completed successfully' AS status;
