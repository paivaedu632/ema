/**
 * Test Helper Functions
 * Utilities for API testing with Jest and Supertest
 */

import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

// Test configuration - use real keys from .env.local
export const TEST_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  TEST_TIMEOUT: 30000,
}

// Test user data (using real users from database)
export const TEST_USERS = {
  VALID_USER: {
    id: '1d7e1eb7-8758-4a67-84a8-4fe911a733bc', // Real user from database
    email: 'paivaedu.br@gmail.com',
    phone: '+244900000001',
    fullName: 'Eduardo Paiva',
    pin: '123456'
  },
  RECIPIENT_USER: {
    id: '2b78d37a-0ad0-4018-8c3e-c7b78783d785', // Real workflow user from database
    email: 'new-user-workflow@emapay.test',
    phone: '+244900000002',
    fullName: 'Recipient User',
    pin: '654321'
  },
  ADMIN_USER: {
    id: '1233e282-b6f0-4655-85d7-60339c8f4671', // Real trader user from database
    email: 'trader_1@test.emapay.com',
    phone: '+244900000003',
    fullName: 'Admin User',
    pin: '999999'
  }
}

// Create Supabase client for testing
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

// Cache for JWT tokens to avoid recreating them
const tokenCache = new Map<string, { token: string; expires: number }>()

// Get a real Supabase JWT token for testing
export async function getSupabaseJWT(
  userId: string = TEST_USERS.VALID_USER.id,
  options: {
    expired?: boolean
    forceRefresh?: boolean
  } = {}
): Promise<string> {
  const { expired = false, forceRefresh = false } = options

  // Check cache first
  const cacheKey = `${userId}-${expired}`
  const cached = tokenCache.get(cacheKey)
  if (cached && !forceRefresh && Date.now() < cached.expires) {
    return cached.token
  }

  try {
    // Use Supabase Admin API to generate a JWT for the user
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: TEST_USERS.VALID_USER.email,
      options: {
        redirectTo: 'http://localhost:3000'
      }
    })

    if (error || !data.properties?.access_token) {
      throw new Error(`Failed to generate JWT: ${error?.message}`)
    }

    let token = data.properties.access_token

    // If we need an expired token, create one manually
    if (expired) {
      const decoded = jwt.decode(token) as any
      if (decoded) {
        const expiredPayload = {
          ...decoded,
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        }
        // We need the JWT secret to create expired tokens - for now return a mock expired token
        token = 'expired.jwt.token'
      }
    }

    // Cache the token (expires in 50 minutes to be safe)
    tokenCache.set(cacheKey, {
      token,
      expires: Date.now() + (50 * 60 * 1000)
    })

    return token
  } catch (error) {
    console.error('Failed to get Supabase JWT:', error)
    // Fallback to mock token for testing
    return createMockSupabaseJWT(userId, { expired })
  }
}

// Fallback mock JWT creation (for when Supabase API fails)
function createMockSupabaseJWT(
  userId: string = TEST_USERS.VALID_USER.id,
  options: {
    role?: 'authenticated' | 'service_role' | 'supabase_admin'
    email?: string
    expiresIn?: string | number
    expired?: boolean
  } = {}
): string {
  const {
    role = 'authenticated',
    email = TEST_USERS.VALID_USER.email,
    expiresIn = '1h',
    expired = false
  } = options

  const now = Math.floor(Date.now() / 1000)
  const expTime = expired ? now - 3600 : (
    typeof expiresIn === 'string' && expiresIn === '1h' ? now + 3600 :
    typeof expiresIn === 'number' ? now + expiresIn : now + 3600
  )

  const payload = {
    aud: role === 'authenticated' ? 'authenticated' : role,
    exp: expTime,
    iat: now,
    iss: TEST_CONFIG.SUPABASE_URL,
    sub: userId,
    email: email,
    phone: '',
    app_metadata: {
      provider: 'email',
      providers: ['email']
    },
    user_metadata: {},
    role: role,
    aal: 'aal1',
    amr: [{ method: 'password', timestamp: now }],
    session_id: `session-${userId}-${now}`
  }

  // Use a test secret (this won't work with real Supabase validation)
  const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-long'

  return jwt.sign(payload, jwtSecret, { algorithm: 'HS256' })
}

// Create expired JWT token
export async function createExpiredJWT(userId: string = TEST_USERS.VALID_USER.id): Promise<string> {
  return await getSupabaseJWT(userId, { expired: true })
}

// Create JWT without Bearer prefix
export async function createJWTWithoutBearer(): Promise<string> {
  const token = await getSupabaseJWT()
  return token.replace('Bearer ', '')
}

// Create admin JWT token for admin operations
export function createAdminJWT(): string {
  return createMockSupabaseJWT(TEST_USERS.ADMIN_USER.id, {
    role: 'supabase_admin',
    email: TEST_USERS.ADMIN_USER.email
  })
}

// Create service role JWT token
export function createServiceRoleJWT(): string {
  return createMockSupabaseJWT('service', {
    role: 'service_role',
    email: 'service@supabase.io'
  })
}

// Synchronous version for backward compatibility (uses mock tokens)
export function createSupabaseJWT(
  userId: string = TEST_USERS.VALID_USER.id,
  options: {
    role?: 'authenticated' | 'service_role' | 'supabase_admin'
    email?: string
    expiresIn?: string | number
    expired?: boolean
  } = {}
): string {
  return createMockSupabaseJWT(userId, options)
}

// Create malformed JWT token
export function createMalformedJWT(): string {
  return 'invalid.jwt.token'
}

// API Response type definitions (matching actual API)
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// Common test assertions
export function expectSuccessResponse<T>(response: any): asserts response is ApiSuccessResponse<T> {
  expect(response).toHaveProperty('success', true)
  expect(response).toHaveProperty('data')
  expect(response.message).toBeDefined()
}

export function expectErrorResponse(response: any, expectedCode?: string): asserts response is ApiErrorResponse {
  expect(response).toHaveProperty('success', false)
  expect(response).toHaveProperty('error')
  expect(typeof response.error).toBe('string')
  if (expectedCode) {
    expect(response.code).toBe(expectedCode)
  }
}

// Authentication headers
export function getAuthHeaders(token?: string): Record<string, string> {
  if (!token) {
    return {}
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

// Common test data generators
export function generateTransferData(overrides: Partial<any> = {}) {
  return {
    recipientId: TEST_USERS.RECIPIENT_USER.email,
    amount: 100.50,
    currency: 'EUR',
    pin: TEST_USERS.VALID_USER.pin,
    description: 'Test transfer',
    ...overrides
  }
}

export function generateLimitOrderData(overrides: Partial<any> = {}) {
  return {
    side: 'buy' as const,
    amount: 100,
    price: 655.50,
    baseCurrency: 'EUR' as const,
    quoteCurrency: 'AOA' as const,
    ...overrides
  }
}

export function generateMarketOrderData(overrides: Partial<any> = {}) {
  return {
    side: 'buy' as const,
    amount: 100,
    baseCurrency: 'EUR' as const,
    quoteCurrency: 'AOA' as const,
    slippageLimit: 0.05,
    ...overrides
  }
}

export function generatePinData(overrides: Partial<any> = {}) {
  const pin = '123456'
  return {
    pin,
    confirmPin: pin,
    ...overrides
  }
}

// Database cleanup utilities
export async function cleanupTestData() {
  // This would clean up any test data created during tests
  // Implementation depends on your test database setup
  console.log('Cleaning up test data...')
}

// Performance measurement utilities
export function measureResponseTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve) => {
    const start = Date.now()
    const result = await fn()
    const duration = Date.now() - start
    resolve({ result, duration })
  })
}

// Validation helpers
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export function isValidTimestamp(str: string): boolean {
  const date = new Date(str)
  return !isNaN(date.getTime()) && str.includes('T') && str.includes('Z')
}

// Currency validation
export function isValidCurrency(currency: string): boolean {
  return ['EUR', 'AOA'].includes(currency)
}

// Amount validation
export function isValidAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && amount <= 1000000
}

// JWT Token utilities
export function createMockJWT(userId: string): string {
  // For now, return a placeholder - the real implementation will use getRealSupabaseJWT
  return `mock-jwt-token-${userId}`
}
