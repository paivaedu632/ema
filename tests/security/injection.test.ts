/**
 * Security Testing - SQL Injection and Input Validation
 * Tests for SQL injection vulnerabilities and input validation
 */

import { ApiTestClient } from '../utils'
import { getRealSupabaseJWT } from '../utils/supabase-auth'

describe('Security Testing - SQL Injection Protection', () => {
  let apiClient: ApiTestClient
  let authToken: string

  beforeAll(async () => {
    apiClient = new ApiTestClient()
    authToken = await getRealSupabaseJWT()
  })

  describe('SQL Injection Attempts', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' OR 1=1 --",
      "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
      "' UNION SELECT * FROM users --",
      "'; UPDATE users SET email='hacked@evil.com' WHERE id=1; --",
      "' OR EXISTS(SELECT * FROM users) --",
      "'; EXEC xp_cmdshell('dir'); --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; WAITFOR DELAY '00:00:05'; --"
    ]

    test('User search should be protected against SQL injection', async () => {
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get(`/api/v1/users/search?q=${encodeURIComponent(payload)}&type=email`)
          .set('Authorization', `Bearer ${authToken}`)

        // Should either return 400 (validation error) or 200 with safe results
        expect([200, 400]).toContain(response.status)
        
        if (response.status === 200) {
          // If successful, should return safe data structure
          expect(response.body.success).toBe(true)
          expect(Array.isArray(response.body.data.users)).toBe(true)
          
          // Should not contain any suspicious data indicating successful injection
          const responseText = JSON.stringify(response.body)
          expect(responseText).not.toMatch(/DROP TABLE/i)
          expect(responseText).not.toMatch(/INSERT INTO/i)
          expect(responseText).not.toMatch(/UPDATE.*SET/i)
          expect(responseText).not.toMatch(/EXEC/i)
        }
      }
    })

    test('Transfer endpoints should be protected against SQL injection', async () => {
      for (const payload of sqlInjectionPayloads.slice(0, 5)) { // Test subset for performance
        const response = await request(app)
          .post('/api/v1/transfers/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientId: payload,
            amount: 10.00,
            currency: 'EUR',
            description: payload
          })

        // Should return validation error, not execute injection
        expect([400, 422]).toContain(response.status)
        expect(response.body.success).toBe(false)
        
        // Should not contain any database error messages that might leak info
        const responseText = JSON.stringify(response.body)
        expect(responseText).not.toMatch(/syntax error/i)
        expect(responseText).not.toMatch(/table.*doesn't exist/i)
        expect(responseText).not.toMatch(/column.*unknown/i)
      }
    })

    test('Order endpoints should be protected against SQL injection', async () => {
      for (const payload of sqlInjectionPayloads.slice(0, 3)) { // Test subset
        const response = await request(app)
          .post('/api/v1/orders/place')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            pair: payload,
            type: 'limit',
            side: 'buy',
            amount: 100,
            price: 650
          })

        // Should return validation error
        expect([400, 422]).toContain(response.status)
        expect(response.body.success).toBe(false)
      }
    })
  })

  describe('NoSQL Injection Protection', () => {
    const nosqlInjectionPayloads = [
      { "$ne": null },
      { "$gt": "" },
      { "$regex": ".*" },
      { "$where": "function() { return true; }" },
      { "$or": [{"email": "admin@test.com"}, {"email": {"$ne": null}}] }
    ]

    test('Should handle NoSQL injection attempts in JSON payloads', async () => {
      for (const payload of nosqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/transfers/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientId: payload,
            amount: 10.00,
            currency: 'EUR',
            description: 'Test transfer'
          })

        // Should return validation error
        expect([400, 422]).toContain(response.status)
        expect(response.body.success).toBe(false)
      }
    })
  })

  describe('Input Validation and Sanitization', () => {
    test('Should validate and sanitize user search input', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '${7*7}', // Template injection
        '{{7*7}}', // Template injection
        '../../../etc/passwd', // Path traversal
        '..\\..\\..\\windows\\system32\\config\\sam' // Windows path traversal
      ]

      for (const input of maliciousInputs) {
        const response = await request(app)
          .get(`/api/v1/users/search?q=${encodeURIComponent(input)}&type=email`)
          .set('Authorization', `Bearer ${authToken}`)

        // Should handle safely
        expect([200, 400]).toContain(response.status)
        
        if (response.status === 200) {
          const responseText = JSON.stringify(response.body)
          // Should not contain unescaped malicious content
          expect(responseText).not.toContain('<script>')
          expect(responseText).not.toContain('javascript:')
          expect(responseText).not.toContain('onerror=')
          expect(responseText).not.toContain('${7*7}')
          expect(responseText).not.toContain('{{7*7}}')
        }
      }
    })

    test('Should validate numeric inputs properly', async () => {
      const invalidNumbers = [
        'NaN',
        'Infinity',
        '-Infinity',
        '1e308', // Number overflow
        '1.7976931348623157e+308', // Max safe number + 1
        'null',
        'undefined',
        '{}',
        '[]'
      ]

      for (const invalidNumber of invalidNumbers) {
        const response = await request(app)
          .post('/api/v1/transfers/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientId: 'test-recipient',
            amount: invalidNumber,
            currency: 'EUR',
            description: 'Test transfer'
          })

        // Should return validation error
        expect([400, 422]).toContain(response.status)
        expect(response.body.success).toBe(false)
      }
    })

    test('Should validate currency codes properly', async () => {
      const invalidCurrencies = [
        'INVALID',
        'XXX',
        '123',
        'EUR123',
        'E',
        'EUREUR',
        null,
        undefined,
        '',
        '<script>',
        'EUR; DROP TABLE currencies;'
      ]

      for (const currency of invalidCurrencies) {
        const response = await request(app)
          .post('/api/v1/transfers/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            recipientId: 'test-recipient',
            amount: 10.00,
            currency: currency,
            description: 'Test transfer'
          })

        // Should return validation error
        expect([400, 422]).toContain(response.status)
        expect(response.body.success).toBe(false)
      }
    })
  })

  describe('Header Injection Protection', () => {
    test('Should protect against HTTP header injection', async () => {
      const headerInjectionPayloads = [
        'test\r\nX-Injected-Header: malicious',
        'test\nX-Injected-Header: malicious',
        'test\r\n\r\n<script>alert("xss")</script>',
        'test%0d%0aX-Injected-Header:%20malicious',
        'test%0aX-Injected-Header:%20malicious'
      ]

      for (const payload of headerInjectionPayloads) {
        const response = await request(app)
          .get('/api/v1/users/search?q=test&type=email')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Custom-Header', payload)

        // Should handle request safely
        expect([200, 400]).toContain(response.status)
        
        // Response should not contain injected headers
        expect(response.headers['x-injected-header']).toBeUndefined()
      }
    })
  })

  describe('Rate Limiting and DoS Protection', () => {
    test('Should handle rapid successive requests gracefully', async () => {
      const rapidRequests = 20
      const promises: Promise<any>[] = []

      for (let i = 0; i < rapidRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health/status')
        )
      }

      const results = await Promise.all(promises)
      
      // All requests should complete (may be rate limited but not crash)
      expect(results).toHaveLength(rapidRequests)
      
      // Most should succeed, some might be rate limited
      const successCount = results.filter(r => r.status === 200).length
      const rateLimitedCount = results.filter(r => r.status === 429).length
      
      expect(successCount + rateLimitedCount).toBe(rapidRequests)
      expect(successCount).toBeGreaterThan(0) // At least some should succeed
    })
  })

  describe('Error Information Disclosure', () => {
    test('Should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.success).toBe(false)
      
      const errorMessage = JSON.stringify(response.body).toLowerCase()
      
      // Should not contain sensitive information
      expect(errorMessage).not.toContain('database')
      expect(errorMessage).not.toContain('sql')
      expect(errorMessage).not.toContain('password')
      expect(errorMessage).not.toContain('secret')
      expect(errorMessage).not.toContain('key')
      expect(errorMessage).not.toContain('token')
      expect(errorMessage).not.toContain('stack trace')
      expect(errorMessage).not.toContain('file path')
    })

    test('Should not expose internal server errors details', async () => {
      // Try to trigger a server error with malformed data
      const response = await request(app)
        .post('/api/v1/orders/place')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pair: 'INVALID/PAIR',
          type: 'invalid_type',
          side: 'invalid_side',
          amount: -1,
          price: -1
        })

      expect([400, 422, 500]).toContain(response.status)
      expect(response.body.success).toBe(false)
      
      const errorMessage = JSON.stringify(response.body).toLowerCase()
      
      // Should not contain internal details
      expect(errorMessage).not.toContain('internal server error')
      expect(errorMessage).not.toContain('stack')
      expect(errorMessage).not.toContain('line')
      expect(errorMessage).not.toContain('.ts:')
      expect(errorMessage).not.toContain('.js:')
    })
  })
})
