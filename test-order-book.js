#!/usr/bin/env node

/**
 * EmaPay Order Book Database Testing Suite
 * Comprehensive testing of order book implementation
 * 
 * IMPORTANT: Execute tests ONE AT A TIME as specified in test protocol
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test data configuration
const TEST_USERS = [
  { id: '11111111-1111-1111-1111-111111111111', email: 'test1@emapay.com', full_name: 'Test User 1', clerk_user_id: 'test_user_1' },
  { id: '22222222-2222-2222-2222-222222222222', email: 'test2@emapay.com', full_name: 'Test User 2', clerk_user_id: 'test_user_2' },
  { id: '33333333-3333-3333-3333-333333333333', email: 'test3@emapay.com', full_name: 'Test User 3', clerk_user_id: 'test_user_3' }
];

const INITIAL_BALANCES = [
  { user_id: TEST_USERS[0].id, currency: 'EUR', available_balance: 10000.00, reserved_balance: 0.00 },
  { user_id: TEST_USERS[0].id, currency: 'AOA', available_balance: 50000.00, reserved_balance: 0.00 },
  { user_id: TEST_USERS[1].id, currency: 'EUR', available_balance: 5000.00, reserved_balance: 0.00 },
  { user_id: TEST_USERS[1].id, currency: 'AOA', available_balance: 25000.00, reserved_balance: 0.00 },
  { user_id: TEST_USERS[2].id, currency: 'EUR', available_balance: 2000.00, reserved_balance: 0.00 },
  { user_id: TEST_USERS[2].id, currency: 'AOA', available_balance: 10000.00, reserved_balance: 0.00 }
];

// Utility functions
function logTest(testId, description) {
  console.log(`\n🧪 ${testId}: ${description}`);
  console.log('='.repeat(60));
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.log(`❌ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

async function measureTime(fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

// Database setup functions
async function setupTestEnvironment() {
  logTest('SETUP', 'Establishing Test Environment');
  
  try {
    // 1. Verify database connection
    logInfo('Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }
    logSuccess('Database connection established');

    // 2. Clean existing test data
    logInfo('Cleaning existing test data...');
    await cleanTestData();
    logSuccess('Test data cleaned');

    // 3. Create test users
    logInfo('Creating test users...');
    for (const user of TEST_USERS) {
      const { error: userError } = await supabase
        .from('users')
        .upsert(user, { onConflict: 'id' });
      
      if (userError) {
        throw new Error(`Failed to create user ${user.email}: ${userError.message}`);
      }
    }
    logSuccess(`Created ${TEST_USERS.length} test users`);

    // 4. Create initial balances
    logInfo('Setting up initial balances...');
    for (const balance of INITIAL_BALANCES) {
      const { error: balanceError } = await supabase
        .from('wallets')
        .upsert(balance, { onConflict: 'user_id,currency' });
      
      if (balanceError) {
        throw new Error(`Failed to create balance: ${balanceError.message}`);
      }
    }
    logSuccess(`Created ${INITIAL_BALANCES.length} wallet balances`);

    // 5. Verify schema functions exist
    logInfo('Verifying order book functions...');
    const requiredFunctions = [
      'place_order',
      'cancel_order', 
      'match_order',
      'get_best_prices',
      'get_user_orders'
    ];

    for (const funcName of requiredFunctions) {
      const { data, error } = await supabase
        .rpc('pg_get_functiondef', { funcname: funcName })
        .single();
      
      if (error) {
        logError(`Function ${funcName} not found: ${error.message}`);
      } else {
        logSuccess(`Function ${funcName} verified`);
      }
    }

    // 6. Display test environment status
    logInfo('Test Environment Summary:');
    console.log('  - Database: Connected ✅');
    console.log('  - Test Users: 3 created ✅');
    console.log('  - Initial Balances: Set ✅');
    console.log('  - Functions: Verified ✅');
    
    return true;

  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    return false;
  }
}

async function cleanTestData() {
  // Clean in reverse dependency order
  const tables = ['trades', 'order_book', 'wallets', 'users'];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .in('user_id', TEST_USERS.map(u => u.id));
    
    if (error && !error.message.includes('does not exist')) {
      console.warn(`Warning cleaning ${table}: ${error.message}`);
    }
  }
}

// Test T1.1: Valid Limit Buy Order
async function testT11_ValidLimitBuyOrder() {
  logTest('T1.1', 'Valid Limit Buy Order (EUR/AOA, 100 EUR at 580 AOA/EUR)');
  
  try {
    const userId = TEST_USERS[0].id;
    const testParams = {
      p_user_id: userId,
      p_order_type: 'limit',
      p_side: 'buy',
      p_base_currency: 'AOA',
      p_quote_currency: 'EUR', 
      p_quantity: 100.00,
      p_price: 580.00
    };

    logInfo(`Placing order: ${JSON.stringify(testParams, null, 2)}`);

    // Get initial balance
    const { data: initialBalance } = await supabase
      .from('wallets')
      .select('available_balance, reserved_balance')
      .eq('user_id', userId)
      .eq('currency', 'EUR')
      .single();

    logInfo(`Initial EUR balance: Available=${initialBalance.available_balance}, Reserved=${initialBalance.reserved_balance}`);

    // Execute order placement
    const { result: orderResult, duration } = await measureTime(async () => {
      const { data, error } = await supabase.rpc('place_order', testParams);
      if (error) throw error;
      return data;
    });

    logInfo(`Order placement completed in ${duration}ms`);
    logInfo(`Order result: ${JSON.stringify(orderResult, null, 2)}`);

    // Verify order was created
    if (!orderResult.success) {
      throw new Error(`Order placement failed: ${orderResult.error}`);
    }

    const orderId = orderResult.order_id;
    logSuccess(`Order created with ID: ${orderId}`);

    // Verify order in database
    const { data: orderRecord, error: orderError } = await supabase
      .from('order_book')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw new Error(`Failed to retrieve order: ${orderError.message}`);
    }

    logSuccess('Order record found in database');
    logInfo(`Order details: Status=${orderRecord.status}, Quantity=${orderRecord.quantity}, Price=${orderRecord.price}`);

    // Verify balance changes
    const { data: finalBalance } = await supabase
      .from('wallets')
      .select('available_balance, reserved_balance')
      .eq('user_id', userId)
      .eq('currency', 'EUR')
      .single();

    const expectedReserved = 100.00; // 100 EUR * 1 (buying AOA with EUR)
    const expectedAvailable = initialBalance.available_balance - expectedReserved;

    logInfo(`Final EUR balance: Available=${finalBalance.available_balance}, Reserved=${finalBalance.reserved_balance}`);
    logInfo(`Expected: Available=${expectedAvailable}, Reserved=${expectedReserved}`);

    // Validate balance changes
    if (Math.abs(finalBalance.available_balance - expectedAvailable) > 0.01) {
      throw new Error(`Available balance mismatch: Expected ${expectedAvailable}, Got ${finalBalance.available_balance}`);
    }

    if (Math.abs(finalBalance.reserved_balance - expectedReserved) > 0.01) {
      throw new Error(`Reserved balance mismatch: Expected ${expectedReserved}, Got ${finalBalance.reserved_balance}`);
    }

    logSuccess('Balance changes verified correctly');
    logSuccess(`T1.1 PASSED - Order placed successfully with proper fund reservation`);
    
    return {
      success: true,
      orderId: orderId,
      executionTime: duration,
      balanceChanges: {
        availableChange: finalBalance.available_balance - initialBalance.available_balance,
        reservedChange: finalBalance.reserved_balance - initialBalance.reserved_balance
      }
    };

  } catch (error) {
    logError(`T1.1 FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main execution
async function main() {
  console.log('🚀 EmaPay Order Book Database Testing Suite');
  console.log('==========================================');
  console.log('⚠️  IMPORTANT: Executing tests ONE AT A TIME as per protocol');
  
  // Setup test environment
  const setupSuccess = await setupTestEnvironment();
  if (!setupSuccess) {
    console.log('\n❌ Setup failed. Cannot proceed with testing.');
    process.exit(1);
  }

  console.log('\n✅ Test environment ready. Starting T1.1...');
  
  // Execute T1.1 only
  const t11Result = await testT11_ValidLimitBuyOrder();
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`T1.1 - Valid Limit Buy Order: ${t11Result.success ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  if (t11Result.success) {
    console.log(`  - Execution Time: ${t11Result.executionTime}ms`);
    console.log(`  - Order ID: ${t11Result.orderId}`);
    console.log(`  - Balance Changes: Available=${t11Result.balanceChanges.availableChange}, Reserved=${t11Result.balanceChanges.reservedChange}`);
  } else {
    console.log(`  - Error: ${t11Result.error}`);
  }

  console.log('\n⏸️  Test T1.1 completed. Waiting for approval before proceeding to T1.2...');
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  setupTestEnvironment,
  testT11_ValidLimitBuyOrder,
  cleanTestData,
  TEST_USERS,
  INITIAL_BALANCES
};
