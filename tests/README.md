# EmaPay Database Trading Functions Test Suite

This directory contains comprehensive unit tests for the EmaPay database trading functions. The test suite is designed to validate all critical functionality and edge cases for the trading engine.

## 📋 Test Coverage

### 🔄 place_limit_order Function Tests
- ✅ **Valid Order Placement**: Buy and sell order creation with proper fund reservation
- ✅ **Order Matching**: Full fill, partial fill, and no-match scenarios
- ✅ **Input Validation**: Negative quantities, invalid currencies, same base/quote currencies
- ✅ **Balance Management**: Insufficient balance scenarios and wallet creation
- ✅ **Fee Calculation**: Verification of 1% trading fees
- ✅ **Fund Mechanics**: Reservation and release of funds

### 📈 execute_market_order Function Tests  
- ✅ **Market Execution**: Orders with sufficient liquidity
- ✅ **Liquidity Checking**: Rejection when no liquidity available
- ✅ **Slippage Protection**: Orders rejected when slippage exceeds threshold
- ✅ **Price Discovery**: Market order conversion to limit order at worst acceptable price

### ❌ cancel_order Function Tests
- ✅ **Successful Cancellation**: Order cancellation with fund release
- ✅ **Error Handling**: Non-existent orders, unauthorized access
- ✅ **State Validation**: Attempts to cancel filled/cancelled orders
- ✅ **Balance Verification**: Fund release back to available balance

### 🔗 Integration Tests
- ✅ **Complete Trading Scenarios**: End-to-end order lifecycle
- ✅ **Multi-User Trading**: Complex scenarios with multiple participants
- ✅ **Order Book Accuracy**: Market depth and data consistency
- ✅ **Balance Consistency**: Verification across all operations

## 🚀 Quick Start

### 1. Load Test Framework
```sql
-- In Supabase SQL Editor, copy and paste the contents of:
-- tests/database_trading_functions_tests.sql
```

### 2. Run All Tests
```sql
SELECT run_all_tests();
```

### 3. View Results
```sql
SELECT display_test_results();
```

## 📊 Test Framework Features

### 🎯 Assertion Functions
- **`assert_equals()`**: Compare expected vs actual values
- **`assert_exception()`**: Verify that exceptions are thrown correctly
- **Automatic Logging**: All test results stored in `test_results` table

### 🔧 Setup/Teardown
- **`setup_test_environment()`**: Creates test users and initial balances
- **`cleanup_test_environment()`**: Removes all test data
- **Isolated Tests**: Each test suite runs in clean environment

### 📈 Test Data
- **Alice**: Rich trader (10,000 EUR, 5,000,000 AOA)
- **Bob**: Moderate trader (1,000 EUR, 1,000,000 AOA)  
- **Charlie**: Low balance user (10 EUR, 5,000 AOA)
- **Diana**: Single currency user (500 EUR only)

## 🔍 Individual Test Execution

### Run Specific Test Suites
```sql
-- place_limit_order tests only
SELECT setup_test_environment();
SELECT run_place_limit_order_tests();
SELECT display_test_results();
SELECT cleanup_test_environment();

-- execute_market_order tests only
SELECT setup_test_environment();
SELECT run_execute_market_order_tests();
SELECT display_test_results();
SELECT cleanup_test_environment();

-- cancel_order tests only
SELECT setup_test_environment();
SELECT run_cancel_order_tests();
SELECT display_test_results();
SELECT cleanup_test_environment();

-- Integration tests only
SELECT setup_test_environment();
SELECT run_integration_tests();
SELECT display_test_results();
SELECT cleanup_test_environment();
```

## 📋 Test Results Analysis

### View All Results
```sql
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
```

### View Failed Tests Only
```sql
SELECT 
    test_suite,
    test_name,
    status,
    error_message
FROM test_results 
WHERE status IN ('FAIL', 'ERROR')
ORDER BY test_suite, test_name;
```

### Test Suite Summary
```sql
SELECT 
    test_suite,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE status = 'PASS') as passed,
    COUNT(*) FILTER (WHERE status = 'FAIL') as failed,
    COUNT(*) FILTER (WHERE status = 'ERROR') as errors,
    ROUND((COUNT(*) FILTER (WHERE status = 'PASS')::DECIMAL / COUNT(*)) * 100, 1) as pass_rate_percent
FROM test_results
GROUP BY test_suite
ORDER BY test_suite;
```

## 🛡️ Critical Test Cases

### Edge Cases Covered
1. **Negative Values**: Quantities, prices, balances
2. **Invalid Currencies**: Unsupported currency pairs
3. **Insufficient Funds**: Orders exceeding available balance
4. **Unauthorized Access**: Users trying to cancel others' orders
5. **State Violations**: Cancelling filled orders
6. **Slippage Limits**: Market orders with excessive price impact
7. **Balance Consistency**: Total system balance preservation
8. **Fee Calculations**: Accurate fee computation and deduction

### Production Scenarios
1. **High-Frequency Trading**: Multiple rapid order placements
2. **Partial Fills**: Large orders matched against multiple smaller orders
3. **Market Volatility**: Orders with wide bid-ask spreads
4. **Liquidity Constraints**: Market orders in thin markets
5. **Multi-Currency Trading**: EUR/AOA pair trading scenarios

## 🔧 Maintenance

### Adding New Tests
1. Create test function following naming convention: `test_[suite]_[scenario]()`
2. Use assertion functions for validation
3. Add to appropriate test suite runner
4. Document expected behavior

### Test Data Management
- Test users have `.test@emapay.com` email pattern
- All test data is automatically cleaned up
- Initial balances are reset for each test suite

### Performance Considerations
- Tests run in transactions for isolation
- Cleanup functions prevent data accumulation
- Execution time is tracked for performance monitoring

## 📞 Support

For issues with the test suite:
1. Check test results for specific error messages
2. Verify database schema matches expected structure
3. Ensure all trading functions are properly deployed
4. Review test data setup for balance requirements

---

**Last Updated**: December 2024  
**Test Coverage**: 40+ test cases across 4 test suites  
**Status**: Production Ready
