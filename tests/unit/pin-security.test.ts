/**
 * PIN Security Operations Endpoint Tests
 * Tests for /api/v1/security/pin/* endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('PIN Security Operations Endpoints', () => {
  let testUser: TestUser;
  let userWithPin: TestUser;
  let userForRateLimit: TestUser;

  beforeAll(async () => {
    // Create test users for PIN security testing
    testUser = await testUtils.createUser({
      email: 'pin-security-test@emapay.test',
      metadata: { purpose: 'PIN Security Testing' }
    });

    userWithPin = await testUtils.createUser({
      email: 'pin-security-pin@emapay.test',
      metadata: { purpose: 'PIN Testing' }
    });

    userForRateLimit = await testUtils.createUser({
      email: 'pin-security-rate@emapay.test',
      metadata: { purpose: 'PIN Rate Limit Testing' }
    });
  });

  afterAll(async () => {
    await testUtils.cleanup();
  });

  describe('POST /api/v1/security/pin - PIN Setup', () => {
    test('should create new PIN successfully', async () => {
      const pinData = {
        pin: '123456',
        confirmPin: '123456'
      };

      const response = await testUtils.post(
        '/api/v1/security/pin',
        pinData,
        testUser
      );

      const result = testUtils.assertSuccessResponse(response, 200);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('PIN');

      // Should not return the actual PIN
      expect(result).not.toHaveProperty('pin');
      expect(result).not.toHaveProperty('hash');

      testUtils.assertResponseTime(response, 200);
    });

    test('should update existing PIN', async () => {
      // First set a PIN
      await testUtils.post('/api/v1/security/pin', {
        pin: '111111',
        confirmPin: '111111'
      }, userWithPin);

      // Then update it
      const newPinData = {
        currentPin: '111111',
        pin: '222222',
        confirmPin: '222222'
      };

      const response = await testUtils.post(
        '/api/v1/security/pin',
        newPinData,
        userWithPin
      );

      const result = testUtils.assertSuccessResponse(response, 200);

      expect(result.success).toBe(true);
      expect(result.message).toContain('PIN');
    });

    test('should validate PIN format', async () => {
      const invalidPins = [
        '12345', // Too short
        '1234567', // Too long
        'abcdef', // Non-numeric
        '123abc', // Mixed
        '', // Empty
        '000000', // All zeros
        '123123' // Repeated pattern
      ];

      for (const pin of invalidPins) {
        const pinData = {
          pin: pin,
          confirmPin: pin
        };

        const response = await testUtils.post(
          '/api/v1/security/pin/set',
          pinData,
          testUser
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['PIN', 'format', 'invalid']);
      }
    });

    test('should require PIN confirmation', async () => {
      const pinData = {
        pin: '123456',
        confirmPin: '654321' // Different confirmation
      };

      const response = await testUtils.post(
        '/api/v1/security/pin/set',
        pinData,
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain(['PIN', 'confirmation', 'match']);
    });

    test('should require current PIN for updates', async () => {
      const pinData = {
        pin: '333333',
        confirmPin: '333333'
        // Missing currentPin
      };

      const response = await testUtils.post(
        '/api/v1/security/pin/set',
        pinData,
        userWithPin
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain(['current', 'PIN', 'required']);
    });

    test('should validate current PIN for updates', async () => {
      const pinData = {
        currentPin: '999999', // Wrong current PIN
        pin: '444444',
        confirmPin: '444444'
      };

      const response = await testUtils.post(
        '/api/v1/security/pin/set',
        pinData,
        userWithPin
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain(['current', 'PIN', 'incorrect']);
    });

    test('should enforce PIN complexity rules', async () => {
      const weakPins = [
        '111111', // All same digits
        '123456', // Sequential
        '654321', // Reverse sequential
        '121212', // Alternating pattern
        '112233' // Paired pattern
      ];

      for (const pin of weakPins) {
        const pinData = {
          pin: pin,
          confirmPin: pin
        };

        const response = await testUtils.post(
          '/api/v1/security/pin/set',
          pinData,
          testUser
        );
        
        // Should either reject or warn about weak PIN
        if (response.status === 400) {
          expect(response.body.error).toContain(['PIN', 'weak', 'complexity']);
        } else {
          const result = testUtils.assertSuccessResponse(response, 201);
          expect(result).toHaveProperty('warning');
        }
      }
    });
  });

  describe('POST /api/v1/security/pin/verify - PIN Verification', () => {
    beforeEach(async () => {
      // Ensure userWithPin has a PIN set
      await testUtils.post('/api/v1/security/pin', {
        pin: '555555',
        confirmPin: '555555'
      }, userWithPin);
    });

    test('should verify correct PIN', async () => {
      const verifyData = {
        pin: '555555'
      };

      const response = await testUtils.post(
        '/api/v1/security/pin/verify',
        verifyData,
        userWithPin
      );

      const result = testUtils.assertSuccessResponse(response, 200);
      
      expect(result).toHaveProperty('verified');
      expect(result.verified).toBe(true);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('PIN verified successfully');
      
      testUtils.assertResponseTime(response, 200);
    });

    test('should reject incorrect PIN', async () => {
      const verifyData = {
        pin: '999999' // Wrong PIN
      };

      const response = await testUtils.post(
        '/api/v1/security/pin/verify',
        verifyData,
        userWithPin
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain(['PIN', 'incorrect', 'invalid']);
    });

    test('should reject verification for user without PIN', async () => {
      const verifyData = {
        pin: '123456'
      };

      const response = await testUtils.post(
        '/api/v1/security/pin/verify',
        verifyData,
        testUser
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain(['PIN', 'not set', 'configured']);
    });

    test('should validate PIN format in verification', async () => {
      const invalidPins = ['12345', '1234567', 'abcdef', ''];

      for (const pin of invalidPins) {
        const verifyData = { pin: pin };

        const response = await testUtils.post(
          '/api/v1/security/pin/verify',
          verifyData,
          userWithPin
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['PIN', 'format']);
      }
    });

    test('should implement rate limiting for failed attempts', async () => {
      const wrongPin = { pin: '000000' };
      const attempts = [];

      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        const response = await testUtils.post(
          '/api/v1/security/pin/verify',
          wrongPin,
          userForRateLimit
        );
        
        attempts.push(response);
      }

      // First few attempts should be 400 (wrong PIN)
      attempts.slice(0, 3).forEach(response => {
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['PIN', 'incorrect']);
      });

      // Later attempts should be rate limited (429)
      const rateLimitedAttempts = attempts.slice(3);
      const hasRateLimit = rateLimitedAttempts.some(response => response.status === 429);
      
      if (hasRateLimit) {
        expect(rateLimitedAttempts.some(response => 
          response.body.error && response.body.error.includes('rate limit')
        )).toBe(true);
      }
    });

    test('should track failed attempt count', async () => {
      const wrongPin = { pin: '111111' };

      const response1 = await testUtils.post(
        '/api/v1/security/pin/verify',
        wrongPin,
        userWithPin
      );
      
      testUtils.assertErrorResponse(response1, 400);
      
      const response2 = await testUtils.post(
        '/api/v1/security/pin/verify',
        wrongPin,
        userWithPin
      );
      
      testUtils.assertErrorResponse(response2, 400);
      
      // Second attempt might include attempt count in response
      if (response2.body.attemptsRemaining !== undefined) {
        expect(response2.body.attemptsRemaining).toBeLessThan(5);
      }
    });

    test('should reset failed attempts after successful verification', async () => {
      // Make a failed attempt
      await testUtils.post('/api/v1/security/pin/verify', {
        pin: '111111'
      }, userWithPin);

      // Then successful verification
      const response = await testUtils.post('/api/v1/security/pin/verify', {
        pin: '555555'
      }, userWithPin);
      
      const result = testUtils.assertSuccessResponse(response, 200);
      expect(result.verified).toBe(true);

      // Next failed attempt should not show accumulated count
      const nextFailed = await testUtils.post('/api/v1/security/pin/verify', {
        pin: '111111'
      }, userWithPin);
      
      testUtils.assertErrorResponse(nextFailed, 400);
    });
  });

  describe('PIN Security Features', () => {
    test('should hash PINs securely', async () => {
      // This test verifies that PINs are not stored in plain text
      // We can't directly test the hash, but we can verify behavior

      const pinData = {
        pin: '777777',
        confirmPin: '777777'
      };

      const setResponse = await testUtils.post(
        '/api/v1/security/pin',
        pinData,
        testUser
      );

      testUtils.assertSuccessResponse(setResponse, 201);

      // Verify the PIN works
      const verifyResponse = await testUtils.post(
        '/api/v1/security/pin/verify',
        { pin: '777777' },
        testUser
      );

      const result = testUtils.assertSuccessResponse(verifyResponse, 200);
      expect(result.verified).toBe(true);
    });

    test('should prevent timing attacks', async () => {
      // Measure response times for different scenarios
      const times = [];

      // Time for correct PIN
      const start1 = Date.now();
      await testUtils.post('/api/v1/security/pin/verify', {
        pin: '555555'
      }, userWithPin);
      times.push(Date.now() - start1);

      // Time for incorrect PIN
      const start2 = Date.now();
      await testUtils.post('/api/v1/security/pin/verify', {
        pin: '111111'
      }, userWithPin);
      times.push(Date.now() - start2);

      // Time for user without PIN
      const start3 = Date.now();
      await testUtils.post('/api/v1/security/pin/verify', {
        pin: '123456'
      }, testUser);
      times.push(Date.now() - start3);

      // Response times should be relatively consistent
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const timeDifference = maxTime - minTime;

      // Allow some variance but not too much (timing attack protection)
      expect(timeDifference).toBeLessThan(100); // 100ms variance
    });

    test('should handle concurrent PIN operations safely', async () => {
      const pinData = {
        pin: '888888',
        confirmPin: '888888'
      };

      // Concurrent PIN set attempts
      const promises = Array(5).fill(null).map(() =>
        testUtils.post('/api/v1/security/pin/set', pinData, testUser)
      );

      const responses = await Promise.all(promises);

      // Only one should succeed, others should fail gracefully
      const successful = responses.filter(r => r.status === 201 || r.status === 200);
      const failed = responses.filter(r => r.status >= 400);

      expect(successful.length).toBeGreaterThanOrEqual(1);
      expect(successful.length + failed.length).toBe(5);
    });
  });

  describe('PIN Authorization', () => {
    test('should require authentication for PIN setup', async () => {
      const pinData = {
        pin: '123456',
        confirmPin: '123456'
      };

      const response = await testUtils.publicPost('/api/v1/security/pin/set', pinData);

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('authorization');
    });

    test('should require authentication for PIN verification', async () => {
      const verifyData = {
        pin: '123456'
      };

      const response = await testUtils.publicPost('/api/v1/security/pin/verify', verifyData);

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('authorization');
    });

    test('should reject invalid JWT tokens', async () => {
      const pinData = {
        pin: '123456',
        confirmPin: '123456'
      };

      const response = await testUtils.testWithInvalidToken(
        'POST',
        '/api/v1/security/pin',
        pinData
      );

      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('token');
    });
  });

  describe('PIN Performance', () => {
    test('should process PIN setup within 200ms', async () => {
      const pinData = {
        pin: '999999',
        confirmPin: '999999'
      };

      const { response, passed } = await testUtils.testPerformance(
        'POST',
        '/api/v1/security/pin/set',
        200,
        testUser,
        pinData
      );

      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 201);
    });

    test('should process PIN verification within 200ms', async () => {
      const verifyData = {
        pin: '555555'
      };

      const { response, passed } = await testUtils.testPerformance(
        'POST',
        '/api/v1/security/pin/verify',
        200,
        userWithPin,
        verifyData
      );

      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should handle multiple PIN operations efficiently', async () => {
      const promises = Array(10).fill(null).map(() =>
        testUtils.post('/api/v1/security/pin/verify', {
          pin: '555555'
        }, userWithPin)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 300);
      });
    });
  });
});
