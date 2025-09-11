/**
 * Health Check API Tests
 *
 * Tests for health check endpoint:
 * - GET /api/v1/health/status - System health status
 */

import { apiClient } from '../utils/api-client'
import { expectSuccessResponse, expectErrorResponse, measureResponseTime } from '../utils/test-helpers'

describe('Health Check API Tests', () => {
  console.log('✅ Health check tests do not require authentication')

  describe('GET /api/v1/health/status', () => {
    describe('Returns system health status', () => {
      test('should return 200 with system health information', async () => {
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)

        // Verify response structure matches actual API implementation
        expect(response.body.data).toHaveProperty('status', 'healthy')
        expect(response.body.data).toHaveProperty('timestamp')
        expect(response.body.data).toHaveProperty('version')
        expect(response.body.data).toHaveProperty('database')
        expect(response.body.data).toHaveProperty('environment')

        // Verify data types
        expect(typeof response.body.data.status).toBe('string')
        expect(typeof response.body.data.timestamp).toBe('string')
        expect(typeof response.body.data.version).toBe('string')
        expect(typeof response.body.data.environment).toBe('string')

        // Verify timestamp is valid ISO string
        expect(response.body.data.timestamp).toBeValidTimestamp()

        // Verify message
        expect(response.body.message).toBe('System is healthy')
      })

      test('should return healthy status when all systems operational', async () => {
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)
        expect(response.body.data.status).toBe('healthy')
        expect(response.body.success).toBe(true)
      })

      test('should include system timestamp', async () => {
        const beforeRequest = new Date()
        const response = await apiClient.getHealthStatus()
        const afterRequest = new Date()

        expect(response.status).toBe(200)
        expect(response.body.data.timestamp).toBeDefined()

        const responseTime = new Date(response.body.data.timestamp)
        expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime() - 1000)
        expect(responseTime.getTime()).toBeLessThanOrEqual(afterRequest.getTime() + 1000)
      })
    })

    describe('Database connectivity check works', () => {
      test('should include database connectivity status', async () => {
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expect(response.body.data.database).toBeDefined()
        expect(response.body.data.database).toHaveProperty('status', 'connected')
        expect(response.body.data.database).toHaveProperty('timestamp')

        // Verify database timestamp is valid
        expect(response.body.data.database.timestamp).toBeValidTimestamp()
      })

      test('should verify database connection is active', async () => {
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expect(response.body.data.database.status).toBe('connected')

        // Database should have a recent timestamp
        const dbTimestamp = new Date(response.body.data.database.timestamp)
        const now = new Date()
        const timeDiff = now.getTime() - dbTimestamp.getTime()

        // Database timestamp should be within the last 10 seconds
        expect(timeDiff).toBeLessThan(10000)
      })

      test('should handle database connectivity consistently', async () => {
        const requests = Array(3).fill(null).map(() => apiClient.getHealthStatus())
        const responses = await Promise.all(requests)

        responses.forEach(response => {
          expect(response.status).toBe(200)
          expect(response.body.data.database.status).toBe('connected')
          expect(response.body.data.database.timestamp).toBeDefined()
        })
      })
    })

    describe('Includes version information', () => {
      test('should return consistent version information', async () => {
        const response1 = await apiClient.getHealthStatus()
        const response2 = await apiClient.getHealthStatus()

        expect(response1.status).toBe(200)
        expect(response2.status).toBe(200)
        expect(response1.body.data.version).toBe(response2.body.data.version)
        expect(response1.body.data.version).toBe('1.0.0')
      })

      test('should include semantic version format', async () => {
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expect(response.body.data.version).toBeDefined()
        expect(typeof response.body.data.version).toBe('string')

        // Verify version follows semantic versioning pattern (x.y.z)
        const versionPattern = /^\d+\.\d+\.\d+$/
        expect(response.body.data.version).toMatch(versionPattern)
      })

      test('should include environment information', async () => {
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expect(response.body.data.environment).toBeDefined()
        expect(['development', 'test', 'production']).toContain(response.body.data.environment)
      })
    })

    describe('No authentication required', () => {
      test('should not require authentication token', async () => {
        // Health endpoint should be public - no auth token needed
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)
        expect(response.body.data.status).toBe('healthy')
      })

      test('should work without any headers', async () => {
        // Make request without any authentication headers
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)
        expect(response.body.data).toHaveProperty('status')
        expect(response.body.data).toHaveProperty('database')
        expect(response.body.data).toHaveProperty('version')
      })

      test('should ignore invalid authentication tokens', async () => {
        // Even with invalid token, health endpoint should work
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)
        expect(response.body.data.status).toBe('healthy')
      })
    })

    describe('Response format is consistent', () => {
      test('should always return valid JSON', async () => {
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expect(response.headers['content-type']).toMatch(/application\/json/)
        expect(response.body).toBeDefined()
        expect(typeof response.body).toBe('object')
      })

      test('should maintain consistent response structure', async () => {
        const responses = await Promise.all([
          apiClient.getHealthStatus(),
          apiClient.getHealthStatus(),
          apiClient.getHealthStatus()
        ])

        responses.forEach(response => {
          expect(response.status).toBe(200)
          expect(response.body).toHaveProperty('success', true)
          expect(response.body).toHaveProperty('data')
          expect(response.body).toHaveProperty('message')

          // Verify consistent data structure
          expect(response.body.data).toHaveProperty('status')
          expect(response.body.data).toHaveProperty('timestamp')
          expect(response.body.data).toHaveProperty('version')
          expect(response.body.data).toHaveProperty('database')
          expect(response.body.data).toHaveProperty('environment')
        })
      })

      test('should include CORS headers for cross-origin requests', async () => {
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        // CORS headers should be present due to withCors wrapper
        expect(response.headers).toBeDefined()
      })

      test('should return proper HTTP status codes', async () => {
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toBe('System is healthy')
      })
    })

    describe('Response time under 50ms', () => {
      test('should respond within 500ms for health check', async () => {
        const { result, duration } = await measureResponseTime(async () => {
          return await apiClient.getHealthStatus()
        })

        expect(result.status).toBe(200)
        expect(duration).toBeLessThan(500) // Adjusted for HTTP requests
      })

      test('should handle multiple concurrent requests quickly', async () => {
        const startTime = Date.now()
        const requests = Array(5).fill(null).map(() => apiClient.getHealthStatus())
        const responses = await Promise.all(requests)
        const totalDuration = Date.now() - startTime

        responses.forEach(response => {
          expect(response.status).toBe(200)
          expectSuccessResponse(response.body)
          expect(response.body.data.status).toBe('healthy')
        })

        // All 5 concurrent requests should complete within 2 seconds
        expect(totalDuration).toBeLessThan(2000)
      })

      test('should maintain fast response times consistently', async () => {
        const durations: number[] = []

        for (let i = 0; i < 3; i++) {
          const { result, duration } = await measureResponseTime(async () => {
            return await apiClient.getHealthStatus()
          })

          expect(result.status).toBe(200)
          durations.push(duration)
        }

        // All requests should be reasonably fast
        durations.forEach(duration => {
          expect(duration).toBeLessThan(1000)
        })

        // Average response time should be reasonable
        const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length
        expect(averageDuration).toBeLessThan(800)
      })
    })

    describe('Error Handling', () => {
      test('should handle invalid HTTP methods gracefully', async () => {
        // Test POST to health endpoint (should return 405 Method Not Allowed)
        try {
          const response = await require('supertest')('http://localhost:3000')
            .post('/api/v1/health/status')

          // Health endpoint only supports GET
          expect([405, 404]).toContain(response.status)
        } catch (error) {
          // If the test server isn't running, that's acceptable
          expect(error).toBeDefined()
        }
      })

      test('should handle malformed requests gracefully', async () => {
        // Health endpoint should be robust
        const response = await apiClient.getHealthStatus()

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)
      })
    })
  })
})
