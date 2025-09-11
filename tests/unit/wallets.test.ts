/**
 * Wallet Operations API Tests
 * Tests for wallet balance endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { ApiTestClient, getRealSupabaseJWT, expectSuccessResponse, expectErrorResponse, TEST_USERS, isValidCurrency } from '../utils'

describe('Wallet Operations API', () => {
  let apiClient: ApiTestClient
  let validToken: string

  beforeAll(async () => {
    apiClient = new ApiTestClient()
    validToken = await getRealSupabaseJWT(TEST_USERS.VALID_USER.id)
  })

  afterAll(() => {
    // Cleanup if needed
  })

  describe('GET /api/v1/wallets/balance - All Wallet Balances', () => {
    test('should return 200 with all currency balances for authenticated user', async () => {
      const response = await apiClient.getWalletBalance(validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // Verify response structure
      expect(response.body.data).toHaveProperty('balances')
      expect(response.body.data).toHaveProperty('userId')
      expect(response.body.data).toHaveProperty('timestamp')
      
      // Verify balances object structure
      expect(typeof response.body.data.balances).toBe('object')
      expect(response.body.data.userId).toBe(TEST_USERS.VALID_USER.id)
      
      // Verify supported currencies are present
      const supportedCurrencies = ['EUR', 'AOA']
      supportedCurrencies.forEach(currency => {
        expect(response.body.data.balances).toHaveProperty(currency)
        
        const balance = response.body.data.balances[currency]
        expect(balance).toHaveProperty('currency', currency)
        expect(balance).toHaveProperty('availableBalance')
        expect(balance).toHaveProperty('reservedBalance')
        expect(balance).toHaveProperty('totalBalance')
        
        // Verify balance types
        expect(typeof balance.availableBalance).toBe('number')
        expect(typeof balance.reservedBalance).toBe('number')
        expect(typeof balance.totalBalance).toBe('number')
        
        // Verify balance calculations
        expect(balance.totalBalance).toBe(balance.availableBalance + balance.reservedBalance)
      })
      
      // Verify timestamp
      expect(response.body.data.timestamp).toBeValidTimestamp()
      
      // Verify message
      expect(response.body.message).toBe('Wallet balances retrieved successfully')
    })

    test('should require authentication', async () => {
      const response = await apiClient.getWalletBalance()
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })

    test('should reject invalid tokens', async () => {
      const response = await apiClient.getWalletBalance('invalid-token')
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })
  })

  describe('GET /api/v1/wallets/{currency} - Specific Currency Balance', () => {
    test('should return 200 with EUR balance for authenticated user', async () => {
      const response = await apiClient.getCurrencyBalance('EUR', validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // Verify response structure matches actual API
      expect(response.body.data).toHaveProperty('userId', TEST_USERS.VALID_USER.id)
      expect(response.body.data).toHaveProperty('currency', 'EUR')
      expect(response.body.data).toHaveProperty('availableBalance')
      expect(response.body.data).toHaveProperty('reservedBalance')
      expect(response.body.data).toHaveProperty('totalBalance')
      expect(response.body.data).toHaveProperty('timestamp')
      
      // Verify data types
      expect(typeof response.body.data.availableBalance).toBe('number')
      expect(typeof response.body.data.reservedBalance).toBe('number')
      expect(typeof response.body.data.totalBalance).toBe('number')
      
      // Verify balance calculation
      expect(response.body.data.totalBalance).toBe(
        response.body.data.availableBalance + response.body.data.reservedBalance
      )
      
      // Verify timestamp
      expect(response.body.data.timestamp).toBeValidTimestamp()
      
      // Verify message
      expect(response.body.message).toMatch(/Wallet balance retrieved/)
    })

    test('should return 200 with AOA balance for authenticated user', async () => {
      const response = await apiClient.getCurrencyBalance('AOA', validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      expect(response.body.data.currency).toBe('AOA')
    })

    test('should return zero balances for new wallet', async () => {
      const response = await apiClient.getCurrencyBalance('EUR', validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // New wallets should have zero balances
      expect(response.body.data.availableBalance).toBeGreaterThanOrEqual(0)
      expect(response.body.data.reservedBalance).toBeGreaterThanOrEqual(0)
      expect(response.body.data.totalBalance).toBeGreaterThanOrEqual(0)
    })

    test('should return 400 for invalid currency', async () => {
      const response = await apiClient.getCurrencyBalance('INVALID', validToken)
      
      expect(response.status).toBe(400)
      expectErrorResponse(response.body)
      expect(response.body.error).toMatch(/validation/i)
    })

    test('should return 400 for unsupported currency', async () => {
      const response = await apiClient.getCurrencyBalance('USD', validToken)
      
      expect(response.status).toBe(400)
      expectErrorResponse(response.body)
    })

    test('should require authentication', async () => {
      const response = await apiClient.getCurrencyBalance('EUR')
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })

    test('should handle case sensitivity correctly', async () => {
      const lowerCaseResponse = await apiClient.getCurrencyBalance('eur', validToken)
      
      // Should return validation error for lowercase
      expect(lowerCaseResponse.status).toBe(400)
      expectErrorResponse(lowerCaseResponse.body)
    })
  })

  describe('Currency Validation', () => {
    test('should only accept supported currencies', async () => {
      const supportedCurrencies = ['EUR', 'AOA']
      const unsupportedCurrencies = ['USD', 'GBP', 'BTC', 'ETH']
      
      // Test supported currencies
      for (const currency of supportedCurrencies) {
        const response = await apiClient.getCurrencyBalance(currency, validToken)
        expect(response.status).toBe(200)
        expect(isValidCurrency(currency)).toBe(true)
      }
      
      // Test unsupported currencies
      for (const currency of unsupportedCurrencies) {
        const response = await apiClient.getCurrencyBalance(currency, validToken)
        expect(response.status).toBe(400)
        expect(isValidCurrency(currency)).toBe(false)
      }
    })
  })

  describe('Performance Tests', () => {
    test('should respond quickly for balance requests', async () => {
      const start = Date.now()
      const response = await apiClient.getWalletBalance(validToken)
      const duration = Date.now() - start
      
      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(500) // Should respond within 500ms
    })

    test('should handle concurrent balance requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        apiClient.getWalletBalance(validToken)
      )
      
      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)
      })
    })
  })

  describe('Data Consistency', () => {
    test('should return consistent balance data across requests', async () => {
      const response1 = await apiClient.getCurrencyBalance('EUR', validToken)
      const response2 = await apiClient.getCurrencyBalance('EUR', validToken)
      
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      // Balances should be consistent (assuming no transactions between requests)
      expect(response1.body.data.availableBalance).toBe(response2.body.data.availableBalance)
      expect(response1.body.data.reservedBalance).toBe(response2.body.data.reservedBalance)
      expect(response1.body.data.totalBalance).toBe(response2.body.data.totalBalance)
    })
  })
})
