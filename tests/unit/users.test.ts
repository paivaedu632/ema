/**
 * User Management API Tests
 * Tests for GET /api/v1/users/search endpoint
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { ApiTestClient, getRealSupabaseJWT, expectSuccessResponse, expectErrorResponse, TEST_USERS } from '../utils'

describe('User Management API - GET /api/v1/users/search', () => {
  let apiClient: ApiTestClient
  let validToken: string

  beforeAll(async () => {
    apiClient = new ApiTestClient()
    validToken = await getRealSupabaseJWT(TEST_USERS.VALID_USER.id)
  })

  afterAll(() => {
    // Cleanup if needed
  })

  describe('User Search Functionality', () => {
    test('should return 200 with user search results for valid query', async () => {
      const response = await apiClient.searchUsers('postman-test@emapay.com', 'email', validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // Verify response structure
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.message).toBe('Users found successfully')
      
      // If users found, verify structure
      if (response.body.data.length > 0) {
        const user = response.body.data[0]
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('identifierType')
        
        // Optional fields
        if (user.phone) expect(typeof user.phone).toBe('string')
        if (user.fullName) expect(typeof user.fullName).toBe('string')
        
        // Verify data types
        expect(typeof user.id).toBe('string')
        expect(typeof user.email).toBe('string')
        expect(typeof user.identifierType).toBe('string')
        
        // Verify user ID is valid UUID
        expect(user.id).toBeValidUUID()
      }
    })

    test('should search by email (default type)', async () => {
      const response = await apiClient.searchUsers('test@emapay.com', undefined, validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    test('should search by phone number', async () => {
      const response = await apiClient.searchUsers('+244900000001', 'phone', validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    test('should search by name', async () => {
      const response = await apiClient.searchUsers('Test User', 'name', validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    test('should exclude current user from search results', async () => {
      const response = await apiClient.searchUsers(TEST_USERS.VALID_USER.email, 'email', validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // Should not return the current user
      const currentUserInResults = response.body.data.find((user: any) => user.id === TEST_USERS.VALID_USER.id)
      expect(currentUserInResults).toBeUndefined()
    })

    test('should return empty array for no matches', async () => {
      const response = await apiClient.searchUsers('nonexistent@emapay.com', 'email', validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      expect(response.body.data).toEqual([])
    })
  })

  describe('Input Validation', () => {
    test('should return 400 for empty query', async () => {
      const response = await apiClient.searchUsers('', 'email', validToken)
      
      expect(response.status).toBe(400)
      expectErrorResponse(response.body)
      expect(response.body.error).toMatch(/validation/i)
    })

    test('should return 400 for query too long', async () => {
      const longQuery = 'a'.repeat(101) // Max is 100 characters
      const response = await apiClient.searchUsers(longQuery, 'email', validToken)
      
      expect(response.status).toBe(400)
      expectErrorResponse(response.body)
    })

    test('should return 400 for invalid search type', async () => {
      const response = await apiClient.searchUsers('test@emapay.com', 'invalid', validToken)
      
      expect(response.status).toBe(400)
      expectErrorResponse(response.body)
    })

    test('should accept valid search types', async () => {
      const validTypes = ['email', 'phone', 'name']
      
      for (const type of validTypes) {
        const response = await apiClient.searchUsers('test', type, validToken)
        expect([200, 400]).toContain(response.status) // 400 might be due to invalid format for specific type
      }
    })
  })

  describe('Authentication and Authorization', () => {
    test('should require authentication', async () => {
      const response = await apiClient.searchUsers('test@emapay.com')
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })

    test('should reject invalid tokens', async () => {
      const response = await apiClient.searchUsers('test@emapay.com', 'email', 'invalid-token')
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })
  })

  describe('Data Privacy and Security', () => {
    test('should not expose sensitive user information', async () => {
      const response = await apiClient.searchUsers('test@emapay.com', 'email', validToken)
      
      expect(response.status).toBe(200)
      
      if (response.body.data.length > 0) {
        const user = response.body.data[0]
        
        // Should not expose sensitive fields
        expect(user).not.toHaveProperty('password')
        expect(user).not.toHaveProperty('pin')
        expect(user).not.toHaveProperty('pinHash')
        expect(user).not.toHaveProperty('balance')
        expect(user).not.toHaveProperty('walletBalance')
      }
    })

    test('should filter results appropriately', async () => {
      const response = await apiClient.searchUsers('test', 'name', validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // All returned users should be different from current user
      response.body.data.forEach((user: any) => {
        expect(user.id).not.toBe(TEST_USERS.VALID_USER.id)
      })
    })
  })

  describe('Performance and Reliability', () => {
    test('should respond quickly for search queries', async () => {
      const start = Date.now()
      const response = await apiClient.searchUsers('test@emapay.com', 'email', validToken)
      const duration = Date.now() - start
      
      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(1000) // Should respond within 1 second
    })

    test('should handle concurrent search requests', async () => {
      const requests = Array(3).fill(null).map(() => 
        apiClient.searchUsers('test', 'name', validToken)
      )
      
      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)
      })
    })

    test('should handle special characters in search query', async () => {
      const specialQueries = ['test+user@emapay.com', 'test.user@emapay.com', 'test_user@emapay.com']
      
      for (const query of specialQueries) {
        const response = await apiClient.searchUsers(query, 'email', validToken)
        expect([200, 400]).toContain(response.status) // Should handle gracefully
      }
    })
  })

  describe('Response Format', () => {
    test('should return consistent response format', async () => {
      const response = await apiClient.searchUsers('test@emapay.com', 'email', validToken)
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveValidApiResponse()
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(typeof response.body.message).toBe('string')
    })
  })
})
