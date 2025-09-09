#!/usr/bin/env node

/**
 * Check existing users in Clerk
 */

require('dotenv').config({ path: '.env.local' });
const { createClerkClient } = require('@clerk/backend');

async function checkUsers() {
  try {
    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    
    if (!CLERK_SECRET_KEY) {
      console.log('❌ CLERK_SECRET_KEY not found in .env.local');
      return;
    }

    console.log('🔍 Checking existing users in Clerk...\n');

    const clerkClient = createClerkClient({ 
      secretKey: CLERK_SECRET_KEY 
    });

    const { data: users } = await clerkClient.users.getUserList({ limit: 10 });
    
    console.log(`📊 Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.emailAddresses[0]?.emailAddress || 'No email'}`);
      console.log(`   Name: ${user.firstName || ''} ${user.lastName || ''}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}\n`);
    });

    if (users.length > 0) {
      console.log('✅ You can use any of these user IDs to generate a JWT token:');
      console.log(`   node scripts/generate-jwt-token.js --user-id ${users[0].id}`);
    } else {
      console.log('❌ No users found. You need to create a user first through your app.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();
