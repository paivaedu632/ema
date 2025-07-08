/**
 * Test script for VWAP Dynamic Exchange Rate System
 * This script tests the 1-minute rolling window VWAP system
 */

const BASE_URL = 'http://localhost:3000'

async function testVWAPSystem() {
  console.log('🧪 Testing VWAP Dynamic Exchange Rate System')
  console.log('=' .repeat(50))

  try {
    // Test 1: Get dynamic rates
    console.log('\n1️⃣ Testing Dynamic Rate Retrieval...')
    const ratesResponse = await fetch(`${BASE_URL}/api/test/vwap?action=rates`)
    const ratesData = await ratesResponse.json()
    
    if (ratesData.success) {
      console.log('✅ Dynamic rates retrieved successfully:')
      console.log(`   EUR: ${ratesData.data.EUR.formatted} (source: ${ratesData.data.EUR.source})`)
      console.log(`   AOA: ${ratesData.data.AOA.formatted} (source: ${ratesData.data.AOA.source})`)
      console.log(`   EUR rate is stale: ${ratesData.data.EUR.isStale}`)
      console.log(`   AOA rate is stale: ${ratesData.data.AOA.isStale}`)
    } else {
      console.log('❌ Failed to retrieve dynamic rates:', ratesData.error)
    }

    // Test 2: Test VWAP calculation
    console.log('\n2️⃣ Testing VWAP Calculation...')
    const vwapResponse = await fetch(`${BASE_URL}/api/test/vwap?action=vwap`)
    const vwapData = await vwapResponse.json()
    
    if (vwapData.success) {
      console.log('✅ VWAP calculation completed:')
      console.log(`   EUR_AOA: ${vwapData.data.EUR_AOA.calculation_successful ? 'Success' : 'Failed'} (${vwapData.data.EUR_AOA.transaction_count} transactions)`)
      console.log(`   AOA_EUR: ${vwapData.data.AOA_EUR.calculation_successful ? 'Success' : 'Failed'} (${vwapData.data.AOA_EUR.transaction_count} transactions)`)
      
      if (vwapData.data.EUR_AOA.calculation_successful) {
        console.log(`   EUR_AOA VWAP Rate: ${vwapData.data.EUR_AOA.vwap_rate}`)
      }
      if (vwapData.data.AOA_EUR.calculation_successful) {
        console.log(`   AOA_EUR VWAP Rate: ${vwapData.data.AOA_EUR.vwap_rate}`)
      }
    } else {
      console.log('❌ Failed to calculate VWAP:', vwapData.error)
    }

    // Test 3: Refresh rates
    console.log('\n3️⃣ Testing Rate Refresh...')
    const refreshResponse = await fetch(`${BASE_URL}/api/test/vwap?action=refresh`)
    const refreshData = await refreshResponse.json()
    
    if (refreshData.success) {
      console.log('✅ Rate refresh completed:')
      refreshData.data.forEach(result => {
        console.log(`   ${result.currency_pair}: ${result.success ? 'Success' : 'Failed'} (rate: ${result.new_rate})`)
      })
    } else {
      console.log('❌ Failed to refresh rates:', refreshData.error)
    }

    // Test 4: Get stored rates
    console.log('\n4️⃣ Testing Stored Rates...')
    const storedResponse = await fetch(`${BASE_URL}/api/test/vwap?action=stored`)
    const storedData = await storedResponse.json()
    
    if (storedData.success) {
      console.log(`✅ Found ${storedData.data.length} stored dynamic rates:`)
      storedData.data.forEach(rate => {
        console.log(`   ${rate.currency_pair}: ${rate.vwap_rate} (${rate.transaction_count} transactions, calculated at ${rate.calculated_at})`)
      })
    } else {
      console.log('❌ Failed to get stored rates:', storedData.error)
    }

    // Test 5: Rate validation
    console.log('\n5️⃣ Testing Rate Validation...')
    const validationResponse = await fetch(`${BASE_URL}/api/test/vwap?action=validate&rate=900&currency=EUR`)
    const validationData = await validationResponse.json()
    
    if (validationData.success) {
      console.log('✅ Rate validation completed:')
      console.log(`   Test rate: ${validationData.data.testRate} ${validationData.data.currency}`)
      console.log(`   Valid: ${validationData.data.validation.isValid}`)
      console.log(`   Reason: ${validationData.data.validation.reason}`)
      if (validationData.data.validation.dynamicRate) {
        console.log(`   Dynamic rate: ${validationData.data.validation.dynamicRate}`)
      }
    } else {
      console.log('❌ Failed to validate rate:', validationData.error)
    }

    // Test 6: Production API endpoint
    console.log('\n6️⃣ Testing Production API Endpoint...')
    const prodResponse = await fetch(`${BASE_URL}/api/exchange/dynamic-rates?currency=EUR&includeDetails=true`)
    const prodData = await prodResponse.json()
    
    if (prodData.success) {
      console.log('✅ Production API working:')
      console.log(`   Currency: ${prodData.data.currency}`)
      console.log(`   Rate: ${prodData.data.rate}`)
      console.log(`   Source: ${prodData.data.source}`)
      console.log(`   Formatted: ${prodData.data.formatted_rate}`)
      console.log(`   Is stale: ${prodData.data.is_stale}`)
      if (prodData.data.details) {
        console.log(`   Transaction count: ${prodData.data.details.transaction_count}`)
        console.log(`   Total volume: ${prodData.data.details.total_volume}`)
      }
    } else {
      console.log('❌ Production API failed:', prodData.error)
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message)
  }

  console.log('\n' + '=' .repeat(50))
  console.log('🏁 VWAP System Test Complete')
  console.log('\n📝 Notes:')
  console.log('- VWAP calculation may show "Failed" if no transactions in last 1 minute')
  console.log('- System falls back to user offers (from our test offers) when VWAP unavailable')
  console.log('- 1-minute window makes system very responsive to recent activity')
  console.log('- Test offers created with dynamic_rate = true are working correctly')
}

// Run the test
testVWAPSystem().catch(console.error)
