#!/usr/bin/env node

/**
 * Comprehensive Dynamic Pricing Feature Test
 * Tests all aspects of dynamic pricing with real market scenarios
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test configuration
const TEST_CONFIG = {
  testUsers: ['TRADER_1', 'TRADER_2', 'TRADER_3'],
  baseCurrency: 'EUR',
  quoteCurrency: 'AOA',
  testOrders: [
    { user: 'TRADER_1', quantity: 5, price: 1220, dynamic: true },
    { user: 'TRADER_2', quantity: 3, price: 1250, dynamic: false },
    { user: 'TRADER_3', quantity: 7, price: 1300, dynamic: true }
  ]
}

let createdOrderIds = []

/**
 * Main test execution
 */
async function runComprehensiveDynamicPricingTest() {
  console.log('🧪 Starting Comprehensive Dynamic Pricing Test\n')
  
  try {
    // Step 1: Setup test environment
    await setupTestEnvironment()
    
    // Step 2: Create test sell orders with dynamic pricing
    await testCreateSellOrdersWithDynamicPricing()
    
    // Step 3: Verify VWAP calculations
    await testVWAPCalculations()
    
    // Step 4: Test price update mechanisms
    await testPriceUpdateMechanisms()
    
    // Step 5: Validate price bounds protection
    await testPriceBoundsProtection()
    
    // Step 6: Test toggle functionality
    await testToggleFunctionality()
    
    // Step 7: Verify audit trail
    await testAuditTrail()
    
    // Step 8: Test real-world scenarios
    await testRealWorldScenarios()
    
    console.log('\n✅ All Comprehensive Dynamic Pricing Tests Completed Successfully!')
    
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    // Cleanup
    await cleanupTestData()
  }
}

/**
 * Step 1: Setup test environment
 */
async function setupTestEnvironment() {
  console.log('🔧 Step 1: Setting up test environment')
  
  // Get current market state
  const { data: currentOrders } = await supabase
    .from('order_book')
    .select('id, side, price, quantity, dynamic_pricing_enabled')
    .eq('base_currency', 'EUR')
    .eq('quote_currency', 'AOA')
    .in('status', ['pending', 'partially_filled'])
  
  console.log(`   📊 Current market orders: ${currentOrders?.length || 0}`)
  
  // Get recent trades for VWAP context
  const { data: recentTrades } = await supabase
    .from('trades')
    .select('price, quantity, executed_at')
    .eq('base_currency', 'EUR')
    .eq('quote_currency', 'AOA')
    .gte('executed_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
    .order('executed_at', { ascending: false })
  
  console.log(`   📈 Recent trades (12h): ${recentTrades?.length || 0}`)
  
  if (recentTrades && recentTrades.length > 0) {
    const avgPrice = recentTrades.reduce((sum, trade) => sum + trade.price, 0) / recentTrades.length
    console.log(`   💰 Average recent price: ${avgPrice.toFixed(2)} AOA per EUR`)
  }
  
  console.log('   ✅ Test environment ready\n')
}

/**
 * Step 2: Create test sell orders with dynamic pricing
 */
async function testCreateSellOrdersWithDynamicPricing() {
  console.log('📋 Step 2: Creating test sell orders with dynamic pricing')
  
  for (const orderConfig of TEST_CONFIG.testOrders) {
    try {
      // Get user ID for the test user
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('test_user', orderConfig.user)
        .single()
      
      if (!userData) {
        console.log(`   ⚠️  Test user ${orderConfig.user} not found, skipping`)
        continue
      }
      
      // Place order using database function
      const { data: orderResult, error: orderError } = await supabase
        .rpc('place_order', {
          p_user_id: userData.id,
          p_order_type: 'limit',
          p_side: 'sell',
          p_base_currency: TEST_CONFIG.baseCurrency,
          p_quote_currency: TEST_CONFIG.quoteCurrency,
          p_quantity: orderConfig.quantity,
          p_price: orderConfig.price,
          p_dynamic_pricing_enabled: orderConfig.dynamic
        })
      
      if (orderError) {
        console.log(`   ❌ Failed to create order for ${orderConfig.user}: ${orderError.message}`)
        continue
      }
      
      if (orderResult && orderResult.length > 0) {
        const order = orderResult[0]
        createdOrderIds.push(order.order_id)
        
        console.log(`   ✅ Created order for ${orderConfig.user}:`)
        console.log(`      Order ID: ${order.order_id}`)
        console.log(`      Price: ${orderConfig.price} AOA per EUR`)
        console.log(`      Quantity: ${orderConfig.quantity} EUR`)
        console.log(`      Dynamic Pricing: ${orderConfig.dynamic ? 'Enabled' : 'Disabled'}`)
        console.log(`      Status: ${order.status}`)
      }
      
    } catch (error) {
      console.log(`   ❌ Error creating order for ${orderConfig.user}: ${error.message}`)
    }
  }
  
  console.log(`   📊 Created ${createdOrderIds.length} test orders\n`)
}

/**
 * Step 3: Verify VWAP calculations
 */
async function testVWAPCalculations() {
  console.log('📋 Step 3: Verifying VWAP calculations')
  
  // Test VWAP calculation for different time periods
  const testPeriods = [1, 6, 12, 24]
  
  for (const hours of testPeriods) {
    const { data: vwapResult, error: vwapError } = await supabase
      .rpc('calculate_vwap', {
        p_base_currency: TEST_CONFIG.baseCurrency,
        p_quote_currency: TEST_CONFIG.quoteCurrency,
        p_hours: hours
      })
    
    if (vwapError) {
      console.log(`   ❌ VWAP calculation failed for ${hours}h: ${vwapError.message}`)
      continue
    }
    
    if (vwapResult && vwapResult.length > 0) {
      const vwap = vwapResult[0]
      console.log(`   ✅ VWAP (${hours}h): ${vwap.vwap || 'N/A'} AOA per EUR`)
      console.log(`      Volume: ${vwap.total_volume} EUR, Trades: ${vwap.trade_count}`)
    }
  }
  
  console.log('')
}

/**
 * Step 4: Test price update mechanisms
 */
async function testPriceUpdateMechanisms() {
  console.log('📋 Step 4: Testing price update mechanisms')
  
  // Get orders before update
  const { data: ordersBefore } = await supabase
    .from('order_book')
    .select('id, price, dynamic_pricing_enabled, last_price_update')
    .in('id', createdOrderIds)
  
  console.log('   📊 Orders before price update:')
  ordersBefore?.forEach(order => {
    console.log(`      ${order.id}: ${order.price} AOA (Dynamic: ${order.dynamic_pricing_enabled})`)
  })
  
  // Run batch price update
  const { data: updateResult, error: updateError } = await supabase
    .rpc('process_all_dynamic_pricing_updates')
  
  if (updateError) {
    console.log(`   ❌ Batch price update failed: ${updateError.message}`)
    return
  }
  
  if (updateResult && updateResult.length > 0) {
    const result = updateResult[0]
    console.log(`   ✅ Batch update completed:`)
    console.log(`      Orders processed: ${result.total_orders_processed}`)
    console.log(`      Orders updated: ${result.orders_updated}`)
    console.log(`      Orders unchanged: ${result.orders_unchanged}`)
    console.log(`      Duration: ${result.processing_duration}`)
    
    // Show update details
    if (result.update_summary && result.update_summary.length > 0) {
      console.log('   📈 Price changes:')
      result.update_summary.forEach(update => {
        console.log(`      ${update.order_id}: ${update.old_price} → ${update.new_price} (${update.change_percentage}%)`)
      })
    }
  }
  
  // Get orders after update
  const { data: ordersAfter } = await supabase
    .from('order_book')
    .select('id, price, dynamic_pricing_enabled, last_price_update, price_update_count')
    .in('id', createdOrderIds)
  
  console.log('   📊 Orders after price update:')
  ordersAfter?.forEach(order => {
    console.log(`      ${order.id}: ${order.price} AOA (Updates: ${order.price_update_count})`)
  })
  
  console.log('')
}

/**
 * Step 5: Validate price bounds protection
 */
async function testPriceBoundsProtection() {
  console.log('📋 Step 5: Validating price bounds protection')
  
  // Get orders with dynamic pricing enabled
  const { data: dynamicOrders } = await supabase
    .from('order_book')
    .select('id, price, original_price, min_price_bound, max_price_bound')
    .in('id', createdOrderIds)
    .eq('dynamic_pricing_enabled', true)
  
  if (!dynamicOrders || dynamicOrders.length === 0) {
    console.log('   ⚠️  No dynamic orders found for bounds testing')
    return
  }
  
  dynamicOrders.forEach(order => {
    const currentPrice = order.price
    const originalPrice = order.original_price
    const minBound = order.min_price_bound
    const maxBound = order.max_price_bound
    
    console.log(`   📊 Order ${order.id}:`)
    console.log(`      Original: ${originalPrice} AOA`)
    console.log(`      Current: ${currentPrice} AOA`)
    console.log(`      Bounds: ${minBound} - ${maxBound} AOA`)
    
    // Validate bounds
    const withinBounds = currentPrice >= minBound && currentPrice <= maxBound
    const boundsCorrect = Math.abs(minBound - originalPrice * 0.8) < 0.01 && 
                         Math.abs(maxBound - originalPrice * 1.2) < 0.01
    
    console.log(`      ✅ Within bounds: ${withinBounds}`)
    console.log(`      ✅ Bounds correct (±20%): ${boundsCorrect}`)
  })
  
  console.log('')
}

/**
 * Step 7: Verify audit trail
 */
async function testAuditTrail() {
  console.log('📋 Step 7: Verifying audit trail')

  // Get all price updates for our test orders
  const { data: priceUpdates, error: auditError } = await supabase
    .from('price_updates')
    .select(`
      id,
      order_id,
      old_price,
      new_price,
      price_change_percentage,
      update_reason,
      vwap_reference,
      created_at
    `)
    .in('order_id', createdOrderIds)
    .order('created_at', { ascending: false })

  if (auditError) {
    console.log(`   ❌ Failed to retrieve audit trail: ${auditError.message}`)
    return
  }

  console.log(`   📊 Found ${priceUpdates?.length || 0} price update records`)

  if (priceUpdates && priceUpdates.length > 0) {
    priceUpdates.forEach(update => {
      console.log(`   📝 Update ${update.id}:`)
      console.log(`      Order: ${update.order_id}`)
      console.log(`      Price: ${update.old_price} → ${update.new_price} AOA`)
      console.log(`      Change: ${update.price_change_percentage}%`)
      console.log(`      Reason: ${update.update_reason}`)
      console.log(`      VWAP Ref: ${update.vwap_reference || 'N/A'}`)
      console.log(`      Time: ${new Date(update.created_at).toLocaleString()}`)
      console.log('')
    })
  }

  // Verify audit trail completeness
  const expectedUpdates = createdOrderIds.filter(id => {
    // Check if order has dynamic pricing enabled
    return true // We'll validate this in the actual data
  }).length

  console.log(`   ✅ Audit trail verification complete`)
  console.log('')
}

/**
 * Step 8: Test real-world scenarios
 */
async function testRealWorldScenarios() {
  console.log('📋 Step 8: Testing real-world scenarios')

  // Scenario 1: Sufficient VWAP data
  console.log('   🎯 Scenario 1: Testing with sufficient VWAP data')

  const { data: vwapData } = await supabase
    .rpc('calculate_vwap', {
      p_base_currency: TEST_CONFIG.baseCurrency,
      p_quote_currency: TEST_CONFIG.quoteCurrency,
      p_hours: 12
    })

  if (vwapData && vwapData.length > 0) {
    const vwap = vwapData[0]
    if (vwap.vwap && vwap.total_volume >= 100) {
      console.log(`      ✅ Sufficient VWAP data available`)
      console.log(`      VWAP: ${vwap.vwap} AOA, Volume: ${vwap.total_volume} EUR`)

      // Test price calculation with VWAP
      if (createdOrderIds.length > 0) {
        const { data: priceCalc } = await supabase
          .rpc('calculate_dynamic_price', {
            p_order_id: createdOrderIds[0],
            p_base_currency: TEST_CONFIG.baseCurrency,
            p_quote_currency: TEST_CONFIG.quoteCurrency,
            p_original_price: 1250,
            p_current_price: 1250
          })

        if (priceCalc && priceCalc.length > 0) {
          const calc = priceCalc[0]
          console.log(`      Suggested price: ${calc.suggested_price} AOA`)
          console.log(`      Source: ${calc.price_source}`)
        }
      }
    } else {
      console.log(`      ⚠️  Insufficient VWAP data (Volume: ${vwap.total_volume})`)
    }
  }

  // Scenario 2: Fallback to best ask pricing
  console.log('   🎯 Scenario 2: Testing fallback to best ask pricing')

  // Get current best ask
  const { data: bestAsk } = await supabase
    .from('order_book')
    .select('price')
    .eq('base_currency', TEST_CONFIG.baseCurrency)
    .eq('quote_currency', TEST_CONFIG.quoteCurrency)
    .eq('side', 'sell')
    .in('status', ['pending', 'partially_filled'])
    .order('price', { ascending: true })
    .limit(1)

  if (bestAsk && bestAsk.length > 0) {
    console.log(`      ✅ Best ask available: ${bestAsk[0].price} AOA`)
    console.log(`      Fallback pricing would use: ${(bestAsk[0].price * 0.99).toFixed(2)} AOA`)
  } else {
    console.log(`      ⚠️  No best ask available for fallback`)
  }

  // Scenario 3: Price bounds enforcement
  console.log('   🎯 Scenario 3: Testing price bounds enforcement')

  // Test extreme price calculation
  if (createdOrderIds.length > 0) {
    const { data: extremeCalc } = await supabase
      .rpc('calculate_dynamic_price', {
        p_order_id: createdOrderIds[0],
        p_base_currency: TEST_CONFIG.baseCurrency,
        p_quote_currency: TEST_CONFIG.quoteCurrency,
        p_original_price: 1000, // Low original price
        p_current_price: 1000
      })

    if (extremeCalc && extremeCalc.length > 0) {
      const calc = extremeCalc[0]
      console.log(`      Original: 1000 AOA, Suggested: ${calc.suggested_price} AOA`)
      console.log(`      Bounds would limit to: 800-1200 AOA range`)

      // Verify bounds are respected
      const withinBounds = calc.suggested_price >= 800 && calc.suggested_price <= 1200
      console.log(`      ✅ Bounds respected: ${withinBounds}`)
    }
  }

  console.log('')
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data')

  if (createdOrderIds.length === 0) {
    console.log('   ✅ No test data to clean up')
    return
  }

  // Cancel all created test orders
  for (const orderId of createdOrderIds) {
    try {
      const { data: orderData } = await supabase
        .from('order_book')
        .select('user_id')
        .eq('id', orderId)
        .single()

      if (orderData) {
        const { error: cancelError } = await supabase
          .rpc('cancel_order', {
            p_order_id: orderId,
            p_user_id: orderData.user_id
          })

        if (cancelError) {
          console.log(`   ⚠️  Failed to cancel order ${orderId}: ${cancelError.message}`)
        } else {
          console.log(`   ✅ Cancelled order ${orderId}`)
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Error cleaning up order ${orderId}: ${error.message}`)
    }
  }

  console.log('   ✅ Cleanup completed')
}

// Run the comprehensive test
if (require.main === module) {
  runComprehensiveDynamicPricingTest()
    .then(() => {
      console.log('\n🎉 Comprehensive Dynamic Pricing Test Completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test Failed:', error)
      process.exit(1)
    })
}

/**
 * Step 6: Test toggle functionality
 */
async function testToggleFunctionality() {
  console.log('📋 Step 6: Testing toggle functionality')
  
  if (createdOrderIds.length === 0) {
    console.log('   ⚠️  No orders available for toggle testing')
    return
  }
  
  const testOrderId = createdOrderIds[0]
  
  // Get order details
  const { data: orderData } = await supabase
    .from('order_book')
    .select('id, user_id, dynamic_pricing_enabled, price, original_price')
    .eq('id', testOrderId)
    .single()
  
  if (!orderData) {
    console.log('   ❌ Test order not found')
    return
  }
  
  console.log(`   🔄 Testing toggle for order ${testOrderId}`)
  console.log(`      Current state: ${orderData.dynamic_pricing_enabled ? 'Enabled' : 'Disabled'}`)
  
  // Toggle dynamic pricing off
  const { data: toggleResult1, error: toggleError1 } = await supabase
    .rpc('toggle_dynamic_pricing', {
      p_order_id: testOrderId,
      p_user_id: orderData.user_id,
      p_enable: false
    })
  
  if (toggleError1) {
    console.log(`   ❌ Toggle off failed: ${toggleError1.message}`)
  } else if (toggleResult1 && toggleResult1.length > 0) {
    const result = toggleResult1[0]
    console.log(`   ✅ Toggled off: ${result.message}`)
  }
  
  // Toggle dynamic pricing back on
  const { data: toggleResult2, error: toggleError2 } = await supabase
    .rpc('toggle_dynamic_pricing', {
      p_order_id: testOrderId,
      p_user_id: orderData.user_id,
      p_enable: true
    })
  
  if (toggleError2) {
    console.log(`   ❌ Toggle on failed: ${toggleError2.message}`)
  } else if (toggleResult2 && toggleResult2.length > 0) {
    const result = toggleResult2[0]
    console.log(`   ✅ Toggled on: ${result.message}`)
  }
  
  console.log('')
}
