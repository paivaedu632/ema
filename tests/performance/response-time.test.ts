/**
 * Performance Testing - Response Time Benchmarks
 * Tests response times for all API endpoints under normal load
 */

import { ApiTestClient, TEST_CONFIG } from '../utils'
import { getRealSupabaseJWT } from '../utils/supabase-auth'

describe('Performance Testing - Response Time Benchmarks', () => {
  let apiClient: ApiTestClient
  let authToken: string

  beforeAll(async () => {
    apiClient = new ApiTestClient()
    // Get a cached JWT token for authenticated endpoints
    authToken = await getRealSupabaseJWT()
  })

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    FAST: 100,      // Health checks, simple queries
    NORMAL: 500,    // Standard API operations
    SLOW: 1000,     // Complex operations, database writes
    TIMEOUT: 5000   // Maximum acceptable response time
  }

  describe('Public Endpoints Performance', () => {
    test('Health check should respond under 100ms', async () => {
      const start = Date.now()
      const response = await apiClient.getHealthStatus()
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST)
      expect(response.body.success).toBe(true)
    })

    test('Market data should respond under 500ms', async () => {
      const start = Date.now()
      const response = await apiClient.getMarketPairs()
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL)
      expect(response.body.success).toBe(true)
    })
  })

  describe('Authenticated Endpoints Performance', () => {
    test('User profile should respond under 500ms', async () => {
      const start = Date.now()
      const response = await apiClient.getAuthMe(authToken)
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL)
      expect(response.body.success).toBe(true)
    })

    test('User search should respond under 500ms', async () => {
      const start = Date.now()
      const response = await apiClient.searchUsers({ q: 'test', type: 'email' }, authToken)
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL)
      expect(response.body.success).toBe(true)
    })

    test('Wallet balance should respond under 500ms', async () => {
      const start = Date.now()
      const response = await apiClient.getWalletBalance(authToken)
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL)
      expect(response.body.success).toBe(true)
    })

    test('Transfer history should respond under 1000ms', async () => {
      const start = Date.now()
      const response = await apiClient.getTransferHistory(authToken)
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW)
      expect(response.body.success).toBe(true)
    })

    test('Order history should respond under 1000ms', async () => {
      const start = Date.now()
      const response = await apiClient.getOrderHistory(authToken)
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW)
      expect(response.body.success).toBe(true)
    })
  })

  describe('Write Operations Performance', () => {
    test('PIN verification should respond under 500ms', async () => {
      const start = Date.now()
      const response = await apiClient.verifyPin({ pin: '1234' }, authToken)
      const duration = Date.now() - start

      expect([400, 422]).toContain(response.status) // Expected to fail with test PIN
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL)
      expect(response.body.success).toBe(false)
    })

    test('Transfer creation should respond under 1000ms', async () => {
      const start = Date.now()
      const response = await apiClient.sendTransfer({
        recipientId: 'test-recipient-id',
        amount: 10.00,
        currency: 'EUR',
        description: 'Performance test transfer'
      }, authToken)
      const duration = Date.now() - start

      expect([400, 422]).toContain(response.status) // Expected to fail with test data
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW)
      expect(response.body.success).toBe(false)
    })

    test('Order placement should respond under 1000ms', async () => {
      const start = Date.now()
      const response = await apiClient.placeOrder({
        pair: 'EUR/AOA',
        type: 'limit',
        side: 'buy',
        amount: 100,
        price: 650
      }, authToken)
      const duration = Date.now() - start

      expect([400, 422]).toContain(response.status) // Expected to fail with test data
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW)
      expect(response.body.success).toBe(false)
    })
  })

  describe('Response Time Consistency', () => {
    test('Health check should have consistent response times', async () => {
      const times: number[] = []
      const iterations = 10

      for (let i = 0; i < iterations; i++) {
        const start = Date.now()
        const response = await apiClient.getHealthStatus()
        expect(response.status).toBe(200)
        times.push(Date.now() - start)
      }

      const average = times.reduce((a, b) => a + b, 0) / times.length
      const max = Math.max(...times)
      const min = Math.min(...times)

      expect(average).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST)
      expect(max).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL)
      expect(max - min).toBeLessThan(200) // Variance should be low
    })

    test('Authenticated endpoints should have consistent response times', async () => {
      const endpointTests = [
        { name: 'auth/me', test: () => apiClient.getAuthMe(authToken) },
        { name: 'wallets/balance', test: () => apiClient.getWalletBalance(authToken) },
        { name: 'users/search', test: () => apiClient.searchUsers({ q: 'test', type: 'email' }, authToken) }
      ]

      for (const endpointTest of endpointTests) {
        const times: number[] = []
        const iterations = 5

        for (let i = 0; i < iterations; i++) {
          const start = Date.now()
          const response = await endpointTest.test()
          expect(response.status).toBe(200)
          times.push(Date.now() - start)
        }

        const average = times.reduce((a, b) => a + b, 0) / times.length
        const max = Math.max(...times)

        expect(average).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL)
        expect(max).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW)
      }
    })
  })

  describe('Timeout Protection', () => {
    test('All endpoints should respond within timeout threshold', async () => {
      const endpointTests = [
        { name: 'health/status', test: () => apiClient.getHealthStatus(), auth: false },
        { name: 'market/pairs', test: () => apiClient.getMarketPairs(), auth: false },
        { name: 'auth/me', test: () => apiClient.getAuthMe(authToken), auth: true },
        { name: 'wallets/balance', test: () => apiClient.getWalletBalance(authToken), auth: true },
        { name: 'transfers/history', test: () => apiClient.getTransferHistory(authToken), auth: true },
        { name: 'orders/history', test: () => apiClient.getOrderHistory(authToken), auth: true }
      ]

      for (const endpointTest of endpointTests) {
        const start = Date.now()
        const response = await endpointTest.test()
        const duration = Date.now() - start

        expect(response.status).toBe(200)
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.TIMEOUT)
      }
    })
  })
})
