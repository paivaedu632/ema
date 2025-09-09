#!/usr/bin/env node

/**
 * EmaPay Production Token Generator
 * 
 * Creates a real user and generates a proper 30-day Supabase Auth token
 * 
 * Usage:
 *   node scripts/create-supabase-user-token.js --email test@emapay.com
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Initialize regular Supabase client for user operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '');
      if (key === 'signin') {
        options[key] = true;
      } else {
        const value = args[i + 1];
        if (value && !value.startsWith('--')) {
          options[key] = value;
          i++; // Skip the value in next iteration
        }
      }
    }
  }

  return options;
}

/**
 * Generate a secure random password
 */
function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const bytes = randomBytes(16);
  
  for (let i = 0; i < 16; i++) {
    password += chars[bytes[i] % chars.length];
  }
  
  return password;
}

/**
 * Sign in existing user with password
 */
async function signInExistingUser(email, password) {
  console.log(`🔐 Signing in existing user: ${email}`);

  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (signInError) {
      throw new Error(`Failed to sign in: ${signInError.message}`);
    }

    if (!signInData.session?.access_token) {
      throw new Error('No access token received from sign in');
    }

    console.log('✅ Successfully signed in and obtained access token');

    return {
      user: signInData.user,
      session: signInData.session,
      credentials: { email, password }
    };

  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
}

/**
 * Create a test user with proper authentication
 */
async function createAndAuthenticateUser(email, password = null, signinOnly = false) {
  if (signinOnly) {
    if (!password) {
      throw new Error('Password required for signin mode');
    }
    return await signInExistingUser(email, password);
  }

  console.log(`🔧 Creating test user: ${email}`);

  const userPassword = password || generateSecurePassword();

  try {
    // Create user using admin API
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: userPassword,
      email_confirm: true, // Skip email confirmation for testing
      user_metadata: {
        name: 'EmaPay API Test User',
        purpose: 'API Testing and Development',
        created_at: new Date().toISOString()
      }
    });

    if (adminError) {
      // If user already exists, try to sign in instead
      if (adminError.message.includes('already been registered')) {
        console.log('👤 User already exists, attempting to sign in...');
        if (!password) {
          throw new Error('User exists but no password provided. Use --password flag or --signin flag.');
        }
        return await signInExistingUser(email, password);
      }
      throw new Error(`Failed to create user: ${adminError.message}`);
    }

    console.log(`✅ User created: ${adminData.user.id}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${userPassword}`);

    // Now sign in as the user to get a real session token
    console.log('🔐 Signing in to generate session token...');

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: userPassword
    });

    if (signInError) {
      throw new Error(`Failed to sign in: ${signInError.message}`);
    }

    if (!signInData.session?.access_token) {
      throw new Error('No access token received from sign in');
    }

    console.log('✅ Successfully signed in and obtained access token');

    return {
      user: signInData.user,
      session: signInData.session,
      credentials: { email, password: userPassword }
    };

  } catch (error) {
    console.error('User creation/authentication failed:', error);
    throw error;
  }
}

/**
 * Decode and display token information
 */
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    console.log('📋 Token Information:');
    console.log(`   User ID: ${payload.sub}`);
    console.log(`   Email: ${payload.email}`);
    console.log(`   Role: ${payload.role}`);
    console.log(`   Audience: ${payload.aud}`);
    console.log(`   Issuer: ${payload.iss}`);
    console.log(`   Session ID: ${payload.session_id}`);
    console.log(`   Issued At: ${new Date(payload.iat * 1000).toISOString()}`);
    console.log(`   Expires At: ${new Date(payload.exp * 1000).toISOString()}`);
    
    const expiresIn = payload.exp - payload.iat;
    const days = Math.floor(expiresIn / (24 * 60 * 60));
    const hours = Math.floor((expiresIn % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((expiresIn % (60 * 60)) / 60);
    
    console.log(`   Duration: ${days} days, ${hours} hours, ${minutes} minutes`);
    
    return payload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 EmaPay Production Token Generator');
    console.log('===================================');

    const options = parseArgs();
    
    if (!options.email) {
      console.error('❌ Error: Please provide --email');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/create-supabase-user-token.js --email test@emapay.com');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(options.email)) {
      console.error('❌ Error: Invalid email format');
      process.exit(1);
    }

    console.log('');

    // Create user and authenticate
    const { user, session, credentials } = await createAndAuthenticateUser(
      options.email,
      options.password,
      options.signin
    );
    
    // Save token to file
    writeFileSync('.jwt-token-supabase', session.access_token);
    
    // Save refresh token for future use
    writeFileSync('.jwt-refresh-token-supabase', session.refresh_token);
    
    // Save user credentials for reference
    writeFileSync('.user-credentials.json', JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      userId: user.id,
      createdAt: new Date().toISOString()
    }, null, 2));

    console.log('');
    console.log('✅ Token generated successfully!');
    console.log(`📁 Access token saved to: .jwt-token-supabase`);
    console.log(`🔄 Refresh token saved to: .jwt-refresh-token-supabase`);
    console.log(`👤 User credentials saved to: .user-credentials.json`);
    console.log('');
    
    // Decode and display token info
    decodeToken(session.access_token);
    
    console.log('');
    console.log('🧪 Test the token:');
    console.log('curl -H "Authorization: Bearer $(cat .jwt-token-supabase)" http://localhost:3000/api/v1/auth/me');
    console.log('');
    console.log('🔄 To refresh the token later:');
    console.log('node scripts/refresh-supabase-token.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
