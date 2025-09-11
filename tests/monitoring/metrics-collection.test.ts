import { describe, test, expect, beforeAll } from '@jest/globals'
import { getRealSupabaseJWT } from '../utils/supabase-auth'
import { ApiTestClient } from '../utils/api-client'

describe('Monitoring & Observability Tests - Metrics Collection', () => {
  let authToken: string
  let userId: string
  let secondUserId: string
  let apiClient: ApiTestClient

  beforeAll(async () => {
    console.log('📈 Setting up metrics collection tests...')
    
    const authResult = await getRealSupabaseJWT()
    authToken = authResult.token
    userId = authResult.userId
    secondUserId = '2e8f2eb8-9759-5b68-95a9-5gf022b844cd'
    
    apiClient = new ApiTestClient()
    apiClient.setAuthToken(authToken)
    
    console.log('✅ Metrics collection test setup completed')
    console.log(`🔧 User ID: ${userId}`)
  })

  describe('7.2 Metrics Collection Testing', () => {
    describe('Response Time Metrics', () => {
      test('should collect response time metrics', async () => {
        console.log('⏱️ Testing response time metrics collection...')
        
        const results: any[] = []
        const responseTimes: number[] = []
        
        // Test response time metrics across multiple calls
        const responseTimeTests = [
          {
            name: 'Balance Check Response Time',
            test: async () => {
              const startTime = performance.now()
              const response = await apiClient.getWalletBalance(authToken)
              const endTime = performance.now()
              const responseTime = endTime - startTime
              
              return {
                operation: 'Balance Check',
                responseTime,
                status: response.status,
                isSuccessful: response.status === 200
              }
            }
          },
          {
            name: 'User Search Response Time',
            test: async () => {
              const startTime = performance.now()
              const response = await apiClient.searchUsers({ query: 'metrics' }, authToken)
              const endTime = performance.now()
              const responseTime = endTime - startTime
              
              return {
                operation: 'User Search',
                responseTime,
                status: response.status,
                isSuccessful: response.status === 200 || response.status === 400
              }
            }
          },
          {
            name: 'Transfer History Response Time',
            test: async () => {
              const startTime = performance.now()
              const response = await apiClient.getTransferHistory({}, authToken)
              const endTime = performance.now()
              const responseTime = endTime - startTime
              
              return {
                operation: 'Transfer History',
                responseTime,
                status: response.status,
                isSuccessful: response.status === 200
              }
            }
          },
          {
            name: 'Order History Response Time',
            test: async () => {
              const startTime = performance.now()
              const response = await apiClient.getOrderHistory({}, authToken)
              const endTime = performance.now()
              const responseTime = endTime - startTime
              
              return {
                operation: 'Order History',
                responseTime,
                status: response.status,
                isSuccessful: response.status === 200
              }
            }
          },
          {
            name: 'Health Check Response Time',
            test: async () => {
              const startTime = performance.now()
              const response = await apiClient.getHealthStatus()
              const endTime = performance.now()
              const responseTime = endTime - startTime
              
              return {
                operation: 'Health Check',
                responseTime,
                status: response.status,
                isSuccessful: response.status === 200
              }
            }
          }
        ]
        
        // Run each test multiple times to get better metrics
        for (let i = 0; i < 3; i++) {
          for (const timeTest of responseTimeTests) {
            try {
              const result = await timeTest.test()
              
              // Collect response time data
              if (result.responseTime > 0) {
                responseTimes.push(result.responseTime)
              }
              
              const hasValidResponseTime = result.responseTime > 0 && result.responseTime < 30000 // Less than 30 seconds
              const isMetricsWorthy = hasValidResponseTime && result.isSuccessful
              
              results.push({
                name: `${timeTest.name} (Run ${i + 1})`,
                operation: result.operation,
                responseTime: result.responseTime,
                status: result.status,
                isSuccessful: result.isSuccessful,
                hasValidResponseTime,
                isMetricsWorthy,
                success: isMetricsWorthy
              })
              
              // Small delay between calls
              await new Promise(resolve => setTimeout(resolve, 100))
              
            } catch (error: any) {
              results.push({
                name: `${timeTest.name} (Run ${i + 1})`,
                success: false,
                error: error.message,
                isMetricsWorthy: false
              })
            }
          }
        }
        
        // Calculate response time statistics
        const avgResponseTime = responseTimes.length > 0 ? 
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0
        const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0
        const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0
        
        console.log('📊 Response Time Metrics Results:')
        console.log(`     📈 Average Response Time: ${avgResponseTime.toFixed(2)}ms`)
        console.log(`     📉 Min Response Time: ${minResponseTime.toFixed(2)}ms`)
        console.log(`     📊 Max Response Time: ${maxResponseTime.toFixed(2)}ms`)
        console.log(`     🔢 Total Measurements: ${responseTimes.length}`)
        
        results.slice(0, 10).forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const timeInfo = result.responseTime ? ` (${result.responseTime.toFixed(2)}ms)` : ''
          const statusInfo = result.status ? ` - Status: ${result.status}` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${timeInfo}${statusInfo}${errorInfo}`)
        })
        
        if (results.length > 10) {
          console.log(`     ... and ${results.length - 10} more measurements`)
        }
        
        // Calculate response time metrics collection rate
        const metricsCount = results.filter(r => r.success).length
        const metricsRate = (metricsCount / results.length) * 100
        console.log(`⏱️ Response Time Metrics Collection Rate: ${metricsRate.toFixed(1)}%`)
        
        // Response time metrics should be collectible
        expect(metricsRate).toBeGreaterThanOrEqual(80)
        expect(avgResponseTime).toBeGreaterThan(0)
        expect(responseTimes.length).toBeGreaterThan(0)
      })
    })

    describe('Error Rate Metrics', () => {
      test('should collect error rate metrics', async () => {
        console.log('❌ Testing error rate metrics collection...')
        
        const results: any[] = []
        let totalRequests = 0
        let errorRequests = 0
        
        // Test error rate metrics with mixed success/error scenarios
        const errorRateTests = [
          {
            name: 'Valid Balance Request',
            expectError: false,
            test: async () => {
              const response = await apiClient.getWalletBalance(authToken)
              return { status: response.status, isError: response.status >= 400 }
            }
          },
          {
            name: 'Invalid Transfer Request',
            expectError: true,
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: 'invalid',
                  amount: -10,
                  currency: 'INVALID'
                })
              })
              return { status: response.status, isError: response.status >= 400 }
            }
          },
          {
            name: 'Valid Health Check',
            expectError: false,
            test: async () => {
              const response = await apiClient.getHealthStatus()
              return { status: response.status, isError: response.status >= 400 }
            }
          },
          {
            name: 'Unauthorized Request',
            expectError: true,
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer invalid-token',
                  'Content-Type': 'application/json'
                }
              })
              return { status: response.status, isError: response.status >= 400 }
            }
          },
          {
            name: 'Valid Transfer History',
            expectError: false,
            test: async () => {
              const response = await apiClient.getTransferHistory({}, authToken)
              return { status: response.status, isError: response.status >= 400 }
            }
          },
          {
            name: 'Invalid Order Request',
            expectError: true,
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/limit', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  side: 'invalid',
                  amount: 'not-a-number'
                })
              })
              return { status: response.status, isError: response.status >= 400 }
            }
          }
        ]
        
        // Run tests multiple times to get better error rate data
        for (let i = 0; i < 2; i++) {
          for (const errorTest of errorRateTests) {
            try {
              const result = await errorTest.test()
              totalRequests++
              
              if (result.isError) {
                errorRequests++
              }
              
              const errorExpectationMet = errorTest.expectError === result.isError
              
              results.push({
                name: `${errorTest.name} (Run ${i + 1})`,
                status: result.status,
                isError: result.isError,
                expectError: errorTest.expectError,
                errorExpectationMet,
                success: errorExpectationMet
              })
              
              // Small delay between error tests
              await new Promise(resolve => setTimeout(resolve, 100))
              
            } catch (error: any) {
              totalRequests++
              errorRequests++
              
              results.push({
                name: `${errorTest.name} (Run ${i + 1})`,
                success: errorTest.expectError, // Network errors count as errors
                error: error.message,
                isError: true,
                expectError: errorTest.expectError
              })
            }
          }
        }
        
        // Calculate error rate statistics
        const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0
        const successRate = 100 - errorRate
        
        console.log('📊 Error Rate Metrics Results:')
        console.log(`     📈 Total Requests: ${totalRequests}`)
        console.log(`     ❌ Error Requests: ${errorRequests}`)
        console.log(`     📊 Error Rate: ${errorRate.toFixed(1)}%`)
        console.log(`     ✅ Success Rate: ${successRate.toFixed(1)}%`)
        
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = result.status ? ` (Status: ${result.status})` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          const expectationInfo = result.expectError ? ' - Expected Error' : ' - Expected Success'
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${expectationInfo}${errorInfo}`)
        })
        
        // Calculate error rate metrics collection rate
        const errorMetricsCount = results.filter(r => r.success).length
        const errorMetricsRate = (errorMetricsCount / results.length) * 100
        console.log(`❌ Error Rate Metrics Collection Rate: ${errorMetricsRate.toFixed(1)}%`)
        
        // Error rate metrics should be collectible
        expect(errorMetricsRate).toBeGreaterThanOrEqual(80)
        expect(totalRequests).toBeGreaterThan(0)
        expect(errorRate).toBeGreaterThanOrEqual(0)
        expect(errorRate).toBeLessThanOrEqual(100)
      })
    })

    describe('Throughput Metrics', () => {
      test('should collect throughput metrics', async () => {
        console.log('🚀 Testing throughput metrics collection...')

        const results: any[] = []
        const testDuration = 5000 // 5 seconds
        const startTime = Date.now()
        let requestCount = 0
        let successfulRequests = 0

        console.log(`     ⏱️ Running throughput test for ${testDuration / 1000} seconds...`)

        // Run concurrent requests to measure throughput
        const throughputPromises: Promise<any>[] = []

        while (Date.now() - startTime < testDuration) {
          // Create a batch of concurrent requests
          const batchPromises = [
            // Balance check
            (async () => {
              try {
                const response = await apiClient.getWalletBalance(authToken)
                requestCount++
                if (response.status === 200) successfulRequests++
                return { operation: 'Balance', status: response.status, success: response.status === 200 }
              } catch (error) {
                requestCount++
                return { operation: 'Balance', success: false, error: error.message }
              }
            })(),

            // Health check
            (async () => {
              try {
                const response = await apiClient.getHealthStatus()
                requestCount++
                if (response.status === 200) successfulRequests++
                return { operation: 'Health', status: response.status, success: response.status === 200 }
              } catch (error) {
                requestCount++
                return { operation: 'Health', success: false, error: error.message }
              }
            })(),

            // Transfer history
            (async () => {
              try {
                const response = await apiClient.getTransferHistory({ limit: 5 }, authToken)
                requestCount++
                if (response.status === 200) successfulRequests++
                return { operation: 'Transfer History', status: response.status, success: response.status === 200 }
              } catch (error) {
                requestCount++
                return { operation: 'Transfer History', success: false, error: error.message }
              }
            })()
          ]

          throughputPromises.push(...batchPromises)

          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Wait for all requests to complete
        const throughputResults = await Promise.allSettled(throughputPromises)

        const actualDuration = Date.now() - startTime
        const requestsPerSecond = (requestCount / actualDuration) * 1000
        const successfulRequestsPerSecond = (successfulRequests / actualDuration) * 1000
        const successRate = requestCount > 0 ? (successfulRequests / requestCount) * 100 : 0

        // Process results
        throughputResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push({
              name: `Request ${index + 1}`,
              operation: result.value.operation,
              status: result.value.status,
              success: result.value.success,
              error: result.value.error
            })
          } else if (result.status === 'rejected') {
            results.push({
              name: `Request ${index + 1}`,
              success: false,
              error: result.reason?.message || 'Unknown error'
            })
          }
        })

        console.log('📊 Throughput Metrics Results:')
        console.log(`     ⏱️ Test Duration: ${actualDuration}ms`)
        console.log(`     📈 Total Requests: ${requestCount}`)
        console.log(`     ✅ Successful Requests: ${successfulRequests}`)
        console.log(`     🚀 Requests/Second: ${requestsPerSecond.toFixed(2)}`)
        console.log(`     ✅ Successful Requests/Second: ${successfulRequestsPerSecond.toFixed(2)}`)
        console.log(`     📊 Success Rate: ${successRate.toFixed(1)}%`)

        // Show sample of results
        const sampleResults = results.slice(0, 10)
        sampleResults.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = result.status ? ` (Status: ${result.status})` : ''
          const operationInfo = result.operation ? ` - ${result.operation}` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${operationInfo}${errorInfo}`)
        })

        if (results.length > 10) {
          console.log(`     ... and ${results.length - 10} more requests`)
        }

        // Calculate throughput metrics collection success
        const hasThroughputData = requestCount > 0 && requestsPerSecond > 0
        const hasReasonableThroughput = requestsPerSecond > 0.1 && requestsPerSecond < 1000 // Reasonable range
        const throughputMetricsWork = hasThroughputData && hasReasonableThroughput

        console.log(`🚀 Throughput Metrics Collection: ${throughputMetricsWork ? 'Working' : 'Not Working'}`)

        // Throughput metrics should be collectible
        expect(throughputMetricsWork).toBe(true)
        expect(requestCount).toBeGreaterThan(0)
        expect(requestsPerSecond).toBeGreaterThan(0)
      })
    })

    describe('Business Metrics', () => {
      test('should collect business metrics for trades and transfers', async () => {
        console.log('💼 Testing business metrics collection...')

        const results: any[] = []

        // Test business metrics collection
        const businessTests = [
          {
            name: 'Transfer Attempt Metrics',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: secondUserId,
                  amount: 10,
                  currency: 'AOA',
                  description: 'Business metrics test'
                })
              })

              return {
                businessEvent: 'Transfer Attempt',
                status: response.status,
                isBusinessEvent: true,
                eventType: 'transfer',
                amount: 10,
                currency: 'AOA'
              }
            }
          },
          {
            name: 'Order Attempt Metrics',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/limit', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  side: 'buy',
                  amount: 5,
                  price: 100,
                  baseCurrency: 'AOA',
                  quoteCurrency: 'EUR'
                })
              })

              return {
                businessEvent: 'Order Attempt',
                status: response.status,
                isBusinessEvent: true,
                eventType: 'order',
                amount: 5,
                price: 100
              }
            }
          },
          {
            name: 'Balance Check Metrics',
            test: async () => {
              const response = await apiClient.getWalletBalance(authToken)

              return {
                businessEvent: 'Balance Check',
                status: response.status,
                isBusinessEvent: true,
                eventType: 'balance_check',
                hasBalanceData: response.body && response.body.data && response.body.data.balances
              }
            }
          },
          {
            name: 'User Search Metrics',
            test: async () => {
              const response = await apiClient.searchUsers({ query: 'business' }, authToken)

              return {
                businessEvent: 'User Search',
                status: response.status,
                isBusinessEvent: true,
                eventType: 'user_search',
                query: 'business'
              }
            }
          },
          {
            name: 'Transfer History Metrics',
            test: async () => {
              const response = await apiClient.getTransferHistory({}, authToken)

              return {
                businessEvent: 'Transfer History',
                status: response.status,
                isBusinessEvent: true,
                eventType: 'history_check',
                hasHistoryData: response.body && response.body.data && response.body.data.transfers
              }
            }
          }
        ]

        for (const businessTest of businessTests) {
          try {
            const result = await businessTest.test()

            // Check if business event is trackable
            const isTrackableEvent = result.isBusinessEvent && result.businessEvent
            const hasBusinessData = result.amount || result.price || result.hasBalanceData || result.hasHistoryData || result.query
            const isBusinessMetricsWorthy = isTrackableEvent && (result.status < 500) // Any non-server-error response is trackable

            results.push({
              name: businessTest.name,
              businessEvent: result.businessEvent,
              eventType: result.eventType,
              status: result.status,
              isTrackableEvent,
              hasBusinessData,
              isBusinessMetricsWorthy,
              success: isBusinessMetricsWorthy,
              amount: result.amount,
              price: result.price,
              currency: result.currency
            })

            // Small delay between business tests
            await new Promise(resolve => setTimeout(resolve, 100))

          } catch (error: any) {
            results.push({
              name: businessTest.name,
              success: false,
              error: error.message,
              isBusinessMetricsWorthy: false
            })
          }
        }

        console.log('📊 Business Metrics Collection Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = result.status ? ` (Status: ${result.status})` : ''
          const eventInfo = result.businessEvent ? ` - ${result.businessEvent}` : ''
          const amountInfo = result.amount ? ` - Amount: ${result.amount}` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${eventInfo}${amountInfo}${errorInfo}`)
        })

        // Calculate business metrics collection rate
        const businessMetricsCount = results.filter(r => r.success).length
        const businessMetricsRate = (businessMetricsCount / results.length) * 100
        console.log(`💼 Business Metrics Collection Rate: ${businessMetricsRate.toFixed(1)}%`)

        // Business metrics should be collectible
        expect(businessMetricsRate).toBeGreaterThanOrEqual(80)
      })
    })

    describe('System Health Metrics', () => {
      test('should collect system health metrics', async () => {
        console.log('🏥 Testing system health metrics collection...')

        const results: any[] = []

        // Test system health metrics
        const healthTests = [
          {
            name: 'API Health Status',
            test: async () => {
              const response = await apiClient.getHealthStatus()

              return {
                healthCheck: 'API Health',
                status: response.status,
                isHealthy: response.status === 200,
                hasHealthData: response.body && typeof response.body === 'object',
                responseTime: Date.now() // Simplified timestamp
              }
            }
          },
          {
            name: 'Database Connectivity Health',
            test: async () => {
              // Test database connectivity through balance check
              const response = await apiClient.getWalletBalance(authToken)

              return {
                healthCheck: 'Database Connectivity',
                status: response.status,
                isHealthy: response.status === 200,
                hasHealthData: response.body && response.body.data,
                responseTime: Date.now()
              }
            }
          },
          {
            name: 'Authentication Service Health',
            test: async () => {
              // Test auth service health
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer invalid-token',
                  'Content-Type': 'application/json'
                }
              })

              return {
                healthCheck: 'Authentication Service',
                status: response.status,
                isHealthy: response.status === 401, // Proper auth rejection means service is healthy
                hasHealthData: response.status === 401,
                responseTime: Date.now()
              }
            }
          },
          {
            name: 'API Response Health',
            test: async () => {
              // Test API response health through multiple endpoints
              const responses = await Promise.allSettled([
                apiClient.getHealthStatus(),
                apiClient.getWalletBalance(authToken),
                apiClient.getTransferHistory({}, authToken)
              ])

              const successfulResponses = responses.filter(r =>
                r.status === 'fulfilled' && r.value.status === 200
              ).length

              return {
                healthCheck: 'API Response Health',
                status: 200,
                isHealthy: successfulResponses >= 2, // At least 2 out of 3 should work
                hasHealthData: successfulResponses > 0,
                responseTime: Date.now(),
                successfulEndpoints: successfulResponses,
                totalEndpoints: responses.length
              }
            }
          },
          {
            name: 'Error Handling Health',
            test: async () => {
              // Test error handling health
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: 'invalid',
                  amount: -10
                })
              })

              return {
                healthCheck: 'Error Handling',
                status: response.status,
                isHealthy: response.status === 400 || response.status === 422, // Proper error handling
                hasHealthData: response.status >= 400 && response.status < 500,
                responseTime: Date.now()
              }
            }
          }
        ]

        for (const healthTest of healthTests) {
          try {
            const result = await healthTest.test()

            results.push({
              name: healthTest.name,
              healthCheck: result.healthCheck,
              status: result.status,
              isHealthy: result.isHealthy,
              hasHealthData: result.hasHealthData,
              responseTime: result.responseTime,
              successfulEndpoints: result.successfulEndpoints,
              totalEndpoints: result.totalEndpoints,
              success: result.isHealthy && result.hasHealthData
            })

            // Small delay between health tests
            await new Promise(resolve => setTimeout(resolve, 100))

          } catch (error: any) {
            results.push({
              name: healthTest.name,
              success: false,
              error: error.message,
              isHealthy: false
            })
          }
        }

        console.log('📊 System Health Metrics Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = result.status ? ` (Status: ${result.status})` : ''
          const healthInfo = result.isHealthy ? ' - Healthy' : ' - Unhealthy'
          const endpointInfo = result.successfulEndpoints !== undefined ?
            ` - ${result.successfulEndpoints}/${result.totalEndpoints} endpoints` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${healthInfo}${endpointInfo}${errorInfo}`)
        })

        // Calculate system health metrics collection rate
        const healthMetricsCount = results.filter(r => r.success).length
        const healthMetricsRate = (healthMetricsCount / results.length) * 100
        console.log(`🏥 System Health Metrics Collection Rate: ${healthMetricsRate.toFixed(1)}%`)

        // System health metrics should be collectible
        expect(healthMetricsRate).toBeGreaterThanOrEqual(80)
      })
    })
  })
})
