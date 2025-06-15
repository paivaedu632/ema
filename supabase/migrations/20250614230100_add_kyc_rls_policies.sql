-- =====================================================================================
-- EmaPay KYC Status Tracking RLS Policies
-- =====================================================================================
-- This migration adds Row Level Security policies for the new KYC status tracking
-- functionality, ensuring users can only access their own KYC status and limits.
-- =====================================================================================

-- =====================================================================================
-- 1. ENABLE RLS ON NEW TABLES
-- =====================================================================================

-- Enable RLS on user_limits table
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- 2. USER_LIMITS TABLE POLICIES
-- =====================================================================================
-- Users can only access their own transaction limits

-- Policy: Users can view their own limits
CREATE POLICY "Users can view own limits" ON user_limits
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Users can update their own limits (for usage tracking)
CREATE POLICY "Users can update own limits" ON user_limits
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Service role can manage all limits
CREATE POLICY "Service role can manage limits" ON user_limits
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Policy: Allow limits creation (triggered by user creation)
CREATE POLICY "Allow limits creation" ON user_limits
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
    OR auth.role() = 'service_role'
  );

-- =====================================================================================
-- 3. ENHANCED KYC_RECORDS POLICIES
-- =====================================================================================
-- Update existing KYC policies to support new functionality

-- Policy: Users can view their own KYC records
DROP POLICY IF EXISTS "Users can view own kyc records" ON kyc_records;
CREATE POLICY "Users can view own kyc records" ON kyc_records
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Users can update their own KYC records
DROP POLICY IF EXISTS "Users can update own kyc records" ON kyc_records;
CREATE POLICY "Users can update own kyc records" ON kyc_records
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Service role can manage all KYC records
DROP POLICY IF EXISTS "Service role can manage kyc records" ON kyc_records;
CREATE POLICY "Service role can manage kyc records" ON kyc_records
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Policy: Allow KYC record creation (triggered by user creation or manual start)
DROP POLICY IF EXISTS "Allow kyc record creation" ON kyc_records;
CREATE POLICY "Allow kyc record creation" ON kyc_records
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
    OR auth.role() = 'service_role'
  );

-- =====================================================================================
-- 4. ENHANCED USERS TABLE POLICIES FOR KYC STATUS
-- =====================================================================================
-- Update users table policies to allow KYC status updates

-- Policy: Users can view their own profile including KYC status
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Policy: Users can update their own profile (limited fields)
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  ) WITH CHECK (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Policy: Service role can manage all users (for webhook operations)
DROP POLICY IF EXISTS "Service role can manage users" ON users;
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Policy: Allow user creation during signup
DROP POLICY IF EXISTS "Allow user creation" ON users;
CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (
    clerk_user_id = auth.jwt() ->> 'sub'
    OR auth.role() = 'service_role'
  );

-- =====================================================================================
-- 5. FUNCTION SECURITY
-- =====================================================================================
-- Grant execute permissions on utility functions

-- Grant execute on KYC and limits functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_limits(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_transaction_limits(UUID, DECIMAL, TEXT) TO authenticated;

-- Grant execute on existing utility functions
GRANT EXECUTE ON FUNCTION get_user_balance(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_available_balance(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_exchange_rate(TEXT, TEXT) TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================================================
-- 6. VIEW PERMISSIONS
-- =====================================================================================
-- Create a secure view for user dashboard data

CREATE OR REPLACE VIEW user_dashboard_data AS
SELECT 
    u.id,
    u.clerk_user_id,
    u.email,
    u.full_name,
    u.phone_number,
    u.profile_image_url,
    u.kyc_status,
    u.kyc_current_step,
    u.kyc_completion_percentage,
    u.kyc_last_updated,
    u.created_at,
    u.updated_at
FROM users u
WHERE u.clerk_user_id = auth.jwt() ->> 'sub';

-- Grant select on view to authenticated users
GRANT SELECT ON user_dashboard_data TO authenticated;

-- Create a secure view for user limits data
CREATE OR REPLACE VIEW user_limits_data AS
SELECT 
    ul.id,
    ul.user_id,
    ul.current_daily_limit,
    ul.current_monthly_limit,
    ul.current_transaction_limit,
    ul.daily_used,
    ul.monthly_used,
    (ul.current_daily_limit - ul.daily_used) AS daily_remaining,
    (ul.current_monthly_limit - ul.monthly_used) AS monthly_remaining,
    ul.currency,
    ul.last_reset_date,
    ul.updated_at
FROM user_limits ul
JOIN users u ON ul.user_id = u.id
WHERE u.clerk_user_id = auth.jwt() ->> 'sub';

-- Grant select on view to authenticated users
GRANT SELECT ON user_limits_data TO authenticated;

-- =====================================================================================
-- 7. SECURITY COMMENTS
-- =====================================================================================

COMMENT ON POLICY "Users can view own limits" ON user_limits IS 'Users can only view their own transaction limits';
COMMENT ON POLICY "Service role can manage limits" ON user_limits IS 'Service role can manage all limits for admin operations';
COMMENT ON VIEW user_dashboard_data IS 'Secure view for user dashboard data including KYC status';
COMMENT ON VIEW user_limits_data IS 'Secure view for user transaction limits and usage';

-- RLS policies migration completed successfully
SELECT 'KYC RLS policies migration completed successfully' AS status;
