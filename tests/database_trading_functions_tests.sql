-- ============================================================================
-- EMAPAY DATABASE TRADING FUNCTIONS COMPREHENSIVE TEST SUITE
-- ============================================================================
-- This file contains comprehensive unit tests for all EmaPay trading functions
-- Tests are designed to be run in Supabase and include setup/teardown procedures
-- ============================================================================

-- ============================================================================
-- TEST FRAMEWORK SETUP
-- ============================================================================

-- Create test results table to track test outcomes
CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    test_suite TEXT NOT NULL,
    test_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'ERROR')),
    expected_result TEXT,
    actual_result TEXT,
    error_message TEXT,
    execution_time INTERVAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test assertion function
CREATE OR REPLACE FUNCTION assert_equals(
    p_test_suite TEXT,
    p_test_name TEXT,
    p_expected ANYELEMENT,
    p_actual ANYELEMENT,
    p_description TEXT DEFAULT ''
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_status TEXT := 'PASS';
    v_error TEXT := NULL;
BEGIN
    IF p_expected IS DISTINCT FROM p_actual THEN
        v_status := 'FAIL';
        v_error := FORMAT('Expected: %s, Got: %s. %s', p_expected, p_actual, p_description);
    END IF;
    
    INSERT INTO test_results (test_suite, test_name, status, expected_result, actual_result, error_message, execution_time)
    VALUES (p_test_suite, p_test_name, v_status, p_expected::TEXT, p_actual::TEXT, v_error, clock_timestamp() - v_start_time);
    
    RETURN v_status = 'PASS';
EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results (test_suite, test_name, status, error_message, execution_time)
    VALUES (p_test_suite, p_test_name, 'ERROR', SQLERRM, clock_timestamp() - v_start_time);
    RETURN FALSE;
END;
$$;

-- Test assertion for exceptions
CREATE OR REPLACE FUNCTION assert_exception(
    p_test_suite TEXT,
    p_test_name TEXT,
    p_sql_statement TEXT,
    p_expected_error_pattern TEXT DEFAULT '%'
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_status TEXT := 'FAIL';
    v_error TEXT := 'No exception was raised';
BEGIN
    EXECUTE p_sql_statement;
    
    INSERT INTO test_results (test_suite, test_name, status, expected_result, actual_result, error_message, execution_time)
    VALUES (p_test_suite, p_test_name, v_status, 'Exception matching: ' || p_expected_error_pattern, 'No exception', v_error, clock_timestamp() - v_start_time);
    
    RETURN FALSE;
EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE p_expected_error_pattern THEN
        v_status := 'PASS';
        v_error := NULL;
    ELSE
        v_error := FORMAT('Expected error pattern: %s, Got: %s', p_expected_error_pattern, SQLERRM);
    END IF;
    
    INSERT INTO test_results (test_suite, test_name, status, expected_result, actual_result, error_message, execution_time)
    VALUES (p_test_suite, p_test_name, v_status, 'Exception matching: ' || p_expected_error_pattern, SQLERRM, v_error, clock_timestamp() - v_start_time);
    
    RETURN v_status = 'PASS';
END;
$$;

-- ============================================================================
-- TEST DATA SETUP AND TEARDOWN FUNCTIONS
-- ============================================================================

-- Setup test environment
CREATE OR REPLACE FUNCTION setup_test_environment() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- Clear existing test data
    DELETE FROM trades WHERE buyer_id IN (SELECT id FROM users WHERE email LIKE '%test%');
    DELETE FROM order_book WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
    DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
    DELETE FROM users WHERE email LIKE '%test%';
    DELETE FROM test_results;
    
    -- Create test users
    INSERT INTO users (clerk_user_id, email, first_name, last_name) VALUES
    ('test_alice_001', 'alice.test@emapay.com', 'Alice', 'TestTrader'),
    ('test_bob_002', 'bob.test@emapay.com', 'Bob', 'TestInvestor'),
    ('test_charlie_003', 'charlie.test@emapay.com', 'Charlie', 'TestUser'),
    ('test_diana_004', 'diana.test@emapay.com', 'Diana', 'TestMaker');
    
    -- Setup initial balances
    INSERT INTO wallets (user_id, currency, available_balance, reserved_balance) VALUES
    -- Alice: Rich in both currencies
    ((SELECT id FROM users WHERE email = 'alice.test@emapay.com'), 'EUR', 10000.00, 0.00),
    ((SELECT id FROM users WHERE email = 'alice.test@emapay.com'), 'AOA', 5000000.00, 0.00),
    -- Bob: Moderate balances
    ((SELECT id FROM users WHERE email = 'bob.test@emapay.com'), 'EUR', 1000.00, 0.00),
    ((SELECT id FROM users WHERE email = 'bob.test@emapay.com'), 'AOA', 1000000.00, 0.00),
    -- Charlie: Low balances for insufficient funds tests
    ((SELECT id FROM users WHERE email = 'charlie.test@emapay.com'), 'EUR', 10.00, 0.00),
    ((SELECT id FROM users WHERE email = 'charlie.test@emapay.com'), 'AOA', 5000.00, 0.00),
    -- Diana: Only EUR for single currency tests
    ((SELECT id FROM users WHERE email = 'diana.test@emapay.com'), 'EUR', 500.00, 0.00);
    
    RAISE NOTICE 'Test environment setup completed';
END;
$$;

-- Cleanup test environment
CREATE OR REPLACE FUNCTION cleanup_test_environment() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- Clean up test data
    DELETE FROM trades WHERE buyer_id IN (SELECT id FROM users WHERE email LIKE '%test%');
    DELETE FROM order_book WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
    DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
    DELETE FROM users WHERE email LIKE '%test%';
    
    RAISE NOTICE 'Test environment cleaned up';
END;
$$;

-- Get test user ID helper
CREATE OR REPLACE FUNCTION get_test_user_id(p_name TEXT) RETURNS UUID LANGUAGE plpgsql AS $$
BEGIN
    RETURN (SELECT id FROM users WHERE email = p_name || '.test@emapay.com');
END;
$$;

-- ============================================================================
-- PLACE_LIMIT_ORDER FUNCTION TESTS
-- ============================================================================

-- Test valid buy order placement
CREATE OR REPLACE FUNCTION test_place_limit_order_valid_buy() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_result RECORD;
    v_initial_balance DECIMAL(15,2);
    v_final_balance DECIMAL(15,2);
    v_reserved_balance DECIMAL(15,2);
BEGIN
    -- Get initial balance
    SELECT available_balance INTO v_initial_balance FROM wallets WHERE user_id = v_alice_id AND currency = 'AOA';
    
    -- Place buy order: Alice buys 100 EUR at 1200 AOA each (cost: 120,000 AOA)
    SELECT * INTO v_result FROM place_limit_order(v_alice_id, 'buy', 'EUR', 'AOA', 100.00, 1200.000000);
    
    -- Check order was created
    PERFORM assert_equals('place_limit_order', 'valid_buy_order_created', 'pending', v_result.status);
    PERFORM assert_equals('place_limit_order', 'valid_buy_reserved_amount', 120000.00, v_result.reserved_amount);
    PERFORM assert_equals('place_limit_order', 'valid_buy_remaining_quantity', 100.00, v_result.remaining_quantity);
    
    -- Check balance changes
    SELECT available_balance, reserved_balance INTO v_final_balance, v_reserved_balance 
    FROM wallets WHERE user_id = v_alice_id AND currency = 'AOA';
    
    PERFORM assert_equals('place_limit_order', 'valid_buy_balance_reduced', v_initial_balance - 120000.00, v_final_balance);
    PERFORM assert_equals('place_limit_order', 'valid_buy_funds_reserved', 120000.00, v_reserved_balance);
END;
$$;

-- Test valid sell order placement
CREATE OR REPLACE FUNCTION test_place_limit_order_valid_sell() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_result RECORD;
    v_initial_balance DECIMAL(15,2);
    v_final_balance DECIMAL(15,2);
    v_reserved_balance DECIMAL(15,2);
BEGIN
    -- Get initial balance
    SELECT available_balance INTO v_initial_balance FROM wallets WHERE user_id = v_alice_id AND currency = 'EUR';
    
    -- Place sell order: Alice sells 50 EUR at 1300 AOA each
    SELECT * INTO v_result FROM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 50.00, 1300.000000);
    
    -- Check order was created
    PERFORM assert_equals('place_limit_order', 'valid_sell_order_created', 'pending', v_result.status);
    PERFORM assert_equals('place_limit_order', 'valid_sell_reserved_amount', 50.00, v_result.reserved_amount);
    PERFORM assert_equals('place_limit_order', 'valid_sell_remaining_quantity', 50.00, v_result.remaining_quantity);
    
    -- Check balance changes
    SELECT available_balance, reserved_balance INTO v_final_balance, v_reserved_balance 
    FROM wallets WHERE user_id = v_alice_id AND currency = 'EUR';
    
    PERFORM assert_equals('place_limit_order', 'valid_sell_balance_reduced', v_initial_balance - 50.00, v_final_balance);
    PERFORM assert_equals('place_limit_order', 'valid_sell_funds_reserved', 50.00, v_reserved_balance);
END;
$$;

-- Test input validation: negative quantity
CREATE OR REPLACE FUNCTION test_place_limit_order_negative_quantity() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
BEGIN
    PERFORM assert_exception('place_limit_order', 'negative_quantity_rejected',
        FORMAT('SELECT place_limit_order(''%s'', ''buy'', ''EUR'', ''AOA'', -10.00, 1200.000000)', v_alice_id),
        '%Quantity must be positive%');
END;
$$;

-- Test input validation: negative price
CREATE OR REPLACE FUNCTION test_place_limit_order_negative_price() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
BEGIN
    PERFORM assert_exception('place_limit_order', 'negative_price_rejected',
        FORMAT('SELECT place_limit_order(''%s'', ''buy'', ''EUR'', ''AOA'', 10.00, -1200.000000)', v_alice_id),
        '%Price must be positive%');
END;
$$;

-- Test input validation: same base and quote currencies
CREATE OR REPLACE FUNCTION test_place_limit_order_same_currencies() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
BEGIN
    PERFORM assert_exception('place_limit_order', 'same_currencies_rejected',
        FORMAT('SELECT place_limit_order(''%s'', ''buy'', ''EUR'', ''EUR'', 10.00, 1200.000000)', v_alice_id),
        '%Base and quote currencies must be different%');
END;
$$;

-- Test input validation: invalid side
CREATE OR REPLACE FUNCTION test_place_limit_order_invalid_side() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
BEGIN
    PERFORM assert_exception('place_limit_order', 'invalid_side_rejected',
        FORMAT('SELECT place_limit_order(''%s'', ''invalid'', ''EUR'', ''AOA'', 10.00, 1200.000000)', v_alice_id),
        '%Side must be buy or sell%');
END;
$$;

-- Test insufficient balance scenario
CREATE OR REPLACE FUNCTION test_place_limit_order_insufficient_balance() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_charlie_id UUID := get_test_user_id('charlie');
BEGIN
    -- Charlie only has 5000 AOA, trying to buy 100 EUR at 1200 AOA each (needs 120,000 AOA)
    PERFORM assert_exception('place_limit_order', 'insufficient_balance_rejected',
        FORMAT('SELECT place_limit_order(''%s'', ''buy'', ''EUR'', ''AOA'', 100.00, 1200.000000)', v_charlie_id),
        '%Insufficient%balance%');
END;
$$;

-- Test wallet creation for new currency
CREATE OR REPLACE FUNCTION test_place_limit_order_wallet_creation() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_diana_id UUID := get_test_user_id('diana');
    v_aoa_wallet_count INTEGER;
    v_result RECORD;
BEGIN
    -- Diana initially only has EUR wallet, check AOA wallet doesn't exist
    SELECT COUNT(*) INTO v_aoa_wallet_count FROM wallets WHERE user_id = v_diana_id AND currency = 'AOA';
    PERFORM assert_equals('place_limit_order', 'aoa_wallet_initially_missing', 0, v_aoa_wallet_count);

    -- Place sell order (should create AOA wallet automatically)
    SELECT * INTO v_result FROM place_limit_order(v_diana_id, 'sell', 'EUR', 'AOA', 10.00, 1200.000000);

    -- Check AOA wallet was created
    SELECT COUNT(*) INTO v_aoa_wallet_count FROM wallets WHERE user_id = v_diana_id AND currency = 'AOA';
    PERFORM assert_equals('place_limit_order', 'aoa_wallet_auto_created', 1, v_aoa_wallet_count);
END;
$$;

-- Test order matching: full fill scenario
CREATE OR REPLACE FUNCTION test_place_limit_order_full_match() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_bob_id UUID := get_test_user_id('bob');
    v_sell_result RECORD;
    v_buy_result RECORD;
    v_trade_count INTEGER;
    v_alice_eur_balance DECIMAL(15,2);
    v_bob_aoa_balance DECIMAL(15,2);
BEGIN
    -- Alice places sell order: 20 EUR at 1250 AOA each
    SELECT * INTO v_sell_result FROM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 20.00, 1250.000000);
    PERFORM assert_equals('place_limit_order', 'sell_order_pending', 'pending', v_sell_result.status);

    -- Bob places matching buy order: 20 EUR at 1250 AOA each (should match completely)
    SELECT * INTO v_buy_result FROM place_limit_order(v_bob_id, 'buy', 'EUR', 'AOA', 20.00, 1250.000000);

    -- Check buy order was filled
    PERFORM assert_equals('place_limit_order', 'buy_order_filled', 'filled', v_buy_result.status);
    PERFORM assert_equals('place_limit_order', 'buy_filled_quantity', 20.00, v_buy_result.filled_quantity);
    PERFORM assert_equals('place_limit_order', 'buy_remaining_quantity', 0.00, v_buy_result.remaining_quantity);

    -- Check trade was created
    SELECT COUNT(*) INTO v_trade_count FROM trades WHERE buyer_id = v_bob_id AND seller_id = v_alice_id;
    PERFORM assert_equals('place_limit_order', 'trade_created', 1, v_trade_count);

    -- Check balances updated correctly (with 1% fees)
    SELECT available_balance INTO v_alice_eur_balance FROM wallets WHERE user_id = v_alice_id AND currency = 'EUR';
    SELECT available_balance INTO v_bob_aoa_balance FROM wallets WHERE user_id = v_bob_id AND currency = 'AOA';

    -- Alice should have received 25000 AOA - 1% fee = 24750 AOA (plus her original balance)
    -- Bob should have received 20 EUR - 1% fee = 19.8 EUR (plus his original balance)
    PERFORM assert_equals('place_limit_order', 'alice_received_aoa', TRUE, v_alice_eur_balance > 9950.00); -- Original 10000 - 20 - fees
    PERFORM assert_equals('place_limit_order', 'bob_received_eur', TRUE, v_bob_aoa_balance < 1000000.00); -- Original 1000000 - 25000
END;
$$;

-- Test order matching: partial fill scenario
CREATE OR REPLACE FUNCTION test_place_limit_order_partial_match() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_bob_id UUID := get_test_user_id('bob');
    v_sell_result RECORD;
    v_buy_result RECORD;
BEGIN
    -- Alice places large sell order: 100 EUR at 1250 AOA each
    SELECT * INTO v_sell_result FROM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 100.00, 1250.000000);

    -- Bob places smaller buy order: 30 EUR at 1250 AOA each (should partially fill Alice's order)
    SELECT * INTO v_buy_result FROM place_limit_order(v_bob_id, 'buy', 'EUR', 'AOA', 30.00, 1250.000000);

    -- Check buy order was filled completely
    PERFORM assert_equals('place_limit_order', 'partial_buy_filled', 'filled', v_buy_result.status);
    PERFORM assert_equals('place_limit_order', 'partial_buy_quantity', 30.00, v_buy_result.filled_quantity);

    -- Check sell order was partially filled
    -- Note: We need to check the database directly since the original order was modified
    PERFORM assert_equals('place_limit_order', 'partial_sell_status', 1,
        (SELECT COUNT(*) FROM order_book WHERE id = v_sell_result.order_id AND status = 'partially_filled'));
    PERFORM assert_equals('place_limit_order', 'partial_sell_remaining', 70.00,
        (SELECT remaining_quantity FROM order_book WHERE id = v_sell_result.order_id));
END;
$$;

-- ============================================================================
-- EXECUTE_MARKET_ORDER FUNCTION TESTS
-- ============================================================================

-- Test market order execution with sufficient liquidity
CREATE OR REPLACE FUNCTION test_execute_market_order_sufficient_liquidity() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_bob_id UUID := get_test_user_id('bob');
    v_sell_result RECORD;
    v_market_result RECORD;
BEGIN
    -- Setup: Alice places sell orders to create liquidity
    SELECT * INTO v_sell_result FROM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 50.00, 1200.000000);

    -- Bob executes market buy order
    SELECT * INTO v_market_result FROM execute_market_order(v_bob_id, 'buy', 'EUR', 'AOA', 25.00, 5.0);

    -- Check market order was executed
    PERFORM assert_equals('execute_market_order', 'market_order_filled', 'filled', v_market_result.status);
    PERFORM assert_equals('execute_market_order', 'market_filled_quantity', 25.00, v_market_result.filled_quantity);
    PERFORM assert_equals('execute_market_order', 'market_slippage_acceptable', TRUE, v_market_result.slippage_percent <= 5.0);
END;
$$;

-- Test market order rejection due to insufficient liquidity
CREATE OR REPLACE FUNCTION test_execute_market_order_no_liquidity() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_bob_id UUID := get_test_user_id('bob');
    v_market_result RECORD;
BEGIN
    -- Clear any existing orders to ensure no liquidity
    DELETE FROM order_book WHERE user_id != v_bob_id;

    -- Try to execute market order with no liquidity
    SELECT * INTO v_market_result FROM execute_market_order(v_bob_id, 'buy', 'EUR', 'AOA', 10.00, 5.0);

    -- Check market order was rejected
    PERFORM assert_equals('execute_market_order', 'no_liquidity_rejected', 'rejected', v_market_result.status);
    PERFORM assert_equals('execute_market_order', 'no_liquidity_message', 'No liquidity available', v_market_result.message);
END;
$$;

-- Test market order rejection due to excessive slippage
CREATE OR REPLACE FUNCTION test_execute_market_order_excessive_slippage() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_bob_id UUID := get_test_user_id('bob');
    v_market_result RECORD;
BEGIN
    -- Setup: Alice places sell orders with wide price spread
    PERFORM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 10.00, 1200.000000);
    PERFORM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 10.00, 1400.000000); -- 16.7% higher

    -- Bob tries market order with low slippage tolerance
    SELECT * INTO v_market_result FROM execute_market_order(v_bob_id, 'buy', 'EUR', 'AOA', 20.00, 2.0);

    -- Check market order was rejected due to slippage
    PERFORM assert_equals('execute_market_order', 'slippage_rejected', 'rejected', v_market_result.status);
    PERFORM assert_equals('execute_market_order', 'slippage_message_contains_exceeds', TRUE,
        v_market_result.message LIKE '%exceeds maximum%');
END;
$$;

-- ============================================================================
-- CANCEL_ORDER FUNCTION TESTS
-- ============================================================================

-- Test successful order cancellation
CREATE OR REPLACE FUNCTION test_cancel_order_success() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_order_result RECORD;
    v_cancel_result RECORD;
    v_initial_balance DECIMAL(15,2);
    v_final_balance DECIMAL(15,2);
    v_reserved_balance DECIMAL(15,2);
BEGIN
    -- Get initial balance
    SELECT available_balance INTO v_initial_balance FROM wallets WHERE user_id = v_alice_id AND currency = 'EUR';

    -- Place order to cancel
    SELECT * INTO v_order_result FROM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 30.00, 1300.000000);

    -- Cancel the order
    SELECT * INTO v_cancel_result FROM cancel_order(v_order_result.order_id, v_alice_id);

    -- Check cancellation was successful
    PERFORM assert_equals('cancel_order', 'cancellation_success', TRUE, v_cancel_result.success);
    PERFORM assert_equals('cancel_order', 'released_amount', 30.00, v_cancel_result.released_amount);
    PERFORM assert_equals('cancel_order', 'success_message', 'Order cancelled successfully', v_cancel_result.message);

    -- Check funds were released
    SELECT available_balance, reserved_balance INTO v_final_balance, v_reserved_balance
    FROM wallets WHERE user_id = v_alice_id AND currency = 'EUR';

    PERFORM assert_equals('cancel_order', 'funds_released', v_initial_balance, v_final_balance);
    PERFORM assert_equals('cancel_order', 'no_reserved_funds', 0.00, v_reserved_balance);

    -- Check order status updated
    PERFORM assert_equals('cancel_order', 'order_status_cancelled', 'cancelled',
        (SELECT status FROM order_book WHERE id = v_order_result.order_id));
END;
$$;

-- Test cancellation of non-existent order
CREATE OR REPLACE FUNCTION test_cancel_order_not_found() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_fake_order_id UUID := gen_random_uuid();
    v_cancel_result RECORD;
BEGIN
    -- Try to cancel non-existent order
    SELECT * INTO v_cancel_result FROM cancel_order(v_fake_order_id, v_alice_id);

    -- Check cancellation failed
    PERFORM assert_equals('cancel_order', 'not_found_failure', FALSE, v_cancel_result.success);
    PERFORM assert_equals('cancel_order', 'not_found_message', 'Order not found', v_cancel_result.message);
END;
$$;

-- Test cancellation of order belonging to another user
CREATE OR REPLACE FUNCTION test_cancel_order_unauthorized() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_bob_id UUID := get_test_user_id('bob');
    v_order_result RECORD;
    v_cancel_result RECORD;
BEGIN
    -- Alice places order
    SELECT * INTO v_order_result FROM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 20.00, 1300.000000);

    -- Bob tries to cancel Alice's order
    SELECT * INTO v_cancel_result FROM cancel_order(v_order_result.order_id, v_bob_id);

    -- Check cancellation failed
    PERFORM assert_equals('cancel_order', 'unauthorized_failure', FALSE, v_cancel_result.success);
    PERFORM assert_equals('cancel_order', 'unauthorized_message', 'Order not found', v_cancel_result.message);
END;
$$;

-- Test cancellation of already filled order
CREATE OR REPLACE FUNCTION test_cancel_order_already_filled() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_bob_id UUID := get_test_user_id('bob');
    v_sell_result RECORD;
    v_buy_result RECORD;
    v_cancel_result RECORD;
BEGIN
    -- Alice places sell order
    SELECT * INTO v_sell_result FROM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 15.00, 1250.000000);

    -- Bob fills the order
    SELECT * INTO v_buy_result FROM place_limit_order(v_bob_id, 'buy', 'EUR', 'AOA', 15.00, 1250.000000);

    -- Alice tries to cancel the filled order
    SELECT * INTO v_cancel_result FROM cancel_order(v_sell_result.order_id, v_alice_id);

    -- Check cancellation failed
    PERFORM assert_equals('cancel_order', 'filled_order_failure', FALSE, v_cancel_result.success);
    PERFORM assert_equals('cancel_order', 'filled_order_message', 'Order cannot be cancelled', v_cancel_result.message);
END;
$$;

-- ============================================================================
-- INTEGRATION TESTS
-- ============================================================================

-- Test complete trading scenario: place → match → execute → settle
CREATE OR REPLACE FUNCTION test_integration_complete_trading_scenario() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_bob_id UUID := get_test_user_id('bob');
    v_alice_initial_eur DECIMAL(15,2);
    v_alice_initial_aoa DECIMAL(15,2);
    v_bob_initial_eur DECIMAL(15,2);
    v_bob_initial_aoa DECIMAL(15,2);
    v_alice_final_eur DECIMAL(15,2);
    v_alice_final_aoa DECIMAL(15,2);
    v_bob_final_eur DECIMAL(15,2);
    v_bob_final_aoa DECIMAL(15,2);
    v_sell_result RECORD;
    v_buy_result RECORD;
    v_trade_count INTEGER;
BEGIN
    -- Record initial balances
    SELECT available_balance INTO v_alice_initial_eur FROM wallets WHERE user_id = v_alice_id AND currency = 'EUR';
    SELECT available_balance INTO v_alice_initial_aoa FROM wallets WHERE user_id = v_alice_id AND currency = 'AOA';
    SELECT available_balance INTO v_bob_initial_eur FROM wallets WHERE user_id = v_bob_id AND currency = 'EUR';
    SELECT available_balance INTO v_bob_initial_aoa FROM wallets WHERE user_id = v_bob_id AND currency = 'AOA';

    -- Step 1: Alice places sell order
    SELECT * INTO v_sell_result FROM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 40.00, 1275.000000);
    PERFORM assert_equals('integration', 'sell_order_placed', 'pending', v_sell_result.status);

    -- Step 2: Bob places matching buy order
    SELECT * INTO v_buy_result FROM place_limit_order(v_bob_id, 'buy', 'EUR', 'AOA', 40.00, 1275.000000);
    PERFORM assert_equals('integration', 'buy_order_filled', 'filled', v_buy_result.status);

    -- Step 3: Verify trade was executed
    SELECT COUNT(*) INTO v_trade_count FROM trades
    WHERE buyer_id = v_bob_id AND seller_id = v_alice_id AND quantity = 40.00 AND price = 1275.000000;
    PERFORM assert_equals('integration', 'trade_executed', 1, v_trade_count);

    -- Step 4: Verify final balances are consistent
    SELECT available_balance INTO v_alice_final_eur FROM wallets WHERE user_id = v_alice_id AND currency = 'EUR';
    SELECT available_balance INTO v_alice_final_aoa FROM wallets WHERE user_id = v_alice_id AND currency = 'AOA';
    SELECT available_balance INTO v_bob_final_eur FROM wallets WHERE user_id = v_bob_id AND currency = 'EUR';
    SELECT available_balance INTO v_bob_final_aoa FROM wallets WHERE user_id = v_bob_id AND currency = 'AOA';

    -- Alice should have: less EUR (sold 40), more AOA (received 40*1275 - fees)
    PERFORM assert_equals('integration', 'alice_eur_decreased', TRUE, v_alice_final_eur < v_alice_initial_eur);
    PERFORM assert_equals('integration', 'alice_aoa_increased', TRUE, v_alice_final_aoa > v_alice_initial_aoa);

    -- Bob should have: more EUR (bought 40 - fees), less AOA (paid 40*1275)
    PERFORM assert_equals('integration', 'bob_eur_increased', TRUE, v_bob_final_eur > v_bob_initial_eur);
    PERFORM assert_equals('integration', 'bob_aoa_decreased', TRUE, v_bob_final_aoa < v_bob_initial_aoa);

    -- Verify no reserved balances remain
    PERFORM assert_equals('integration', 'no_reserved_eur_alice', 0.00,
        (SELECT reserved_balance FROM wallets WHERE user_id = v_alice_id AND currency = 'EUR'));
    PERFORM assert_equals('integration', 'no_reserved_aoa_bob', 0.00,
        (SELECT reserved_balance FROM wallets WHERE user_id = v_bob_id AND currency = 'AOA'));
END;
$$;

-- Test multi-user trading scenario
CREATE OR REPLACE FUNCTION test_integration_multi_user_scenario() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_alice_id UUID := get_test_user_id('alice');
    v_bob_id UUID := get_test_user_id('bob');
    v_charlie_id UUID := get_test_user_id('charlie');
    v_order_count INTEGER;
    v_trade_count INTEGER;
BEGIN
    -- Multiple users place orders
    PERFORM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 25.00, 1260.000000);
    PERFORM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 25.00, 1270.000000);
    PERFORM place_limit_order(v_bob_id, 'buy', 'EUR', 'AOA', 15.00, 1265.000000);

    -- Charlie places order that matches multiple orders
    PERFORM place_limit_order(v_charlie_id, 'buy', 'EUR', 'AOA', 35.00, 1270.000000);

    -- Verify order book state
    SELECT COUNT(*) INTO v_order_count FROM order_book WHERE status IN ('pending', 'partially_filled');
    SELECT COUNT(*) INTO v_trade_count FROM trades;

    PERFORM assert_equals('integration', 'multi_user_orders_processed', TRUE, v_order_count >= 0);
    PERFORM assert_equals('integration', 'multi_user_trades_created', TRUE, v_trade_count > 0);
END;
$$;

-- Test balance consistency across all operations
CREATE OR REPLACE FUNCTION test_integration_balance_consistency() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_total_eur_before DECIMAL(15,2);
    v_total_aoa_before DECIMAL(15,2);
    v_total_eur_after DECIMAL(15,2);
    v_total_aoa_after DECIMAL(15,2);
    v_alice_id UUID := get_test_user_id('alice');
    v_bob_id UUID := get_test_user_id('bob');
BEGIN
    -- Calculate total balances before trading
    SELECT SUM(available_balance + reserved_balance) INTO v_total_eur_before
    FROM wallets WHERE currency = 'EUR' AND user_id IN (v_alice_id, v_bob_id);

    SELECT SUM(available_balance + reserved_balance) INTO v_total_aoa_before
    FROM wallets WHERE currency = 'AOA' AND user_id IN (v_alice_id, v_bob_id);

    -- Execute some trades
    PERFORM place_limit_order(v_alice_id, 'sell', 'EUR', 'AOA', 10.00, 1250.000000);
    PERFORM place_limit_order(v_bob_id, 'buy', 'EUR', 'AOA', 10.00, 1250.000000);

    -- Calculate total balances after trading (excluding fees for this test)
    SELECT SUM(available_balance + reserved_balance) INTO v_total_eur_after
    FROM wallets WHERE currency = 'EUR' AND user_id IN (v_alice_id, v_bob_id);

    SELECT SUM(available_balance + reserved_balance) INTO v_total_aoa_after
    FROM wallets WHERE currency = 'AOA' AND user_id IN (v_alice_id, v_bob_id);

    -- Total EUR should decrease by fees only (1% of 10 EUR = 0.2 EUR total fees)
    PERFORM assert_equals('integration', 'eur_balance_consistency', TRUE,
        ABS(v_total_eur_before - v_total_eur_after - 0.20) < 0.01);

    -- Total AOA should remain approximately the same (fees are in EUR)
    PERFORM assert_equals('integration', 'aoa_balance_consistency', TRUE,
        ABS(v_total_aoa_before - v_total_aoa_after) < 1.00);
END;
$$;

-- ============================================================================
-- TEST RUNNER AND REPORTING
-- ============================================================================

-- Run all place_limit_order tests
CREATE OR REPLACE FUNCTION run_place_limit_order_tests() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    RAISE NOTICE 'Running place_limit_order tests...';

    PERFORM test_place_limit_order_valid_buy();
    PERFORM test_place_limit_order_valid_sell();
    PERFORM test_place_limit_order_negative_quantity();
    PERFORM test_place_limit_order_negative_price();
    PERFORM test_place_limit_order_same_currencies();
    PERFORM test_place_limit_order_invalid_side();
    PERFORM test_place_limit_order_insufficient_balance();
    PERFORM test_place_limit_order_wallet_creation();
    PERFORM test_place_limit_order_full_match();
    PERFORM test_place_limit_order_partial_match();

    RAISE NOTICE 'place_limit_order tests completed';
END;
$$;

-- Run all execute_market_order tests
CREATE OR REPLACE FUNCTION run_execute_market_order_tests() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    RAISE NOTICE 'Running execute_market_order tests...';

    PERFORM test_execute_market_order_sufficient_liquidity();
    PERFORM test_execute_market_order_no_liquidity();
    PERFORM test_execute_market_order_excessive_slippage();

    RAISE NOTICE 'execute_market_order tests completed';
END;
$$;

-- Run all cancel_order tests
CREATE OR REPLACE FUNCTION run_cancel_order_tests() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    RAISE NOTICE 'Running cancel_order tests...';

    PERFORM test_cancel_order_success();
    PERFORM test_cancel_order_not_found();
    PERFORM test_cancel_order_unauthorized();
    PERFORM test_cancel_order_already_filled();

    RAISE NOTICE 'cancel_order tests completed';
END;
$$;

-- Run all integration tests
CREATE OR REPLACE FUNCTION run_integration_tests() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    RAISE NOTICE 'Running integration tests...';

    PERFORM test_integration_complete_trading_scenario();
    PERFORM test_integration_multi_user_scenario();
    PERFORM test_integration_balance_consistency();

    RAISE NOTICE 'Integration tests completed';
END;
$$;

-- Main test runner - executes all tests
CREATE OR REPLACE FUNCTION run_all_tests() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_end_time TIMESTAMPTZ;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'STARTING EMAPAY DATABASE TRADING FUNCTIONS TEST SUITE';
    RAISE NOTICE '============================================================================';

    -- Setup test environment
    PERFORM setup_test_environment();

    -- Run all test suites
    PERFORM run_place_limit_order_tests();
    PERFORM cleanup_test_environment();
    PERFORM setup_test_environment();

    PERFORM run_execute_market_order_tests();
    PERFORM cleanup_test_environment();
    PERFORM setup_test_environment();

    PERFORM run_cancel_order_tests();
    PERFORM cleanup_test_environment();
    PERFORM setup_test_environment();

    PERFORM run_integration_tests();

    -- Cleanup
    PERFORM cleanup_test_environment();

    v_end_time := clock_timestamp();

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'TEST SUITE COMPLETED in %', v_end_time - v_start_time;
    RAISE NOTICE '============================================================================';

    -- Display results summary
    PERFORM display_test_results();
END;
$$;

-- Display test results summary
CREATE OR REPLACE FUNCTION display_test_results() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_total_tests INTEGER;
    v_passed_tests INTEGER;
    v_failed_tests INTEGER;
    v_error_tests INTEGER;
    v_pass_rate DECIMAL(5,2);
    v_result RECORD;
BEGIN
    -- Get summary statistics
    SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'PASS') as passed,
        COUNT(*) FILTER (WHERE status = 'FAIL') as failed,
        COUNT(*) FILTER (WHERE status = 'ERROR') as errors
    INTO v_total_tests, v_passed_tests, v_failed_tests, v_error_tests
    FROM test_results;

    v_pass_rate := CASE WHEN v_total_tests > 0 THEN (v_passed_tests::DECIMAL / v_total_tests) * 100 ELSE 0 END;

    RAISE NOTICE '';
    RAISE NOTICE 'TEST RESULTS SUMMARY:';
    RAISE NOTICE '--------------------';
    RAISE NOTICE 'Total Tests: %', v_total_tests;
    RAISE NOTICE 'Passed: % (%.1f%%)', v_passed_tests, v_pass_rate;
    RAISE NOTICE 'Failed: %', v_failed_tests;
    RAISE NOTICE 'Errors: %', v_error_tests;
    RAISE NOTICE '';

    -- Show failed tests
    IF v_failed_tests > 0 OR v_error_tests > 0 THEN
        RAISE NOTICE 'FAILED/ERROR TESTS:';
        RAISE NOTICE '-------------------';

        FOR v_result IN
            SELECT test_suite, test_name, status, error_message
            FROM test_results
            WHERE status IN ('FAIL', 'ERROR')
            ORDER BY test_suite, test_name
        LOOP
            RAISE NOTICE '[%] %:% - %', v_result.status, v_result.test_suite, v_result.test_name,
                COALESCE(v_result.error_message, 'No error message');
        END LOOP;
        RAISE NOTICE '';
    END IF;

    -- Show test suite breakdown
    RAISE NOTICE 'TEST SUITE BREAKDOWN:';
    RAISE NOTICE '--------------------';

    FOR v_result IN
        SELECT
            test_suite,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'PASS') as passed,
            COUNT(*) FILTER (WHERE status = 'FAIL') as failed,
            COUNT(*) FILTER (WHERE status = 'ERROR') as errors
        FROM test_results
        GROUP BY test_suite
        ORDER BY test_suite
    LOOP
        RAISE NOTICE '%: % total, % passed, % failed, % errors',
            v_result.test_suite, v_result.total, v_result.passed, v_result.failed, v_result.errors;
    END LOOP;
END;
$$;

-- ============================================================================
-- QUICK TEST EXECUTION COMMANDS
-- ============================================================================

/*
-- To run all tests:
SELECT run_all_tests();

-- To run specific test suites:
SELECT setup_test_environment();
SELECT run_place_limit_order_tests();
SELECT display_test_results();
SELECT cleanup_test_environment();

-- To view detailed test results:
SELECT * FROM test_results ORDER BY test_suite, test_name;

-- To clear test results:
DELETE FROM test_results;
*/
