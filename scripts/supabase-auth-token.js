#!/usr/bin/env node

/**
 * EmaPay Supabase Auth Token Generator
 * 
 * Generates 30-day JWT tokens using Supabase Auth for API testing
 * 
 * Usage:
 *   node scripts/supabase-auth-token.js --email user@example.com
 *   node scripts/supabase-auth-token.js --user-id existing-user-id
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      options[key] = value;
    }
  }

  return options;
}

/**
 * Create a test user for token generation
 */
async function createTestUser(email) {
  console.log(`🔧 Creating test user: ${email}`);
  
  const password = `TestPass_${randomUUID().slice(0, 8)}`;
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Skip email confirmation for testing
    user_metadata: {
      name: 'EmaPay Test User',
      created_for: 'API Testing',
      created_at: new Date().toISOString()
    }
  });

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  console.log(`✅ Test user created: ${data.user.id}`);
  return data.user;
}

/**
 * Generate a 30-day access token for a user
 */
async function generateToken(userId) {
  console.log(`🎯 Generating 30-day token for user: ${userId}`);

  try {
    // Create a session for the user (this generates the JWT)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `user-${userId}@emapay.test`, // Temporary email for token generation
      options: {
        redirectTo: 'http://localhost:3000/auth/callback'
      }
    });

    if (error) {
      throw new Error(`Failed to generate token: ${error.message}`);
    }

    // Extract the access token from the response
    // Note: This is a simplified approach - in production you'd handle the magic link flow
    console.log('⚠️  Magic link generated. For direct token access, use the admin API.');
    console.log('🔗 Magic link:', data.properties?.action_link);
    
    return null; // We'll implement direct token generation next
  } catch (error) {
    console.error('Token generation failed:', error);
    throw error;
  }
}

/**
 * Alternative: Generate token using direct session creation
 */
async function generateDirectToken(userId) {
  console.log(`🎯 Generating direct access token for user: ${userId}`);

  try {
    // Get user details
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      throw new Error(`User not found: ${userError?.message || 'Unknown error'}`);
    }

    console.log(`📋 User found: ${userData.user.email}`);

    // For now, we'll create a custom JWT using the service role
    // This is a temporary solution until we implement proper session management
    const payload = {
      aud: 'emapay-api',
      role: 'authenticated',
      sub: userId,
      iss: process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      session_id: `sess_${randomUUID().replace(/-/g, '')}`,
      email: userData.user.email,
      phone: userData.user.phone || '',
      is_anonymous: false
    };

    // Note: This creates an unsigned token for testing
    // In production, this would be properly signed by Supabase
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    // Create unsigned token (for testing only)
    const unsignedToken = `${encodedHeader}.${encodedPayload}.unsigned_test_token`;
    
    console.log('⚠️  Generated unsigned test token (for development only)');
    console.log('🔒 In production, use properly signed Supabase Auth tokens');
    
    return unsignedToken;
  } catch (error) {
    console.error('Direct token generation failed:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 EmaPay Supabase Auth Token Generator');
    console.log('=====================================');

    const options = parseArgs();
    
    if (!options.email && !options['user-id']) {
      console.error('❌ Error: Please provide either --email or --user-id');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/supabase-auth-token.js --email user@example.com');
      console.log('  node scripts/supabase-auth-token.js --user-id existing-user-id');
      process.exit(1);
    }

    let userId = options['user-id'];
    
    // Create user if email provided
    if (options.email && !userId) {
      const user = await createTestUser(options.email);
      userId = user.id;
    }

    // Generate the token
    const token = await generateDirectToken(userId);
    
    if (token) {
      // Save token to file
      writeFileSync('.jwt-token-supabase', token);
      console.log('');
      console.log('✅ Token generated successfully!');
      console.log(`📁 Saved to: .jwt-token-supabase`);
      console.log('');
      console.log('🧪 Test the token:');
      console.log('curl -H "Authorization: Bearer $(cat .jwt-token-supabase)" http://localhost:3000/api/v1/auth/me');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
