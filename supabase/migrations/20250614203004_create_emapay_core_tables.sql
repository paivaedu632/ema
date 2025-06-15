-- =====================================================================================
-- EmaPay Core Database Tables Migration
-- =====================================================================================
-- This migration creates the core tables for EmaPay fintech application:
-- 1. Users table (synced with Clerk authentication)
-- 2. Wallets table (AOA and EUR currency balances)
-- 3. Transactions table (buy, sell, send, deposit, withdraw)
-- 4. KYC Records table (16-step verification process)
-- 5. Documents table (KYC document management with AWS S3)
-- 6. Exchange Rates table (static rates with manual/automatic indicators)
-- =====================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- 1. USERS TABLE
-- =====================================================================================
-- Purpose: Central user registry synced with Clerk authentication
-- Key Features: Clerk integration, user profile data, audit timestamps

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add email validation constraint
ALTER TABLE users ADD CONSTRAINT valid_email
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================================================
-- 2. WALLETS TABLE
-- =====================================================================================
-- Purpose: Manage user currency balances (AOA and EUR only)
-- Key Features: Multi-currency support, balance tracking, constraints

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('AOA', 'EUR')),
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  available_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  pending_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

-- Add balance constraints (must be >= 0)
ALTER TABLE wallets ADD CONSTRAINT positive_balance CHECK (balance >= 0);
ALTER TABLE wallets ADD CONSTRAINT positive_available_balance CHECK (available_balance >= 0);
ALTER TABLE wallets ADD CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0);

-- Create indexes for performance
CREATE INDEX idx_wallets_user_currency ON wallets(user_id, currency);

-- =====================================================================================
-- 3. TRANSACTIONS TABLE
-- =====================================================================================
-- Purpose: Record all financial transactions with 2% EmaPay fee
-- Key Features: All transaction types, fee tracking, status management

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'send', 'receive', 'deposit', 'withdraw')),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('AOA', 'EUR')),
  fee_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(15,2) NOT NULL,
  exchange_rate DECIMAL(10,6),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  reference_id TEXT UNIQUE,
  recipient_info JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add amount constraints
ALTER TABLE transactions ADD CONSTRAINT positive_amount CHECK (amount > 0);
ALTER TABLE transactions ADD CONSTRAINT positive_fee_amount CHECK (fee_amount >= 0);

-- Create indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference_id ON transactions(reference_id);

-- =====================================================================================
-- 4. KYC RECORDS TABLE
-- =====================================================================================
-- Purpose: Track 16-step KYC verification process
-- Key Features: Flexible JSONB storage, AWS integration, step tracking

CREATE TABLE kyc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 16),
  data JSONB NOT NULL DEFAULT '{}',
  verification_results JSONB DEFAULT '{}',
  documents JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_kyc_records_user_id ON kyc_records(user_id);
CREATE INDEX idx_kyc_records_status ON kyc_records(status);
CREATE INDEX idx_kyc_records_step ON kyc_records(current_step);

-- =====================================================================================
-- 5. DOCUMENTS TABLE
-- =====================================================================================
-- Purpose: Manage KYC document uploads and AWS verification
-- Key Features: S3 integration, document types, verification status

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  kyc_record_id UUID REFERENCES kyc_records(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('id_front', 'id_back', 'selfie', 'proof_of_address')),
  s3_key TEXT NOT NULL,
  s3_bucket TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_results JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_kyc_record_id ON documents(kyc_record_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_verification_status ON documents(verification_status);

-- =====================================================================================
-- 6. EXCHANGE RATES TABLE
-- =====================================================================================
-- Purpose: Manage static exchange rates with manual/automatic indicators
-- Key Features: Rate management, type indicators, active status

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL CHECK (from_currency IN ('AOA', 'EUR')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('AOA', 'EUR')),
  rate DECIMAL(10,6) NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('manual', 'automatic')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, is_active)
);

-- Add rate constraints
ALTER TABLE exchange_rates ADD CONSTRAINT positive_rate CHECK (rate > 0);
ALTER TABLE exchange_rates ADD CONSTRAINT different_currencies CHECK (from_currency != to_currency);

-- Create indexes for performance
CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_active ON exchange_rates(is_active);
CREATE INDEX idx_exchange_rates_type ON exchange_rates(rate_type);