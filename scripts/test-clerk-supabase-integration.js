#!/usr/bin/env node

/**
 * Comprehensive Clerk-Supabase Integration Test
 * 
 * This script:
 * 1. Creates a user in Clerk
 * 2. Checks if the user synchronizes to Supabase
 * 3. Extracts JWT token using Playwright
 * 4. Tests API endpoints with the token
 * 
 * Usage:
 *   node scripts/test-clerk-supabase-integration.js
 */

const { createTestUser } = require('./create-test-user');
const { extractJWTToken } = require('./extract-jwt-playwright');
const { testAPIEndpoints } = require('./test-api-endpoints');

// Supabase integration check (we'll need to implement this)
async function checkSupabaseSync(clerkUserId) {
  console.log('🔍 Checking if user synchronized to Supabase...');
  
  try {
    // We'll use curl to check since we have the project ID
    const { spawn } = require('child_process');
    
    // This is a placeholder - we'll implement the actual check
    console.log(`   Looking for user with clerk_user_id: ${clerkUserId}`);
    
    // For now, let's return a placeholder
    return {
      synchronized: false,
      message: 'Supabase sync check not yet implemented'
    };
    
  } catch (error) {
    return {
      synchronized: false,
      error: error.message
    };
  }
}

async function runIntegrationTest() {
  console.log('🧪 CLERK-SUPABASE INTEGRATION TEST\n');
  console.log('This test will verify the complete authentication flow:\n');

  const testResults = {
    userCreation: null,
    supabaseSync: null,
    jwtExtraction: null,
    apiTesting: null,
    overall: 'PENDING'
  };

  try {
    // Step 1: Create user in Clerk
    console.log('📝 STEP 1: Creating user in Clerk');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const userResult = await createTestUser({
      email: `integration-test-${Date.now()}@emapay.test`,
      password: 'EmaPay2024!Integration',
      firstName: 'Integration',
      lastName: 'Test'
    });

    testResults.userCreation = userResult;

    if (!userResult.success) {
      console.log('❌ User creation failed. Stopping test.');
      testResults.overall = 'FAILED';
      return testResults;
    }

    const { user } = userResult;
    console.log('✅ User created successfully in Clerk\n');

    // Step 2: Check Supabase synchronization
    console.log('📝 STEP 2: Checking Supabase synchronization');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Wait a moment for potential webhook processing
    console.log('⏳ Waiting 5 seconds for potential webhook processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const syncResult = await checkSupabaseSync(user.userId);
    testResults.supabaseSync = syncResult;
    
    if (syncResult.synchronized) {
      console.log('✅ User synchronized to Supabase');
    } else {
      console.log('❌ User NOT synchronized to Supabase');
      console.log(`   Reason: ${syncResult.message || syncResult.error}`);
    }
    console.log('');

    // Step 3: Extract JWT token
    console.log('📝 STEP 3: Extracting JWT token with Playwright');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const jwtResult = await extractJWTToken({
      email: user.email,
      password: user.password,
      headless: true,
      timeout: 45000 // Longer timeout for integration test
    });

    testResults.jwtExtraction = jwtResult;

    if (!jwtResult.success) {
      console.log('❌ JWT extraction failed. This might indicate:');
      console.log('   1. Authentication flow issues');
      console.log('   2. User not properly created');
      console.log('   3. Frontend authentication problems');
      testResults.overall = 'FAILED';
      return testResults;
    }

    console.log('✅ JWT token extracted successfully\n');

    // Step 4: Test API endpoints
    console.log('📝 STEP 4: Testing API endpoints');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const apiResult = await testAPIEndpoints({
      token: jwtResult.token
    });

    testResults.apiTesting = apiResult;

    // Determine overall result
    const protectedEndpointsWorking = apiResult.summary.passed > 0 && 
                                    apiResult.protected.some(r => r.success);

    if (protectedEndpointsWorking) {
      testResults.overall = 'SUCCESS';
      console.log('\n🎉 INTEGRATION TEST PASSED!');
    } else {
      testResults.overall = 'PARTIAL';
      console.log('\n⚠️ INTEGRATION TEST PARTIALLY SUCCESSFUL');
      console.log('   User creation and JWT extraction worked, but API authentication failed');
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    testResults.overall = 'FAILED';
    testResults.error = error.message;
  }

  // Final summary
  console.log('\n📊 INTEGRATION TEST SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Overall Result: ${testResults.overall}`);
  console.log(`User Creation: ${testResults.userCreation?.success ? '✅' : '❌'}`);
  console.log(`Supabase Sync: ${testResults.supabaseSync?.synchronized ? '✅' : '❌'}`);
  console.log(`JWT Extraction: ${testResults.jwtExtraction?.success ? '✅' : '❌'}`);
  console.log(`API Testing: ${testResults.apiTesting?.summary ? 
    `${testResults.apiTesting.summary.passed}/${testResults.apiTesting.summary.total} passed` : '❌'}`);

  // Save results
  const fs = require('fs');
  fs.writeFileSync('.integration-test-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n💾 Full results saved to .integration-test-results.json');

  return testResults;
}

// Run the integration test
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}

module.exports = { runIntegrationTest };
