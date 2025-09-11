/**
 * Supabase Authentication Utilities for Testing
 * Creates real JWT tokens using Supabase Admin API and proper signing
 */

import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { TEST_CONFIG, TEST_USERS } from './test-helpers'

// Create admin client for generating test tokens
const supabaseAdmin = createClient(
  TEST_CONFIG.SUPABASE_URL,
  TEST_CONFIG.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// JWT Key Information from discovery endpoint
const JWT_KEY_INFO = {
  kid: 'a6e6bb46-bc5e-4129-b026-32e5a17af311',
  alg: 'ES256',
  issuer: TEST_CONFIG.SUPABASE_URL + '/auth/v1',
  // Public key from JWKS endpoint
  publicKey: {
    x: 'oqEoMKUE04dT5_oU4d4r3GwAmnI3bY8RC6pq93tNE_4',
    y: 'NkwOAZCAV_nTZZz8B2t2POCoIr9QBUo32DKmPHmuCCs',
    alg: 'ES256',
    crv: 'P-256',
    ext: true,
    kid: 'a6e6bb46-bc5e-4129-b026-32e5a17af311',
    kty: 'EC',
    key_ops: ['verify']
  }
}

// Cache for JWT tokens with longer duration
const tokenCache = new Map<string, { token: string; expires: number }>()

/**
 * Get a real Supabase JWT token for testing
 * Uses the Admin API to generate a proper user session token
 */
export async function getRealSupabaseJWT(
  userId: string = TEST_USERS.VALID_USER.id,
  options: {
    forceRefresh?: boolean
  } = {}
): Promise<{ token: string; userId: string }> {
  const cacheKey = `jwt_${userId}`;
  const now = Date.now();

  // Check cache first (unless force refresh)
  if (!options.forceRefresh) {
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expires > now) {
      console.log('🎯 Using cached JWT token');
      return { token: cached.token, userId };
    }
  }

  // Retry mechanism for token generation
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Generating real Supabase JWT token... (Attempt ${attempt}/${maxRetries})`);

      // Generate a magic link for the existing user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: TEST_USERS.VALID_USER.email,
        options: {
          redirectTo: 'http://localhost:3000/auth/callback'
        }
      });

      if (linkError) {
        throw new Error(`Failed to generate magic link: ${linkError.message}`);
      }

      // Extract the token from the action_link and exchange it for an access token
      if (linkData.properties?.action_link) {
        const actionLink = linkData.properties.action_link;
        const urlParams = new URL(actionLink).searchParams;
        const token = urlParams.get('token');

        if (token && linkData.properties.hashed_token) {
          console.log('🔗 Exchanging token for access token...');

          // Exchange the token for an access token
          const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'magiclink'
          });

          if (!sessionError && sessionData.session?.access_token) {
            const accessToken = sessionData.session.access_token;
            console.log('✅ Successfully generated JWT token!');

            // Cache the token for 15 minutes (longer duration for test stability)
            tokenCache.set(cacheKey, {
              token: accessToken,
              expires: now + (15 * 60 * 1000)
            });

            return { token: accessToken, userId };
          }

          throw new Error(`Token exchange failed: ${sessionError?.message || 'No access token'}`);
        }
      }

      throw new Error('No action link found in magic link response');

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        console.log(`⏳ Waiting before retry...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  }

  // If all retries failed, throw the last error
  console.error('❌ All retry attempts failed');
  throw lastError || new Error('Failed to generate JWT token after all retries');
}

/**
 * Create an expired token for testing
 */
export function createExpiredToken(): string {
  // Return a token that's clearly expired
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid'
}

/**
 * Create a malformed token for testing
 */
export function createMalformedToken(): string {
  return 'invalid.jwt.token'
}

/**
 * Clear token cache (useful for testing)
 */
export function clearTokenCache(): void {
  tokenCache.clear()
}

/**
 * Clear expired tokens from cache
 */
export function clearExpiredTokens(): void {
  const now = Date.now();
  for (const [key, value] of tokenCache.entries()) {
    if (value.expires <= now) {
      tokenCache.delete(key);
    }
  }
}
