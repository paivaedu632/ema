// Test script to verify market order API fix
const fetch = require('node-fetch');

async function testMarketOrderAPI() {
  const baseUrl = 'http://localhost:3000';
  
  // Test data for a market order that should trigger rejection
  const testOrder = {
    side: 'sell',
    amount: 1000, // Large amount that should exceed available cross-user liquidity
    baseCurrency: 'EUR',
    quoteCurrency: 'AOA',
    slippageLimit: 0.05
  };

  try {
    console.log('🧪 Testing Market Order API Fix...');
    console.log('📤 Sending market order request:', testOrder);
    
    const response = await fetch(`${baseUrl}/api/v1/orders/market`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test won't work without proper authentication
        // This is just to demonstrate the API structure
      },
      body: JSON.stringify(testOrder)
    });

    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (response.status === 200) {
      console.log('✅ API returned success - checking if order was actually filled...');
      if (result.data?.status === 'filled') {
        console.log('✅ Order was successfully filled');
      } else {
        console.log('❌ Order status is not filled:', result.data?.status);
      }
    } else {
      console.log('❌ API returned error (this is expected for rejected orders)');
      console.log('🔍 Error details:', result.error || result.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Note: This test requires authentication and a running server
console.log('⚠️  This test requires proper authentication to work');
console.log('⚠️  Run this after setting up proper auth tokens');

// Uncomment to run the test:
// testMarketOrderAPI();
