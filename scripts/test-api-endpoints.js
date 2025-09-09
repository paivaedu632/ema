#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Testing with Playwright-extracted JWT tokens
 * 
 * Usage:
 *   node scripts/test-api-endpoints.js
 *   node scripts/test-api-endpoints.js --extract-fresh-token
 *   node scripts/test-api-endpoints.js --token=your_jwt_token_here
 */

const fs = require('fs');
const { extractJWTToken } = require('./extract-jwt-playwright');

// API endpoints to test
const API_ENDPOINTS = {
  // Public endpoints (no auth required)
  public: [
    { method: 'GET', path: '/api/v1/health/status', description: 'System health check' },
    { method: 'GET', path: '/api/v1/market/summary', description: 'Market data summary' },
    { method: 'GET', path: '/api/v1/market/depth', description: 'Market order book' }
  ],
  
  // Protected endpoints (auth required)
  protected: [
    { method: 'GET', path: '/api/v1/auth/me', description: 'Get current user info' },
    { method: 'GET', path: '/api/v1/wallets/balance', description: 'Get wallet balances' },
    { method: 'GET', path: '/api/v1/wallets/AOA', description: 'Get AOA wallet details' },
    { method: 'GET', path: '/api/v1/wallets/EUR', description: 'Get EUR wallet details' },
    { method: 'GET', path: '/api/v1/users/search?q=test', description: 'Search users' },
    { method: 'GET', path: '/api/v1/transfers/history', description: 'Transfer history' },
    { method: 'GET', path: '/api/v1/orders/history', description: 'Order history' }
  ]
};

const BASE_URL = 'http://localhost:3000';

async function makeAPIRequest(endpoint, token = null) {
  const url = `${BASE_URL}${endpoint.path}`;
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers
    });

    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data,
      endpoint: endpoint.path,
      method: endpoint.method
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      endpoint: endpoint.path,
      method: endpoint.method
    };
  }
}

async function testAPIEndpoints(options = {}) {
  console.log('🧪 EmaPay API Endpoint Testing\n');

  let jwtToken = options.token;

  // Get JWT token
  if (!jwtToken) {
    if (options.extractFreshToken) {
      console.log('🎭 Extracting fresh JWT token with Playwright...\n');
      
      if (!options.password) {
        console.log('❌ Password required for fresh token extraction!');
        console.log('Usage: node scripts/test-api-endpoints.js --extract-fresh-token --password=your_password');
        return;
      }

      const result = await extractJWTToken({
        email: options.email,
        password: options.password,
        headless: true
      });

      if (!result.success) {
        console.log('❌ Failed to extract JWT token:', result.error);
        return;
      }

      jwtToken = result.token;
    } else {
      // Try to load token from file
      try {
        jwtToken = fs.readFileSync('.jwt-token', 'utf8').trim();
        console.log('📄 Using JWT token from .jwt-token file\n');
      } catch (error) {
        console.log('❌ No JWT token found!');
        console.log('💡 Options:');
        console.log('   1. Run: node scripts/test-api-endpoints.js --extract-fresh-token --password=your_password');
        console.log('   2. Run: node scripts/extract-jwt-playwright.js --password=your_password');
        console.log('   3. Provide token: node scripts/test-api-endpoints.js --token=your_jwt_token');
        return;
      }
    }
  }

  console.log('🔐 JWT Token loaded successfully\n');

  // Test results
  const results = {
    public: [],
    protected: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  // Test public endpoints
  console.log('🌐 Testing Public Endpoints (No Authentication Required)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const endpoint of API_ENDPOINTS.public) {
    process.stdout.write(`${endpoint.method} ${endpoint.path} - ${endpoint.description}... `);
    
    const result = await makeAPIRequest(endpoint);
    results.public.push(result);
    results.summary.total++;

    if (result.success) {
      console.log('✅ PASS');
      results.summary.passed++;
    } else {
      console.log(`❌ FAIL (${result.status || 'ERROR'})`);
      results.summary.failed++;
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  console.log('');

  // Test protected endpoints
  console.log('🔐 Testing Protected Endpoints (Authentication Required)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const endpoint of API_ENDPOINTS.protected) {
    process.stdout.write(`${endpoint.method} ${endpoint.path} - ${endpoint.description}... `);
    
    const result = await makeAPIRequest(endpoint, jwtToken);
    results.protected.push(result);
    results.summary.total++;

    if (result.success) {
      console.log('✅ PASS');
      results.summary.passed++;
    } else {
      console.log(`❌ FAIL (${result.status || 'ERROR'})`);
      results.summary.failed++;
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else if (result.data && result.data.error) {
        console.log(`   API Error: ${result.data.error}`);
      }
    }
  }

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);

  // Save detailed results
  const detailedResults = {
    timestamp: new Date().toISOString(),
    summary: results.summary,
    publicEndpoints: results.public,
    protectedEndpoints: results.protected,
    jwtTokenUsed: jwtToken ? jwtToken.substring(0, 50) + '...' : null
  };

  fs.writeFileSync('.api-test-results.json', JSON.stringify(detailedResults, null, 2));
  console.log('\n💾 Detailed results saved to .api-test-results.json');

  // Show failed tests details
  const failedTests = [...results.public, ...results.protected].filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS DETAILS:');
    failedTests.forEach(test => {
      console.log(`\n${test.method} ${test.endpoint}:`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      } else if (test.data) {
        console.log(`   Response: ${JSON.stringify(test.data, null, 2)}`);
      }
    });
  }

  return results;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach(arg => {
    if (arg === '--extract-fresh-token') {
      options.extractFreshToken = true;
    } else if (arg.startsWith('--token=')) {
      options.token = arg.split('=')[1];
    } else if (arg.startsWith('--email=')) {
      options.email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      options.password = arg.split('=')[1];
    }
  });

  return options;
}

// Run the script
if (require.main === module) {
  const options = parseArgs();
  testAPIEndpoints(options).catch(console.error);
}

module.exports = { testAPIEndpoints, makeAPIRequest };
