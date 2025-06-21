/**
 * EmaPay Buy Transaction API Test Script
 * Tests the /api/transactions/buy endpoint with various scenarios
 */

// Test configuration
const API_BASE_URL = 'http://localhost:3000';
const TEST_EXCHANGE_RATE = 924.0675; // Static rate used by the system

// Test users from database (based on our query results)
const TEST_USERS = {
  EDGAR: {
    id: '264410e2-189e-4bf5-84da-d9ad39a75933',
    email: 'paivaedu.br@gmail.com',
    clerk_id: 'user_2yOoLt1xVABfEEIwD1UB3dJ7hur',
    eur_balance: 10000000.00,
    aoa_balance: 0.00
  },
  MARIA: {
    id: 'fabce27b-8951-4b95-af26-53fe38d0a0b1',
    email: 'maria.santos.emapay@gmail.com',
    clerk_id: 'user_2yinvNtw5oKMavtKn0zeQWobrf7',
    eur_balance: 1800.00,
    aoa_balance: 10000.00
  },
  JOAO: {
    id: 'e8de74e3-5372-489a-8c17-090ea105f0c6',
    email: 'joao.pereira.emapay@gmail.com',
    clerk_id: 'user_2yinwAFoZ6TWG6YHm9yb7tGvWXO',
    eur_balance: 500.00,
    aoa_balance: 0.00
  },
  ANA: {
    id: '77561efc-c31c-4ab9-80c7-8d75e0761927',
    email: 'ana.silva.emapay@gmail.com',
    clerk_id: 'user_2yinwhoD8V8ttR6uBdYh4LPrNh5',
    eur_balance: 500.00,
    aoa_balance: 49000.00
  }
};

// Transaction limits from validation rules
const TRANSACTION_LIMITS = {
  EUR: { min: 1, max: 10000 },
  AOA: { min: 1000, max: 1000000000 }
};

/**
 * Test cases for buy transaction API
 */
const TEST_CASES = [
  // Valid transactions
  {
    name: 'Valid small buy transaction',
    user: 'EDGAR',
    amount: 10,
    expectedSuccess: true,
    description: 'Test minimum valid EUR amount with sufficient balance'
  },
  {
    name: 'Valid medium buy transaction',
    user: 'MARIA',
    amount: 100,
    expectedSuccess: true,
    description: 'Test medium EUR amount with sufficient balance'
  },
  {
    name: 'Valid large buy transaction',
    user: 'EDGAR',
    amount: 1000,
    expectedSuccess: true,
    description: 'Test large EUR amount with sufficient balance'
  },
  
  // Limit validation tests
  {
    name: 'Below minimum limit',
    user: 'EDGAR',
    amount: 0.5,
    expectedSuccess: false,
    expectedError: 'Invalid amount',
    description: 'Test amount below minimum EUR limit (1 EUR)'
  },
  {
    name: 'Above maximum limit',
    user: 'EDGAR',
    amount: 15000,
    expectedSuccess: false,
    expectedError: 'Valor máximo',
    description: 'Test amount above maximum EUR limit (10,000 EUR)'
  },
  
  // Balance validation tests
  {
    name: 'Insufficient balance - João',
    user: 'JOAO',
    amount: 600,
    expectedSuccess: false,
    expectedError: 'insufficient',
    description: 'Test transaction exceeding available EUR balance (500 EUR)'
  },
  {
    name: 'Insufficient balance - Maria',
    user: 'MARIA',
    amount: 2000,
    expectedSuccess: false,
    expectedError: 'insufficient',
    description: 'Test transaction exceeding available EUR balance (1800 EUR)'
  },
  
  // Edge cases
  {
    name: 'Exact balance amount',
    user: 'JOAO',
    amount: 500,
    expectedSuccess: true,
    description: 'Test transaction using exact available balance'
  },
  {
    name: 'Zero amount',
    user: 'EDGAR',
    amount: 0,
    expectedSuccess: false,
    expectedError: 'Invalid amount',
    description: 'Test zero amount validation'
  },
  {
    name: 'Negative amount',
    user: 'EDGAR',
    amount: -10,
    expectedSuccess: false,
    expectedError: 'Invalid amount',
    description: 'Test negative amount validation'
  }
];

/**
 * Helper function to make API request
 */
async function makeApiRequest(amount, exchangeRate = TEST_EXCHANGE_RATE) {
  const response = await fetch(`${API_BASE_URL}/api/transactions/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Note: In real testing, we would need proper authentication headers
      // For now, this script documents the test structure
    },
    body: JSON.stringify({
      amount: amount,
      exchangeRate: exchangeRate
    })
  });
  
  const result = await response.json();
  return { response, result };
}

/**
 * Calculate expected AOA amount based on exchange rate
 */
function calculateExpectedAOA(eurAmount, exchangeRate = TEST_EXCHANGE_RATE) {
  const feeAmount = eurAmount * 0.02; // 2% fee
  const netAmount = eurAmount - feeAmount;
  const aoaAmount = netAmount * exchangeRate;
  return {
    feeAmount: feeAmount,
    netAmount: netAmount,
    aoaAmount: aoaAmount
  };
}

/**
 * Validate API response structure
 */
function validateResponseStructure(result, isSuccess = true) {
  const requiredFields = ['success', 'timestamp'];
  
  if (isSuccess) {
    requiredFields.push('data', 'message');
    // Check transaction data structure
    if (result.data) {
      const transactionFields = ['transaction_id', 'status', 'amount', 'currency', 'fee_amount', 'net_amount'];
      return transactionFields.every(field => result.data.hasOwnProperty(field));
    }
  } else {
    requiredFields.push('error');
  }
  
  return requiredFields.every(field => result.hasOwnProperty(field));
}

/**
 * Run a single test case
 */
async function runTestCase(testCase) {
  console.log(`\n🧪 Running: ${testCase.name}`);
  console.log(`   Description: ${testCase.description}`);
  console.log(`   User: ${testCase.user} (${TEST_USERS[testCase.user].email})`);
  console.log(`   Amount: ${testCase.amount} EUR`);
  
  try {
    const { response, result } = await makeApiRequest(testCase.amount);
    
    // Validate response structure
    const structureValid = validateResponseStructure(result, testCase.expectedSuccess);
    
    // Check if result matches expectation
    const success = result.success === testCase.expectedSuccess;
    
    if (testCase.expectedSuccess) {
      // For successful transactions, validate calculations
      const expected = calculateExpectedAOA(testCase.amount);
      console.log(`   Expected AOA: ${expected.aoaAmount.toFixed(2)}`);
      console.log(`   Expected Fee: ${expected.feeAmount.toFixed(2)} EUR`);
      
      if (result.data) {
        console.log(`   Actual AOA: ${result.data.metadata?.aoa_amount || 'N/A'}`);
        console.log(`   Actual Fee: ${result.data.fee_amount || 'N/A'} EUR`);
      }
    } else {
      // For failed transactions, check error message
      console.log(`   Expected Error: ${testCase.expectedError}`);
      console.log(`   Actual Error: ${result.error || 'N/A'}`);
    }
    
    console.log(`   ✅ Status: ${success ? 'PASS' : 'FAIL'}`);
    console.log(`   📋 Structure Valid: ${structureValid ? 'YES' : 'NO'}`);
    
    return {
      testCase: testCase.name,
      passed: success && structureValid,
      response: result
    };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      testCase: testCase.name,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting EmaPay Buy Transaction API Tests');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    const result = await runTestCase(testCase);
    results.push(result);
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  // Failed tests
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(f => {
      console.log(`   - ${f.testCase}: ${f.error || 'Assertion failed'}`);
    });
  }
  
  return results;
}

// Export for use in testing environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    runTestCase,
    TEST_CASES,
    TEST_USERS,
    calculateExpectedAOA,
    validateResponseStructure
  };
}

// Run tests if script is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}
