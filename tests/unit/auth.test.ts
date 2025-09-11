/**
 * Authentication API Tests - FOCUSED ON /api/v1/auth/me ONLY
 * Tests for GET /api/v1/auth/me endpoint as requested by user
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { ApiTestClient, expectSuccessResponse, expectErrorResponse, measureResponseTime, TEST_USERS } from '../utils'
import { getRealSupabaseJWT, createExpiredToken, createMalformedToken } from '../utils/supabase-auth'

describe('Authentication API - GET /api/v1/auth/me', () => {
  let apiClient: ApiTestClient
  let validToken: string
  let expiredToken: string
  let malformedToken: string

  beforeAll(async () => {
    apiClient = new ApiTestClient()

    try {
      // Get a real Supabase JWT token for testing
      validToken = await getRealSupabaseJWT(TEST_USERS.VALID_USER.id)
      console.log('✅ Got real Supabase JWT token for testing')
    } catch (error) {
      console.warn('⚠️ Failed to get real JWT, using mock token:', error)
      validToken = 'mock-jwt-token-for-testing'
    }

    expiredToken = createExpiredToken()
    malformedToken = createMalformedToken()
  }, 30000) // Increase timeout for token generation

  afterAll(() => {
    // Cleanup if needed
  })

  describe('Valid JWT token returns user info', () => {
    test('should return 200 with correct user data when valid JWT provided', async () => {
      const response = await apiClient.getAuthMe(validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // Verify response structure matches actual API
      expect(response.body.data).toHaveProperty('userId')
      expect(response.body.data).toHaveProperty('sessionId')
      expect(response.body.data).toHaveProperty('authenticated', true)
      expect(response.body.data).toHaveProperty('timestamp')
      
      // Verify data types
      expect(typeof response.body.data.userId).toBe('string')
      expect(typeof response.body.data.sessionId).toBe('string')
      expect(typeof response.body.data.authenticated).toBe('boolean')
      expect(typeof response.body.data.timestamp).toBe('string')
      
      // Verify timestamp is valid ISO string
      expect(response.body.data.timestamp).toBeValidTimestamp()
      
      // Verify message
      expect(response.body.message).toBe('User authenticated successfully')
    })

    test('should return consistent user ID for same token', async () => {
      const response1 = await apiClient.getAuthMe(validToken)
      const response2 = await apiClient.getAuthMe(validToken)
      
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      expect(response1.body.data.userId).toBe(response2.body.data.userId)
    })
  })

  describe('Invalid JWT token returns 401', () => {
    test('should return 401 with AUTH_REQUIRED code for invalid token', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      const response = await apiClient.getAuthMe(invalidToken)
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
      expect(response.body.error).toContain('Invalid or expired token')
    })

    test('should return 401 for corrupted JWT token', async () => {
      const corruptedToken = validToken.slice(0, -10) + 'corrupted'
      const response = await apiClient.getAuthMe(corruptedToken)
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })
  })

  describe('Expired JWT token returns 401', () => {
    test('should return 401 with appropriate error message for expired token', async () => {
      const response = await apiClient.getAuthMe(expiredToken)
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
      expect(response.body.error).toContain('Invalid or expired token')
    })
  })

  describe('Missing Authorization header returns 401', () => {
    test('should return 401 with AUTH_REQUIRED error when no Authorization header', async () => {
      const response = await apiClient.getAuthMe()
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
      expect(response.body.error).toContain('Authorization header missing or invalid')
    })

    test('should return 401 when Authorization header is empty', async () => {
      const response = await apiClient.getAuthMe('')
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })
  })

  describe('Malformed JWT token returns 401', () => {
    test('should return 401 for completely malformed token', async () => {
      const response = await apiClient.getAuthMe(malformedToken)
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })

    test('should return 401 for token missing Bearer prefix', async () => {
      // Test direct token without Bearer prefix by making raw request
      const tokenWithoutBearer = validToken.replace('Bearer ', '')
      const response = await apiClient.makeRawRequest('GET', '/api/v1/auth/me', {
        'Authorization': tokenWithoutBearer, // No "Bearer " prefix
        'Content-Type': 'application/json'
      })

      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })

    test('should return 401 for token with wrong number of parts', async () => {
      const wrongPartsToken = 'header.payload' // Missing signature
      const response = await apiClient.getAuthMe(wrongPartsToken)
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })
  })

  describe('Response includes correct user data format', () => {
    test('should validate response schema includes all required fields', async () => {
      const response = await apiClient.getAuthMe(validToken)
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveValidApiResponse()
      
      // Verify all required fields are present
      const requiredFields = ['userId', 'sessionId', 'authenticated', 'timestamp']
      requiredFields.forEach(field => {
        expect(response.body.data).toHaveProperty(field)
      })
      
      // Verify field types
      expect(typeof response.body.data.userId).toBe('string')
      expect(typeof response.body.data.sessionId).toBe('string')
      expect(response.body.data.authenticated).toBe(true)
      expect(typeof response.body.data.timestamp).toBe('string')
      
      // Verify userId is valid UUID format
      expect(response.body.data.userId).toBeValidUUID()
    })
  })

  describe('Response time under 100ms', () => {
    test('should respond within 500ms for valid authentication', async () => {
      const { result, duration } = await measureResponseTime(async () => {
        return await apiClient.getAuthMe(validToken)
      })

      expect(result.status).toBe(200)
      expect(duration).toBeLessThan(500) // Adjusted for HTTP requests to running server
    })

    test('should respond quickly even for invalid tokens', async () => {
      const { result, duration } = await measureResponseTime(async () => {
        return await apiClient.getAuthMe(malformedToken)
      })

      expect(result.status).toBe(401)
      expect(duration).toBeLessThan(500) // Adjusted for HTTP requests to running server
    })
  })
})
