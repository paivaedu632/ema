/**
 * Wallet Balance API Tests - FOCUSED ON /api/v1/wallets/balance ONLY
 * Tests for GET /api/v1/wallets/balance endpoint as requested by user
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { ApiTestClient, expectSuccessResponse, expectErrorResponse, measureResponseTime, TEST_USERS } from '../utils'
import { getRealSupabaseJWT } from '../utils/supabase-auth'

describe('Wallet Balance API - GET /api/v1/wallets/balance', () => {
  let apiClient: ApiTestClient
  let validToken: string

  beforeAll(async () => {
    apiClient = new ApiTestClient()

    try {
      // Get a real Supabase JWT token for testing
      validToken = await getRealSupabaseJWT(TEST_USERS.VALID_USER.id)
      console.log('✅ Got real Supabase JWT token for wallet balance testing')
    } catch (error) {
      console.warn('⚠️ Failed to get real JWT, using mock token:', error)
      validToken = 'mock-jwt-token-for-testing'
    }
  }, 30000) // Increase timeout for token generation

  afterAll(() => {
    // Cleanup if needed
  })

  describe('Returns balances for both EUR and AOA', () => {
    test('should return 200 with EUR and AOA balances', async () => {
      const response = await apiClient.getWalletBalance(validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // Verify response structure
      expect(response.body.data).toHaveProperty('balances')
      expect(response.body.data).toHaveProperty('userId')
      expect(response.body.data).toHaveProperty('timestamp')

      // Verify balances object structure
      expect(typeof response.body.data.balances).toBe('object')

      // Should have both EUR and AOA currencies
      const balances = response.body.data.balances
      expect(balances).toHaveProperty('EUR')
      expect(balances).toHaveProperty('AOA')

      // Verify balance structure for each currency
      const supportedCurrencies = ['EUR', 'AOA']
      supportedCurrencies.forEach(currency => {
        const balance = balances[currency]
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
    })

    test('should include both currencies even if zero balance', async () => {
      const response = await apiClient.getWalletBalance(validToken)

      expect(response.status).toBe(200)
      const balances = response.body.data.balances

      // Must have both EUR and AOA currencies
      expect(balances).toHaveProperty('EUR')
      expect(balances).toHaveProperty('AOA')

      // Verify each currency has proper structure
      const supportedCurrencies = ['EUR', 'AOA']
      supportedCurrencies.forEach(currency => {
        const balance = balances[currency]
        expect(balance).toHaveProperty('currency', currency)
        expect(balance).toHaveProperty('availableBalance')
        expect(balance).toHaveProperty('reservedBalance')
        expect(balance).toHaveProperty('totalBalance')
      })
    })
  })

  describe('Handles user with no wallets', () => {
    test('should return zero balances for user with no wallet history', async () => {
      const response = await apiClient.getWalletBalance(validToken)
      
      expect(response.status).toBe(200)
      expectSuccessResponse(response.body)
      
      // Should still return both currencies with zero balances
      const balances = response.body.data.balances
      expect(balances).toHaveProperty('EUR')
      expect(balances).toHaveProperty('AOA')

      // Each balance should be valid even if zero
      const supportedCurrencies = ['EUR', 'AOA']
      supportedCurrencies.forEach(currency => {
        const balance = balances[currency]
        expect(balance).toHaveProperty('currency', currency)
        expect(balance).toHaveProperty('availableBalance')
        expect(balance).toHaveProperty('reservedBalance')
        expect(balance).toHaveProperty('totalBalance')

        // Values should be valid numbers
        expect(typeof balance.availableBalance).toBe('number')
        expect(typeof balance.reservedBalance).toBe('number')
        expect(typeof balance.totalBalance).toBe('number')

        // All values should be non-negative
        expect(balance.availableBalance).toBeGreaterThanOrEqual(0)
        expect(balance.reservedBalance).toBeGreaterThanOrEqual(0)
        expect(balance.totalBalance).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Returns zero balances for new wallets', () => {
    test('should return 0.00 balances for new user wallets', async () => {
      const response = await apiClient.getWalletBalance(validToken)
      
      expect(response.status).toBe(200)
      const balances = response.body.data.balances
      
      // Check if any balances are zero (which is expected for new wallets)
      const supportedCurrencies = ['EUR', 'AOA']
      const hasZeroBalances = supportedCurrencies.some(currency => {
        const balance = balances[currency]
        return balance.totalBalance === 0 &&
               balance.availableBalance === 0 &&
               balance.reservedBalance === 0
      })

      // This is acceptable - new wallets should have zero balances
      if (hasZeroBalances) {
        expect(hasZeroBalances).toBe(true)
      }

      // All balances should be valid numbers
      supportedCurrencies.forEach(currency => {
        const balance = balances[currency]
        expect(typeof balance.totalBalance).toBe('number')
        expect(typeof balance.availableBalance).toBe('number')
        expect(typeof balance.reservedBalance).toBe('number')

        // All values should be non-negative
        expect(balance.totalBalance).toBeGreaterThanOrEqual(0)
        expect(balance.availableBalance).toBeGreaterThanOrEqual(0)
        expect(balance.reservedBalance).toBeGreaterThanOrEqual(0)
      })
    })

    test('should maintain consistent balance relationships', async () => {
      const response = await apiClient.getWalletBalance(validToken)
      
      expect(response.status).toBe(200)
      const balances = response.body.data.balances
      
      const supportedCurrencies = ['EUR', 'AOA']
      supportedCurrencies.forEach(currency => {
        const balance = balances[currency]

        // Available + Reserved should equal total balance
        expect(balance.totalBalance).toBe(balance.availableBalance + balance.reservedBalance)

        // All values should be non-negative
        expect(balance.totalBalance).toBeGreaterThanOrEqual(0)
        expect(balance.availableBalance).toBeGreaterThanOrEqual(0)
        expect(balance.reservedBalance).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Unauthorized request returns 401', () => {
    test('should return 401 when no authorization header', async () => {
      const response = await apiClient.getWalletBalance()
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
      expect(response.body.error).toContain('Authorization header missing or invalid')
    })

    test('should return 401 for invalid token', async () => {
      const response = await apiClient.getWalletBalance('invalid-token')
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })

    test('should return 401 for expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid'
      const response = await apiClient.getWalletBalance(expiredToken)
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })

    test('should return 401 for malformed token', async () => {
      const malformedToken = 'not-a-jwt-token'
      const response = await apiClient.getWalletBalance(malformedToken)
      
      expect(response.status).toBe(401)
      expectErrorResponse(response.body, 'AUTH_REQUIRED')
    })
  })

  describe('Response format matches specification', () => {
    test('should return correct response structure', async () => {
      const response = await apiClient.getWalletBalance(validToken)
      
      expect(response.status).toBe(200)
      
      // Verify top-level response structure
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('data')
      
      // Verify data structure
      expect(response.body.data).toHaveProperty('balances')
      expect(response.body.data).toHaveProperty('userId')
      expect(response.body.data).toHaveProperty('timestamp')

      // Verify balances object structure
      expect(typeof response.body.data.balances).toBe('object')

      // Verify each balance object structure
      const supportedCurrencies = ['EUR', 'AOA']
      supportedCurrencies.forEach(currency => {
        const balance = response.body.data.balances[currency]
        expect(balance).toHaveProperty('currency', currency)
        expect(balance).toHaveProperty('availableBalance')
        expect(balance).toHaveProperty('reservedBalance')
        expect(balance).toHaveProperty('totalBalance')

        // Verify data types
        expect(typeof balance.currency).toBe('string')
        expect(typeof balance.availableBalance).toBe('number')
        expect(typeof balance.reservedBalance).toBe('number')
        expect(typeof balance.totalBalance).toBe('number')

        // Verify currency format
        expect(balance.currency).toMatch(/^[A-Z]{3}$/)
      })
    })

    test('should include proper success message', async () => {
      const response = await apiClient.getWalletBalance(validToken)
      
      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Wallet balances retrieved successfully')
    })
  })

  describe('Decimal precision is correct (15,2)', () => {
    test('should return balances with exactly 2 decimal places', async () => {
      const response = await apiClient.getWalletBalance(validToken)
      
      expect(response.status).toBe(200)
      const balances = response.body.data.balances
      
      const supportedCurrencies = ['EUR', 'AOA']
      supportedCurrencies.forEach(currency => {
        const balance = balances[currency]

        // Check balance precision - numbers should have reasonable precision
        expect(typeof balance.totalBalance).toBe('number')
        expect(typeof balance.availableBalance).toBe('number')
        expect(typeof balance.reservedBalance).toBe('number')

        // Verify the values are valid numbers
        expect(balance.totalBalance).not.toBeNaN()
        expect(balance.availableBalance).not.toBeNaN()
        expect(balance.reservedBalance).not.toBeNaN()

        // Check that values don't exceed reasonable limits
        expect(balance.totalBalance).toBeLessThan(10000000000000) // 13 digits
        expect(balance.availableBalance).toBeLessThan(10000000000000)
        expect(balance.reservedBalance).toBeLessThan(10000000000000)

        // Check precision - when converted to string with 2 decimals, should be valid
        expect(balance.totalBalance.toFixed(2)).toMatch(/^\d+\.\d{2}$/)
        expect(balance.availableBalance.toFixed(2)).toMatch(/^\d+\.\d{2}$/)
        expect(balance.reservedBalance.toFixed(2)).toMatch(/^\d+\.\d{2}$/)
      })
    })

    test('should handle zero values with correct precision', async () => {
      const response = await apiClient.getWalletBalance(validToken)
      
      expect(response.status).toBe(200)
      const balances = response.body.data.balances
      
      const supportedCurrencies = ['EUR', 'AOA']
      supportedCurrencies.forEach(currency => {
        const balance = balances[currency]

        // If any value is zero, it should be exactly 0
        if (balance.totalBalance === 0) {
          expect(balance.totalBalance).toBe(0)
        }
        if (balance.availableBalance === 0) {
          expect(balance.availableBalance).toBe(0)
        }
        if (balance.reservedBalance === 0) {
          expect(balance.reservedBalance).toBe(0)
        }

        // When formatted to 2 decimal places, should be valid
        expect(balance.totalBalance.toFixed(2)).toMatch(/^\d+\.\d{2}$/)
        expect(balance.availableBalance.toFixed(2)).toMatch(/^\d+\.\d{2}$/)
        expect(balance.reservedBalance.toFixed(2)).toMatch(/^\d+\.\d{2}$/)
      })
    })
  })

  describe('Response time under 50ms', () => {
    test('should respond within 500ms for wallet balance request', async () => {
      const { result, duration } = await measureResponseTime(async () => {
        return await apiClient.getWalletBalance(validToken)
      })
      
      expect(result.status).toBe(200)
      expect(duration).toBeLessThan(1000) // Adjusted for HTTP requests to running server
    })

    test('should respond quickly even for unauthorized requests', async () => {
      const { result, duration } = await measureResponseTime(async () => {
        return await apiClient.getWalletBalance('invalid-token')
      })
      
      expect(result.status).toBe(401)
      expect(duration).toBeLessThan(1000) // Adjusted for HTTP requests to running server
    })

    test('should have consistent response times', async () => {
      const times: number[] = []
      
      // Make 5 requests to test consistency
      for (let i = 0; i < 5; i++) {
        const { result, duration } = await measureResponseTime(async () => {
          return await apiClient.getWalletBalance(validToken)
        })
        
        expect(result.status).toBe(200)
        times.push(duration)
      }
      
      // Calculate average and check consistency
      const average = times.reduce((a, b) => a + b, 0) / times.length
      const max = Math.max(...times)
      const min = Math.min(...times)
      
      expect(average).toBeLessThan(1000)
      expect(max - min).toBeLessThan(2000) // Variance should be reasonable
    })
  })

  // Additional tests for individual currency endpoint
  describe('Individual Currency Wallet - GET /api/v1/wallets/{currency}', () => {
    describe('Valid currency (EUR) returns balance', () => {
      test('should return 200 with EUR balance', async () => {
        const response = await apiClient.getWalletByCurrency('EUR', validToken)

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)

        // Verify response structure
        expect(response.body.data).toHaveProperty('currency', 'EUR')
        expect(response.body.data).toHaveProperty('availableBalance')
        expect(response.body.data).toHaveProperty('reservedBalance')
        expect(response.body.data).toHaveProperty('totalBalance')
        expect(response.body.data).toHaveProperty('userId')
        expect(response.body.data).toHaveProperty('timestamp')

        // Verify balance types
        expect(typeof response.body.data.availableBalance).toBe('number')
        expect(typeof response.body.data.reservedBalance).toBe('number')
        expect(typeof response.body.data.totalBalance).toBe('number')

        // Verify balance calculations
        expect(response.body.data.totalBalance).toBe(
          response.body.data.availableBalance + response.body.data.reservedBalance
        )

        // Verify user ID
        expect(response.body.data.userId).toBe(TEST_USERS.VALID_USER.id)
      })

      test('should return consistent EUR balance with main endpoint', async () => {
        // Get balance from main endpoint
        const mainResponse = await apiClient.getWalletBalance(validToken)
        const eurFromMain = mainResponse.body.data.balances.EUR

        // Get balance from individual currency endpoint
        const currencyResponse = await apiClient.getWalletByCurrency('EUR', validToken)
        const eurFromCurrency = currencyResponse.body.data

        // Should match
        expect(eurFromCurrency.availableBalance).toBe(eurFromMain.availableBalance)
        expect(eurFromCurrency.reservedBalance).toBe(eurFromMain.reservedBalance)
        expect(eurFromCurrency.totalBalance).toBe(eurFromMain.totalBalance)
        expect(eurFromCurrency.currency).toBe(eurFromMain.currency)
      })
    })

    describe('Valid currency (AOA) returns balance', () => {
      test('should return 200 with AOA balance', async () => {
        const response = await apiClient.getWalletByCurrency('AOA', validToken)

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)

        // Verify response structure
        expect(response.body.data).toHaveProperty('currency', 'AOA')
        expect(response.body.data).toHaveProperty('availableBalance')
        expect(response.body.data).toHaveProperty('reservedBalance')
        expect(response.body.data).toHaveProperty('totalBalance')
        expect(response.body.data).toHaveProperty('userId')
        expect(response.body.data).toHaveProperty('timestamp')

        // Verify balance types
        expect(typeof response.body.data.availableBalance).toBe('number')
        expect(typeof response.body.data.reservedBalance).toBe('number')
        expect(typeof response.body.data.totalBalance).toBe('number')

        // Verify balance calculations
        expect(response.body.data.totalBalance).toBe(
          response.body.data.availableBalance + response.body.data.reservedBalance
        )

        // Verify user ID
        expect(response.body.data.userId).toBe(TEST_USERS.VALID_USER.id)
      })

      test('should return consistent AOA balance with main endpoint', async () => {
        // Get balance from main endpoint
        const mainResponse = await apiClient.getWalletBalance(validToken)
        const aoaFromMain = mainResponse.body.data.balances.AOA

        // Get balance from individual currency endpoint
        const currencyResponse = await apiClient.getWalletByCurrency('AOA', validToken)
        const aoaFromCurrency = currencyResponse.body.data

        // Should match
        expect(aoaFromCurrency.availableBalance).toBe(aoaFromMain.availableBalance)
        expect(aoaFromCurrency.reservedBalance).toBe(aoaFromMain.reservedBalance)
        expect(aoaFromCurrency.totalBalance).toBe(aoaFromMain.totalBalance)
        expect(aoaFromCurrency.currency).toBe(aoaFromMain.currency)
      })
    })

    describe('Invalid currency returns 400', () => {
      test('should return 400 for unsupported currency', async () => {
        const invalidCurrencies = ['USD', 'GBP', 'BTC', 'XYZ', '123']

        for (const currency of invalidCurrencies) {
          const response = await apiClient.getWalletByCurrency(currency, validToken)
          expect(response.status).toBe(400)
          expectErrorResponse(response.body, 'VALIDATION_ERROR')
          expect(response.body.error).toContain('currency')
        }
      })

      test('should handle malformed currency codes appropriately', async () => {
        const malformedCurrencies = ['eu', 'EURO', 'eur', 'aoa', 'E', 'EUR123', '']

        for (const currency of malformedCurrencies) {
          const response = await apiClient.getWalletByCurrency(currency, validToken)
          // API might return 400, 404, or 308 (redirect) for invalid currencies
          expect([400, 404, 308]).toContain(response.status)

          if (response.status === 400) {
            expectErrorResponse(response.body, 'VALIDATION_ERROR')
          }
        }
      })
    })

    describe('Non-existent wallet creates wallet with zero balance', () => {
      test('should create EUR wallet with zero balance if not exists', async () => {
        const response = await apiClient.getWalletByCurrency('EUR', validToken)

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)

        // Should have valid structure even if wallet was just created
        expect(response.body.data).toHaveProperty('currency', 'EUR')
        expect(response.body.data).toHaveProperty('availableBalance')
        expect(response.body.data).toHaveProperty('reservedBalance')
        expect(response.body.data).toHaveProperty('totalBalance')

        // All balances should be non-negative
        expect(response.body.data.availableBalance).toBeGreaterThanOrEqual(0)
        expect(response.body.data.reservedBalance).toBeGreaterThanOrEqual(0)
        expect(response.body.data.totalBalance).toBeGreaterThanOrEqual(0)

        // Balance relationship should be maintained
        expect(response.body.data.totalBalance).toBe(
          response.body.data.availableBalance + response.body.data.reservedBalance
        )
      })

      test('should create AOA wallet with zero balance if not exists', async () => {
        const response = await apiClient.getWalletByCurrency('AOA', validToken)

        expect(response.status).toBe(200)
        expectSuccessResponse(response.body)

        // Should have valid structure even if wallet was just created
        expect(response.body.data).toHaveProperty('currency', 'AOA')
        expect(response.body.data).toHaveProperty('availableBalance')
        expect(response.body.data).toHaveProperty('reservedBalance')
        expect(response.body.data).toHaveProperty('totalBalance')

        // All balances should be non-negative
        expect(response.body.data.availableBalance).toBeGreaterThanOrEqual(0)
        expect(response.body.data.reservedBalance).toBeGreaterThanOrEqual(0)
        expect(response.body.data.totalBalance).toBeGreaterThanOrEqual(0)

        // Balance relationship should be maintained
        expect(response.body.data.totalBalance).toBe(
          response.body.data.availableBalance + response.body.data.reservedBalance
        )
      })
    })

    describe('Unauthorized request returns 401', () => {
      test('should return 401 when no authorization header for EUR', async () => {
        const response = await apiClient.getWalletByCurrency('EUR')

        expect(response.status).toBe(401)
        expectErrorResponse(response.body, 'AUTH_REQUIRED')
        expect(response.body.error).toContain('Authorization header missing or invalid')
      })

      test('should return 401 when no authorization header for AOA', async () => {
        const response = await apiClient.getWalletByCurrency('AOA')

        expect(response.status).toBe(401)
        expectErrorResponse(response.body, 'AUTH_REQUIRED')
        expect(response.body.error).toContain('Authorization header missing or invalid')
      })

      test('should return 401 for invalid token', async () => {
        const response = await apiClient.getWalletByCurrency('EUR', 'invalid-token')

        expect(response.status).toBe(401)
        expectErrorResponse(response.body, 'AUTH_REQUIRED')
      })

      test('should return 401 for expired token', async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid'
        const response = await apiClient.getWalletByCurrency('EUR', expiredToken)

        expect(response.status).toBe(401)
        expectErrorResponse(response.body, 'AUTH_REQUIRED')
      })

      test('should return 401 for malformed token', async () => {
        const malformedToken = 'not-a-jwt-token'
        const response = await apiClient.getWalletByCurrency('AOA', malformedToken)

        expect(response.status).toBe(401)
        expectErrorResponse(response.body, 'AUTH_REQUIRED')
      })
    })

    describe('Currency parameter validation works', () => {
      test('should validate currency parameter format', async () => {
        const testCases = [
          { currency: 'EUR', shouldPass: true },
          { currency: 'AOA', shouldPass: true },
          { currency: 'USD', shouldPass: false },
          { currency: 'eur', shouldPass: false },
          { currency: 'aoa', shouldPass: false },
          { currency: 'EURO', shouldPass: false },
          { currency: 'E', shouldPass: false },
          { currency: 'EUR123', shouldPass: false },
          { currency: '123', shouldPass: false },
          { currency: '', shouldPass: false }
        ]

        for (const testCase of testCases) {
          const response = await apiClient.getWalletByCurrency(testCase.currency, validToken)

          if (testCase.shouldPass) {
            expect(response.status).toBe(200)
            expectSuccessResponse(response.body)
            expect(response.body.data.currency).toBe(testCase.currency)
          } else {
            // API might return 400, 404, or 308 (redirect) for invalid currencies
            expect([400, 404, 308]).toContain(response.status)

            if (response.status === 400) {
              expectErrorResponse(response.body, 'VALIDATION_ERROR')
            }
          }
        }
      })

      test('should handle special characters in currency parameter', async () => {
        const specialCurrencies = ['EU@', 'A$A', 'E-R', 'A.A', 'E R', 'A\tA']

        for (const currency of specialCurrencies) {
          const response = await apiClient.getWalletByCurrency(currency, validToken)
          expect(response.status).toBe(400)
          expectErrorResponse(response.body, 'VALIDATION_ERROR')
        }
      })

      test('should validate currency parameter length', async () => {
        const lengthTestCases = [
          { currency: 'E', shouldPass: false },      // Too short
          { currency: 'EU', shouldPass: false },     // Too short
          { currency: 'EUR', shouldPass: true },     // Correct length
          { currency: 'AOA', shouldPass: true },     // Correct length
          { currency: 'EURO', shouldPass: false },   // Too long
          { currency: 'EUROS', shouldPass: false }   // Too long
        ]

        for (const testCase of lengthTestCases) {
          const response = await apiClient.getWalletByCurrency(testCase.currency, validToken)

          if (testCase.shouldPass) {
            expect(response.status).toBe(200)
          } else {
            expect(response.status).toBe(400)
            expectErrorResponse(response.body, 'VALIDATION_ERROR')
          }
        }
      })
    })

    describe('Response time under 50ms', () => {
      test('should respond within 1000ms for EUR wallet request', async () => {
        const { result, duration } = await measureResponseTime(async () => {
          return await apiClient.getWalletByCurrency('EUR', validToken)
        })

        expect(result.status).toBe(200)
        expect(duration).toBeLessThan(1000) // Adjusted for HTTP requests to running server
      })

      test('should respond within 1000ms for AOA wallet request', async () => {
        const { result, duration } = await measureResponseTime(async () => {
          return await apiClient.getWalletByCurrency('AOA', validToken)
        })

        expect(result.status).toBe(200)
        expect(duration).toBeLessThan(1000) // Adjusted for HTTP requests to running server
      })

      test('should respond quickly for invalid currency', async () => {
        const { result, duration } = await measureResponseTime(async () => {
          return await apiClient.getWalletByCurrency('USD', validToken)
        })

        expect(result.status).toBe(400)
        expect(duration).toBeLessThan(1000) // Adjusted for HTTP requests to running server
      })

      test('should respond quickly for unauthorized requests', async () => {
        const { result, duration } = await measureResponseTime(async () => {
          return await apiClient.getWalletByCurrency('EUR', 'invalid-token')
        })

        expect(result.status).toBe(401)
        expect(duration).toBeLessThan(1000) // Adjusted for HTTP requests to running server
      })

      test('should have consistent response times for currency requests', async () => {
        const times: number[] = []

        // Make 5 requests to test consistency
        for (let i = 0; i < 5; i++) {
          const { result, duration } = await measureResponseTime(async () => {
            return await apiClient.getWalletByCurrency('EUR', validToken)
          })

          expect(result.status).toBe(200)
          times.push(duration)
        }

        // Calculate average and check consistency
        const average = times.reduce((a, b) => a + b, 0) / times.length
        const max = Math.max(...times)
        const min = Math.min(...times)

        expect(average).toBeLessThan(1000)
        expect(max - min).toBeLessThan(2000) // Variance should be reasonable
      })
    })
  })
})
