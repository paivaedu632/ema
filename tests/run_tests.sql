-- ============================================================================
-- EMAPAY DATABASE TESTS - QUICK EXECUTION SCRIPT
-- ============================================================================
-- This script provides quick commands to run the EmaPay database tests
-- Execute this in Supabase SQL Editor after loading the main test file
-- ============================================================================

-- Load the test framework (run the main test file first)
-- \i tests/database_trading_functions_tests.sql

-- ============================================================================
-- QUICK TEST EXECUTION
-- ============================================================================

-- Run all tests (recommended)
SELECT run_all_tests();

-- ============================================================================
-- INDIVIDUAL TEST SUITE EXECUTION
-- ============================================================================

/*
-- Run place_limit_order tests only
SELECT setup_test_environment();
SELECT run_place_limit_order_tests();
SELECT display_test_results();
SELECT cleanup_test_environment();

-- Run execute_market_order tests only  
SELECT setup_test_environment();
SELECT run_execute_market_order_tests();
SELECT display_test_results();
SELECT cleanup_test_environment();

-- Run cancel_order tests only
SELECT setup_test_environment();
SELECT run_cancel_order_tests();
SELECT display_test_results();
SELECT cleanup_test_environment();

-- Run integration tests only
SELECT setup_test_environment();
SELECT run_integration_tests();
SELECT display_test_results();
SELECT cleanup_test_environment();
*/

-- ============================================================================
-- TEST RESULTS VIEWING
-- ============================================================================

/*
-- View all test results
SELECT 
    test_suite,
    test_name,
    status,
    CASE 
        WHEN status = 'FAIL' THEN error_message
        WHEN status = 'ERROR' THEN error_message
        ELSE 'OK'
    END as result,
    execution_time
FROM test_results 
ORDER BY test_suite, test_name;

-- View only failed tests
SELECT 
    test_suite,
    test_name,
    status,
    error_message,
    execution_time
FROM test_results 
WHERE status IN ('FAIL', 'ERROR')
ORDER BY test_suite, test_name;

-- View test summary by suite
SELECT 
    test_suite,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE status = 'PASS') as passed,
    COUNT(*) FILTER (WHERE status = 'FAIL') as failed,
    COUNT(*) FILTER (WHERE status = 'ERROR') as errors,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'PASS')::DECIMAL / COUNT(*)) * 100, 
        1
    ) as pass_rate_percent
FROM test_results
GROUP BY test_suite
ORDER BY test_suite;
*/

-- ============================================================================
-- CLEANUP COMMANDS
-- ============================================================================

/*
-- Clear test results
DELETE FROM test_results;

-- Drop test framework (if needed)
DROP FUNCTION IF EXISTS run_all_tests();
DROP FUNCTION IF EXISTS display_test_results();
DROP FUNCTION IF EXISTS setup_test_environment();
DROP FUNCTION IF EXISTS cleanup_test_environment();
DROP FUNCTION IF EXISTS assert_equals(TEXT, TEXT, ANYELEMENT, ANYELEMENT, TEXT);
DROP FUNCTION IF EXISTS assert_exception(TEXT, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS test_results;
*/
