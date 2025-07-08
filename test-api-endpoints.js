/**
 * Comprehensive API Endpoint Testing for VWAP Dynamic Exchange Rate System
 * Tests all VWAP-related endpoints to ensure production readiness
 */

const BASE_URL = 'http://localhost:8080'

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
}

// Helper function to log test results
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL'
  console.log(`${status} ${name}`)
  if (details) console.log(`   ${details}`)
  
  testResults.tests.push({ name, passed, details })
  if (passed) testResults.passed++
  else testResults.failed++
}

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    return { response, data, status: response.status }
  } catch (error) {
    return { error: error.message, status: 0 }
  }
}

async function runTests() {
  console.log('🧪 Testing VWAP Dynamic Exchange Rate System API Endpoints')
  console.log('=' .repeat(70))

  // Test 1: Dynamic Rates API - EUR with details
  console.log('\n📊 Testing Dynamic Rates API')
  try {
    const { data, status } = await apiRequest('/api/exchange/dynamic-rates?currency=EUR&includeDetails=true')
    
    if (status === 200 && data.success) {
      logTest('Dynamic Rates API - EUR with details', true, 
        `Rate: ${data.data.rate}, Source: ${data.data.source}, Formatted: ${data.data.formatted_rate}`)
      
      // Validate response structure
      const hasRequiredFields = data.data.currency && data.data.rate && data.data.source && data.data.formatted_rate
      logTest('Dynamic Rates API - Response structure', hasRequiredFields, 
        hasRequiredFields ? 'All required fields present' : 'Missing required fields')
    } else {
      logTest('Dynamic Rates API - EUR with details', false, `Status: ${status}, Error: ${data.error || 'Unknown error'}`)
    }
  } catch (error) {
    logTest('Dynamic Rates API - EUR with details', false, `Exception: ${error.message}`)
  }

  // Test 2: Dynamic Rates API - AOA with details
  try {
    const { data, status } = await apiRequest('/api/exchange/dynamic-rates?currency=AOA&includeDetails=true')
    
    if (status === 200 && data.success) {
      logTest('Dynamic Rates API - AOA with details', true, 
        `Rate: ${data.data.rate}, Source: ${data.data.source}, Formatted: ${data.data.formatted_rate}`)
    } else {
      logTest('Dynamic Rates API - AOA with details', false, `Status: ${status}, Error: ${data.error || 'Unknown error'}`)
    }
  } catch (error) {
    logTest('Dynamic Rates API - AOA with details', false, `Exception: ${error.message}`)
  }

  // Test 3: Dynamic Rates API - Invalid currency
  try {
    const { data, status } = await apiRequest('/api/exchange/dynamic-rates?currency=USD')
    
    if (status === 400 && !data.success) {
      logTest('Dynamic Rates API - Invalid currency handling', true, 'Correctly rejected invalid currency')
    } else {
      logTest('Dynamic Rates API - Invalid currency handling', false, `Expected 400 error, got status: ${status}`)
    }
  } catch (error) {
    logTest('Dynamic Rates API - Invalid currency handling', false, `Exception: ${error.message}`)
  }

  // Test 4: Test VWAP endpoints
  console.log('\n🔬 Testing VWAP Test Endpoints')
  
  // Test rates action
  try {
    const { data, status } = await apiRequest('/api/test/vwap?action=rates')
    
    if (status === 200 && data.success) {
      logTest('VWAP Test - Rates action', true, 
        `EUR source: ${data.data.EUR.source}, AOA source: ${data.data.AOA.source}`)
    } else {
      logTest('VWAP Test - Rates action', false, `Status: ${status}, Error: ${data.error || 'Unknown error'}`)
    }
  } catch (error) {
    logTest('VWAP Test - Rates action', false, `Exception: ${error.message}`)
  }

  // Test vwap action
  try {
    const { data, status } = await apiRequest('/api/test/vwap?action=vwap')
    
    if (status === 200 && data.success) {
      logTest('VWAP Test - VWAP calculation', true, 
        `EUR_AOA success: ${data.data.EUR_AOA.calculation_successful}, AOA_EUR success: ${data.data.AOA_EUR.calculation_successful}`)
    } else {
      logTest('VWAP Test - VWAP calculation', false, `Status: ${status}, Error: ${data.error || 'Unknown error'}`)
    }
  } catch (error) {
    logTest('VWAP Test - VWAP calculation', false, `Exception: ${error.message}`)
  }

  // Test refresh action
  try {
    const { data, status } = await apiRequest('/api/test/vwap?action=refresh')
    
    if (status === 200 && data.success) {
      logTest('VWAP Test - Refresh action', true, `Refreshed ${data.data.length} currency pairs`)
    } else {
      logTest('VWAP Test - Refresh action', false, `Status: ${status}, Error: ${data.error || 'Unknown error'}`)
    }
  } catch (error) {
    logTest('VWAP Test - Refresh action', false, `Exception: ${error.message}`)
  }

  // Test stored action
  try {
    const { data, status } = await apiRequest('/api/test/vwap?action=stored')
    
    if (status === 200 && data.success) {
      logTest('VWAP Test - Stored rates', true, `Found ${data.data.length} stored rates`)
    } else {
      logTest('VWAP Test - Stored rates', false, `Status: ${status}, Error: ${data.error || 'Unknown error'}`)
    }
  } catch (error) {
    logTest('VWAP Test - Stored rates', false, `Exception: ${error.message}`)
  }

  // Test validate action
  try {
    const { data, status } = await apiRequest('/api/test/vwap?action=validate&rate=950&currency=EUR')
    
    if (status === 200 && data.success) {
      logTest('VWAP Test - Rate validation', true, 
        `Rate ${data.data.testRate} is ${data.data.validation.isValid ? 'valid' : 'invalid'}`)
    } else {
      logTest('VWAP Test - Rate validation', false, `Status: ${status}, Error: ${data.error || 'Unknown error'}`)
    }
  } catch (error) {
    logTest('VWAP Test - Rate validation', false, `Exception: ${error.message}`)
  }

  // Test 5: Dynamic Rates Refresh POST endpoint
  console.log('\n🔄 Testing Dynamic Rates Refresh')
  try {
    const { data, status } = await apiRequest('/api/exchange/dynamic-rates/refresh', { method: 'POST' })
    
    if (status === 200 && data.success) {
      logTest('Dynamic Rates Refresh POST', true, `Refresh completed: ${data.data.message}`)
    } else {
      logTest('Dynamic Rates Refresh POST', false, `Status: ${status}, Error: ${data.error || 'Unknown error'}`)
    }
  } catch (error) {
    logTest('Dynamic Rates Refresh POST', false, `Exception: ${error.message}`)
  }

  // Test 6: Invalid test action
  try {
    const { data, status } = await apiRequest('/api/test/vwap?action=invalid')
    
    if (status === 400 && !data.success) {
      logTest('VWAP Test - Invalid action handling', true, 'Correctly rejected invalid action')
    } else {
      logTest('VWAP Test - Invalid action handling', false, `Expected 400 error, got status: ${status}`)
    }
  } catch (error) {
    logTest('VWAP Test - Invalid action handling', false, `Exception: ${error.message}`)
  }

  // Summary
  console.log('\n' + '=' .repeat(70))
  console.log('📋 Test Summary')
  console.log(`✅ Passed: ${testResults.passed}`)
  console.log(`❌ Failed: ${testResults.failed}`)
  console.log(`📊 Total: ${testResults.tests.length}`)
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`)

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:')
    testResults.tests.filter(t => !t.passed).forEach(test => {
      console.log(`   • ${test.name}: ${test.details}`)
    })
  }

  console.log('\n🏁 API Endpoint Testing Complete')
  
  return testResults.failed === 0
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Test execution failed:', error)
  process.exit(1)
})
