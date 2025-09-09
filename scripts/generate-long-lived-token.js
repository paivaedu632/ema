#!/usr/bin/env node

/**
 * Generate Long-Lived JWT Token for EmaPay API Testing
 * Creates tokens that last 30 days for extended testing
 * 
 * Usage:
 *   node scripts/generate-long-lived-token.js
 *   node scripts/generate-long-lived-token.js --user-id USER_ID
 *   node scripts/generate-long-lived-token.js --days 7
 */

require('dotenv').config({ path: '.env.local' });
const { createClerkClient } = require('@clerk/backend');

// Your Clerk configuration from .env.local
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

async function generateLongLivedToken(options = {}) {
  try {
    const days = options.days || 30;
    const expiresInSeconds = days * 24 * 60 * 60;
    
    console.log(`🔐 EmaPay Long-Lived JWT Token Generator (${days} days)\n`);
    console.log('📋 Configuration:');
    console.log(`   Publishable Key: ${CLERK_PUBLISHABLE_KEY}`);
    console.log(`   Secret Key: ${CLERK_SECRET_KEY ? 'sk_***' : 'NOT SET'}`);
    console.log(`   Expiration: ${days} days (${expiresInSeconds} seconds)\n`);

    if (!CLERK_SECRET_KEY) {
      console.log('❌ CLERK_SECRET_KEY not found in .env.local');
      console.log('💡 Add your secret key to .env.local:');
      console.log('   CLERK_SECRET_KEY=sk_test_your_secret_key_here');
      return;
    }

    // Initialize Clerk client with secret key (official method)
    const clerkClient = createClerkClient({ 
      secretKey: CLERK_SECRET_KEY 
    });

    let userId = options.userId;

    // If no user ID provided, use existing user
    if (!userId) {
      console.log('👥 Fetching existing users...');
      const { data: users } = await clerkClient.users.getUserList({ limit: 10 });
      
      if (users.length === 0) {
        console.log('❌ No users found. Please specify a user ID:');
        console.log('   node scripts/generate-long-lived-token.js --user-id USER_ID');
        return;
      }

      // Use the first user
      userId = users[0].id;
      console.log(`✅ Using existing user: ${userId}`);
      console.log(`📧 Email: ${users[0].emailAddresses[0]?.emailAddress || 'No email'}\n`);
    }

    console.log(`🔄 Creating long-lived session (${days} days)...`);
    
    // Create a session for the user with custom expiration (official method)
    const session = await clerkClient.sessions.createSession({
      userId: userId,
      expiresInSeconds: expiresInSeconds,
    });

    console.log(`✅ Session created: ${session.id}\n`);

    console.log('🎯 Generating JWT token...');
    
    // Get the JWT token from the session (official method)
    const tokenObject = await clerkClient.sessions.getToken(session.id);
    const token = tokenObject.jwt; // Extract the actual JWT string

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 ${days}-DAY JWT TOKEN GENERATED SUCCESSFULLY!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Decode and show expiration
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const expDate = new Date(payload.exp * 1000);
    
    console.log('⏰ TOKEN DETAILS:');
    console.log(`   Created: ${new Date().toLocaleString()}`);
    console.log(`   Expires: ${expDate.toLocaleString()}`);
    console.log(`   Valid for: ${days} days\n`);

    console.log('📋 USAGE EXAMPLES:');
    console.log('');
    console.log('# Test user authentication:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v1/auth/me`);
    console.log('');
    console.log('# Test wallet balance:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v1/wallets/balance`);
    console.log('');
    console.log('# Test user search:');
    console.log(`curl -H "Authorization: Bearer ${token}" "http://localhost:3000/api/v1/users/search?q=test"`);
    console.log('');

    console.log('🧹 CLEANUP INFO:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Session ID: ${session.id}`);
    console.log('   To delete this test user later, use the Clerk Dashboard\n');

    // Save token to file for easy access
    const fs = require('fs');
    fs.writeFileSync('.jwt-token-30day', token);
    console.log('💾 Token saved to .jwt-token-30day file for easy access');

    return {
      token,
      userId,
      sessionId: session.id,
      expiresAt: expDate
    };

  } catch (error) {
    console.error('❌ Error generating long-lived JWT token:', error.message);
    
    if (error.message.includes('unauthorized') || error.message.includes('Invalid API key')) {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Check your CLERK_SECRET_KEY in .env.local');
      console.log('2. Make sure it starts with "sk_test_" or "sk_live_"');
      console.log('3. Verify the key is correct in Clerk Dashboard');
      console.log('4. Ensure the key has proper permissions');
    }
    
    if (error.message.includes('rate limit')) {
      console.log('\n💡 Rate limit reached. Wait a moment and try again.');
    }

    if (error.status === 422) {
      console.log('\n💡 Validation error. Check if user already exists or email format is valid.');
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

const userIdIndex = args.indexOf('--user-id');
if (userIdIndex !== -1 && args[userIdIndex + 1]) {
  options.userId = args[userIdIndex + 1];
}

const daysIndex = args.indexOf('--days');
if (daysIndex !== -1 && args[daysIndex + 1]) {
  options.days = parseInt(args[daysIndex + 1]);
}

// Run the script
if (require.main === module) {
  generateLongLivedToken(options).catch(console.error);
}

module.exports = { generateLongLivedToken };
