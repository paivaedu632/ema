#!/usr/bin/env node

/**
 * Test Dynamic Pricing API Endpoints
 */

const fetch = require('node-fetch')
require('dotenv').config({ path: '.env.local' })

async function testAPIEndpoints() {
  console.log('🧪 Testing Dynamic Pricing API Endpoints\n')
  
  const baseUrl = 'http://localhost:3000'
  
  try {
    // Test 1: VWAP Calculation Endpoint
    console.log('📋 Test 1: VWAP Calculation API')
    
    const vwapResponse = await fetch(`${baseUrl}/api/market/vwap/EUR-AOA?hours=12`)
    const vwapData = await vwapResponse.json()
    
    if (vwapData.success) {
      console.log('   ✅ VWAP API working')
      console.log(`   VWAP: ${vwapData.data.vwap} AOA per EUR`)
      console.log(`   Volume: ${vwapData.data.total_volume} EUR`)
      console.log(`   Trades: ${vwapData.data.trade_count}`)
      console.log(`   Market Activity: ${vwapData.data.market_activity.active ? 'Active' : 'Inactive'}`)
    } else {
      console.log('   ❌ VWAP API failed:', vwapData.error)
    }
    
    // Test 2: Different currency pairs
    console.log('\n📋 Test 2: Different Currency Pairs')
    
    const pairs = ['EUR-AOA', 'AOA-EUR']
    for (const pair of pairs) {
      try {
        const response = await fetch(`${baseUrl}/api/market/vwap/${pair}?hours=6`)
        const data = await response.json()
        
        if (data.success) {
          console.log(`   ✅ ${pair}: VWAP = ${data.data.vwap || 'N/A'}`)
        } else {
          console.log(`   ⚠️  ${pair}: ${data.error}`)
        }
      } catch (error) {
        console.log(`   ❌ ${pair}: ${error.message}`)
      }
    }
    
    // Test 3: Invalid currency pair
    console.log('\n📋 Test 3: Invalid Currency Pair Validation')
    
    try {
      const invalidResponse = await fetch(`${baseUrl}/api/market/vwap/USD-EUR`)
      const invalidData = await invalidResponse.json()
      
      if (!invalidData.success) {
        console.log('   ✅ Invalid pair correctly rejected:', invalidData.error)
      } else {
        console.log('   ❌ Invalid pair should have been rejected')
      }
    } catch (error) {
      console.log('   ❌ Error testing invalid pair:', error.message)
    }
    
    // Test 4: Different time periods
    console.log('\n📋 Test 4: Different Time Periods')
    
    const periods = [1, 6, 12, 24]
    for (const hours of periods) {
      try {
        const response = await fetch(`${baseUrl}/api/market/vwap/EUR-AOA?hours=${hours}`)
        const data = await response.json()
        
        if (data.success) {
          console.log(`   ✅ ${hours}h: VWAP = ${data.data.vwap || 'N/A'}, Volume = ${data.data.total_volume}`)
        } else {
          console.log(`   ⚠️  ${hours}h: ${data.error}`)
        }
      } catch (error) {
        console.log(`   ❌ ${hours}h: ${error.message}`)
      }
    }
    
    console.log('\n✅ All API endpoint tests completed!')
    
  } catch (error) {
    console.error('❌ API endpoint test failed:', error.message)
  }
}

// Check if Next.js server is running
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:3000/api/health', { timeout: 5000 })
    return response.ok
  } catch (error) {
    return false
  }
}

async function main() {
  const serverRunning = await checkServerStatus()
  
  if (!serverRunning) {
    console.log('⚠️  Next.js server not running on localhost:3000')
    console.log('Please start the server with: npm run dev')
    console.log('Then run this test again.')
    return
  }
  
  await testAPIEndpoints()
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { testAPIEndpoints }
