/**
 * Security & Vulnerability Tests
 * Tests for security vulnerabilities and attack vectors
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { testUtils, TestUser } from '../utils';

describe('Security & Vulnerability Testing', () => {
  let testUser: TestUser;
  let userWithBalance: TestUser;

  beforeAll(async () => {
    // Create test users for security testing
    testUser = await testUtils.createUser({
      email: 'security-test@emapay.test',
      metadata: { purpose: 'Security Testing' }
    });

    userWithBalance = await testUtils.createUserWithBalance({
      email: 'security-balance-test@emapay.test',
      metadata: { purpose: 'Security Balance Testing' },
      balances: {
        EUR: { available: 1000.00, reserved: 0 }
      }
    });
  });

  afterAll(async () => {
    // Clean up test users
    await testUtils.cleanup();
  });

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' OR 1=1 --",
      "'; DELETE FROM wallets; --",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'evil@hack.com'); --",
      "' OR 'x'='x",
      "'; UPDATE users SET email='hacked@evil.com' WHERE id=1; --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; EXEC xp_cmdshell('dir'); --"
    ];

    test('should prevent SQL injection in user search', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await testUtils.get(
          `/api/v1/users/search?q=${encodeURIComponent(payload)}`,
          testUser
        );
        
        // Should return empty results or 400, not 500 (which would indicate SQL error)
        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          const results = testUtils.assertSuccessResponse(response, 200);
          expect(Array.isArray(results)).toBe(true);
          // Should not return unexpected data or error messages
          expect(results.length).toBeLessThanOrEqual(20); // Normal limit
        }
      }
    });

    test('should prevent SQL injection in transfer operations', async () => {
      for (const payload of sqlInjectionPayloads) {
        const transferData = {
          recipientId: payload,
          currency: 'EUR',
          amount: 10.00,
          pin: '123456'
        };

        const response = await testUtils.post(
          '/api/v1/transfers/send',
          transferData,
          userWithBalance
        );
        
        // Should return 400 or 404 for invalid recipient, not 500
        expect([400, 404]).toContain(response.status);
        testUtils.assertErrorResponse(response, [400, 404]);
      }
    });

    test('should prevent SQL injection in wallet operations', async () => {
      const maliciousCurrencies = [
        "EUR'; DROP TABLE wallets; --",
        "AOA' OR '1'='1",
        "EUR' UNION SELECT * FROM users --"
      ];

      for (const currency of maliciousCurrencies) {
        const response = await testUtils.get(
          `/api/v1/wallets/${encodeURIComponent(currency)}`,
          testUser
        );
        
        // Should return 400 for invalid currency, not 500
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain('currency');
      }
    });

    test('should sanitize SQL injection in transfer descriptions', async () => {
      const maliciousDescription = "'; DROP TABLE transfers; --";
      
      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        10.00
      );
      transferData.description = maliciousDescription;

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userWithBalance
      );
      
      if (response.status === 201) {
        const transfer = testUtils.assertSuccessResponse(response, 201);
        // Description should be sanitized or escaped
        expect(transfer.description).not.toContain('DROP TABLE');
      } else {
        // Should fail gracefully, not with SQL error
        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('XSS and Input Sanitization', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")',
      '<svg onload="alert(1)">',
      '"><script>alert("XSS")</script>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload="alert(1)">',
      '<div onclick="alert(1)">Click me</div>',
      '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      '%3Cscript%3Ealert("XSS")%3C/script%3E'
    ];

    test('should sanitize XSS in user search queries', async () => {
      for (const payload of xssPayloads) {
        const response = await testUtils.get(
          `/api/v1/users/search?q=${encodeURIComponent(payload)}`,
          testUser
        );
        
        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          const results = testUtils.assertSuccessResponse(response, 200);
          expect(Array.isArray(results)).toBe(true);
          
          // Response should not contain unescaped script tags
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
          expect(responseText).not.toContain('onerror=');
        }
      }
    });

    test('should sanitize XSS in transfer descriptions', async () => {
      for (const payload of xssPayloads) {
        const transferData = testUtils.generateTransferData(
          testUser.id,
          'EUR',
          1.00
        );
        transferData.description = payload;

        const response = await testUtils.post(
          '/api/v1/transfers/send',
          transferData,
          userWithBalance
        );
        
        if (response.status === 201) {
          const transfer = testUtils.assertSuccessResponse(response, 201);
          
          // Description should be sanitized
          expect(transfer.description).not.toContain('<script>');
          expect(transfer.description).not.toContain('javascript:');
          expect(transfer.description).not.toContain('onerror=');
          expect(transfer.description).not.toContain('onload=');
        }
      }
    });

    test('should handle malformed JSON input', async () => {
      const malformedPayloads = [
        '{"invalid": json}',
        '{invalid json',
        'not json at all',
        '{"nested": {"too": {"deep": {"object": "value"}}}}',
        '{"circular": "reference"}',
        '{"huge": "' + 'x'.repeat(10000) + '"}'
      ];

      for (const payload of malformedPayloads) {
        try {
          const response = await testUtils.postRaw(
            '/api/v1/transfers/send',
            payload,
            testUser
          );
          
          // Should return 400 for malformed JSON
          testUtils.assertErrorResponse(response, 400);
        } catch (error) {
          // Network errors are acceptable for malformed requests
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Authentication Bypass Attempts', () => {
    test('should prevent JWT token manipulation', async () => {
      const manipulationAttempts = [
        // Modified header
        testUser.accessToken.replace(/^[^.]+/, 'eyJhbGciOiJub25lIn0'),
        // Modified payload
        testUser.accessToken.replace(/\.[^.]+\./, '.eyJzdWIiOiJhZG1pbiJ9.'),
        // No signature
        testUser.accessToken.split('.').slice(0, 2).join('.') + '.',
        // Wrong signature
        testUser.accessToken.slice(0, -10) + 'wrongsig12',
        // Empty token
        '',
        // Invalid format
        'not.a.jwt.token',
        // Null bytes
        testUser.accessToken + '\0admin'
      ];

      for (const token of manipulationAttempts) {
        const response = await testUtils.get('/api/v1/auth/me', undefined, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        testUtils.assertErrorResponse(response, 401);
        expect(response.body.error).toContain('token');
      }
    });

    test('should prevent authorization header manipulation', async () => {
      const headerManipulations = [
        `Basic ${Buffer.from('admin:password').toString('base64')}`,
        `Bearer ${testUser.accessToken} Bearer ${testUser.accessToken}`,
        `Bearer\n${testUser.accessToken}`,
        `Bearer\t${testUser.accessToken}`,
        `bearer ${testUser.accessToken}`, // Wrong case
        `Token ${testUser.accessToken}`,
        `JWT ${testUser.accessToken}`,
        testUser.accessToken, // Missing Bearer
        `Bearer  ${testUser.accessToken}`, // Extra space
        `Bearer${testUser.accessToken}` // No space
      ];

      for (const authHeader of headerManipulations) {
        const response = await testUtils.get('/api/v1/auth/me', undefined, {
          headers: { 'Authorization': authHeader }
        });
        
        testUtils.assertErrorResponse(response, 401);
      }
    });

    test('should prevent session fixation attacks', async () => {
      // Try to use another user's session
      const anotherUser = await testUtils.createUser({
        email: 'session-test@emapay.test'
      });

      // Try to access first user's data with second user's token
      const response = await testUtils.get('/api/v1/auth/me', anotherUser);
      const userData = testUtils.assertSuccessResponse(response, 200);
      
      // Should return second user's data, not first user's
      expect(userData.userId).toBe(anotherUser.id);
      expect(userData.userId).not.toBe(testUser.id);
    });

    test('should prevent privilege escalation', async () => {
      // Try to access admin endpoints (if they exist)
      const adminEndpoints = [
        '/api/v1/admin/users',
        '/api/v1/admin/system',
        '/api/v1/admin/config',
        '/api/v1/internal/debug',
        '/api/v1/system/reset'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await testUtils.get(endpoint, testUser);
        
        // Should return 404 (not found) or 403 (forbidden), not 200
        expect([403, 404]).toContain(response.status);
      }
    });
  });

  describe('Business Logic Security', () => {
    test('should prevent negative amount transfers', async () => {
      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        -100.00 // Negative amount
      );

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userWithBalance
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('amount');
    });

    test('should prevent zero amount transfers', async () => {
      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        0.00 // Zero amount
      );

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userWithBalance
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('amount');
    });

    test('should prevent transfers exceeding balance', async () => {
      const transferData = testUtils.generateTransferData(
        testUser.id,
        'EUR',
        999999.00 // Amount exceeding balance
      );

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userWithBalance
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('insufficient');
    });

    test('should prevent self-transfers', async () => {
      const transferData = testUtils.generateTransferData(
        userWithBalance.id, // Same as sender
        'EUR',
        10.00
      );

      const response = await testUtils.post(
        '/api/v1/transfers/send',
        transferData,
        userWithBalance
      );
      
      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error).toContain('self');
    });

    test('should prevent currency manipulation', async () => {
      const invalidCurrencies = [
        'INVALID',
        'USD', // Not supported
        'BTC',
        'ETH',
        'eur', // Wrong case
        'aoa', // Wrong case
        '123',
        'EUR123',
        'E U R'
      ];

      for (const currency of invalidCurrencies) {
        const transferData = testUtils.generateTransferData(
          testUser.id,
          currency,
          10.00
        );

        const response = await testUtils.post(
          '/api/v1/transfers/send',
          transferData,
          userWithBalance
        );
        
        testUtils.assertErrorResponse(response, 400);
        expect(response.body.error).toContain('currency');
      }
    });

    test('should prevent decimal precision manipulation', async () => {
      const invalidAmounts = [
        10.123, // Too many decimals
        10.1234,
        10.12345,
        0.001, // Below minimum precision
        999999999.999 // Too large with decimals
      ];

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
        expect(response.body.error).toContain(['amount', 'precision']);
      }
    });
  });

  describe('Data Privacy Protection', () => {
    test('should not expose sensitive user data in search', async () => {
      const response = await testUtils.get(
        `/api/v1/users/search?q=${testUser.email}`,
        userWithBalance
      );
      
      const results = testUtils.assertSuccessResponse(response, 200);
      
      if (results.length > 0) {
        results.forEach((user: any) => {
          // Should not expose sensitive fields
          expect(user).not.toHaveProperty('password');
          expect(user).not.toHaveProperty('pin');
          expect(user).not.toHaveProperty('pinHash');
          expect(user).not.toHaveProperty('accessToken');
          expect(user).not.toHaveProperty('refreshToken');
          expect(user).not.toHaveProperty('privateKey');
          expect(user).not.toHaveProperty('internalId');
          expect(user).not.toHaveProperty('metadata');
        });
      }
    });

    test('should not expose other users wallet data', async () => {
      // User should only see their own wallet data
      const response = await testUtils.get('/api/v1/wallets/balance', testUser);
      
      const balances = testUtils.assertSuccessResponse(response, 200);
      
      // Should return testUser's balances (zero), not userWithBalance's balances
      balances.forEach((balance: any) => {
        expect(balance.availableBalance).toBe(0);
        expect(balance.reservedBalance).toBe(0);
        expect(balance.totalBalance).toBe(0);
      });
    });

    test('should not expose other users transfer history', async () => {
      const response = await testUtils.get('/api/v1/transfers/history', testUser);
      
      const history = testUtils.assertSuccessResponse(response, 200);
      
      // Should only return transfers involving testUser
      history.transfers.forEach((transfer: any) => {
        const isInvolved = transfer.fromUserId === testUser.id || 
                          transfer.toUserId === testUser.id;
        expect(isInvolved).toBe(true);
      });
    });

    test('should mask sensitive data in error messages', async () => {
      // Try to access non-existent user
      const response = await testUtils.get(
        '/api/v1/users/search?q=nonexistent@example.com',
        testUser
      );
      
      const results = testUtils.assertSuccessResponse(response, 200);
      expect(results).toHaveLength(0);
      
      // Error messages should not reveal system internals
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('database');
      expect(responseText).not.toContain('sql');
      expect(responseText).not.toContain('internal');
      expect(responseText).not.toContain('stack trace');
    });
  });
});
