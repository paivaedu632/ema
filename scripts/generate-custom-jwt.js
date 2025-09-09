#!/usr/bin/env node

/**
 * Generate Custom JWT Token with Template for EmaPay API Testing
 * Uses custom JWT templates for longer-lived tokens
 * 
 * Usage:
 *   node scripts/generate-custom-jwt.js
 *   node scripts/generate-custom-jwt.js --user-id USER_ID
 *   node scripts/generate-custom-jwt.js --template my-template
 */

require('dotenv').config({ path: '.env.local' });
const { createClerkClient } = require('@clerk/backend');

// Your Clerk configuration from .env.local
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

async function generateCustomJWT(options = {}) {
  try {
    const templateName = options.template || 'default';
    
    console.log(`🔐 EmaPay Custom JWT Token Generator\n`);
    console.log('📋 Configuration:');
    console.log(`   Publishable Key: ${CLERK_PUBLISHABLE_KEY}`);
    console.log(`   Secret Key: ${CLERK_SECRET_KEY ? 'sk_***' : 'NOT SET'}`);
    console.log(`   Template: ${templateName}\n`);

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
        console.log('   node scripts/generate-custom-jwt.js --user-id USER_ID');
        return;
      }

      // Use the first user
      userId = users[0].id;
      console.log(`✅ Using existing user: ${userId}`);
      console.log(`📧 Email: ${users[0].emailAddresses[0]?.emailAddress || 'No email'}\n`);
    }

    console.log('🔄 Creating session...');
    
    // Create a session for the user (official method)
    const session = await clerkClient.sessions.createSession({
      userId: userId,
    });

    console.log(`✅ Session created: ${session.id}\n`);

    console.log('🎯 Generating JWT token with custom template...');
    
    // Try to get the JWT token with a custom template
    let token;
    try {
      if (templateName !== 'default') {
        // Get the JWT token with custom template (official method)
        const tokenObject = await clerkClient.sessions.getToken(session.id, templateName);
        token = tokenObject.jwt;
      } else {
        // Get the default JWT token
        const tokenObject = await clerkClient.sessions.getToken(session.id);
        token = tokenObject.jwt;
      }
    } catch (error) {
      if (error.message.includes('template')) {
        console.log(`❌ Custom template '${templateName}' not found.`);
        console.log('💡 Available options:');
        console.log('1. Create a custom JWT template in Clerk Dashboard');
        console.log('2. Use the default template (no --template flag)');
        console.log('3. Check template name spelling');
        return;
      }
      throw error;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 CUSTOM JWT TOKEN GENERATED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Decode and show expiration
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    
    console.log('⏰ TOKEN DETAILS:');
    console.log(`   Created: ${now.toLocaleString()}`);
    console.log(`   Expires: ${expDate.toLocaleString()}`);
    console.log(`   Valid: ${expDate > now ? '✅ Yes' : '❌ Expired'}`);
    console.log(`   Template: ${templateName}\n`);

    console.log('📋 USAGE EXAMPLES:');
    console.log('');
    console.log('# Test user authentication:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v1/auth/me`);
    console.log('');
    console.log('# Test wallet balance:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v1/wallets/balance`);
    console.log('');

    console.log('🧹 CLEANUP INFO:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Session ID: ${session.id}`);
    console.log('   To delete this test user later, use the Clerk Dashboard\n');

    // Save token to file for easy access
    const fs = require('fs');
    const filename = templateName === 'default' ? '.jwt-token-custom' : `.jwt-token-${templateName}`;
    fs.writeFileSync(filename, token);
    console.log(`💾 Token saved to ${filename} file for easy access`);

    return {
      token,
      userId,
      sessionId: session.id,
      expiresAt: expDate,
      template: templateName
    };

  } catch (error) {
    console.error('❌ Error generating custom JWT token:', error.message);
    
    if (error.message.includes('unauthorized') || error.message.includes('Invalid API key')) {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Check your CLERK_SECRET_KEY in .env.local');
      console.log('2. Make sure it starts with "sk_test_" or "sk_live_"');
      console.log('3. Verify the key is correct in Clerk Dashboard');
      console.log('4. Ensure the key has proper permissions');
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

const templateIndex = args.indexOf('--template');
if (templateIndex !== -1 && args[templateIndex + 1]) {
  options.template = args[templateIndex + 1];
}

// Run the script
if (require.main === module) {
  generateCustomJWT(options).catch(console.error);
}

module.exports = { generateCustomJWT };
