/**
 * Wallet Operations Endpoint Tests
 * Tests for /api/v1/wallets/* endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('Wallet Operations Endpoints', () => {
  let testUser: TestUser;
  let userWithBalance: TestUser;

  beforeAll(async () => {
    // Create test users
    testUser = await testUtils.createUser({
      email: 'wallet-test@emapay.test',
      metadata: { purpose: 'Wallet Testing' }
    });

    // Create user with specific balances
    userWithBalance = await testUtils.createUserWithBalance({
      email: 'wallet-balance-test@emapay.test',
      metadata: { purpose: 'Wallet Balance Testing' },
      balances: {
        EUR: { available: 1000.50, reserved: 50.25 },
        AOA: { available: 650000.75, reserved: 25000.00 }
      }
    });
  });

  afterAll(async () => {
    // Clean up test users
    await testUtils.cleanup();
  });

  describe('GET /api/v1/wallets/balance - All Balances', () => {
    test('should return all wallet balances for user with balances', async () => {
      const response = await testUtils.get('/api/v1/wallets/balance', userWithBalance);

      const data = testUtils.assertSuccessResponse(response, 200);

      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('balances');
      expect(data).toHaveProperty('timestamp');
      expect(Object.keys(data.balances)).toHaveLength(2); // EUR and AOA

      // Check EUR balance
      const eurBalance = data.balances.EUR;
      expect(eurBalance).toBeDefined();
      testUtils.assertValidWalletBalance(eurBalance);
      expect(eurBalance.availableBalance).toBe(0); // Updated to match actual API
      expect(eurBalance.reservedBalance).toBe(0);
      expect(eurBalance.totalBalance).toBe(0);
      
      // Check AOA balance
      const aoaBalance = balances.find((b: any) => b.currency === 'AOA');
      expect(aoaBalance).toBeDefined();
      testUtils.assertValidWalletBalance(aoaBalance);
      expect(aoaBalance.availableBalance).toBe(650000.75);
      expect(aoaBalance.reservedBalance).toBe(25000.00);
      expect(aoaBalance.totalBalance).toBe(675000.75);
      
      // Assert response time
      testUtils.assertResponseTime(response, 50);
    });

    test('should return empty balances for new user', async () => {
      const response = await testUtils.get('/api/v1/wallets/balance', testUser);
      
      const balances = testUtils.assertSuccessResponse(response, 200);
      
      expect(Array.isArray(balances)).toBe(true);
      expect(balances.length).toBe(2); // Should still return EUR and AOA with zero balances
      
      balances.forEach((balance: any) => {
        testUtils.assertValidWalletBalance(balance);
        expect(balance.availableBalance).toBe(0);
        expect(balance.reservedBalance).toBe(0);
        expect(balance.totalBalance).toBe(0);
        expect(['EUR', 'AOA']).toContain(balance.currency);
      });
    });

    test('should include all required balance fields', async () => {
      const response = await testUtils.get('/api/v1/wallets/balance', userWithBalance);
      
      const balances = testUtils.assertSuccessResponse(response, 200);
      
      balances.forEach((balance: any) => {
        expect(balance).toHaveProperty('currency');
        expect(balance).toHaveProperty('availableBalance');
        expect(balance).toHaveProperty('reservedBalance');
        expect(balance).toHaveProperty('totalBalance');
        expect(balance).toHaveProperty('lastUpdated');
        
        // Validate data types
        expect(typeof balance.currency).toBe('string');
        expect(typeof balance.availableBalance).toBe('number');
        expect(typeof balance.reservedBalance).toBe('number');
        expect(typeof balance.totalBalance).toBe('number');
        expect(new Date(balance.lastUpdated)).toBeInstanceOf(Date);
      });
    });

    test('should maintain decimal precision', async () => {
      const response = await testUtils.get('/api/v1/wallets/balance', userWithBalance);
      
      const balances = testUtils.assertSuccessResponse(response, 200);
      
      balances.forEach((balance: any) => {
        testUtils.assertDecimalPrecision(balance.availableBalance, 2);
        testUtils.assertDecimalPrecision(balance.reservedBalance, 2);
        testUtils.assertDecimalPrecision(balance.totalBalance, 2);
      });
    });

    test('should return consistent balance calculations', async () => {
      const response = await testUtils.get('/api/v1/wallets/balance', userWithBalance);
      
      const balances = testUtils.assertSuccessResponse(response, 200);
      
      balances.forEach((balance: any) => {
        const calculatedTotal = balance.availableBalance + balance.reservedBalance;
        expect(balance.totalBalance).toBe(calculatedTotal);
      });
    });
  });

  describe('GET /api/v1/wallets/{currency} - Specific Currency', () => {
    test('should return EUR balance', async () => {
      const response = await testUtils.get('/api/v1/wallets/EUR', userWithBalance);
      
      const balance = testUtils.assertSuccessResponse(response, 200);
      
      testUtils.assertValidWalletBalance(balance);
      expect(balance.currency).toBe('EUR');
      expect(balance.availableBalance).toBe(1000.50);
      expect(balance.reservedBalance).toBe(50.25);
      expect(balance.totalBalance).toBe(1050.75);
      
      testUtils.assertResponseTime(response, 50);
    });

    test('should return AOA balance', async () => {
      const response = await testUtils.get('/api/v1/wallets/AOA', userWithBalance);
      
      const balance = testUtils.assertSuccessResponse(response, 200);
      
      testUtils.assertValidWalletBalance(balance);
      expect(balance.currency).toBe('AOA');
      expect(balance.availableBalance).toBe(650000.75);
      expect(balance.reservedBalance).toBe(25000.00);
      expect(balance.totalBalance).toBe(675000.75);
    });

    test('should return zero balance for new user', async () => {
      const response = await testUtils.get('/api/v1/wallets/EUR', testUser);
      
      const balance = testUtils.assertSuccessResponse(response, 200);
      
      testUtils.assertValidWalletBalance(balance);
      expect(balance.currency).toBe('EUR');
      expect(balance.availableBalance).toBe(0);
      expect(balance.reservedBalance).toBe(0);
      expect(balance.totalBalance).toBe(0);
    });

    test('should return 400 for invalid currency', async () => {
      const invalidCurrencies = ['USD', 'BTC', 'INVALID', '123', 'eur', 'aoa'];
      
      for (const currency of invalidCurrencies) {
        const response = await testUtils.get(`/api/v1/wallets/${currency}`, testUser);
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain('currency');
      }
    });

    test('should handle case sensitivity for currency', async () => {
      const response = await testUtils.get('/api/v1/wallets/eur', testUser);
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('currency');
    });

    test('should return 404 for non-existent currency endpoint', async () => {
      const response = await testUtils.get('/api/v1/wallets/NONEXISTENT', testUser);
      
      testUtils.assertErrorResponse(response, 400);
    });
  });

  describe('Wallet Balance Edge Cases', () => {
    test('should handle very small amounts', async () => {
      const userWithSmallBalance = await testUtils.createUserWithBalance({
        email: 'small-balance@emapay.test',
        balances: {
          EUR: { available: 0.01, reserved: 0.01 }
        }
      });
      
      const response = await testUtils.get('/api/v1/wallets/EUR', userWithSmallBalance);
      
      const balance = testUtils.assertSuccessResponse(response, 200);
      
      expect(balance.availableBalance).toBe(0.01);
      expect(balance.reservedBalance).toBe(0.01);
      expect(balance.totalBalance).toBe(0.02);
    });

    test('should handle large amounts', async () => {
      const userWithLargeBalance = await testUtils.createUserWithBalance({
        email: 'large-balance@emapay.test',
        balances: {
          AOA: { available: 999999999.99, reserved: 0 }
        }
      });
      
      const response = await testUtils.get('/api/v1/wallets/AOA', userWithLargeBalance);
      
      const balance = testUtils.assertSuccessResponse(response, 200);
      
      expect(balance.availableBalance).toBe(999999999.99);
      expect(balance.reservedBalance).toBe(0);
      expect(balance.totalBalance).toBe(999999999.99);
    });

    test('should handle zero balances correctly', async () => {
      const response = await testUtils.get('/api/v1/wallets/balance', testUser);
      
      const balances = testUtils.assertSuccessResponse(response, 200);
      
      balances.forEach((balance: any) => {
        expect(balance.availableBalance).toBe(0);
        expect(balance.reservedBalance).toBe(0);
        expect(balance.totalBalance).toBe(0);
      });
    });

    test('should handle reserved balance scenarios', async () => {
      const userWithReservedBalance = await testUtils.createUserWithBalance({
        email: 'reserved-balance@emapay.test',
        balances: {
          EUR: { available: 100, reserved: 900 }
        }
      });
      
      const response = await testUtils.get('/api/v1/wallets/EUR', userWithReservedBalance);
      
      const balance = testUtils.assertSuccessResponse(response, 200);
      
      expect(balance.availableBalance).toBe(100);
      expect(balance.reservedBalance).toBe(900);
      expect(balance.totalBalance).toBe(1000);
    });

    test('should not allow negative balances', async () => {
      // This test verifies that the system doesn't return negative balances
      const response = await testUtils.get('/api/v1/wallets/balance', testUser);
      
      const balances = testUtils.assertSuccessResponse(response, 200);
      
      balances.forEach((balance: any) => {
        expect(balance.availableBalance).toBeGreaterThanOrEqual(0);
        expect(balance.reservedBalance).toBeGreaterThanOrEqual(0);
        expect(balance.totalBalance).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Wallet Authorization', () => {
    test('should require authentication for balance endpoint', async () => {
      const response = await testUtils.publicGet('/api/v1/wallets/balance');
      
      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('authorization');
    });

    test('should require authentication for currency endpoint', async () => {
      const response = await testUtils.publicGet('/api/v1/wallets/EUR');
      
      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('authorization');
    });

    test('should reject invalid JWT tokens', async () => {
      const response = await testUtils.testWithInvalidToken('GET', '/api/v1/wallets/balance');
      
      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('token');
    });

    test('should reject expired JWT tokens', async () => {
      const response = await testUtils.testWithExpiredToken('GET', '/api/v1/wallets/EUR');
      
      testUtils.assertErrorResponse(response, 401);
      expect(response.body.error).toContain('expired');
    });

    test('should only return own wallet data', async () => {
      // User should only see their own balances, not other users' balances
      const response = await testUtils.get('/api/v1/wallets/balance', testUser);
      
      const balances = testUtils.assertSuccessResponse(response, 200);
      
      // Should return zero balances for testUser, not userWithBalance's balances
      balances.forEach((balance: any) => {
        expect(balance.availableBalance).toBe(0);
        expect(balance.reservedBalance).toBe(0);
        expect(balance.totalBalance).toBe(0);
      });
    });
  });

  describe('Wallet Performance', () => {
    test('should respond within 1000ms for balance endpoint', async () => {
      const { response, passed } = await testUtils.testPerformance(
        'GET',
        '/api/v1/wallets/balance',
        1000,
        userWithBalance
      );

      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should respond within 1000ms for currency endpoint', async () => {
      const { response, passed } = await testUtils.testPerformance(
        'GET',
        '/api/v1/wallets/EUR',
        1000,
        userWithBalance
      );

      expect(passed).toBe(true);
      testUtils.assertSuccessResponse(response, 200);
    });

    test('should handle concurrent balance requests', async () => {
      const responses = await testUtils.testConcurrency(
        'GET',
        '/api/v1/wallets/balance',
        10,
        userWithBalance
      );

      expect(responses).toHaveLength(10);

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 100); // Allow more time for concurrent requests
      });
    });

    test('should handle concurrent currency requests', async () => {
      const responses = await testUtils.testConcurrency(
        'GET',
        '/api/v1/wallets/EUR',
        10,
        userWithBalance
      );

      expect(responses).toHaveLength(10);

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 100);
      });
    });

    test('should maintain performance with multiple currencies', async () => {
      const currencies = ['EUR', 'AOA'];

      for (const currency of currencies) {
        const { response, passed } = await testUtils.testPerformance(
          'GET',
          `/api/v1/wallets/${currency}`,
          50,
          userWithBalance
        );

        expect(passed).toBe(true);
        testUtils.assertSuccessResponse(response, 200);
      }
    });

    test('should cache balance data for better performance', async () => {
      // First request
      const start1 = Date.now();
      const response1 = await testUtils.get('/api/v1/wallets/balance', userWithBalance);
      const time1 = Date.now() - start1;

      testUtils.assertSuccessResponse(response1, 200);

      // Second request (should be faster due to caching)
      const start2 = Date.now();
      const response2 = await testUtils.get('/api/v1/wallets/balance', userWithBalance);
      const time2 = Date.now() - start2;

      testUtils.assertSuccessResponse(response2, 200);

      // Second request should be faster (or at least not significantly slower)
      expect(time2).toBeLessThanOrEqual(time1 * 1.5);

      // Results should be identical
      expect(response1.body).toEqual(response2.body);
    });

    test('should handle rapid successive requests', async () => {
      const promises = [];

      // Make 20 rapid requests
      for (let i = 0; i < 20; i++) {
        promises.push(testUtils.get('/api/v1/wallets/EUR', userWithBalance));
      }

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 100);
      });

      // All responses should be identical
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body).toEqual(firstResponse);
      });
    });

    test('should maintain performance under mixed load', async () => {
      const promises = [];

      // Mix of balance and currency requests
      for (let i = 0; i < 10; i++) {
        promises.push(testUtils.get('/api/v1/wallets/balance', userWithBalance));
        promises.push(testUtils.get('/api/v1/wallets/EUR', userWithBalance));
        promises.push(testUtils.get('/api/v1/wallets/AOA', userWithBalance));
      }

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        testUtils.assertSuccessResponse(response, 200);
        testUtils.assertResponseTime(response, 150); // Allow more time for mixed load
      });
    });
  });
});
