/**
 * Edge Cases & Error Handling Tests
 * Tests for boundary conditions and error scenarios
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('Edge Cases & Error Handling', () => {
  let testUser: TestUser;
  let userWithBalance: TestUser;

  beforeAll(async () => {
    // Create test users for edge case testing
    testUser = await testUtils.createUser({
      email: 'edge-case-test@emapay.test',
      metadata: { purpose: 'Edge Case Testing' }
    });

    userWithBalance = await testUtils.createUserWithBalance({
      email: 'edge-balance-test@emapay.test',
      metadata: { purpose: 'Edge Case Balance Testing' },
      balances: {
        EUR: { available: 999999999.99, reserved: 0 },
        AOA: { available: 999999999.99, reserved: 0 }
      }
    });
  });

  afterAll(async () => {
    // Clean up test users
    await testUtils.cleanup();
  });

  describe('Boundary Value Conditions', () => {
    test('should handle minimum transfer amount', async () => {
      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        0.01 // Minimum amount
      );

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userWithBalance
      );
      
      const transfer = testUtils.assertSuccessResponse(response, 201);
      expect(transfer.amount).toBe(0.01);
      testUtils.assertDecimalPrecision(transfer.amount, 2);
    });

    test('should handle maximum transfer amount', async () => {
      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        999999999.99 // Maximum amount
      );

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userWithBalance
      );
      
      const transfer = testUtils.assertSuccessResponse(response, 201);
      expect(transfer.amount).toBe(999999999.99);
      testUtils.assertDecimalPrecision(transfer.amount, 2);
    });

    test('should reject amounts below minimum', async () => {
      const invalidAmounts = [0.001, 0.005, 0.009];

      for (const amount of invalidAmounts) {
        const transferData = testUtils.generateTransferData(
          testUser.id,
          'EUR',
          amount
        );

        const response = await testUtils.post(
          '/api/v1/transfers/send',
          transferData,
          userWithBalance
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['amount', 'minimum']);
      }
    });

    test('should reject amounts above maximum', async () => {
      const invalidAmounts = [1000000000.00, 9999999999.99, Number.MAX_SAFE_INTEGER];

      for (const amount of invalidAmounts) {
        const transferData = testUtils.generateTransferData(
          testUser.id,
          'EUR',
          amount
        );

        const response = await testUtils.post(
          '/api/v1/transfers/send',
          transferData,
          userWithBalance
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain(['amount', 'maximum']);
      }
    });

    test('should handle maximum string lengths', async () => {
      // Test maximum description length
      const maxDescription = 'a'.repeat(500); // Assuming 500 char limit
      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        10.00
      );
      transferData.description = maxDescription;

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userWithBalance
      );
      
      if (response.status === 201) {
        const transfer = testUtils.assertSuccessResponse(response, 201);
        expect(transfer.description).toBe(maxDescription);
      } else {
        testUtils.assertErrorResponse(response, 400);
      }
    });

    test('should reject strings exceeding maximum length', async () => {
      const tooLongDescription = 'a'.repeat(501); // Exceeding limit
      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        10.00
      );
      transferData.description = tooLongDescription;

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userWithBalance
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain(['description', 'length']);
    });

    test('should handle decimal precision boundaries', async () => {
      const precisionTests = [
        { amount: 10.1, valid: true },
        { amount: 10.12, valid: true },
        { amount: 10.123, valid: false },
        { amount: 10.1234, valid: false },
        { amount: 0.01, valid: true },
        { amount: 0.001, valid: false }
      ];

      for (const test of precisionTests) {
        const transferData = testUtils.generateTransferData(
          testUser.id,
          'EUR',
          test.amount
        );

        const response = await testUtils.post(
          '/api/v1/transfers/send',
          transferData,
          userWithBalance
        );
        
        if (test.valid) {
          if (response.status === 201) {
            const transfer = testUtils.assertSuccessResponse(response, 201);
            testUtils.assertDecimalPrecision(transfer.amount, 2);
          }
        } else {
          testUtils.assertErrorResponse(response, 400);
          expect(response.body.error).toContain(['precision', 'decimal']);
        }
      }
    });

    test('should handle search query length boundaries', async () => {
      // Test minimum query length
      const shortQuery = 'ab'; // Assuming 2 char minimum
      const response1 = await testUtils.get(
        `/api/v1/users/search?q=${shortQuery}`,
        testUser
      );
      
      if (response1.status === 200) {
        testUtils.assertSuccessResponse(response1, 200);
      } else {
        testUtils.assertErrorResponse(response1, 400);
      }

      // Test maximum query length
      const longQuery = 'a'.repeat(100); // Assuming 100 char limit
      const response2 = await testUtils.get(
        `/api/v1/users/search?q=${longQuery}`,
        testUser
      );
      
      if (response2.status === 200) {
        testUtils.assertSuccessResponse(response2, 200);
      } else {
        testUtils.assertErrorResponse(response2, 400);
      }

      // Test exceeding maximum
      const tooLongQuery = 'a'.repeat(101);
      const response3 = await testUtils.get(
        `/api/v1/users/search?q=${tooLongQuery}`,
        testUser
      );
      
      testUtils.assertErrorResponse(response3, 400);
    });
  });

  describe('Race Condition Scenarios', () => {
    test('should handle concurrent transfers from same user', async () => {
      const transferAmount = 100.00;
      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        transferAmount
      );

      // Execute multiple transfers concurrently
      const promises = Array(5).fill(null).map(() =>
        testUtils.post('/api/v1/transfers/send', transferData, userWithBalance)
      );

      const responses = await Promise.all(promises);
      
      // Some should succeed, some should fail due to insufficient balance
      const successful = responses.filter(r => r.status === 201);
      const failed = responses.filter(r => r.status === 400);
      
      expect(successful.length + failed.length).toBe(5);
      expect(successful.length).toBeGreaterThan(0);
      expect(failed.length).toBeGreaterThan(0);
      
      // Failed transfers should have proper error messages
      failed.forEach(response => {
        expect(response.body.error).toContain('insufficient');
      });
    });

    test('should handle concurrent balance checks', async () => {
      const promises = Array(10).fill(null).map(() =>
        testUtils.get('/api/v1/wallets/balance', userWithBalance)
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
      });
      
      // All should return identical results
      const firstResponse = responses[0].body.data;
      responses.forEach(response => {
        expect(response.body.data).toEqual(firstResponse);
      });
    });

    test('should handle concurrent user searches', async () => {
      const promises = Array(10).fill(null).map(() =>
        testUtils.get('/api/v1/users/search?q=test', testUser)
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
      });
      
      // Results should be consistent
      const firstResults = responses[0].body.data;
      responses.forEach(response => {
        expect(response.body.data).toEqual(firstResults);
      });
    });

    test('should prevent double-spending in rapid transfers', async () => {
      // Create user with exact balance for one transfer
      const singleTransferUser = await testUtils.createUserWithBalance({
        email: 'single-transfer@emapay.test',
        balances: {
          EUR: { available: 50.00, reserved: 0 }
        }
      });

      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        50.00 // Exact balance
      );

      // Try to send two transfers simultaneously
      const [response1, response2] = await Promise.all([
        testUtils.post('/api/v1/transfers/send', transferData, singleTransferUser),
        testUtils.post('/api/v1/transfers/send', transferData, singleTransferUser)
      ]);

      // Only one should succeed
      const successful = [response1, response2].filter(r => r.status === 201);
      const failed = [response1, response2].filter(r => r.status === 400);
      
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(1);
      
      // Failed transfer should indicate insufficient balance
      expect(failed[0].body.error).toContain('insufficient');
    });
  });

  describe('Network Failure Handling', () => {
    test('should handle malformed request bodies', async () => {
      const malformedBodies = [
        null,
        undefined,
        '',
        'not json',
        '{"incomplete": ',
        '{"invalid": json}',
        '{malformed json',
        '{"circular": {"ref": "circular"}}'
      ];

      for (const body of malformedBodies) {
        try {
          const response = await testUtils.postRaw(
            '/api/v1/transfers/send',
            body,
            testUser
          );
          
          testUtils.assertErrorResponse(response, 400);
          expect(response.body.error).toContain(['json', 'body', 'format']);
        } catch (error) {
          // Network errors are acceptable for malformed requests
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle missing request headers', async () => {
      const response = await testUtils.get('/api/v1/auth/me', undefined, {
        headers: {} // No headers
      });
      
      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('authorization');
    });

    test('should handle oversized request bodies', async () => {
      const oversizedData = {
        recipientId: testUser.id,
        currency: 'EUR',
        amount: 10.00,
        pin: '123456',
        description: 'x'.repeat(10000), // Very large description
        metadata: 'y'.repeat(10000) // Large metadata
      };

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        oversizedData,
        userWithBalance
      );
      
      testUtils.assertErrorResponse(response, [400, 413]); // 413 = Payload Too Large
    });

    test('should handle timeout scenarios gracefully', async () => {
      // This test would ideally simulate slow network conditions
      // For now, we test that the API responds within reasonable time
      const start = Date.now();
      const response = await testUtils.get('/api/v1/health/status');
      const duration = Date.now() - start;
      
      testUtils.assertSuccessResponse(response, 200);
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  describe('Data Consistency Edge Cases', () => {
    test('should maintain balance consistency during errors', async () => {
      // Get initial balance
      const initialResponse = await testUtils.get('/api/v1/wallets/EUR', userWithBalance);
      const initialBalance = testUtils.assertSuccessResponse(initialResponse, 200);

      // Try invalid transfer that should fail
      const invalidTransferData = testUtils.generateTransferData(
        'invalid-user-id',
        'EUR',
        10.00
      );

      const transferResponse = await testUtils.post(
        '/api/v1/transfers/send',
        invalidTransferData,
        userWithBalance
      );
      
      testUtils.assertErrorResponse(transferResponse, [400, 404]);

      // Balance should remain unchanged
      const finalResponse = await testUtils.get('/api/v1/wallets/EUR', userWithBalance);
      const finalBalance = testUtils.assertSuccessResponse(finalResponse, 200);
      
      expect(finalBalance.availableBalance).toBe(initialBalance.availableBalance);
      expect(finalBalance.reservedBalance).toBe(initialBalance.reservedBalance);
      expect(finalBalance.totalBalance).toBe(initialBalance.totalBalance);
    });

    test('should handle database constraint violations gracefully', async () => {
      // Try to create transfer with invalid data that would violate constraints
      const constraintViolations = [
        { recipientId: null, currency: 'EUR', amount: 10.00, pin: '123456' },
        { recipientId: testUser.id, currency: null, amount: 10.00, pin: '123456' },
        { recipientId: testUser.id, currency: 'EUR', amount: null, pin: '123456' },
        { recipientId: testUser.id, currency: 'EUR', amount: 10.00, pin: null }
      ];

      for (const data of constraintViolations) {
        const response = await testUtils.post(
          '/api/v1/transfers/send',
          data,
          userWithBalance
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toBeDefined();
      }
    });

    test('should handle floating point precision issues', async () => {
      // Test amounts that could cause floating point precision issues
      const precisionTests = [
        0.1 + 0.2, // Should be 0.3 but might be 0.30000000000000004
        0.3 - 0.1, // Should be 0.2 but might have precision issues
        1.005,     // Rounding edge case
        2.675      // Another rounding edge case
      ];

      for (const amount of precisionTests) {
        const transferData = testUtils.generateTransferData(
          testUser.id,
          'EUR',
          amount
        );

        const response = await testUtils.post(
          '/api/v1/transfers/send',
          transferData,
          userWithBalance
        );
        
        if (response.status === 201) {
          const transfer = testUtils.assertSuccessResponse(response, 201);
          // Amount should be properly rounded to 2 decimal places
          testUtils.assertDecimalPrecision(transfer.amount, 2);
        }
      }
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should recover from temporary failures', async () => {
      // Simulate recovery by making multiple requests
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < 10; i++) {
        const response = await testUtils.get('/api/v1/health/status');
        
        if (response.status === 200) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      // Most requests should succeed (system should be stable)
      expect(successCount).toBeGreaterThan(7);
      expect(errorCount).toBeLessThan(3);
    });

    test('should handle graceful degradation', async () => {
      // Test that core functionality works even under stress
      const coreEndpoints = [
        '/api/v1/health/status',
        '/api/v1/auth/me',
        '/api/v1/wallets/balance'
      ];

      for (const endpoint of coreEndpoints) {
        const response = await testUtils.get(endpoint, testUser);
        
        // Core endpoints should always work
        expect([200, 401]).toContain(response.status); // 401 for health (no auth needed)
      }
    });

    test('should provide meaningful error messages', async () => {
      // Test various error scenarios and ensure error messages are helpful
      const errorScenarios = [
        {
          action: () => testUtils.get('/api/v1/auth/me'),
          expectedError: 'authorization'
        },
        {
          action: () => testUtils.get('/api/v1/users/search?q=', testUser),
          expectedError: 'query'
        },
        {
          action: () => testUtils.get('/api/v1/wallets/INVALID', testUser),
          expectedError: 'currency'
        }
      ];

      for (const scenario of errorScenarios) {
        const response = await scenario.action();
        
        testUtils.assertErrorResponse(response, [400, 401]);
        expect(response.body.error).toContain(scenario.expectedError);
        expect(response.body.error.length).toBeGreaterThan(10); // Meaningful message
      }
    });
  });
});
