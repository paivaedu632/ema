#!/usr/bin/env node

/**
 * Reset password for an existing Clerk user
 * 
 * Usage:
 *   node scripts/reset-user-password.js --user-id=user_31nRQY0A5ik6RjoCHYI4VZAJY4s --password=NewPassword123!
 */

require('dotenv').config({ path: '.env.local' });
const { createClerkClient } = require('@clerk/backend');

async function resetUserPassword(options = {}) {
  const {
    userId,
    password = 'EmaPay2024!Test'
  } = options;

  if (!userId) {
    console.log('❌ User ID is required!');
    console.log('Usage: node scripts/reset-user-password.js --user-id=user_xxx --password=NewPassword123!');
    return;
  }

  console.log('🔐 Resetting User Password in Clerk\n');
  console.log('📋 Details:');
  console.log(`   User ID: ${userId}`);
  console.log(`   New Password: ${password}\n`);

  try {
    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    
    if (!CLERK_SECRET_KEY) {
      console.log('❌ CLERK_SECRET_KEY not found in .env.local');
      return;
    }

    const clerkClient = createClerkClient({ 
      secretKey: CLERK_SECRET_KEY 
    });

    console.log('🔄 Updating user password...');
    
    // Update user password
    const user = await clerkClient.users.updateUser(userId, {
      password: password
    });

    console.log('✅ Password updated successfully!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.emailAddresses[0]?.emailAddress}`);
    console.log(`   Updated: ${new Date(user.updatedAt).toLocaleString()}\n`);

    // Save credentials for testing
    const userCredentials = {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      password: password,
      firstName: user.firstName,
      lastName: user.lastName,
      updatedAt: user.updatedAt
    };

    const fs = require('fs');
    fs.writeFileSync('.test-user-credentials.json', JSON.stringify(userCredentials, null, 2));
    console.log('💾 User credentials saved to .test-user-credentials.json');

    console.log('\n🎯 READY FOR TESTING:');
    console.log('');
    console.log('📋 COMMANDS TO RUN:');
    console.log(`   # Extract JWT token:`);
    console.log(`   node scripts/extract-jwt-playwright.js --email=${userCredentials.email} --password=${password}`);
    console.log('');
    console.log(`   # Test API endpoints:`);
    console.log(`   node scripts/test-api-endpoints.js --extract-fresh-token --email=${userCredentials.email} --password=${password}`);

    return {
      success: true,
      user: userCredentials
    };

  } catch (error) {
    console.error('❌ Error updating password:', error.message);
    
    if (error.message.includes('not found')) {
      console.log('\n💡 User not found. Check the user ID.');
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
    if (arg.startsWith('--user-id=')) {
      options.userId = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      options.password = arg.split('=')[1];
    }
  });

  return options;
}

// Run the script
if (require.main === module) {
  const options = parseArgs();
  resetUserPassword(options).catch(console.error);
}

module.exports = { resetUserPassword };
