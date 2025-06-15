-- =====================================================================================
-- EmaPay Database Functions and Triggers Migration
-- =====================================================================================
-- This migration creates essential database functions and triggers for EmaPay:
-- 1. Auto-update timestamp triggers
-- 2. Transaction reference ID generation
-- 3. Wallet creation triggers
-- 4. Audit and utility functions
-- =====================================================================================

-- =====================================================================================
-- 1. AUTO-UPDATE TIMESTAMP FUNCTION
-- =====================================================================================
-- Purpose: Automatically update the updated_at column when records are modified

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables with updated_at columns
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_records_updated_at
    BEFORE UPDATE ON kyc_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- 2. TRANSACTION REFERENCE ID GENERATION
-- =====================================================================================
-- Purpose: Generate unique EmaPay transaction reference IDs (EMA + hash + timestamp)

CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_id IS NULL THEN
        NEW.reference_id = 'EMA' ||
                          UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)) ||
                          EXTRACT(EPOCH FROM NOW())::BIGINT;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to transactions table
CREATE TRIGGER generate_transaction_reference_trigger
    BEFORE INSERT ON transactions
    FOR EACH ROW EXECUTE FUNCTION generate_transaction_reference();

-- =====================================================================================
-- 3. AUTOMATIC WALLET CREATION
-- =====================================================================================
-- Purpose: Automatically create AOA and EUR wallets when a new user is created

CREATE OR REPLACE FUNCTION create_user_wallets()
RETURNS TRIGGER AS $$
BEGIN
    -- Create AOA wallet
    INSERT INTO wallets (user_id, currency, balance, available_balance, pending_balance)
    VALUES (NEW.id, 'AOA', 0.00, 0.00, 0.00);

    -- Create EUR wallet
    INSERT INTO wallets (user_id, currency, balance, available_balance, pending_balance)
    VALUES (NEW.id, 'EUR', 0.00, 0.00, 0.00);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER create_user_wallets_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_wallets();

-- =====================================================================================
-- 4. BALANCE VALIDATION FUNCTION
-- =====================================================================================
-- Purpose: Ensure wallet balances are consistent (available + pending = total)

CREATE OR REPLACE FUNCTION validate_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate that available_balance + pending_balance <= balance
    IF NEW.available_balance + NEW.pending_balance > NEW.balance THEN
        RAISE EXCEPTION 'Available balance (%) + Pending balance (%) cannot exceed total balance (%)',
            NEW.available_balance, NEW.pending_balance, NEW.balance;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to wallets table
CREATE TRIGGER validate_wallet_balance_trigger
    BEFORE INSERT OR UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION validate_wallet_balance();

-- =====================================================================================
-- 5. TRANSACTION FEE CALCULATION FUNCTION
-- =====================================================================================
-- Purpose: Calculate EmaPay 2% transaction fee and net amount

CREATE OR REPLACE FUNCTION calculate_transaction_fee()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate 2% fee for buy/sell transactions
    IF NEW.type IN ('buy', 'sell') THEN
        NEW.fee_amount = NEW.amount * 0.02;
        NEW.net_amount = NEW.amount - NEW.fee_amount;
    ELSE
        -- No fee for send, receive, deposit, withdraw
        NEW.fee_amount = 0.00;
        NEW.net_amount = NEW.amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to transactions table
CREATE TRIGGER calculate_transaction_fee_trigger
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION calculate_transaction_fee();

-- =====================================================================================
-- 6. UTILITY FUNCTIONS
-- =====================================================================================

-- Function to get user's wallet balance by currency
CREATE OR REPLACE FUNCTION get_user_balance(user_uuid UUID, currency_code TEXT)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    user_balance DECIMAL(15,2);
BEGIN
    SELECT balance INTO user_balance
    FROM wallets
    WHERE user_id = user_uuid AND currency = currency_code;

    RETURN COALESCE(user_balance, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's available balance by currency
CREATE OR REPLACE FUNCTION get_user_available_balance(user_uuid UUID, currency_code TEXT)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    available_bal DECIMAL(15,2);
BEGIN
    SELECT available_balance INTO available_bal
    FROM wallets
    WHERE user_id = user_uuid AND currency = currency_code;

    RETURN COALESCE(available_bal, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Function to get active exchange rate
CREATE OR REPLACE FUNCTION get_active_exchange_rate(from_curr TEXT, to_curr TEXT)
RETURNS DECIMAL(10,6) AS $$
DECLARE
    active_rate DECIMAL(10,6);
BEGIN
    SELECT rate INTO active_rate
    FROM exchange_rates
    WHERE from_currency = from_curr
      AND to_currency = to_curr
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN COALESCE(active_rate, 1.000000);
END;
$$ LANGUAGE plpgsql;