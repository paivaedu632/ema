-- EmaPay Complete Order Book Database Schema
-- This migration creates the complete professional order book trading system
-- Based on documentation: docs/emapay_backend.md
-- Status: Production Ready

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table with KYC integration
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    kyc_status TEXT DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'in_progress', 'approved', 'rejected')),
    kyc_current_step INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-currency wallets with available/reserved balance tracking
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    currency TEXT CHECK (currency IN ('AOA', 'EUR')) NOT NULL,
    available_balance DECIMAL(15,2) DEFAULT 0.00 CHECK (available_balance >= 0),
    reserved_balance DECIMAL(15,2) DEFAULT 0.00 CHECK (reserved_balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

-- Professional order book with price-time priority
CREATE TABLE IF NOT EXISTS order_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    order_type TEXT CHECK (order_type IN ('limit', 'market')) NOT NULL,
    side TEXT CHECK (side IN ('buy', 'sell')) NOT NULL,
    base_currency TEXT CHECK (base_currency IN ('AOA', 'EUR')) NOT NULL,
    quote_currency TEXT CHECK (quote_currency IN ('AOA', 'EUR')) NOT NULL,
    quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
    remaining_quantity DECIMAL(15,2) NOT NULL CHECK (remaining_quantity >= 0),
    filled_quantity DECIMAL(15,2) DEFAULT 0.00 CHECK (filled_quantity >= 0),
    price DECIMAL(10,6) CHECK (price > 0), -- NULL for market orders
    average_fill_price DECIMAL(10,6),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partially_filled', 'filled', 'cancelled')),
    reserved_amount DECIMAL(15,2) NOT NULL CHECK (reserved_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    filled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    CHECK (base_currency != quote_currency)
);

-- Fund reservations with automatic management
CREATE TABLE IF NOT EXISTS fund_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    currency TEXT CHECK (currency IN ('AOA', 'EUR')) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    reference_id UUID,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'released', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade execution tracking with dual-party recording
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buy_order_id UUID REFERENCES order_book(id) NOT NULL,
    sell_order_id UUID REFERENCES order_book(id) NOT NULL,
    buyer_id UUID REFERENCES users(id) NOT NULL,
    seller_id UUID REFERENCES users(id) NOT NULL,
    base_currency TEXT CHECK (base_currency IN ('AOA', 'EUR')) NOT NULL,
    quote_currency TEXT CHECK (quote_currency IN ('AOA', 'EUR')) NOT NULL,
    quantity DECIMAL(15,2) NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,6) NOT NULL CHECK (price > 0),
    total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount > 0),
    buyer_fee DECIMAL(15,2) DEFAULT 0.00 CHECK (buyer_fee >= 0),
    seller_fee DECIMAL(15,2) DEFAULT 0.00 CHECK (seller_fee >= 0),
    base_amount DECIMAL(15,2) NOT NULL CHECK (base_amount > 0),
    quote_amount DECIMAL(15,2) NOT NULL CHECK (quote_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- All financial transactions with dynamic fee calculation
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT CHECK (currency IN ('AOA', 'EUR')) NOT NULL,
    type TEXT CHECK (type IN ('buy', 'sell', 'send', 'deposit', 'withdraw', 'exchange_buy', 'exchange_sell')) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) NOT NULL,
    fee_amount DECIMAL(15,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2),
    user_id UUID REFERENCES users(id) NOT NULL,
    counterparty_user_id UUID REFERENCES users(id),
    exchange_rate DECIMAL(10,6),
    exchange_id TEXT,
    display_id TEXT UNIQUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dynamic fee configuration by transaction type and currency
CREATE TABLE IF NOT EXISTS fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL,
    currency TEXT CHECK (currency IN ('AOA', 'EUR')) NOT NULL,
    fee_percentage DECIMAL(5,2) DEFAULT 0.00,
    fee_fixed_amount DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16-step KYC verification workflow
CREATE TABLE IF NOT EXISTS kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 16),
    step_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'skipped')),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sequence for transaction IDs
CREATE SEQUENCE IF NOT EXISTS transaction_sequence START 1;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Order matching optimization
CREATE INDEX IF NOT EXISTS idx_order_book_matching ON order_book(base_currency, quote_currency, side, status, price, created_at);
CREATE INDEX IF NOT EXISTS idx_order_book_user_id ON order_book(user_id);
CREATE INDEX IF NOT EXISTS idx_order_book_status ON order_book(status);
CREATE INDEX IF NOT EXISTS idx_order_book_currency ON order_book(base_currency, quote_currency);
CREATE INDEX IF NOT EXISTS idx_order_book_user_orders ON order_book(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_book_price_time ON order_book(base_currency, quote_currency, side, price, created_at);

-- Trade execution indexes
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_orders ON trades(buy_order_id, sell_order_id);
CREATE INDEX IF NOT EXISTS idx_trades_currency_pair ON trades(base_currency, quote_currency, executed_at DESC);

-- Fund reservation indexes
CREATE INDEX IF NOT EXISTS idx_fund_reservations_user ON fund_reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_fund_reservations_reference ON fund_reservations(reference_id);

-- Wallet and transaction indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_currency ON wallets(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_kyc_records_user ON kyc_records(user_id, step_number);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_book_updated_at BEFORE UPDATE ON order_book FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_reservations_updated_at BEFORE UPDATE ON fund_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fees_updated_at BEFORE UPDATE ON fees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_records_updated_at BEFORE UPDATE ON kyc_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default fee configuration
INSERT INTO fees (transaction_type, currency, fee_percentage, is_active) VALUES
('buy', 'EUR', 2.00, true),
('buy', 'AOA', 2.00, true),
('sell', 'EUR', 0.00, true),
('sell', 'AOA', 0.00, true),
('send', 'EUR', 0.00, true),
('send', 'AOA', 0.00, true),
('deposit', 'EUR', 0.00, true),
('deposit', 'AOA', 0.00, true),
('withdraw', 'EUR', 0.00, true),
('withdraw', 'AOA', 0.00, true)
ON CONFLICT DO NOTHING;
