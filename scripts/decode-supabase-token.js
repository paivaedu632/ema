#!/usr/bin/env node

/**
 * EmaPay Supabase Token Decoder
 * 
 * Decodes and displays information from Supabase Auth JWT tokens
 * 
 * Usage:
 *   node scripts/decode-supabase-token.js [token]
 *   node scripts/decode-supabase-token.js $(cat .jwt-token-supabase)
 */

import { readFileSync, existsSync } from 'fs';

/**
 * Decode and display token information
 */
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format - expected 3 parts separated by dots');
    }

    // Decode header
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    console.log('🔍 JWT Token Analysis');
    console.log('====================');
    console.log('');
    
    // Header information
    console.log('📋 Header:');
    console.log(`   Algorithm: ${header.alg}`);
    console.log(`   Type: ${header.typ}`);
    if (header.kid) console.log(`   Key ID: ${header.kid}`);
    console.log('');
    
    // Payload information
    console.log('📋 Payload:');
    console.log(`   User ID (sub): ${payload.sub}`);
    console.log(`   Email: ${payload.email || 'N/A'}`);
    console.log(`   Phone: ${payload.phone || 'N/A'}`);
    console.log(`   Role: ${payload.role}`);
    console.log(`   Audience (aud): ${payload.aud}`);
    console.log(`   Issuer (iss): ${payload.iss}`);
    console.log(`   Session ID: ${payload.session_id}`);
    console.log(`   Anonymous: ${payload.is_anonymous || false}`);
    console.log('');
    
    // Timing information
    console.log('⏰ Timing:');
    console.log(`   Issued At: ${new Date(payload.iat * 1000).toISOString()}`);
    console.log(`   Expires At: ${new Date(payload.exp * 1000).toISOString()}`);
    if (payload.nbf) {
      console.log(`   Not Before: ${new Date(payload.nbf * 1000).toISOString()}`);
    }
    
    // Calculate time remaining
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = payload.exp - now;
    
    if (timeLeft > 0) {
      const days = Math.floor(timeLeft / (24 * 60 * 60));
      const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
      const seconds = timeLeft % 60;
      
      console.log(`   Time Remaining: ${days}d ${hours}h ${minutes}m ${seconds}s`);
      console.log(`   Status: ✅ VALID`);
    } else {
      const expiredFor = Math.abs(timeLeft);
      const days = Math.floor(expiredFor / (24 * 60 * 60));
      const hours = Math.floor((expiredFor % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((expiredFor % (60 * 60)) / 60);
      const seconds = expiredFor % 60;
      
      console.log(`   Expired: ${days}d ${hours}h ${minutes}m ${seconds}s ago`);
      console.log(`   Status: ❌ EXPIRED`);
    }
    
    // Token duration
    const duration = payload.exp - payload.iat;
    const durationDays = Math.floor(duration / (24 * 60 * 60));
    const durationHours = Math.floor((duration % (24 * 60 * 60)) / (60 * 60));
    const durationMinutes = Math.floor((duration % (60 * 60)) / 60);
    
    console.log(`   Total Duration: ${durationDays}d ${durationHours}h ${durationMinutes}m`);
    console.log('');
    
    // Additional claims
    const standardClaims = ['iss', 'sub', 'aud', 'exp', 'iat', 'nbf', 'jti', 'email', 'phone', 'role', 'session_id', 'is_anonymous'];
    const customClaims = Object.keys(payload).filter(key => !standardClaims.includes(key));
    
    if (customClaims.length > 0) {
      console.log('🔧 Custom Claims:');
      customClaims.forEach(claim => {
        console.log(`   ${claim}: ${JSON.stringify(payload[claim])}`);
      });
      console.log('');
    }
    
    // Signature information
    console.log('🔐 Signature:');
    console.log(`   Length: ${parts[2].length} characters`);
    console.log(`   Preview: ${parts[2].substring(0, 20)}...`);
    console.log('');
    
    return { header, payload, valid: timeLeft > 0 };
    
  } catch (error) {
    console.error('❌ Failed to decode token:', error.message);
    return null;
  }
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  let token = args[0];
  
  // If no token provided, try to read from default file
  if (!token) {
    const tokenFile = '.jwt-token-supabase';
    if (existsSync(tokenFile)) {
      try {
        token = readFileSync(tokenFile, 'utf8').trim();
        console.log(`📁 Reading token from: ${tokenFile}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Failed to read token file: ${error.message}`);
        process.exit(1);
      }
    } else {
      console.error('❌ No token provided and no .jwt-token-supabase file found');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/decode-supabase-token.js [token]');
      console.log('  node scripts/decode-supabase-token.js $(cat .jwt-token-supabase)');
      console.log('');
      console.log('Or generate a token first:');
      console.log('  node scripts/create-supabase-user-token.js --email test@emapay.com');
      process.exit(1);
    }
  }
  
  if (!token) {
    console.error('❌ No token provided');
    process.exit(1);
  }
  
  const result = decodeToken(token);
  
  if (result) {
    console.log('💡 Usage Tips:');
    console.log('   • Test API: curl -H "Authorization: Bearer [token]" http://localhost:3000/api/v1/auth/me');
    console.log('   • Refresh: node scripts/refresh-supabase-token.js');
    console.log('   • New token: node scripts/create-supabase-user-token.js --email your@email.com');
  }
}

// Run the script
main();
