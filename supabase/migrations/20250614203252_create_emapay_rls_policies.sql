-- =====================================================================================
-- EmaPay Row Level Security (RLS) Policies Migration
-- =====================================================================================
-- This migration implements comprehensive Row Level Security for EmaPay:
-- 1. Enable RLS on all tables
-- 2. Create user isolation policies
-- 3. Clerk JWT integration for authentication
-- 4. Service role access for admin operations
-- =====================================================================================

-- =====================================================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- 2. USERS TABLE POLICIES
-- =====================================================================================
-- Users can only see and modify their own data

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Policy: Service role can manage all users (for admin operations)
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Policy: Allow user creation during signup
CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- =====================================================================================
-- 3. WALLETS TABLE POLICIES
-- =====================================================================================
-- Users can only access their own wallets

-- Policy: Users can view their own wallets
CREATE POLICY "Users can view own wallets" ON wallets
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Users can update their own wallets (for balance changes)
CREATE POLICY "Users can update own wallets" ON wallets
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Service role can manage all wallets
CREATE POLICY "Service role can manage wallets" ON wallets
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Policy: Allow wallet creation (triggered by user creation)
CREATE POLICY "Allow wallet creation" ON wallets
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- =====================================================================================
-- 4. TRANSACTIONS TABLE POLICIES
-- =====================================================================================
-- Users can only access their own transactions

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Users can create their own transactions
CREATE POLICY "Users can create own transactions" ON transactions
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Users can update their own transactions (status changes)
CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Service role can manage all transactions
CREATE POLICY "Service role can manage transactions" ON transactions
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- =====================================================================================
-- 5. KYC RECORDS TABLE POLICIES
-- =====================================================================================
-- Users can only access their own KYC records

-- Policy: Users can view their own KYC records
CREATE POLICY "Users can view own KYC records" ON kyc_records
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Users can create their own KYC records
CREATE POLICY "Users can create own KYC records" ON kyc_records
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Users can update their own KYC records
CREATE POLICY "Users can update own KYC records" ON kyc_records
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Service role can manage all KYC records
CREATE POLICY "Service role can manage KYC records" ON kyc_records
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- =====================================================================================
-- 6. DOCUMENTS TABLE POLICIES
-- =====================================================================================
-- Users can only access their own documents

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Users can create their own documents
CREATE POLICY "Users can create own documents" ON documents
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Users can update their own documents (verification status)
CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Policy: Service role can manage all documents
CREATE POLICY "Service role can manage documents" ON documents
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- =====================================================================================
-- 7. EXCHANGE RATES TABLE POLICIES
-- =====================================================================================
-- Exchange rates are public for reading, admin-only for writing

-- Policy: Anyone can view active exchange rates
CREATE POLICY "Anyone can view exchange rates" ON exchange_rates
  FOR SELECT USING (
    is_active = true
  );

-- Policy: Only service role can manage exchange rates
CREATE POLICY "Service role can manage exchange rates" ON exchange_rates
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- =====================================================================================
-- 8. HELPER FUNCTIONS FOR RLS
-- =====================================================================================

-- Function to get current user ID from Clerk JWT
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user owns a resource
CREATE OR REPLACE FUNCTION user_owns_resource(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN resource_user_id = get_current_user_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;