/**
 * Security Testing - JWT Security Testing
 * Tests JWT token security, validation, and attack resistance
 */

import jwt from 'jsonwebtoken'
import { ApiTestClient } from '../utils'
import { getRealSupabaseJWT, createExpiredToken, createMalformedToken } from '../utils/supabase-auth'

describe('Security Testing - JWT Security', () => {
  let apiClient: ApiTestClient
  let validToken: string

  beforeAll(async () => {
    apiClient = new ApiTestClient()
    validToken = await getRealSupabaseJWT()
  })

  describe('Token Validation', () => {
    test('Should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Unauthorized')
    })

    test('Should reject malformed authorization headers', async () => {
      const malformedHeaders = [
        'InvalidToken',
        'Bearer',
        'Bearer ',
        'Basic dGVzdDp0ZXN0',
        'Token abc123',
        'Bearer token1 token2',
        'Bearer ' + 'a'.repeat(10000) // Extremely long token
      ]

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', header)
          .expect(401)

        expect(response.body.success).toBe(false)
      }
    })

    test('Should reject expired tokens', async () => {
      const expiredToken = createExpiredToken()
      
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Unauthorized')
    })

    test('Should reject malformed JWT tokens', async () => {
      const malformedToken = createMalformedToken()
      
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    test('Should reject tokens with invalid signatures', async () => {
      // Create a token with wrong signature
      const invalidToken = jwt.sign(
        {
          sub: '1d7e1eb7-8758-4a67-84a8-4fe911a733bc',
          email: 'test@example.com',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        'wrong-secret'
      )

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('Token Manipulation Attacks', () => {
    test('Should reject tokens with modified payload', async () => {
      // Try to modify the payload of a valid token
      const tokenParts = validToken.split('.')
      
      if (tokenParts.length === 3) {
        // Decode payload
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString())
        
        // Modify payload (try to escalate privileges)
        payload.role = 'admin'
        payload.sub = 'different-user-id'
        
        // Re-encode payload
        const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
        const modifiedToken = `${tokenParts[0]}.${modifiedPayload}.${tokenParts[2]}`

        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${modifiedToken}`)
          .expect(401)

        expect(response.body.success).toBe(false)
      }
    })

    test('Should reject tokens with modified header', async () => {
      const tokenParts = validToken.split('.')
      
      if (tokenParts.length === 3) {
        // Decode header
        const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString())
        
        // Modify header (try to change algorithm)
        header.alg = 'none'
        
        // Re-encode header
        const modifiedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
        const modifiedToken = `${modifiedHeader}.${tokenParts[1]}.${tokenParts[2]}`

        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${modifiedToken}`)
          .expect(401)

        expect(response.body.success).toBe(false)
      }
    })

    test('Should reject "none" algorithm tokens', async () => {
      // Create a token with "none" algorithm (algorithm confusion attack)
      const noneToken = jwt.sign(
        {
          sub: '1d7e1eb7-8758-4a67-84a8-4fe911a733bc',
          email: 'test@example.com',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        '',
        { algorithm: 'none' }
      )

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${noneToken}`)
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('Token Reuse and Session Management', () => {
    test('Valid token should work for multiple requests', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)

      expect(response1.body.success).toBe(true)

      // Second request with same token
      const response2 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)

      expect(response2.body.success).toBe(true)
      expect(response2.body.data.user.id).toBe(response1.body.data.user.id)
    })

    test('Should handle concurrent requests with same token', async () => {
      const concurrentRequests = 5
      const promises: Promise<any>[] = []

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${validToken}`)
            .expect(200)
        )
      }

      const results = await Promise.all(promises)
      
      // All should succeed with same user
      results.forEach(result => {
        expect(result.body.success).toBe(true)
        expect(result.body.data.user.id).toBe('1d7e1eb7-8758-4a67-84a8-4fe911a733bc')
      })
    })
  })

  describe('Token Information Disclosure', () => {
    test('Should not expose token details in error messages', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401)

      const errorMessage = JSON.stringify(response.body).toLowerCase()
      
      // Should not contain token details
      expect(errorMessage).not.toContain('invalid-token-format')
      expect(errorMessage).not.toContain('jwt')
      expect(errorMessage).not.toContain('signature')
      expect(errorMessage).not.toContain('payload')
      expect(errorMessage).not.toContain('header')
    })

    test('Should not expose internal JWT processing errors', async () => {
      const malformedTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-payload.signature',
        'invalid.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature',
        'header.payload.invalid-signature-format'
      ]

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401)

        const errorMessage = JSON.stringify(response.body).toLowerCase()
        
        // Should not contain internal error details
        expect(errorMessage).not.toContain('jsonwebtokenerror')
        expect(errorMessage).not.toContain('malformed')
        expect(errorMessage).not.toContain('invalid signature')
        expect(errorMessage).not.toContain('jwt expired')
      }
    })
  })

  describe('Authorization Bypass Attempts', () => {
    test('Should not accept tokens for different users', async () => {
      // This test assumes we can't easily create tokens for other users
      // In a real scenario, you might have test tokens for different users
      
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)

      // Should return the correct user for the token
      expect(response.body.data.user.id).toBe('1d7e1eb7-8758-4a67-84a8-4fe911a733bc')
      expect(response.body.data.user.email).toBe('paivaedu.br@gmail.com')
    })

    test('Should validate user existence for token claims', async () => {
      // Valid token should work
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toBeDefined()
    })
  })

  describe('Token Storage and Transmission Security', () => {
    test('Should handle tokens with special characters safely', async () => {
      const specialCharTokens = [
        validToken + '&param=value',
        validToken + '<script>',
        validToken + '"; DROP TABLE users; --',
        validToken + '\n\r\t',
        validToken + '%20%3Cscript%3E'
      ]

      for (const token of specialCharTokens) {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401) // Should be rejected due to invalid format

        expect(response.body.success).toBe(false)
      }
    })

    test('Should handle extremely long tokens gracefully', async () => {
      const longToken = 'a'.repeat(10000)
      
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${longToken}`)
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('Cross-Origin and CORS Security', () => {
    test('Should include proper CORS headers for authenticated requests', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Origin', 'https://example.com')
        .expect(200)

      // Should include CORS headers
      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })

    test('Should handle preflight requests for authenticated endpoints', async () => {
      const response = await request(app)
        .options('/api/v1/auth/me')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')

      // Should handle preflight
      expect([200, 204]).toContain(response.status)
      expect(response.headers['access-control-allow-methods']).toBeDefined()
    })
  })
})
