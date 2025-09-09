/**
 * User Management Endpoint Tests
 * Tests for /api/v1/users/* endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('User Management Endpoints', () => {
  let testUser: TestUser;
  let searchTargetUser: TestUser;

  beforeAll(async () => {
    // Create test users
    testUser = await testUtils.createUser({
      email: 'user-search-test@emapay.test',
      metadata: { purpose: 'User Search Testing' }
    });

    // Create a user to search for
    searchTargetUser = await testUtils.createUser({
      email: 'search-target@emapay.test',
      metadata: { 
        purpose: 'Search Target',
        firstName: 'João',
        lastName: 'Silva',
        phone: '+244900123456'
      }
    });
  });

  afterAll(async () => {
    // Clean up test users
    await testUtils.cleanup();
  });

  describe('GET /api/v1/users/search - Valid Queries', () => {
    test('should search users by email', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=search-target@emapay.test',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foundUser = searchResults.find((user: any) => 
        user.email === 'search-target@emapay.test'
      );
      expect(foundUser).toBeDefined();
      expect(foundUser.userId).toBe(searchTargetUser.id);
      
      // Assert response time
      testUtils.assertResponseTime(response, 200);
    });

    test('should search users by partial email', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=search-target',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foundUser = searchResults.find((user: any) => 
        user.email === 'search-target@emapay.test'
      );
      expect(foundUser).toBeDefined();
    });

    test('should search users by phone number', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=+244900123456',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foundUser = searchResults.find((user: any) => 
        user.phone === '+244900123456'
      );
      expect(foundUser).toBeDefined();
      expect(foundUser.userId).toBe(searchTargetUser.id);
    });

    test('should search users by partial phone number', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=900123456',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foundUser = searchResults.find((user: any) => 
        user.phone === '+244900123456'
      );
      expect(foundUser).toBeDefined();
    });

    test('should search users by first name', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=João',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foundUser = searchResults.find((user: any) => 
        user.firstName === 'João'
      );
      expect(foundUser).toBeDefined();
      expect(foundUser.userId).toBe(searchTargetUser.id);
    });

    test('should search users by last name', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=Silva',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foundUser = searchResults.find((user: any) => 
        user.lastName === 'Silva'
      );
      expect(foundUser).toBeDefined();
      expect(foundUser.userId).toBe(searchTargetUser.id);
    });

    test('should search users by full name', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=João Silva',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foundUser = searchResults.find((user: any) => 
        user.firstName === 'João' && user.lastName === 'Silva'
      );
      expect(foundUser).toBeDefined();
      expect(foundUser.userId).toBe(searchTargetUser.id);
    });

    test('should handle case-insensitive search', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=joão silva',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foundUser = searchResults.find((user: any) => 
        user.firstName === 'João' && user.lastName === 'Silva'
      );
      expect(foundUser).toBeDefined();
    });

    test('should limit search results', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=test&limit=5',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeLessThanOrEqual(5);
    });

    test('should handle pagination', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=test&limit=2&offset=0',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/v1/users/search - Invalid Queries', () => {
    test('should return empty array for non-existent user', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=nonexistent@example.com',
        testUser
      );
      
      const searchResults = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBe(0);
    });

    test('should return 400 for missing query parameter', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search',
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('query');
    });

    test('should return 400 for empty query parameter', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=',
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('query');
    });

    test('should return 400 for query too short', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=a',
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('minimum');
    });

    test('should return 400 for query too long', async () => {
      const longQuery = 'a'.repeat(101); // Assuming 100 char limit
      const response = await testUtils.get(
        `/api/v1/users/search?q=${longQuery}`,
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('maximum');
    });

    test('should return 400 for invalid limit parameter', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=test&limit=invalid',
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('limit');
    });

    test('should return 400 for negative limit', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=test&limit=-1',
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('limit');
    });

    test('should return 400 for limit too high', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=test&limit=1000',
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('limit');
    });

    test('should return 400 for invalid offset parameter', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=test&offset=invalid',
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('offset');
    });

    test('should return 400 for negative offset', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=test&offset=-1',
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('offset');
    });

    test('should handle malformed email queries gracefully', async () => {
      const malformedEmails = [
        'invalid-email',
        '@invalid.com',
        'test@',
        'test@@invalid.com',
        'test@invalid@.com'
      ];

      for (const email of malformedEmails) {
        const response = await testUtils.get(
          `/api/v1/users/search?q=${encodeURIComponent(email)}`,
          testUser
        );
        
        // Should return empty results, not error
        const searchResults = testUtils.assertSuccessResponse(response, 200);
        expect(Array.isArray(searchResults)).toBe(true);
      }
    });

    test('should handle special characters in query', async () => {
      const specialChars = ['!@#$%^&*()', '<script>', 'DROP TABLE', '\'OR 1=1--'];

      for (const query of specialChars) {
        const response = await testUtils.get(
          `/api/v1/users/search?q=${encodeURIComponent(query)}`,
          testUser
        );
        
        // Should return empty results, not error
        const searchResults = testUtils.assertSuccessResponse(response, 200);
        expect(Array.isArray(searchResults)).toBe(true);
      }
    });
  });

  describe('User Search Privacy', () => {
    test('should return limited user data in search results', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=search-target@emapay.test',
        testUser
      );

      const searchResults = testUtils.assertSuccessResponse(response, 200);
      const foundUser = searchResults[0];

      // Should include public fields
      expect(foundUser).toHaveProperty('userId');
      expect(foundUser).toHaveProperty('firstName');
      expect(foundUser).toHaveProperty('lastName');
      expect(foundUser).toHaveProperty('email');

      // Should NOT include sensitive fields
      expect(foundUser).not.toHaveProperty('password');
      expect(foundUser).not.toHaveProperty('pin');
      expect(foundUser).not.toHaveProperty('pinHash');
      expect(foundUser).not.toHaveProperty('accessToken');
      expect(foundUser).not.toHaveProperty('refreshToken');
      expect(foundUser).not.toHaveProperty('privateKey');
      expect(foundUser).not.toHaveProperty('internalId');
    });

    test('should not expose full phone numbers to non-contacts', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=João',
        testUser
      );

      const searchResults = testUtils.assertSuccessResponse(response, 200);
      const foundUser = searchResults.find((user: any) => user.firstName === 'João');

      if (foundUser.phone) {
        // Phone should be masked or partially hidden
        expect(foundUser.phone).toMatch(/\*+/); // Contains asterisks for masking
        expect(foundUser.phone).not.toBe('+244900123456'); // Not full number
      }
    });

    test('should not return user own data in search results', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=user-search-test@emapay.test',
        testUser
      );

      const searchResults = testUtils.assertSuccessResponse(response, 200);

      // User should not find themselves in search results
      const selfResult = searchResults.find((user: any) =>
        user.userId === testUser.id
      );
      expect(selfResult).toBeUndefined();
    });

    test('should limit search results to prevent data mining', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=test&limit=100',
        testUser
      );

      const searchResults = testUtils.assertSuccessResponse(response, 200);

      // Should enforce maximum limit (e.g., 20 users max)
      expect(searchResults.length).toBeLessThanOrEqual(20);
    });

    test('should not expose user creation dates or metadata', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=search-target@emapay.test',
        testUser
      );

      const searchResults = testUtils.assertSuccessResponse(response, 200);
      const foundUser = searchResults[0];

      // Should NOT include metadata
      expect(foundUser).not.toHaveProperty('createdAt');
      expect(foundUser).not.toHaveProperty('updatedAt');
      expect(foundUser).not.toHaveProperty('lastLogin');
      expect(foundUser).not.toHaveProperty('metadata');
      expect(foundUser).not.toHaveProperty('purpose');
    });
  });

  describe('User Search Authorization', () => {
    test('should require authentication', async () => {
      const response = await testUtils.publicGet('/api/v1/users/search?q=test');

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('authorization');
    });

    test('should reject invalid JWT tokens', async () => {
      const response = await testUtils.testWithInvalidToken(
        'GET',
        '/api/v1/users/search?q=test'
      );

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('token');
    });

    test('should reject expired JWT tokens', async () => {
      const response = await testUtils.testWithExpiredToken(
        'GET',
        '/api/v1/users/search?q=test'
      );

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('expired');
    });

    test('should work with valid JWT token', async () => {
      const response = await testUtils.get(
        '/api/v1/users/search?q=test',
        testUser
      );

      // Should succeed with valid token
      testUtils.assertSuccessResponse(response, 200);
    });
  });

  describe('User Search Performance', () => {
    test('should respond within 200ms for simple queries', async () => {
      const { response, passed } = await testUtils.testPerformance(
        'GET',
        '/api/v1/users/search?q=test',
        200,
        testUser
      );

      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should respond within 200ms for complex queries', async () => {
      const { response, passed } = await testUtils.testPerformance(
        'GET',
        '/api/v1/users/search?q=João Silva&limit=10&offset=0',
        200,
        testUser
      );

      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should handle concurrent search requests', async () => {
      const responses = await testUtils.testConcurrency(
        'GET',
        '/api/v1/users/search?q=test',
        10,
        testUser
      );

      expect(responses).toHaveLength(10);

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 300); // Allow more time for concurrent requests
      });
    });

    test('should maintain performance with large result sets', async () => {
      const { response, passed } = await testUtils.testPerformance(
        'GET',
        '/api/v1/users/search?q=test&limit=20',
        250,
        testUser
      );

      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should cache frequent searches for better performance', async () => {
      // First request
      const start1 = Date.now();
      const response1 = await testUtils.get(
        '/api/v1/users/search?q=search-target@emapay.test',
        testUser
      );
      const time1 = Date.now() - start1;

      testUtils.assertSuccessResponse(response1, 200);

      // Second request (should be faster due to caching)
      const start2 = Date.now();
      const response2 = await testUtils.get(
        '/api/v1/users/search?q=search-target@emapay.test',
        testUser
      );
      const time2 = Date.now() - start2;

      testUtils.assertSuccessResponse(response2, 200);

      // Second request should be faster (or at least not significantly slower)
      expect(time2).toBeLessThanOrEqual(time1 * 1.5);
    });
  });
});
