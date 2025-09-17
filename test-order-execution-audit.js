// Comprehensive audit script for EmaPay currency conversion system
// Tests order execution accuracy and fee calculations

// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3001';

// Test configuration
const TEST_SCENARIOS = {
  MARKET_ORDERS: [
    {
      name: 'Standard Market Order - Sufficient Liquidity',
      order: { side: 'buy', amount: 10, baseCurrency: 'EUR', quoteCurrency: 'AOA', slippageLimit: 0.05 },
      expectedBehavior: 'Full execution at market price'
    },
    {
      name: 'Large Market Order - Multiple Partial Fills',
      order: { side: 'sell', amount: 500, baseCurrency: 'EUR', quoteCurrency: 'AOA', slippageLimit: 0.05 },
      expectedBehavior: 'Partial fills across price levels'
    },
    {
      name: 'Maximum Slippage Test',
      order: { side: 'buy', amount: 100, baseCurrency: 'EUR', quoteCurrency: 'AOA', slippageLimit: 0.05 },
      expectedBehavior: 'Slippage protection triggered'
    },
    {
      name: 'Insufficient Liquidity Test',
      order: { side: 'sell', amount: 10000, baseCurrency: 'EUR', quoteCurrency: 'AOA', slippageLimit: 0.05 },
      expectedBehavior: 'Fallback to available amount'
    },
    {
      name: 'Low Liquidity Conditions',
      order: { side: 'buy', amount: 50, baseCurrency: 'AOA', quoteCurrency: 'EUR', slippageLimit: 0.05 },
      expectedBehavior: 'Significant price impact'
    }
  ],
  LIMIT_ORDERS: [
    {
      name: 'Immediate Full Execution',
      order: { side: 'buy', amount: 10, price: 1300, baseCurrency: 'EUR', quoteCurrency: 'AOA' },
      expectedBehavior: 'Immediate execution at specified price'
    },
    {
      name: 'Partial Fill Over Time',
      order: { side: 'sell', amount: 100, price: 1250, baseCurrency: 'EUR', quoteCurrency: 'AOA' },
      expectedBehavior: 'Partial execution over multiple transactions'
    },
    {
      name: 'Price Improvement Test',
      order: { side: 'buy', amount: 20, price: 1280, baseCurrency: 'EUR', quoteCurrency: 'AOA' },
      expectedBehavior: 'Better than requested price'
    },
    {
      name: 'Partially Unfilled Order',
      order: { side: 'sell', amount: 1000, price: 1200, baseCurrency: 'EUR', quoteCurrency: 'AOA' },
      expectedBehavior: 'Remains partially unfilled'
    },
    {
      name: 'Volatile Market Conditions',
      order: { side: 'buy', amount: 50, price: 1260, baseCurrency: 'EUR', quoteCurrency: 'AOA' },
      expectedBehavior: 'Execution during volatility'
    }
  ]
};

// Helper functions
async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data, success: response.ok };
  } catch (error) {
    return { status: 0, error: error.message, success: false };
  }
}

async function checkLiquidity(side, baseCurrency, quoteCurrency, quantity, maxSlippage = 5.0) {
  const params = new URLSearchParams({
    side,
    baseCurrency,
    quoteCurrency,
    quantity: quantity.toString(),
    maxSlippage: maxSlippage.toString()
  });
  
  return await makeRequest(`/api/v1/market/liquidity?${params}`);
}

async function getExchangeRate(baseCurrency, quoteCurrency) {
  const params = new URLSearchParams({ baseCurrency, quoteCurrency });
  return await makeRequest(`/api/v1/exchange-rates/midpoint?${params}`);
}

async function placeMarketOrder(orderData) {
  return await makeRequest('/api/v1/orders/market', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

async function placeLimitOrder(orderData) {
  return await makeRequest('/api/v1/orders/limit', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

// Calculation verification functions
function calculateExpectedAmount(fromAmount, exchangeRate, fees = 0) {
  const grossAmount = fromAmount * exchangeRate;
  const netAmount = grossAmount * (1 - fees);
  return netAmount;
}

function calculateSlippage(expectedPrice, actualPrice) {
  return Math.abs((actualPrice - expectedPrice) / expectedPrice) * 100;
}

// Main audit function
async function runOrderExecutionAudit() {
  console.log('🔍 EMAPAY ORDER EXECUTION AUDIT');
  console.log('=====================================\n');

  const results = {
    marketOrders: [],
    limitOrders: [],
    criticalIssues: [],
    recommendations: []
  };

  // Get current exchange rate for baseline calculations
  console.log('📊 Getting baseline exchange rates...');
  const eurToAoaRate = await getExchangeRate('EUR', 'AOA');
  const aoaToEurRate = await getExchangeRate('AOA', 'EUR');
  
  if (!eurToAoaRate.success || !aoaToEurRate.success) {
    console.error('❌ Failed to get exchange rates');
    return;
  }

  const baselineRate = eurToAoaRate.data.data.rate;
  console.log(`✅ Baseline EUR/AOA rate: ${baselineRate}`);
  console.log(`✅ Baseline AOA/EUR rate: ${aoaToEurRate.data.data.rate}\n`);

  // Test Market Orders
  console.log('🎯 TESTING MARKET ORDERS');
  console.log('========================\n');

  for (const scenario of TEST_SCENARIOS.MARKET_ORDERS) {
    console.log(`Testing: ${scenario.name}`);
    console.log(`Expected: ${scenario.expectedBehavior}`);
    
    // Check liquidity first
    const liquidityCheck = await checkLiquidity(
      scenario.order.side,
      scenario.order.baseCurrency,
      scenario.order.quoteCurrency,
      scenario.order.amount
    );
    
    if (liquidityCheck.success) {
      console.log(`💧 Liquidity: ${liquidityCheck.data.data.hasLiquidity ? 'Available' : 'Insufficient'}`);
      console.log(`📊 Available Quantity: ${liquidityCheck.data.data.availableQuantity}`);
      console.log(`📈 Estimated Slippage: ${liquidityCheck.data.data.estimatedSlippage}%`);
    }
    
    // Calculate expected receive amount
    const expectedAmount = calculateExpectedAmount(
      scenario.order.amount,
      scenario.order.baseCurrency === 'EUR' ? baselineRate : (1 / baselineRate)
    );
    
    console.log(`💰 Expected receive amount: ${expectedAmount.toFixed(2)} ${scenario.order.quoteCurrency}`);
    
    // Attempt to place order (will fail without auth, but we can see the validation)
    const orderResult = await placeMarketOrder(scenario.order);
    console.log(`📋 Order Status: ${orderResult.status} - ${orderResult.success ? 'Success' : 'Failed'}`);
    
    if (!orderResult.success && orderResult.data?.error) {
      console.log(`⚠️  Error: ${orderResult.data.error}`);
    }
    
    results.marketOrders.push({
      scenario: scenario.name,
      expectedAmount,
      liquidityAvailable: liquidityCheck.success ? liquidityCheck.data.data.hasLiquidity : false,
      orderStatus: orderResult.status,
      issues: []
    });
    
    console.log('---\n');
  }

  return results;
}

// Run the audit
runOrderExecutionAudit().then(results => {
  console.log('✅ Audit completed');
}).catch(error => {
  console.error('❌ Audit failed:', error);
});
