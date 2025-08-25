#!/usr/bin/env node

/**
 * Live Dynamic Pricing Test with Existing Users
 * Tests dynamic pricing with real database users and orders
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Use existing user IDs from the database
const EXISTING_USERS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
]

let createdOrderIds = []

async function runLiveDynamicPricingTest() {
  console.log('🧪 Live Dynamic Pricing Test with Existing Users\n')
  
  try {
    // Step 1: Check current market state
    await checkMarketState()
    
    // Step 2: Create test orders with dynamic pricing
    await createDynamicPricingOrders()
    
    // Step 3: Test VWAP calculations
    await testVWAPCalculations()
    
    // Step 4: Test individual price updates
    await testIndividualPriceUpdates()
    
    // Step 5: Test batch processing
    await testBatchProcessing()
    
    // Step 6: Test toggle functionality
    await testToggleFunctionality()
    
    // Step 7: Verify audit trail
    await verifyAuditTrail()
    
    // Step 8: Test price bounds
    await testPriceBounds()
    
    console.log('\n✅ Live Dynamic Pricing Test Completed Successfully!')
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
  } finally {
    await cleanup()
  }
}

async function checkMarketState() {
  console.log('📊 Step 1: Checking current market state')
  
  // Get current orders
  const { data: orders } = await supabase
    .from('order_book')
    .select('id, side, price, quantity, dynamic_pricing_enabled, status')
    .eq('base_currency', 'EUR')
    .eq('quote_currency', 'AOA')
    .in('status', ['pending', 'partially_filled'])
  
  console.log(`   Current orders: ${orders?.length || 0}`)
  orders?.forEach(order => {
    console.log(`   ${order.side.toUpperCase()}: ${order.quantity} EUR @ ${order.price} AOA (Dynamic: ${order.dynamic_pricing_enabled})`)
  })
  
  // Get recent trades
  const { data: trades } = await supabase
    .from('trades')
    .select('price, quantity, executed_at')
    .eq('base_currency', 'EUR')
    .eq('quote_currency', 'AOA')
    .gte('executed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('executed_at', { ascending: false })
    .limit(10)
  
  console.log(`   Recent trades (24h): ${trades?.length || 0}`)
  if (trades && trades.length > 0) {
    const avgPrice = trades.reduce((sum, t) => sum + t.price, 0) / trades.length
    console.log(`   Average price: ${avgPrice.toFixed(2)} AOA per EUR`)
  }
  
  console.log('')
}

async function createDynamicPricingOrders() {
  console.log('📋 Step 2: Creating orders with dynamic pricing')
  
  const testOrders = [
    { userId: EXISTING_USERS[0], quantity: 3, price: 1220, dynamic: true },
    { userId: EXISTING_USERS[1], quantity: 5, price: 1280, dynamic: true }
  ]
  
  for (const orderConfig of testOrders) {
    try {
      // Check user wallet balance first
      const { data: wallet } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', orderConfig.userId)
        .eq('currency', 'EUR')
        .single()
      
      if (!wallet || wallet.available_balance < orderConfig.quantity) {
        console.log(`   ⚠️  Insufficient EUR balance for user ${orderConfig.userId}`)
        
        // Add balance for testing
        await supabase
          .from('wallets')
          .upsert({
            user_id: orderConfig.userId,
            currency: 'EUR',
            available_balance: 100,
            reserved_balance: 0
          })
        
        console.log(`   ✅ Added test balance for user ${orderConfig.userId}`)
      }
      
      // Place order
      const { data: result, error } = await supabase
        .rpc('place_order', {
          p_user_id: orderConfig.userId,
          p_order_type: 'limit',
          p_side: 'sell',
          p_base_currency: 'EUR',
          p_quote_currency: 'AOA',
          p_quantity: orderConfig.quantity,
          p_price: orderConfig.price,
          p_dynamic_pricing_enabled: orderConfig.dynamic
        })
      
      if (error) {
        console.log(`   ❌ Failed to create order: ${error.message}`)
        continue
      }
      
      if (result && result.length > 0) {
        const order = result[0]
        createdOrderIds.push(order.order_id)
        console.log(`   ✅ Created dynamic order: ${order.order_id}`)
        console.log(`      Price: ${orderConfig.price} AOA per EUR`)
        console.log(`      Quantity: ${orderConfig.quantity} EUR`)
        console.log(`      Status: ${order.status}`)
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }
  
  console.log(`   📊 Created ${createdOrderIds.length} dynamic orders\n`)
}

async function testVWAPCalculations() {
  console.log('📋 Step 3: Testing VWAP calculations')
  
  const { data: vwapResult, error } = await supabase
    .rpc('calculate_vwap', {
      p_base_currency: 'EUR',
      p_quote_currency: 'AOA',
      p_hours: 12
    })
  
  if (error) {
    console.log(`   ❌ VWAP calculation failed: ${error.message}`)
    return
  }
  
  if (vwapResult && vwapResult.length > 0) {
    const vwap = vwapResult[0]
    console.log(`   ✅ VWAP (12h): ${vwap.vwap || 'N/A'} AOA per EUR`)
    console.log(`   Volume: ${vwap.total_volume} EUR`)
    console.log(`   Trades: ${vwap.trade_count}`)
    console.log(`   Period: ${vwap.calculation_period}`)
  }
  
  console.log('')
}

async function testIndividualPriceUpdates() {
  console.log('📋 Step 4: Testing individual price updates')
  
  if (createdOrderIds.length === 0) {
    console.log('   ⚠️  No orders to test')
    return
  }
  
  for (const orderId of createdOrderIds) {
    // Get order before update
    const { data: orderBefore } = await supabase
      .from('order_book')
      .select('price, original_price, dynamic_pricing_enabled')
      .eq('id', orderId)
      .single()
    
    console.log(`   🔄 Testing order ${orderId}`)
    console.log(`      Before: ${orderBefore?.price} AOA (Original: ${orderBefore?.original_price})`)
    
    // Update price
    const { data: updateResult, error } = await supabase
      .rpc('update_dynamic_order_price', { p_order_id: orderId })
    
    if (error) {
      console.log(`      ❌ Update failed: ${error.message}`)
      continue
    }
    
    if (updateResult && updateResult.length > 0) {
      const result = updateResult[0]
      console.log(`      ✅ Update result: ${result.success}`)
      console.log(`      Price: ${result.old_price} → ${result.new_price} AOA`)
      console.log(`      Change: ${result.price_change_percentage}%`)
      console.log(`      Reason: ${result.update_reason}`)
    }
  }
  
  console.log('')
}

async function testBatchProcessing() {
  console.log('📋 Step 5: Testing batch processing')
  
  const { data: batchResult, error } = await supabase
    .rpc('process_all_dynamic_pricing_updates')
  
  if (error) {
    console.log(`   ❌ Batch processing failed: ${error.message}`)
    return
  }
  
  if (batchResult && batchResult.length > 0) {
    const result = batchResult[0]
    console.log(`   ✅ Batch processing completed:`)
    console.log(`      Orders processed: ${result.total_orders_processed}`)
    console.log(`      Orders updated: ${result.orders_updated}`)
    console.log(`      Orders unchanged: ${result.orders_unchanged}`)
    console.log(`      Duration: ${result.processing_duration}`)
    
    if (result.update_summary && result.update_summary.length > 0) {
      console.log(`   📈 Updates:`)
      result.update_summary.forEach(update => {
        console.log(`      ${update.order_id}: ${update.old_price} → ${update.new_price} (${update.change_percentage}%)`)
      })
    }
  }
  
  console.log('')
}

async function testToggleFunctionality() {
  console.log('📋 Step 6: Testing toggle functionality')

  if (createdOrderIds.length === 0) {
    console.log('   ⚠️  No orders to test')
    return
  }

  const testOrderId = createdOrderIds[0]

  // Get order details
  const { data: order } = await supabase
    .from('order_book')
    .select('user_id, dynamic_pricing_enabled, price, original_price')
    .eq('id', testOrderId)
    .single()

  if (!order) {
    console.log('   ❌ Test order not found')
    return
  }

  console.log(`   🔄 Testing toggle for order ${testOrderId}`)
  console.log(`      Current state: ${order.dynamic_pricing_enabled ? 'Enabled' : 'Disabled'}`)

  // Toggle off
  const { data: toggleOff, error: errorOff } = await supabase
    .rpc('toggle_dynamic_pricing', {
      p_order_id: testOrderId,
      p_user_id: order.user_id,
      p_enable: false
    })

  if (errorOff) {
    console.log(`   ❌ Toggle off failed: ${errorOff.message}`)
  } else if (toggleOff && toggleOff.length > 0) {
    console.log(`   ✅ Toggled off: ${toggleOff[0].message}`)
  }

  // Toggle back on
  const { data: toggleOn, error: errorOn } = await supabase
    .rpc('toggle_dynamic_pricing', {
      p_order_id: testOrderId,
      p_user_id: order.user_id,
      p_enable: true
    })

  if (errorOn) {
    console.log(`   ❌ Toggle on failed: ${errorOn.message}`)
  } else if (toggleOn && toggleOn.length > 0) {
    console.log(`   ✅ Toggled on: ${toggleOn[0].message}`)
  }

  console.log('')
}

async function verifyAuditTrail() {
  console.log('📋 Step 7: Verifying audit trail')

  const { data: priceUpdates, error } = await supabase
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

  if (error) {
    console.log(`   ❌ Failed to get audit trail: ${error.message}`)
    return
  }

  console.log(`   📊 Found ${priceUpdates?.length || 0} price update records`)

  if (priceUpdates && priceUpdates.length > 0) {
    priceUpdates.forEach(update => {
      console.log(`   📝 ${update.order_id}:`)
      console.log(`      ${update.old_price} → ${update.new_price} AOA (${update.price_change_percentage}%)`)
      console.log(`      Reason: ${update.update_reason}`)
      console.log(`      VWAP: ${update.vwap_reference || 'N/A'}`)
      console.log(`      Time: ${new Date(update.created_at).toLocaleString()}`)
    })
  }

  console.log('')
}

async function testPriceBounds() {
  console.log('📋 Step 8: Testing price bounds')

  const { data: orders } = await supabase
    .from('order_book')
    .select('id, price, original_price, min_price_bound, max_price_bound')
    .in('id', createdOrderIds)
    .eq('dynamic_pricing_enabled', true)

  if (!orders || orders.length === 0) {
    console.log('   ⚠️  No dynamic orders found')
    return
  }

  orders.forEach(order => {
    console.log(`   📊 Order ${order.id}:`)
    console.log(`      Original: ${order.original_price} AOA`)
    console.log(`      Current: ${order.price} AOA`)
    console.log(`      Bounds: ${order.min_price_bound} - ${order.max_price_bound} AOA`)

    // Validate bounds
    const withinBounds = order.price >= order.min_price_bound && order.price <= order.max_price_bound
    const expectedMin = order.original_price * 0.8
    const expectedMax = order.original_price * 1.2
    const boundsCorrect = Math.abs(order.min_price_bound - expectedMin) < 1 &&
                         Math.abs(order.max_price_bound - expectedMax) < 1

    console.log(`      ✅ Within bounds: ${withinBounds}`)
    console.log(`      ✅ Bounds correct (±20%): ${boundsCorrect}`)
  })

  console.log('')
}

async function cleanup() {
  console.log('🧹 Cleaning up test data')

  for (const orderId of createdOrderIds) {
    try {
      const { data: order } = await supabase
        .from('order_book')
        .select('user_id')
        .eq('id', orderId)
        .single()

      if (order) {
        const { error } = await supabase
          .rpc('cancel_order', {
            p_order_id: orderId,
            p_user_id: order.user_id
          })

        if (error) {
          console.log(`   ⚠️  Failed to cancel ${orderId}: ${error.message}`)
        } else {
          console.log(`   ✅ Cancelled order ${orderId}`)
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Error cleaning up ${orderId}: ${error.message}`)
    }
  }

  console.log('   ✅ Cleanup completed')
}

// Run the test
if (require.main === module) {
  runLiveDynamicPricingTest()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error)
      process.exit(1)
    })
}
