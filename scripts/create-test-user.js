#!/usr/bin/env node

/**
 * Create a test user in Clerk and verify Supabase synchronization
 * 
 * Usage:
 *   node scripts/create-test-user.js
 *   node scripts/create-test-user.js --email=test@example.com --password=TestPass123!
 */

require('dotenv').config({ path: '.env.local' });
const { createClerkClient } = require('@clerk/backend');

async function createTestUser(options = {}) {
  const {
    email = `test-${Date.now()}@emapay.test`,
    password = 'EmaPay2024!Test',
    firstName = 'Test',
    lastName = 'User'
  } = options;

  console.log('👤 Creating Test User in Clerk\n');
  console.log('📋 User Details:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Name: ${firstName} ${lastName}\n`);

  try {
    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    
    if (!CLERK_SECRET_KEY) {
      console.log('❌ CLERK_SECRET_KEY not found in .env.local');
      return;
    }

    const clerkClient = createClerkClient({ 
      secretKey: CLERK_SECRET_KEY 
    });

    console.log('🔄 Creating user in Clerk...');
    
    // Create user in Clerk with proper parameters
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      password: password,
      firstName: firstName,
      lastName: lastName
    });

    console.log('✅ User created successfully in Clerk!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.emailAddresses[0]?.emailAddress}`);
    console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}\n`);

    // Save user credentials for testing
    const userCredentials = {
      userId: user.id,
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      createdAt: user.createdAt,
      clerkData: {
        id: user.id,
        emailAddresses: user.emailAddresses,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };

    const fs = require('fs');
    fs.writeFileSync('.test-user-credentials.json', JSON.stringify(userCredentials, null, 2));
    console.log('💾 User credentials saved to .test-user-credentials.json');

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Check if user synchronized to Supabase');
    console.log('2. Extract JWT token using Playwright');
    console.log('3. Test API endpoints');
    console.log('');
    console.log('📋 COMMANDS TO RUN:');
    console.log(`   # Extract JWT token:`);
    console.log(`   node scripts/extract-jwt-playwright.js --email=${email} --password=${password}`);
    console.log('');
    console.log(`   # Test API endpoints:`);
    console.log(`   node scripts/test-api-endpoints.js --extract-fresh-token --email=${email} --password=${password}`);

    return {
      success: true,
      user: userCredentials
    };

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n💡 User already exists. Try with a different email or use existing user.');
    }
    
    if (error.message.includes('password')) {
      console.log('\n💡 Password requirements not met. Try a stronger password.');
    }

    return {
      success: false,
      error: error.message
    };
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach(arg => {
    if (arg.startsWith('--email=')) {
      options.email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      options.password = arg.split('=')[1];
    } else if (arg.startsWith('--firstName=')) {
      options.firstName = arg.split('=')[1];
    } else if (arg.startsWith('--lastName=')) {
      options.lastName = arg.split('=')[1];
    }
  });

  return options;
}

// Run the script
if (require.main === module) {
  const options = parseArgs();
  createTestUser(options).catch(console.error);
}

module.exports = { createTestUser };
