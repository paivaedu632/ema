/**
 * Performance Testing - Concurrent Request Testing
 * Tests API behavior under concurrent load
 */

import { ApiTestClient } from '../utils'
import { getRealSupabaseJWT } from '../utils/supabase-auth'

describe('Performance Testing - Concurrent Requests', () => {
  let apiClient: ApiTestClient
  let authToken: string

  beforeAll(async () => {
    apiClient = new ApiTestClient()
    // Get a cached JWT token for authenticated endpoints
    authToken = await getRealSupabaseJWT()
  })

  describe('Public Endpoint Concurrency', () => {
    test('Health check should handle 50 concurrent requests', async () => {
      const concurrentRequests = 50
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health/status')
            .expect(200)
        )
      }

      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests)
      results.forEach(result => {
        expect(result.body.success).toBe(true)
      })

      // Should complete within reasonable time (10 seconds for 50 requests)
      expect(totalTime).toBeLessThan(10000)
      
      console.log(`✅ Completed ${concurrentRequests} concurrent health checks in ${totalTime}ms`)
    })

    test('Market data should handle 25 concurrent requests', async () => {
      const concurrentRequests = 25
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/market/pairs')
            .expect(200)
        )
      }

      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests)
      results.forEach(result => {
        expect(result.body.success).toBe(true)
      })

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(15000)
      
      console.log(`✅ Completed ${concurrentRequests} concurrent market requests in ${totalTime}ms`)
    })
  })

  describe('Authenticated Endpoint Concurrency', () => {
    test('User profile should handle 20 concurrent requests', async () => {
      const concurrentRequests = 20
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
        )
      }

      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests)
      results.forEach(result => {
        expect(result.body.success).toBe(true)
        expect(result.body.data.user.id).toBe('1d7e1eb7-8758-4a67-84a8-4fe911a733bc')
      })

      expect(totalTime).toBeLessThan(15000)
      
      console.log(`✅ Completed ${concurrentRequests} concurrent auth requests in ${totalTime}ms`)
    })

    test('Wallet balance should handle 15 concurrent requests', async () => {
      const concurrentRequests = 15
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/wallets/balance')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
        )
      }

      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests)
      results.forEach(result => {
        expect(result.body.success).toBe(true)
        expect(result.body.data).toHaveProperty('balances')
      })

      expect(totalTime).toBeLessThan(20000)
      
      console.log(`✅ Completed ${concurrentRequests} concurrent wallet requests in ${totalTime}ms`)
    })

    test('User search should handle 10 concurrent requests', async () => {
      const concurrentRequests = 10
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/users/search?q=test&type=email')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
        )
      }

      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests)
      results.forEach(result => {
        expect(result.body.success).toBe(true)
        expect(Array.isArray(result.body.data.users)).toBe(true)
      })

      expect(totalTime).toBeLessThan(15000)
      
      console.log(`✅ Completed ${concurrentRequests} concurrent search requests in ${totalTime}ms`)
    })
  })

  describe('Mixed Load Testing', () => {
    test('Should handle mixed concurrent requests across endpoints', async () => {
      const promises: Promise<any>[] = []
      const startTime = Date.now()

      // Mix of public and authenticated requests
      const requestTypes = [
        { count: 10, request: () => request(app).get('/api/v1/health/status').expect(200) },
        { count: 8, request: () => request(app).get('/api/v1/market/pairs').expect(200) },
        { count: 6, request: () => request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${authToken}`).expect(200) },
        { count: 4, request: () => request(app).get('/api/v1/wallets/balance').set('Authorization', `Bearer ${authToken}`).expect(200) },
        { count: 2, request: () => request(app).get('/api/v1/users/search?q=test&type=email').set('Authorization', `Bearer ${authToken}`).expect(200) }
      ]

      // Create all requests
      requestTypes.forEach(type => {
        for (let i = 0; i < type.count; i++) {
          promises.push(type.request())
        }
      })

      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should succeed
      const totalRequests = requestTypes.reduce((sum, type) => sum + type.count, 0)
      expect(results).toHaveLength(totalRequests)
      
      results.forEach(result => {
        expect(result.body.success).toBe(true)
      })

      expect(totalTime).toBeLessThan(25000)
      
      console.log(`✅ Completed ${totalRequests} mixed concurrent requests in ${totalTime}ms`)
    })
  })

  describe('Error Handling Under Load', () => {
    test('Should handle concurrent requests with authentication errors gracefully', async () => {
      const concurrentRequests = 10
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', 'Bearer invalid-token')
            .expect(401)
        )
      }

      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should fail with 401
      expect(results).toHaveLength(concurrentRequests)
      results.forEach(result => {
        expect(result.body.success).toBe(false)
        expect(result.body.error).toContain('Unauthorized')
      })

      expect(totalTime).toBeLessThan(10000)
      
      console.log(`✅ Handled ${concurrentRequests} concurrent auth errors in ${totalTime}ms`)
    })

    test('Should handle concurrent requests with validation errors gracefully', async () => {
      const concurrentRequests = 8
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/users/search?q=&type=email') // Empty query should fail
            .set('Authorization', `Bearer ${authToken}`)
            .expect(400)
        )
      }

      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      // All requests should fail with 400
      expect(results).toHaveLength(concurrentRequests)
      results.forEach(result => {
        expect(result.body.success).toBe(false)
      })

      expect(totalTime).toBeLessThan(10000)
      
      console.log(`✅ Handled ${concurrentRequests} concurrent validation errors in ${totalTime}ms`)
    })
  })

  describe('Resource Cleanup', () => {
    test('Should not leak resources under concurrent load', async () => {
      // Monitor memory usage before and after
      const initialMemory = process.memoryUsage()
      
      const concurrentRequests = 30
      const promises: Promise<any>[] = []

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health/status')
            .expect(200)
        )
      }

      await Promise.all(promises)
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage()
      
      // Memory usage shouldn't increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100
      
      console.log(`📊 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`)
      
      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50)
    })
  })
})
