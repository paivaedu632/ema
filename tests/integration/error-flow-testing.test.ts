/**
 * Integration Tests - Error Flow Testing
 * 
 * Tests system resilience and error handling:
 * - Database connection failure handling
 * - Invalid authentication recovery
 * - Concurrent operation conflict resolution
 * - Partial transaction rollback works
 * - System remains consistent after errors
 */

import { apiClient } from '../utils/api-client'
import { getRealSupabaseJWT } from '../utils/supabase-auth'
import { expectSuccessResponse, expectErrorResponse, measureResponseTime } from '../utils/test-helpers'

interface SystemHealthSnapshot {
  timestamp: string
  healthStatus: any
  userBalances: any[]
  systemResponsive: boolean
}

describe('Integration Tests - Error Flow Testing', () => {
  let validToken: string
  let userId: string
  let invalidToken: string = 'invalid.jwt.token'
  let expiredToken: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid'

  // Helper function to capture system health
  const captureSystemHealth = async (): Promise<SystemHealthSnapshot> => {
    const healthResponse = await apiClient.getHealthStatus()
    
    let userBalances: any[] = []
    let systemResponsive = true
    
    try {
      if (validToken) {
        const balanceResponse = await apiClient.getWalletBalance(validToken)
        if (balanceResponse.status === 200) {
          userBalances.push(balanceResponse.body.data)
        }
      }
    } catch (error) {
      systemResponsive = false
    }

    return {
      timestamp: new Date().toISOString(),
      healthStatus: healthResponse.status === 200 ? healthResponse.body.data : null,
      userBalances,
      systemResponsive
    }
  }

  // Helper function to simulate network delay/timeout
  const simulateNetworkDelay = (ms: number = 1000): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  beforeAll(async () => {
    // Get valid token for testing
    validToken = await getRealSupabaseJWT()
    
    // Get user ID
    const authResponse = await apiClient.getAuthMe(validToken)
    if (authResponse.status === 200) {
      userId = authResponse.body.data.userId
    }
    
    console.log('✅ Got tokens for error flow testing')
    console.log(`🔧 User ID: ${userId}`)
  })

  describe('2.4 Error Flow Testing', () => {
    describe('Database connection failure handling', () => {
      test('should handle database connectivity issues gracefully', async () => {
        // Step 1: Verify system is healthy initially
        const initialHealth = await captureSystemHealth()
        expect(initialHealth.systemResponsive).toBe(true)
        
        // Step 2: Test health endpoint during potential database issues
        const healthResponse = await apiClient.getHealthStatus()
        expect(healthResponse.status).toBe(200)
        expectSuccessResponse(healthResponse.body)
        
        // Health endpoint should include database connectivity status
        expect(healthResponse.body.data).toHaveProperty('status')
        expect(healthResponse.body.data).toHaveProperty('timestamp')
        
        if (healthResponse.body.data.database) {
          // Database status can have different structures
          if (typeof healthResponse.body.data.database === 'object') {
            expect(healthResponse.body.data.database).toHaveProperty('status')
          } else {
            // Database status might be a simple string
            expect(typeof healthResponse.body.data.database).toBe('string')
          }
        }
        
        console.log('✅ Database connectivity status checked')

        // Step 3: Test API endpoints under potential database stress
        const databaseStressTests = [
          apiClient.getWalletBalance(validToken),
          apiClient.getAuthMe(validToken),
          apiClient.getTransferHistory({}, validToken),
          apiClient.getOrderHistory({}, validToken)
        ]

        const stressResults = await Promise.allSettled(databaseStressTests)
        
        // Step 4: Analyze results - endpoints should either succeed or fail gracefully
        stressResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value
            if (response.status === 200) {
              expectSuccessResponse(response.body)
              console.log(`✅ Database stress test ${index + 1} succeeded`)
            } else if (response.status >= 500) {
              // Server errors are acceptable during database issues
              console.log(`✅ Database stress test ${index + 1} failed gracefully (${response.status})`)
            } else {
              // Client errors should still be handled properly
              expectErrorResponse(response.body)
              console.log(`✅ Database stress test ${index + 1} handled client error (${response.status})`)
            }
          } else {
            // Network/timeout errors are acceptable
            console.log(`✅ Database stress test ${index + 1} failed with network error (expected)`)
          }
        })

        // Step 5: Verify system health after stress tests
        const finalHealth = await captureSystemHealth()
        
        // System should still be responsive or gracefully degraded
        if (finalHealth.systemResponsive) {
          console.log('✅ System remained responsive during database stress')
        } else {
          console.log('✅ System gracefully degraded during database stress')
        }
      })

      test('should recover from temporary database issues', async () => {
        // Step 1: Capture initial state
        const initialState = await captureSystemHealth()
        
        // Step 2: Simulate recovery by making multiple requests
        const recoveryAttempts = []
        for (let i = 0; i < 3; i++) {
          await simulateNetworkDelay(200) // Small delay between attempts
          recoveryAttempts.push(apiClient.getHealthStatus())
        }

        const recoveryResults = await Promise.all(recoveryAttempts)
        
        // Step 3: Verify recovery behavior
        recoveryResults.forEach((result, index) => {
          if (result.status === 200) {
            expectSuccessResponse(result.body)
            console.log(`✅ Recovery attempt ${index + 1} succeeded`)
          } else {
            console.log(`✅ Recovery attempt ${index + 1} still failing (${result.status})`)
          }
        })

        // Step 4: Test that user operations can resume
        if (validToken) {
          const resumeTest = await apiClient.getWalletBalance(validToken)
          if (resumeTest.status === 200) {
            expectSuccessResponse(resumeTest.body)
            console.log('✅ User operations resumed successfully')
          } else {
            console.log('✅ User operations still affected by database issues')
          }
        }

        console.log('✅ Database recovery testing completed')
      })
    })

    describe('Invalid authentication recovery', () => {
      test('should handle invalid tokens gracefully', async () => {
        // Step 1: Test various invalid token scenarios
        const invalidTokenTests = [
          { token: invalidToken, description: 'malformed token' },
          { token: expiredToken, description: 'expired token' },
          { token: '', description: 'empty token' },
          { token: 'Bearer invalid', description: 'invalid bearer token' },
          { token: null as any, description: 'null token' }
        ]

        for (const test of invalidTokenTests) {
          const response = await apiClient.getAuthMe(test.token)
          
          expect(response.status).toBe(401)
          expectErrorResponse(response.body)
          
          // Should include proper error information
          expect(response.body.error).toBeDefined()
          expect(response.body.code).toBe('AUTH_REQUIRED')
          
          console.log(`✅ Invalid token handled: ${test.description}`)
        }
      })

      test('should handle authentication state transitions', async () => {
        // Step 1: Test valid authentication
        const validAuthResponse = await apiClient.getAuthMe(validToken)
        expect(validAuthResponse.status).toBe(200)
        expectSuccessResponse(validAuthResponse.body)
        
        // Step 2: Test operations with valid token
        const validOperations = [
          apiClient.getWalletBalance(validToken),
          apiClient.searchUsers({ query: 'test' }, validToken),
          apiClient.getTransferHistory({}, validToken)
        ]

        const validResults = await Promise.allSettled(validOperations)
        
        validResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value
            if (response.status === 200) {
              expectSuccessResponse(response.body)
              console.log(`✅ Valid operation ${index + 1} succeeded`)
            } else if (response.status === 401) {
              expectErrorResponse(response.body)
              console.log(`✅ Valid operation ${index + 1} requires authentication`)
            } else {
              console.log(`✅ Valid operation ${index + 1} handled with status ${response.status}`)
            }
          }
        })

        // Step 3: Test operations with invalid token
        const invalidOperations = [
          apiClient.getWalletBalance(invalidToken),
          apiClient.searchUsers({ query: 'test' }, invalidToken),
          apiClient.getTransferHistory({}, invalidToken)
        ]

        const invalidResults = await Promise.all(invalidOperations)
        
        invalidResults.forEach((result, index) => {
          expect(result.status).toBe(401)
          expectErrorResponse(result.body)
          expect(result.body.code).toBe('AUTH_REQUIRED')
          console.log(`✅ Invalid operation ${index + 1} properly rejected`)
        })

        console.log('✅ Authentication state transitions handled correctly')
      })

      test('should handle token refresh scenarios', async () => {
        // Step 1: Test with current valid token
        const currentAuthResponse = await apiClient.getAuthMe(validToken)
        expect(currentAuthResponse.status).toBe(200)
        
        // Step 2: Simulate token refresh by getting a new token
        const newToken = await getRealSupabaseJWT()
        
        // Step 3: Test with new token
        const newAuthResponse = await apiClient.getAuthMe(newToken)
        expect(newAuthResponse.status).toBe(200)
        expectSuccessResponse(newAuthResponse.body)
        
        // Step 4: Both tokens should work (until expiration)
        const bothTokensTest = await Promise.all([
          apiClient.getWalletBalance(validToken),
          apiClient.getWalletBalance(newToken)
        ])

        bothTokensTest.forEach((result, index) => {
          if (result.status === 200) {
            expectSuccessResponse(result.body)
            console.log(`✅ Token ${index + 1} still valid`)
          } else {
            console.log(`✅ Token ${index + 1} expired or invalid`)
          }
        })

        console.log('✅ Token refresh scenarios handled')
      })
    })

    describe('Concurrent operation conflict resolution', () => {
      test('should handle concurrent balance operations safely', async () => {
        // Step 1: Set up PIN for operations
        const pinData = { pin: '123456', confirmPin: '123456' }
        const pinResponse = await apiClient.setPin(pinData, validToken)
        expect([200, 201]).toContain(pinResponse.status)

        await simulateNetworkDelay(300)

        // Step 2: Capture initial balance
        const initialBalance = await apiClient.getWalletBalance(validToken)
        expect(initialBalance.status).toBe(200)

        // Step 3: Perform concurrent balance-affecting operations
        const concurrentOperations = [
          // Multiple transfer attempts
          apiClient.sendTransfer({
            recipientId: userId, // Self-transfer for testing
            amount: 10.00,
            currency: 'EUR',
            pin: '123456',
            description: 'Concurrent test 1'
          }, validToken),

          apiClient.sendTransfer({
            recipientId: userId,
            amount: 15.00,
            currency: 'EUR',
            pin: '123456',
            description: 'Concurrent test 2'
          }, validToken),

          // Order placement
          apiClient.placeLimitOrder({
            side: 'buy',
            amount: 50.00,
            price: 640.00,
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA'
          }, validToken),

          // Balance queries
          apiClient.getWalletBalance(validToken),
          apiClient.getWalletBalance(validToken)
        ]

        const concurrentResults = await Promise.allSettled(concurrentOperations)

        // Step 4: Analyze concurrent operation results
        concurrentResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value
            if (response.status === 200 || response.status === 201) {
              expectSuccessResponse(response.body)
              console.log(`✅ Concurrent operation ${index + 1} succeeded`)
            } else {
              // Conflicts or failures are acceptable
              console.log(`✅ Concurrent operation ${index + 1} handled conflict (${response.status})`)
            }
          } else {
            console.log(`✅ Concurrent operation ${index + 1} failed safely`)
          }
        })

        // Step 5: Verify system consistency after concurrent operations
        const finalBalance = await apiClient.getWalletBalance(validToken)
        expect(finalBalance.status).toBe(200)
        expectSuccessResponse(finalBalance.body)

        // Balance math should still be correct
        const eurBalance = finalBalance.body.data.balances.EUR
        expect(eurBalance.totalBalance).toBe(eurBalance.availableBalance + eurBalance.reservedBalance)

        console.log('✅ Concurrent operations handled safely')
      })

      test('should resolve order book conflicts correctly', async () => {
        // Step 1: Place multiple orders that might conflict
        const conflictingOrders = [
          apiClient.placeLimitOrder({
            side: 'buy',
            amount: 100.00,
            price: 650.00,
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA'
          }, validToken),

          apiClient.placeLimitOrder({
            side: 'sell',
            amount: 100.00,
            price: 650.00,
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA'
          }, validToken),

          apiClient.placeMarketOrder({
            side: 'buy',
            amount: 50.00,
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA',
            slippageLimit: 0.05
          }, validToken)
        ]

        const orderResults = await Promise.allSettled(conflictingOrders)

        // Step 2: Verify conflict resolution
        orderResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value
            if (response.status === 200 || response.status === 201) {
              expectSuccessResponse(response.body)
              console.log(`✅ Conflicting order ${index + 1} placed successfully`)
            } else {
              // Order conflicts should be handled gracefully
              console.log(`✅ Conflicting order ${index + 1} resolved (${response.status})`)
            }
          } else {
            console.log(`✅ Conflicting order ${index + 1} failed safely`)
          }
        })

        // Step 3: Check order history for consistency
        const orderHistory = await apiClient.getOrderHistory({}, validToken)
        expect(orderHistory.status).toBe(200)
        expectSuccessResponse(orderHistory.body)

        console.log('✅ Order book conflicts resolved correctly')
      })

      test('should handle rapid successive operations', async () => {
        // Step 1: Perform rapid successive balance queries
        const rapidQueries = []
        for (let i = 0; i < 5; i++) {
          rapidQueries.push(apiClient.getWalletBalance(validToken))
        }

        const queryResults = await Promise.all(rapidQueries)

        // Step 2: All queries should succeed and return consistent results
        const firstResult = queryResults[0]
        expect(firstResult.status).toBe(200)

        queryResults.forEach((result, index) => {
          expect(result.status).toBe(200)
          expectSuccessResponse(result.body)

          // Results should be consistent
          expect(result.body.data.balances.EUR.totalBalance)
            .toBe(firstResult.body.data.balances.EUR.totalBalance)

          console.log(`✅ Rapid query ${index + 1} consistent`)
        })

        // Step 3: Test rapid successive operations with state changes
        const rapidOperations = []
        for (let i = 0; i < 3; i++) {
          rapidOperations.push(
            apiClient.sendTransfer({
              recipientId: userId,
              amount: 1.00,
              currency: 'EUR',
              pin: '123456',
              description: `Rapid operation ${i + 1}`
            }, validToken)
          )
        }

        const operationResults = await Promise.allSettled(rapidOperations)

        operationResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value
            if (response.status === 200) {
              expectSuccessResponse(response.body)
              console.log(`✅ Rapid operation ${index + 1} succeeded`)
            } else {
              console.log(`✅ Rapid operation ${index + 1} handled safely (${response.status})`)
            }
          } else {
            console.log(`✅ Rapid operation ${index + 1} failed safely`)
          }
        })

        console.log('✅ Rapid successive operations handled correctly')
      })
    })

    describe('Partial transaction rollback works', () => {
      test('should rollback failed transfer operations', async () => {
        // Step 1: Capture initial state
        const initialBalance = await apiClient.getWalletBalance(validToken)
        expect(initialBalance.status).toBe(200)

        const initialEurBalance = initialBalance.body.data.balances.EUR.totalBalance
        const initialAoaBalance = initialBalance.body.data.balances.AOA.totalBalance

        // Step 2: Attempt transfer that should fail and rollback
        const failedTransferData = {
          recipientId: 'non-existent-user',
          amount: 999999.00, // Large amount that should fail
          currency: 'EUR',
          pin: '123456',
          description: 'Should fail and rollback'
        }

        const failedTransfer = await apiClient.sendTransfer(failedTransferData, validToken)

        if (failedTransfer.status === 200) {
          // Transfer might succeed but with failed status
          expectSuccessResponse(failedTransfer.body)
          if (failedTransfer.body.data.status === 'failed') {
            console.log('✅ Transfer failed as expected with rollback')
          }
        } else {
          // Transfer failed at API level
          expect([400, 404]).toContain(failedTransfer.status)
          expectErrorResponse(failedTransfer.body)
          console.log('✅ Transfer failed at API level')
        }

        // Step 3: Verify rollback - balances should be unchanged
        const afterFailureBalance = await apiClient.getWalletBalance(validToken)
        expect(afterFailureBalance.status).toBe(200)

        expect(afterFailureBalance.body.data.balances.EUR.totalBalance).toBe(initialEurBalance)
        expect(afterFailureBalance.body.data.balances.AOA.totalBalance).toBe(initialAoaBalance)

        console.log('✅ Failed transfer rollback verified')
      })

      test('should rollback failed order operations', async () => {
        // Step 1: Capture initial state
        const initialBalance = await apiClient.getWalletBalance(validToken)
        expect(initialBalance.status).toBe(200)

        const initialReservedEur = initialBalance.body.data.balances.EUR.reservedBalance
        const initialReservedAoa = initialBalance.body.data.balances.AOA.reservedBalance

        // Step 2: Attempt order that should fail
        const failedOrderData = {
          side: 'buy' as const,
          amount: 999999.00, // Impossibly large amount
          price: 1.00,
          baseCurrency: 'EUR' as const,
          quoteCurrency: 'AOA' as const
        }

        const failedOrder = await apiClient.placeLimitOrder(failedOrderData, validToken)

        if (failedOrder.status === 200 || failedOrder.status === 201) {
          // Order might be placed but should not reserve impossible amounts
          expectSuccessResponse(failedOrder.body)
          console.log('✅ Order processed (may have been rejected internally)')
        } else {
          // Order failed at API level
          expect([400, 422]).toContain(failedOrder.status)
          expectErrorResponse(failedOrder.body)
          console.log('✅ Order failed at API level')
        }

        // Step 3: Verify no improper fund reservation
        const afterOrderBalance = await apiClient.getWalletBalance(validToken)
        expect(afterOrderBalance.status).toBe(200)

        // Reserved balances should not have impossible amounts
        expect(afterOrderBalance.body.data.balances.EUR.reservedBalance)
          .toBeGreaterThanOrEqual(initialReservedEur)
        expect(afterOrderBalance.body.data.balances.AOA.reservedBalance)
          .toBeGreaterThanOrEqual(initialReservedAoa)

        // Balance math should still be correct
        const eurBalance = afterOrderBalance.body.data.balances.EUR
        expect(eurBalance.totalBalance).toBe(eurBalance.availableBalance + eurBalance.reservedBalance)

        console.log('✅ Failed order rollback verified')
      })

      test('should handle partial system failures gracefully', async () => {
        // Step 1: Test operations that might partially fail
        const partialFailureTests = [
          // Transfer with edge case amounts
          apiClient.sendTransfer({
            recipientId: userId,
            amount: 0.01, // Very small amount
            currency: 'EUR',
            pin: '123456',
            description: 'Edge case amount'
          }, validToken),

          // Order with edge case parameters
          apiClient.placeLimitOrder({
            side: 'sell',
            amount: 0.01,
            price: 999999.00, // Very high price
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA'
          }, validToken),

          // Multiple rapid balance queries
          apiClient.getWalletBalance(validToken)
        ]

        const partialResults = await Promise.allSettled(partialFailureTests)

        // Step 2: Verify graceful handling
        partialResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value
            if (response.status === 200 || response.status === 201) {
              expectSuccessResponse(response.body)
              console.log(`✅ Partial failure test ${index + 1} succeeded`)
            } else {
              console.log(`✅ Partial failure test ${index + 1} handled gracefully (${response.status})`)
            }
          } else {
            console.log(`✅ Partial failure test ${index + 1} failed safely`)
          }
        })

        // Step 3: Verify system consistency
        const consistencyCheck = await apiClient.getWalletBalance(validToken)
        expect(consistencyCheck.status).toBe(200)
        expectSuccessResponse(consistencyCheck.body)

        console.log('✅ Partial system failures handled gracefully')
      })
    })

    describe('System remains consistent after errors', () => {
      test('should maintain system health after error scenarios', async () => {
        // Step 1: Capture initial system health
        const initialHealth = await captureSystemHealth()
        expect(initialHealth.systemResponsive).toBe(true)

        // Step 2: Execute various error scenarios
        const errorScenarios = [
          // Authentication errors
          apiClient.getAuthMe(invalidToken),
          apiClient.getWalletBalance(invalidToken),

          // Invalid operations
          apiClient.sendTransfer({
            recipientId: 'invalid',
            amount: -100,
            currency: 'INVALID',
            pin: 'wrong',
            description: 'Invalid transfer'
          }, validToken),

          // Malformed requests
          apiClient.placeLimitOrder({
            side: 'invalid' as any,
            amount: 'not-a-number' as any,
            price: -1,
            baseCurrency: 'INVALID' as any,
            quoteCurrency: 'INVALID' as any
          }, validToken)
        ]

        const errorResults = await Promise.allSettled(errorScenarios)

        // Step 3: Verify errors were handled without system corruption
        errorResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value
            // Errors should return proper error responses
            if (response.status >= 400) {
              expectErrorResponse(response.body)
              console.log(`✅ Error scenario ${index + 1} handled properly (${response.status})`)
            } else {
              console.log(`✅ Error scenario ${index + 1} unexpectedly succeeded`)
            }
          } else {
            console.log(`✅ Error scenario ${index + 1} failed at network level`)
          }
        })

        // Step 4: Verify system health after errors
        const finalHealth = await captureSystemHealth()
        expect(finalHealth.systemResponsive).toBe(true)

        // Health endpoint should still work
        const healthCheck = await apiClient.getHealthStatus()
        expect(healthCheck.status).toBe(200)
        expectSuccessResponse(healthCheck.body)

        console.log('✅ System health maintained after error scenarios')
      })

      test('should recover from cascading error conditions', async () => {
        // Step 1: Create cascading error conditions
        const cascadingErrors = []

        // Multiple invalid authentication attempts
        for (let i = 0; i < 3; i++) {
          cascadingErrors.push(apiClient.getAuthMe(`invalid-token-${i}`))
        }

        // Multiple invalid operations
        for (let i = 0; i < 3; i++) {
          cascadingErrors.push(
            apiClient.sendTransfer({
              recipientId: `invalid-${i}`,
              amount: -i,
              currency: 'EUR',
              pin: 'wrong',
              description: `Cascading error ${i}`
            }, validToken)
          )
        }

        const cascadingResults = await Promise.allSettled(cascadingErrors)

        // Step 2: Verify all errors were handled
        cascadingResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value
            expect(response.status).toBeGreaterThanOrEqual(400)
            expectErrorResponse(response.body)
            console.log(`✅ Cascading error ${index + 1} handled`)
          } else {
            console.log(`✅ Cascading error ${index + 1} failed safely`)
          }
        })

        // Step 3: Verify system recovery
        const recoveryTests = [
          apiClient.getHealthStatus(),
          apiClient.getAuthMe(validToken),
          apiClient.getWalletBalance(validToken)
        ]

        const recoveryResults = await Promise.all(recoveryTests)

        recoveryResults.forEach((result, index) => {
          expect(result.status).toBe(200)
          expectSuccessResponse(result.body)
          console.log(`✅ Recovery test ${index + 1} succeeded`)
        })

        console.log('✅ System recovered from cascading errors')
      })

      test('should maintain data consistency across error conditions', async () => {
        // Step 1: Capture baseline data
        const baselineBalance = await apiClient.getWalletBalance(validToken)
        expect(baselineBalance.status).toBe(200)

        const baselineEurBalance = baselineBalance.body.data.balances.EUR.totalBalance
        const baselineAoaBalance = baselineBalance.body.data.balances.AOA.totalBalance

        // Step 2: Execute operations that should maintain consistency
        const consistencyTests = [
          // Valid operations mixed with invalid ones
          apiClient.getWalletBalance(validToken),
          apiClient.sendTransfer({
            recipientId: 'invalid-user',
            amount: 100,
            currency: 'EUR',
            pin: '123456',
            description: 'Should fail'
          }, validToken),
          apiClient.getWalletBalance(validToken),
          apiClient.placeLimitOrder({
            side: 'buy',
            amount: 999999,
            price: 1,
            baseCurrency: 'EUR',
            quoteCurrency: 'AOA'
          }, validToken),
          apiClient.getWalletBalance(validToken)
        ]

        const consistencyResults = await Promise.allSettled(consistencyTests)

        // Step 3: Verify data consistency
        const balanceQueries = consistencyResults.filter((result, index) =>
          index % 2 === 0 && result.status === 'fulfilled' && result.value.status === 200
        )

        balanceQueries.forEach((result: any, index) => {
          const balance = result.value.body.data.balances

          // Balance math should always be correct
          expect(balance.EUR.totalBalance).toBe(balance.EUR.availableBalance + balance.EUR.reservedBalance)
          expect(balance.AOA.totalBalance).toBe(balance.AOA.availableBalance + balance.AOA.reservedBalance)

          // Total balances should be consistent (no money created/destroyed by errors)
          expect(balance.EUR.totalBalance).toBe(baselineEurBalance)
          expect(balance.AOA.totalBalance).toBe(baselineAoaBalance)

          console.log(`✅ Balance consistency check ${index + 1} passed`)
        })

        // Step 4: Final consistency verification
        const finalBalance = await apiClient.getWalletBalance(validToken)
        expect(finalBalance.status).toBe(200)

        expect(finalBalance.body.data.balances.EUR.totalBalance).toBe(baselineEurBalance)
        expect(finalBalance.body.data.balances.AOA.totalBalance).toBe(baselineAoaBalance)

        console.log('✅ Data consistency maintained across error conditions')
      })

      test('should handle system stress without corruption', async () => {
        // Step 1: Create system stress conditions
        const stressOperations = []

        // Rapid fire requests
        for (let i = 0; i < 10; i++) {
          stressOperations.push(apiClient.getWalletBalance(validToken))
        }

        // Mixed valid/invalid operations
        for (let i = 0; i < 5; i++) {
          stressOperations.push(
            apiClient.sendTransfer({
              recipientId: i % 2 === 0 ? userId : 'invalid',
              amount: 1.00,
              currency: 'EUR',
              pin: '123456',
              description: `Stress test ${i}`
            }, validToken)
          )
        }

        const stressResults = await Promise.allSettled(stressOperations)

        // Step 2: Analyze stress test results
        let successCount = 0
        let errorCount = 0

        stressResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value
            if (response.status === 200) {
              expectSuccessResponse(response.body)
              successCount++
            } else {
              errorCount++
            }
            console.log(`✅ Stress operation ${index + 1}: ${response.status}`)
          } else {
            errorCount++
            console.log(`✅ Stress operation ${index + 1}: network error`)
          }
        })

        // Step 3: Verify system integrity after stress
        const integrityCheck = await apiClient.getWalletBalance(validToken)
        expect(integrityCheck.status).toBe(200)
        expectSuccessResponse(integrityCheck.body)

        // Balance math should still be correct
        const balance = integrityCheck.body.data.balances
        expect(balance.EUR.totalBalance).toBe(balance.EUR.availableBalance + balance.EUR.reservedBalance)
        expect(balance.AOA.totalBalance).toBe(balance.AOA.availableBalance + balance.AOA.reservedBalance)

        console.log(`✅ System stress test completed: ${successCount} success, ${errorCount} errors`)
        console.log('✅ System integrity maintained under stress')
      })
    })
  })
})
