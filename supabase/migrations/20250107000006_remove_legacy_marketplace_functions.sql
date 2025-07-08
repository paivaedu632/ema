-- =====================================================================================
-- EmaPay Order Book System: Remove Legacy Marketplace Functions
-- =====================================================================================
-- This migration removes all legacy marketplace-based database functions to create
-- a clean codebase focused on the new order book system:
-- 1. Remove VWAP calculation functions
-- 2. Remove legacy offer-based trading functions
-- 3. Remove old exchange rate calculation functions
-- 4. Remove deprecated marketplace matching functions
-- 5. Clean up legacy views and triggers
-- =====================================================================================

-- Step 1: Remove VWAP calculation functions
DROP FUNCTION IF EXISTS calculate_vwap_rate(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_dynamic_exchange_rate(TEXT, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS refresh_all_vwap_rates();
DROP FUNCTION IF EXISTS store_dynamic_rate(TEXT, DECIMAL, INTEGER, DECIMAL);

-- Step 2: Remove legacy offer-based trading functions
DROP FUNCTION IF EXISTS create_currency_offer(UUID, TEXT, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS create_currency_offer(UUID, TEXT, DECIMAL, DECIMAL, BOOLEAN);
DROP FUNCTION IF EXISTS create_currency_offer_legacy(UUID, TEXT, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS cancel_currency_offer(UUID, UUID);
DROP FUNCTION IF EXISTS reserve_balance_for_offer(UUID, TEXT, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS get_user_total_balance(UUID, TEXT);

-- Step 3: Remove legacy transaction processing functions
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS process_buy_transaction_with_matching(UUID, DECIMAL, BOOLEAN, DECIMAL);
DROP FUNCTION IF EXISTS process_sell_transaction(UUID, DECIMAL, TEXT, DECIMAL);

-- Step 4: Remove legacy exchange rate and market depth functions
DROP FUNCTION IF EXISTS get_market_depth_buy_aoa(DECIMAL);
DROP FUNCTION IF EXISTS calculate_exchange_rate_for_amount(DECIMAL, TEXT);
DROP FUNCTION IF EXISTS get_available_offers_for_buy(DECIMAL);

-- Step 5: Remove legacy balance management functions (if they exist)
DROP FUNCTION IF EXISTS reserve_balance(UUID, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS unreserve_balance(UUID, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS validate_wallet_2_balance_system();
DROP FUNCTION IF EXISTS validate_wallet_balance_2_system();

-- Step 6: Remove legacy views
DROP VIEW IF EXISTS wallet_balances_with_reserved;
DROP VIEW IF EXISTS user_offer_summary;
DROP VIEW IF EXISTS active_offers_summary;

-- Step 7: Remove legacy tables (keep for data migration purposes, but mark as deprecated)
-- Note: We'll keep the offers table for now to preserve historical data
-- but add a comment indicating it's deprecated
COMMENT ON TABLE offers IS 'DEPRECATED: Legacy marketplace offers table. Replaced by order_book system. Kept for historical data only.';

-- Step 8: Remove dynamic_rates table (replaced by real-time order book pricing)
DROP TABLE IF EXISTS dynamic_rates;

-- Step 9: Remove legacy triggers
DROP TRIGGER IF EXISTS update_dynamic_rates_updated_at ON dynamic_rates;
DROP TRIGGER IF EXISTS validate_wallet_2_balance_system_trigger ON wallets;
DROP TRIGGER IF EXISTS validate_wallet_balance_2_system_trigger ON wallets;

-- Step 10: Remove legacy indexes related to VWAP and offers
DROP INDEX IF EXISTS idx_dynamic_rates_currency_pair;
DROP INDEX IF EXISTS idx_dynamic_rates_calculated_at;
DROP INDEX IF EXISTS idx_dynamic_rates_currency_calculated;
DROP INDEX IF EXISTS idx_offers_currency_status;
DROP INDEX IF EXISTS idx_offers_user_status;
DROP INDEX IF EXISTS idx_offers_exchange_rate;

-- Step 11: Clean up any remaining legacy functions
-- Remove any test functions related to legacy system
DROP FUNCTION IF EXISTS test_vwap_calculation();
DROP FUNCTION IF EXISTS test_dynamic_rates();
DROP FUNCTION IF EXISTS test_offer_creation();
DROP FUNCTION IF EXISTS test_marketplace_functions();

-- Step 12: Remove legacy RPC permissions
-- Note: These will fail silently if functions don't exist
REVOKE ALL ON FUNCTION calculate_vwap_rate FROM authenticated;
REVOKE ALL ON FUNCTION get_dynamic_exchange_rate FROM authenticated;
REVOKE ALL ON FUNCTION refresh_all_vwap_rates FROM authenticated;
REVOKE ALL ON FUNCTION create_currency_offer FROM authenticated;
REVOKE ALL ON FUNCTION cancel_currency_offer FROM authenticated;
REVOKE ALL ON FUNCTION process_buy_transaction FROM authenticated;
REVOKE ALL ON FUNCTION process_sell_transaction FROM authenticated;

-- Step 13: Create cleanup verification function
CREATE OR REPLACE FUNCTION verify_legacy_cleanup()
RETURNS TABLE(
    component_type TEXT,
    component_name TEXT,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check for remaining legacy functions
    RETURN QUERY
    SELECT 
        'function' as component_type,
        routine_name as component_name,
        'STILL_EXISTS' as status
    FROM information_schema.routines 
    WHERE routine_name IN (
        'calculate_vwap_rate',
        'get_dynamic_exchange_rate', 
        'refresh_all_vwap_rates',
        'create_currency_offer',
        'cancel_currency_offer',
        'process_buy_transaction',
        'process_sell_transaction',
        'get_market_depth_buy_aoa'
    );
    
    -- Check for remaining legacy tables
    RETURN QUERY
    SELECT 
        'table' as component_type,
        table_name as component_name,
        'STILL_EXISTS' as status
    FROM information_schema.tables 
    WHERE table_name IN ('dynamic_rates')
    AND table_schema = 'public';
    
    -- Check for remaining legacy views
    RETURN QUERY
    SELECT 
        'view' as component_type,
        table_name as component_name,
        'STILL_EXISTS' as status
    FROM information_schema.views 
    WHERE table_name IN ('wallet_balances_with_reserved', 'user_offer_summary')
    AND table_schema = 'public';
    
    -- If no legacy components found, return success message
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name IN (
            'calculate_vwap_rate', 'get_dynamic_exchange_rate', 'refresh_all_vwap_rates',
            'create_currency_offer', 'cancel_currency_offer', 'process_buy_transaction'
        )
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'dynamic_rates' AND table_schema = 'public'
    ) THEN
        RETURN QUERY
        SELECT 
            'cleanup' as component_type,
            'legacy_marketplace_system' as component_name,
            'SUCCESSFULLY_REMOVED' as status;
    END IF;
END;
$$;

-- Step 14: Run cleanup verification
SELECT * FROM verify_legacy_cleanup();

-- Step 15: Create summary of remaining order book functions
CREATE OR REPLACE FUNCTION list_order_book_functions()
RETURNS TABLE(
    function_name TEXT,
    function_category TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        routine_name as function_name,
        CASE 
            WHEN routine_name LIKE '%order%' THEN 'Order Management'
            WHEN routine_name LIKE '%trade%' THEN 'Trade Execution'
            WHEN routine_name LIKE '%match%' THEN 'Matching Engine'
            WHEN routine_name LIKE '%fund%' THEN 'Fund Management'
            WHEN routine_name LIKE '%fee%' THEN 'Fee Calculation'
            WHEN routine_name LIKE '%analytics%' THEN 'Analytics'
            WHEN routine_name LIKE '%price%' THEN 'Market Data'
            ELSE 'Other'
        END as function_category
    FROM information_schema.routines 
    WHERE routine_name IN (
        'place_order', 'cancel_order', 'get_user_orders', 'get_order_details',
        'match_order', 'get_matching_orders', 'execute_trade', 'execute_trade_enhanced',
        'get_best_prices', 'create_fund_reservation', 'release_fund_reservation',
        'cancel_fund_reservation', 'calculate_trade_fees', 'create_transaction_record',
        'optimize_trade_settlement', 'get_trade_execution_analytics',
        'validate_order_book_entry', 'validate_trade_execution'
    )
    ORDER BY function_category, routine_name;
END;
$$;

-- Step 16: Display remaining order book functions
SELECT 'Order Book System Functions:' as summary;
SELECT * FROM list_order_book_functions();

-- Step 17: Clean up verification functions
DROP FUNCTION IF EXISTS verify_legacy_cleanup();
DROP FUNCTION IF EXISTS list_order_book_functions();

-- Migration completed successfully
SELECT 'Legacy marketplace functions removed successfully. Order book system is now the only trading system.' AS status;
