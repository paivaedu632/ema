/**
 * API Contract Testing
 * Tests for API contract compliance and backward compatibility
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('API Contract Testing', () => {
  let testUser: TestUser;

  beforeAll(async () => {
    testUser = await testUtils.createUser({
      email: 'contract-test@emapay.test',
      metadata: { purpose: 'API Contract Testing' }
    });
  });

  afterAll(async () => {
    await testUtils.cleanup();
  });

  describe('Request/Response Format Compliance', () => {
    test('should accept correct content types', async () => {
      const validContentTypes = [
        'application/json',
        'application/json; charset=utf-8'
      ];

      for (const contentType of validContentTypes) {
        const response = await testUtils.post(
          '/api/v1/auth/me',
          {},
          testUser,
          { 'Content-Type': contentType }
        );
        
        expect([200, 400]).toContain(response.status);
      }
    });

    test('should return correct response headers', async () => {
      const response = await testUtils.get('/api/v1/auth/me', testUser);
      
      testUtils.assertSuccessResponse(response, 200);
      
      // Check required headers
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['x-powered-by']).toBeDefined();
      
      // Security headers
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    test('should return consistent HTTP status codes', async () => {
      const testCases = [
        { endpoint: '/api/v1/auth/me', method: 'GET', expectedSuccess: 200 },
        { endpoint: '/api/v1/wallets/balance', method: 'GET', expectedSuccess: 200 },
        { endpoint: '/api/v1/users/search?q=test', method: 'GET', expectedSuccess: 200 },
        { endpoint: '/api/v1/health/status', method: 'GET', expectedSuccess: 200, noAuth: true }
      ];

      for (const testCase of testCases) {
        const response = testCase.noAuth 
          ? await testUtils.publicGet(testCase.endpoint)
          : await testUtils.get(testCase.endpoint, testUser);
        
        expect(response.status).toBe(testCase.expectedSuccess);
      }
    });

    test('should have consistent error response format', async () => {
      const errorEndpoints = [
        '/api/v1/invalid/endpoint',
        '/api/v1/wallets/INVALID',
        '/api/v1/users/search'  // Missing query parameter
      ];

      for (const endpoint of errorEndpoints) {
        const response = await testUtils.get(endpoint, testUser);
        
        if (response.status >= 400) {
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');
          expect(response.body).toHaveProperty('status');
          expect(response.body).toHaveProperty('timestamp');
        }
      }
    });

    test('should have consistent success response format', async () => {
      const successEndpoints = [
        '/api/v1/auth/me',
        '/api/v1/wallets/balance',
        '/api/v1/health/status'
      ];

      for (const endpoint of successEndpoints) {
        const response = endpoint === '/api/v1/health/status'
          ? await testUtils.publicGet(endpoint)
          : await testUtils.get(endpoint, testUser);
        
        testUtils.assertSuccessResponse(response, 200);
        
        // All success responses should have consistent structure
        expect(response.body).toBeDefined();
        expect(typeof response.body).toBe('object');
      }
    });
  });

  describe('Parameter Validation Compliance', () => {
    test('should enforce required parameters', async () => {
      const requiredParamTests = [
        {
          endpoint: '/api/v1/transfers/send',
          method: 'POST',
          missingParams: [
            { recipientId: 'test', currency: 'EUR' }, // Missing amount
            { amount: 100, currency: 'EUR' }, // Missing recipientId
            { recipientId: 'test', amount: 100 } // Missing currency
          ]
        }
      ];

      for (const test of requiredParamTests) {
        for (const params of test.missingParams) {
          const response = await testUtils.post(test.endpoint, params, testUser);
          
          testUtils.assertErrorResponse(response, 400);
          expect(response.body.error).toContain(['required', 'missing']);
        }
      }
    });

    test('should handle optional parameters correctly', async () => {
      // Test pagination parameters
      const response1 = await testUtils.get('/api/v1/transfers/history', testUser);
      const response2 = await testUtils.get('/api/v1/transfers/history?limit=5', testUser);
      const response3 = await testUtils.get('/api/v1/transfers/history?limit=5&offset=0', testUser);

      testUtils.assertSuccessResponse(response1, 200);
      testUtils.assertSuccessResponse(response2, 200);
      testUtils.assertSuccessResponse(response3, 200);

      // Optional parameters should not break the response
      expect(response2.body).toHaveProperty('transfers');
      expect(response3.body).toHaveProperty('transfers');
    });

    test('should validate parameter types', async () => {
      const typeValidationTests = [
        {
          endpoint: '/api/v1/transfers/send',
          invalidParams: {
            recipientId: 123, // Should be string
            amount: 'invalid', // Should be number
            currency: 123 // Should be string
          }
        }
      ];

      for (const test of typeValidationTests) {
        const response = await testUtils.post(test.endpoint, test.invalidParams, testUser);
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['type', 'invalid', 'format']);
      }
    });

    test('should validate parameter ranges', async () => {
      const rangeValidationTests = [
        {
          endpoint: '/api/v1/transfers/send',
          params: {
            recipientId: testUser.id,
            amount: -100, // Negative amount
            currency: 'EUR'
          }
        },
        {
          endpoint: '/api/v1/transfers/send',
          params: {
            recipientId: testUser.id,
            amount: 0, // Zero amount
            currency: 'EUR'
          }
        }
      ];

      for (const test of rangeValidationTests) {
        const response = await testUtils.post(test.endpoint, test.params, testUser);
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['amount', 'invalid', 'range']);
      }
    });

    test('should reject invalid parameter combinations', async () => {
      // Test self-transfer (invalid combination)
      const selfTransferData = {
        recipientId: testUser.id, // Same as sender
        amount: 100,
        currency: 'EUR'
      };

      const response = await testUtils.post('/api/v1/transfers/send', selfTransferData, testUser);
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain(['self', 'transfer', 'invalid']);
    });
  });

  describe('Backward Compatibility', () => {
    test('should handle API version headers', async () => {
      const versionHeaders = [
        { 'API-Version': '1.0' },
        { 'Accept-Version': '1.0' },
        { 'X-API-Version': '1.0' }
      ];

      for (const headers of versionHeaders) {
        const response = await testUtils.get('/api/v1/auth/me', testUser, headers);
        
        // Should not break with version headers
        expect([200, 400]).toContain(response.status);
      }
    });

    test('should maintain response format stability', async () => {
      const response = await testUtils.get('/api/v1/auth/me', testUser);
      
      testUtils.assertSuccessResponse(response, 200);
      
      // Core fields should always be present
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('createdAt');
      
      // Field types should be consistent
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.email).toBe('string');
      expect(typeof response.body.createdAt).toBe('string');
    });

    test('should handle deprecated parameters gracefully', async () => {
      // Test with potentially deprecated parameters
      const response = await testUtils.get(
        '/api/v1/users/search?q=test&deprecated_param=value',
        testUser
      );
      
      // Should not break with unknown parameters
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('users');
      }
    });

    test('should maintain client compatibility', async () => {
      // Test that old client patterns still work
      const oldStyleRequest = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'EmaPay-Client/1.0.0'
        }
      };

      const response = await testUtils.request('/api/v1/auth/me', oldStyleRequest);
      
      testUtils.assertSuccessResponse(response, 200);
    });
  });

  describe('API Documentation Compliance', () => {
    test('should match OpenAPI specification', async () => {
      // Test that actual responses match documented schemas
      const response = await testUtils.get('/api/v1/wallets/balance', testUser);
      
      testUtils.assertSuccessResponse(response, 200);
      
      // Should match documented wallet balance schema
      expect(response.body).toHaveProperty('balances');
      expect(typeof response.body.balances).toBe('object');
      
      if (response.body.balances.EUR) {
        expect(response.body.balances.EUR).toHaveProperty('available');
        expect(response.body.balances.EUR).toHaveProperty('reserved');
        expect(typeof response.body.balances.EUR.available).toBe('number');
        expect(typeof response.body.balances.EUR.reserved).toBe('number');
      }
    });

    test('should have consistent field naming', async () => {
      const endpoints = [
        '/api/v1/auth/me',
        '/api/v1/wallets/balance',
        '/api/v1/transfers/history'
      ];

      for (const endpoint of endpoints) {
        const response = await testUtils.get(endpoint, testUser);
        
        if (response.status === 200) {
          // Check for consistent naming patterns
          const responseStr = JSON.stringify(response.body);
          
          // Should use camelCase, not snake_case
          expect(responseStr).not.toMatch(/[a-z]+_[a-z]+/);
          
          // Should have consistent timestamp fields
          if (responseStr.includes('createdAt') || responseStr.includes('updatedAt')) {
            expect(responseStr).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          }
        }
      }
    });
  });
});
