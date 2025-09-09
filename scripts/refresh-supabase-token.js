#!/usr/bin/env node

/**
 * EmaPay Token Refresh Script
 * 
 * Refreshes an existing Supabase Auth token using the refresh token
 * 
 * Usage:
 *   node scripts/refresh-supabase-token.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
    console.log(`   Session ID: ${payload.session_id}`);
    console.log(`   Issued At: ${new Date(payload.iat * 1000).toISOString()}`);
    console.log(`   Expires At: ${new Date(payload.exp * 1000).toISOString()}`);
    
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = payload.exp - now;
    
    if (timeLeft > 0) {
      const days = Math.floor(timeLeft / (24 * 60 * 60));
      const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
      console.log(`   Time Remaining: ${days} days, ${hours} hours, ${minutes} minutes`);
    } else {
      console.log(`   ⚠️  Token EXPIRED ${Math.abs(timeLeft)} seconds ago`);
    }
    
    return payload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Read refresh token from file
 */
function readRefreshToken() {
  const refreshTokenFile = '.jwt-refresh-token-supabase';
  
  if (!existsSync(refreshTokenFile)) {
    throw new Error(`Refresh token file not found: ${refreshTokenFile}`);
  }
  
  try {
    return readFileSync(refreshTokenFile, 'utf8').trim();
  } catch (error) {
    throw new Error(`Failed to read refresh token: ${error.message}`);
  }
}

/**
 * Refresh the access token
 */
async function refreshToken() {
  console.log('🔄 Reading refresh token...');
  
  const refreshToken = readRefreshToken();
  console.log('✅ Refresh token loaded');
  
  console.log('🔄 Refreshing access token...');
  
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
    
    if (!data.session?.access_token) {
      throw new Error('No access token received from refresh');
    }
    
    console.log('✅ Token refreshed successfully!');
    
    return data.session;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🔄 EmaPay Token Refresh');
    console.log('=======================');
    console.log('');

    // Check if current token exists and show its status
    if (existsSync('.jwt-token-supabase')) {
      console.log('📋 Current Token Status:');
      const currentToken = readFileSync('.jwt-token-supabase', 'utf8').trim();
      decodeToken(currentToken);
      console.log('');
    }

    // Refresh the token
    const session = await refreshToken();
    
    // Save new tokens
    writeFileSync('.jwt-token-supabase', session.access_token);
    writeFileSync('.jwt-refresh-token-supabase', session.refresh_token);
    
    console.log('');
    console.log('✅ Tokens updated successfully!');
    console.log(`📁 New access token saved to: .jwt-token-supabase`);
    console.log(`🔄 New refresh token saved to: .jwt-refresh-token-supabase`);
    console.log('');
    
    // Show new token info
    console.log('📋 New Token Information:');
    decodeToken(session.access_token);
    
    console.log('');
    console.log('🧪 Test the refreshed token:');
    console.log('curl -H "Authorization: Bearer $(cat .jwt-token-supabase)" http://localhost:3000/api/v1/auth/me');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure you have a valid refresh token file: .jwt-refresh-token-supabase');
    console.log('   2. Generate a new token if the refresh token has expired:');
    console.log('      node scripts/create-supabase-user-token.js --email your@email.com');
    process.exit(1);
  }
}

// Run the script
main();
