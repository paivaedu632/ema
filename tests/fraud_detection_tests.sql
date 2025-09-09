-- ============================================================================
-- FRAUD DETECTION SYSTEM COMPREHENSIVE TESTS
-- Testing fraud detection algorithms, rules, and alert mechanisms
-- ============================================================================

-- ============================================================================
-- 1. TEST DATA SETUP
-- ============================================================================

-- Create test users
INSERT INTO users (clerk_user_id, email, first_name, last_name, phone) VALUES
('test_user_1', 'alice@example.com', 'Alice', 'Johnson', '+244900001001'),
('test_user_2', 'bob@example.com', 'Bob', 'Smith', '+244900001002'),
('test_user_3', 'charlie@example.com', 'Charlie', 'Brown', '+244900001003'),
('test_user_4', 'diana@example.com', 'Diana', 'Wilson', '+244900001004'),
('test_fraudster', 'fraudster@example.com', 'Fraud', 'User', '+244900001999');

-- Create wallets for test users
INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
SELECT u.id, 'EUR', 10000.00, 0.00
FROM users u WHERE u.clerk_user_id LIKE 'test_%';

INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
SELECT u.id, 'AOA', 8000000.00, 0.00
FROM users u WHERE u.clerk_user_id LIKE 'test_%';

-- ============================================================================
-- 2. FRAUD DETECTION ALGORITHM TESTS
-- ============================================================================

-- Test 1: Normal transaction (should pass)
DO $$
DECLARE
    v_alice_id UUID;
    v_bob_id UUID;
    v_result RECORD;
BEGIN
    SELECT id INTO v_alice_id FROM users WHERE clerk_user_id = 'test_user_1';
    SELECT id INTO v_bob_id FROM users WHERE clerk_user_id = 'test_user_2';
    
    RAISE NOTICE 'TEST 1: Normal transaction (should pass)';
    
    SELECT * INTO v_result FROM send_p2p_transfer_with_fraud_detection(
        v_alice_id,
        'bob@example.com',
        'EUR',
        100.00,
        'Normal transfer',
        '{"location": "Luanda", "device_id": "device_001", "ip_address": "192.168.1.100"}'::JSONB
    );
    
    RAISE NOTICE 'Result: Status=%, Risk Score=%, Decision=%', 
        v_result.status, 
        (v_result.risk_assessment->>'risk_score')::INTEGER,
        v_result.risk_assessment->>'decision';
    
    ASSERT v_result.status IN ('completed', 'flagged'), 'Normal transaction should complete or be flagged';
END $$;

-- Test 2: High amount transaction (should be flagged)
DO $$
DECLARE
    v_alice_id UUID;
    v_bob_id UUID;
    v_result RECORD;
BEGIN
    SELECT id INTO v_alice_id FROM users WHERE clerk_user_id = 'test_user_1';
    SELECT id INTO v_bob_id FROM users WHERE clerk_user_id = 'test_user_2';
    
    RAISE NOTICE 'TEST 2: High amount transaction (should be flagged)';
    
    SELECT * INTO v_result FROM send_p2p_transfer_with_fraud_detection(
        v_alice_id,
        'bob@example.com',
        'EUR',
        2000.00,
        'High amount transfer',
        '{"location": "Luanda", "device_id": "device_001", "ip_address": "192.168.1.100"}'::JSONB
    );
    
    RAISE NOTICE 'Result: Status=%, Risk Score=%, Decision=%', 
        v_result.status, 
        (v_result.risk_assessment->>'risk_score')::INTEGER,
        v_result.risk_assessment->>'decision';
    
    ASSERT v_result.status IN ('flagged', 'pending_review'), 'High amount transaction should be flagged or reviewed';
END $$;

-- Test 3: Critical amount transaction (should require review)
DO $$
DECLARE
    v_alice_id UUID;
    v_bob_id UUID;
    v_result RECORD;
BEGIN
    SELECT id INTO v_alice_id FROM users WHERE clerk_user_id = 'test_user_1';
    SELECT id INTO v_bob_id FROM users WHERE clerk_user_id = 'test_user_2';
    
    RAISE NOTICE 'TEST 3: Critical amount transaction (should require review)';
    
    SELECT * INTO v_result FROM send_p2p_transfer_with_fraud_detection(
        v_alice_id,
        'bob@example.com',
        'EUR',
        6000.00,
        'Critical amount transfer',
        '{"location": "Luanda", "device_id": "device_001", "ip_address": "192.168.1.100"}'::JSONB
    );
    
    RAISE NOTICE 'Result: Status=%, Risk Score=%, Decision=%', 
        v_result.status, 
        (v_result.risk_assessment->>'risk_score')::INTEGER,
        v_result.risk_assessment->>'decision';
    
    ASSERT v_result.status = 'pending_review', 'Critical amount transaction should require review';
END $$;

-- Test 4: Blacklisted user (should be blocked)
DO $$
DECLARE
    v_fraudster_id UUID;
    v_bob_id UUID;
    v_result RECORD;
    v_blacklist_id UUID;
BEGIN
    SELECT id INTO v_fraudster_id FROM users WHERE clerk_user_id = 'test_fraudster';
    SELECT id INTO v_bob_id FROM users WHERE clerk_user_id = 'test_user_2';
    
    RAISE NOTICE 'TEST 4: Blacklisted user (should be blocked)';
    
    -- Add fraudster to blacklist
    SELECT add_to_blacklist('user', v_fraudster_id::TEXT, 'Known fraudster', 'critical') INTO v_blacklist_id;
    
    SELECT * INTO v_result FROM send_p2p_transfer_with_fraud_detection(
        v_fraudster_id,
        'bob@example.com',
        'EUR',
        100.00,
        'Transfer from blacklisted user',
        '{"location": "Unknown", "device_id": "device_999", "ip_address": "10.0.0.1"}'::JSONB
    );
    
    RAISE NOTICE 'Result: Status=%, Risk Score=%, Decision=%', 
        v_result.status, 
        COALESCE((v_result.risk_assessment->>'risk_score')::INTEGER, 0),
        COALESCE(v_result.risk_assessment->>'decision', 'N/A');
    
    ASSERT v_result.status = 'blocked', 'Blacklisted user transaction should be blocked';
END $$;

-- Test 5: Velocity check (rapid transactions)
DO $$
DECLARE
    v_charlie_id UUID;
    v_bob_id UUID;
    v_result RECORD;
    i INTEGER;
BEGIN
    SELECT id INTO v_charlie_id FROM users WHERE clerk_user_id = 'test_user_3';
    SELECT id INTO v_bob_id FROM users WHERE clerk_user_id = 'test_user_2';
    
    RAISE NOTICE 'TEST 5: Velocity check (rapid transactions)';
    
    -- Send multiple rapid transactions
    FOR i IN 1..5 LOOP
        SELECT * INTO v_result FROM send_p2p_transfer_with_fraud_detection(
            v_charlie_id,
            'bob@example.com',
            'EUR',
            200.00,
            'Rapid transfer #' || i,
            '{"location": "Luanda", "device_id": "device_003", "ip_address": "192.168.1.103"}'::JSONB
        );
        
        RAISE NOTICE 'Transaction %: Status=%, Risk Score=%', 
            i, v_result.status, (v_result.risk_assessment->>'risk_score')::INTEGER;
    END LOOP;
    
    -- The last transactions should have higher risk scores due to velocity
    ASSERT (v_result.risk_assessment->>'risk_score')::INTEGER > 20, 'Rapid transactions should increase risk score';
END $$;

-- Test 6: Behavioral anomaly (new device and location)
DO $$
DECLARE
    v_diana_id UUID;
    v_bob_id UUID;
    v_result RECORD;
BEGIN
    SELECT id INTO v_diana_id FROM users WHERE clerk_user_id = 'test_user_4';
    SELECT id INTO v_bob_id FROM users WHERE clerk_user_id = 'test_user_2';
    
    RAISE NOTICE 'TEST 6: Behavioral anomaly (new device and location)';
    
    -- First, establish normal behavior
    SELECT * INTO v_result FROM send_p2p_transfer_with_fraud_detection(
        v_diana_id,
        'bob@example.com',
        'EUR',
        50.00,
        'Normal behavior establishment',
        '{"location": "Luanda", "device_id": "device_004", "ip_address": "192.168.1.104"}'::JSONB
    );
    
    -- Wait a moment and then try from completely different context
    PERFORM pg_sleep(1);
    
    SELECT * INTO v_result FROM send_p2p_transfer_with_fraud_detection(
        v_diana_id,
        'bob@example.com',
        'EUR',
        500.00,
        'Anomalous behavior',
        '{"location": "Unknown_City", "device_id": "suspicious_device", "ip_address": "10.0.0.99"}'::JSONB
    );
    
    RAISE NOTICE 'Result: Status=%, Risk Score=%, Decision=%', 
        v_result.status, 
        (v_result.risk_assessment->>'risk_score')::INTEGER,
        v_result.risk_assessment->>'decision';
    
    ASSERT (v_result.risk_assessment->>'risk_score')::INTEGER > 30, 'Behavioral anomaly should increase risk score significantly';
END $$;

-- ============================================================================
-- 3. FRAUD ALERT MANAGEMENT TESTS
-- ============================================================================

-- Test fraud alert retrieval
DO $$
DECLARE
    v_alert_count INTEGER;
    v_high_severity_count INTEGER;
BEGIN
    RAISE NOTICE 'TEST 7: Fraud alert management';
    
    -- Check total alerts created
    SELECT COUNT(*) INTO v_alert_count FROM fraud_alerts;
    RAISE NOTICE 'Total fraud alerts created: %', v_alert_count;
    
    -- Check high severity alerts
    SELECT COUNT(*) INTO v_high_severity_count FROM fraud_alerts WHERE severity_level IN ('high', 'critical');
    RAISE NOTICE 'High/Critical severity alerts: %', v_high_severity_count;
    
    ASSERT v_alert_count > 0, 'Fraud alerts should have been created during testing';
END $$;

-- Test fraud statistics
DO $$
DECLARE
    v_stats RECORD;
BEGIN
    RAISE NOTICE 'TEST 8: Fraud statistics';
    
    SELECT * INTO v_stats FROM get_fraud_statistics();
    
    RAISE NOTICE 'Fraud Statistics:';
    RAISE NOTICE '  Total alerts: %', v_stats.total_alerts;
    RAISE NOTICE '  Critical alerts: %', v_stats.critical_alerts;
    RAISE NOTICE '  High alerts: %', v_stats.high_alerts;
    RAISE NOTICE '  Average risk score: %', v_stats.avg_risk_score;
    RAISE NOTICE '  Blocked transactions: %', v_stats.blocked_transactions;
    
    ASSERT v_stats.total_alerts > 0, 'Statistics should show fraud alerts';
END $$;

-- ============================================================================
-- 4. PERFORMANCE AND INTEGRATION TESTS
-- ============================================================================

-- Test fraud detection performance
DO $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_duration_ms INTEGER;
    v_alice_id UUID;
    v_result RECORD;
BEGIN
    SELECT id INTO v_alice_id FROM users WHERE clerk_user_id = 'test_user_1';
    
    RAISE NOTICE 'TEST 9: Fraud detection performance';
    
    v_start_time := clock_timestamp();
    
    SELECT * INTO v_result FROM send_p2p_transfer_with_fraud_detection(
        v_alice_id,
        'bob@example.com',
        'EUR',
        100.00,
        'Performance test',
        '{"location": "Luanda", "device_id": "device_001", "ip_address": "192.168.1.100"}'::JSONB
    );
    
    v_end_time := clock_timestamp();
    v_duration_ms := EXTRACT(milliseconds FROM v_end_time - v_start_time)::INTEGER;
    
    RAISE NOTICE 'Fraud detection completed in % ms', v_duration_ms;
    RAISE NOTICE 'Assessment duration from result: % ms', 
        (v_result.risk_assessment->>'assessment_duration_ms')::INTEGER;
    
    ASSERT v_duration_ms < 1000, 'Fraud detection should complete within 1 second';
END $$;

RAISE NOTICE '============================================================================';
RAISE NOTICE 'FRAUD DETECTION SYSTEM TESTS COMPLETED SUCCESSFULLY';
RAISE NOTICE '============================================================================';
