/**
 * Test script for the /api/test-deposit endpoint
 * 
 * This script tests the temporary deposit functionality to ensure it works correctly
 * before using it in the application for testing buy/sell/send operations.
 * 
 * Usage: node scripts/test-deposit-endpoint.js
 * 
 * Prerequisites:
 * - Application must be running (npm run dev)
 * - User must be authenticated (get auth token from browser dev tools)
 */

const BASE_URL = 'http://localhost:3000'

// Test cases for the deposit endpoint
const testCases = [
  {
    name: 'Valid EUR deposit',
    data: { amount: 100.50, currency: 'EUR' },
    expectedStatus: 200
  },
  {
    name: 'Valid AOA deposit',
    data: { amount: 85000, currency: 'AOA' },
    expectedStatus: 200
  },
  {
    name: 'Invalid currency',
    data: { amount: 100, currency: 'USD' },
    expectedStatus: 400
  },
  {
    name: 'Negative amount',
    data: { amount: -50, currency: 'EUR' },
    expectedStatus: 400
  },
  {
    name: 'Zero amount',
    data: { amount: 0, currency: 'EUR' },
    expectedStatus: 400
  },
  {
    name: 'Missing amount',
    data: { currency: 'EUR' },
    expectedStatus: 400
  },
  {
    name: 'Missing currency',
    data: { amount: 100 },
    expectedStatus: 400
  },
  {
    name: 'Invalid amount (string)',
    data: { amount: 'invalid', currency: 'EUR' },
    expectedStatus: 400
  }
]

async function testDepositEndpoint() {
  console.log('🧪 Testing /api/test-deposit endpoint...\n')
  
  // Note: This test requires authentication
  console.log('⚠️  Authentication Required:')
  console.log('   1. Start the application: npm run dev')
  console.log('   2. Login to the application in browser')
  console.log('   3. Get the auth token from browser dev tools')
  console.log('   4. Set the AUTH_TOKEN environment variable')
  console.log('   5. Run this test: AUTH_TOKEN=your_token node scripts/test-deposit-endpoint.js\n')
  
  const authToken = process.env.AUTH_TOKEN
  if (!authToken) {
    console.log('❌ AUTH_TOKEN environment variable not set')
    console.log('   Please follow the authentication steps above')
    process.exit(1)
  }

  let passedTests = 0
  let totalTests = testCases.length

  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`)
      
      const response = await fetch(`${BASE_URL}/api/test-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `__session=${authToken}` // Clerk uses cookies
        },
        body: JSON.stringify(testCase.data)
      })

      const result = await response.json()
      
      if (response.status === testCase.expectedStatus) {
        console.log(`✅ PASS - Status: ${response.status}`)
        if (result.success && testCase.expectedStatus === 200) {
          console.log(`   💰 Deposit: ${testCase.data.amount} ${testCase.data.currency}`)
          console.log(`   💳 New Balance: ${result.data.wallet.balance} ${result.data.wallet.currency}`)
        }
        passedTests++
      } else {
        console.log(`❌ FAIL - Expected: ${testCase.expectedStatus}, Got: ${response.status}`)
        console.log(`   Response: ${JSON.stringify(result, null, 2)}`)
      }
      
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`)
    }
    
    console.log('') // Empty line for readability
  }

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The test-deposit endpoint is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.')
    process.exit(1)
  }
}

// Test without authentication (should fail)
async function testUnauthenticatedAccess() {
  console.log('🔒 Testing unauthenticated access...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/test-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: 100, currency: 'EUR' })
    })

    if (response.status === 401) {
      console.log('✅ PASS - Correctly rejected unauthenticated request (401)')
    } else {
      console.log(`❌ FAIL - Expected 401, got ${response.status}`)
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`)
  }
  
  console.log('')
}

// Run tests
async function runAllTests() {
  await testUnauthenticatedAccess()
  await testDepositEndpoint()
}

runAllTests().catch(console.error)
