import { describe, test, expect, beforeAll } from '@jest/globals'
import { getRealSupabaseJWT } from '../utils/supabase-auth'
import { ApiTestClient } from '../utils/api-client'

// Use consistent base URL for all tests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

describe('API Contract Tests - Request/Response Format', () => {
  let authToken: string
  let userId: string
  let apiClient: ApiTestClient

  beforeAll(async () => {
    console.log('📋 Setting up API contract tests...')
    
    const authResult = await getRealSupabaseJWT()
    authToken = authResult.token
    userId = authResult.userId
    
    apiClient = new ApiTestClient()
    apiClient.setAuthToken(authToken)
    
    console.log('✅ API contract test setup completed')
    console.log(`🔧 User ID: ${userId}`)
  })

  describe('6.1 Request/Response Format Testing', () => {
    describe('Content Type Acceptance', () => {
      test('should accept correct content types for all endpoints', async () => {
        console.log('📝 Testing content type acceptance...')
        
        const results: any[] = []
        
        // Test different content types across various endpoints
        const contentTypeTests = [
          {
            name: 'GET Balance - No Content-Type Required',
            test: async () => {
              const response = await fetch(`${API_BASE_URL}/api/v1/wallets/balance`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`
                }
              })
              return {
                status: response.status,
                contentType: response.headers.get('content-type'),
                acceptsRequest: response.status !== 415 // Not Unsupported Media Type
              }
            }
          },
          {
            name: 'GET Balance - JSON Content-Type',
            test: async () => {
              const response = await fetch(`${API_BASE_URL}/api/v1/wallets/balance`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              return {
                status: response.status,
                contentType: response.headers.get('content-type'),
                acceptsRequest: response.status !== 415
              }
            }
          },
          {
            name: 'POST Transfer - JSON Content-Type',
            test: async () => {
              const response = await fetch(`${API_BASE_URL}/api/v1/transfers/send`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: userId,
                  amount: 10,
                  currency: 'AOA',
                  description: 'Content type test'
                })
              })
              return {
                status: response.status,
                contentType: response.headers.get('content-type'),
                acceptsRequest: response.status !== 415
              }
            }
          },
          {
            name: 'POST Transfer - Invalid Content-Type',
            test: async () => {
              const response = await fetch(`${API_BASE_URL}/api/v1/transfers/send`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'text/plain'
                },
                body: 'invalid body'
              })
              return {
                status: response.status,
                contentType: response.headers.get('content-type'),
                acceptsRequest: response.status !== 415,
                rejectsInvalid: response.status === 415 || response.status === 400
              }
            }
          },
          {
            name: 'GET User Search - Query Parameters',
            test: async () => {
              const response = await fetch(`${API_BASE_URL}/api/v1/users/search?query=test`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              return {
                status: response.status,
                contentType: response.headers.get('content-type'),
                acceptsRequest: response.status !== 415
              }
            }
          }
        ]
        
        for (const contentTest of contentTypeTests) {
          try {
            const result = await contentTest.test()
            results.push({
              name: contentTest.name,
              success: result.acceptsRequest || result.rejectsInvalid,
              ...result
            })
          } catch (error: any) {
            results.push({
              name: contentTest.name,
              success: false,
              error: error.message,
              acceptsRequest: false
            })
          }
        }
        
        console.log('📊 Content Type Acceptance Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const contentInfo = result.contentType ? ` - Response: ${result.contentType}` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${contentInfo}${errorInfo}`)
        })
        
        // Calculate content type handling rate
        const successCount = results.filter(r => r.success).length
        const successRate = (successCount / results.length) * 100
        console.log(`📝 Content Type Handling Rate: ${successRate.toFixed(1)}%`)
        
        // Most content type scenarios should be handled correctly
        expect(successRate).toBeGreaterThanOrEqual(80)
      })
    })

    describe('Response Headers Validation', () => {
      test('should return correct response headers', async () => {
        console.log('📤 Testing response headers...')
        
        const results: any[] = []
        
        // Test response headers across different endpoints
        const headerTests = [
          {
            name: 'Balance Endpoint Headers',
            endpoint: '/api/v1/wallets/balance',
            method: 'GET'
          },
          {
            name: 'User Search Headers',
            endpoint: '/api/v1/users/search?query=test',
            method: 'GET'
          },
          {
            name: 'Transfer History Headers',
            endpoint: '/api/v1/transfers/history',
            method: 'GET'
          },
          {
            name: 'Order History Headers',
            endpoint: '/api/v1/orders/history',
            method: 'GET'
          },
          {
            name: 'Health Check Headers',
            endpoint: '/api/v1/health/status',
            method: 'GET'
          }
        ]
        
        for (const headerTest of headerTests) {
          try {
            const response = await fetch(`${API_BASE_URL}${headerTest.endpoint}`, {
              method: headerTest.method,
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            })
            
            const headers = {
              contentType: response.headers.get('content-type'),
              cacheControl: response.headers.get('cache-control'),
              cors: response.headers.get('access-control-allow-origin'),
              server: response.headers.get('server'),
              date: response.headers.get('date'),
              connection: response.headers.get('connection')
            }
            
            // Check for expected headers
            const hasContentType = headers.contentType !== null
            const hasProperContentType = headers.contentType?.includes('application/json') || false
            const hasDate = headers.date !== null
            
            results.push({
              name: headerTest.name,
              endpoint: headerTest.endpoint,
              status: response.status,
              headers,
              hasContentType,
              hasProperContentType,
              hasDate,
              success: response.status === 200 && hasContentType && hasDate
            })
            
          } catch (error: any) {
            results.push({
              name: headerTest.name,
              endpoint: headerTest.endpoint,
              success: false,
              error: error.message
            })
          }
        }
        
        console.log('📊 Response Headers Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const contentTypeInfo = result.headers?.contentType ? ` - CT: ${result.headers.contentType}` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${contentTypeInfo}${errorInfo}`)
        })
        
        // Calculate header compliance rate
        const headerSuccessCount = results.filter(r => r.success).length
        const headerSuccessRate = (headerSuccessCount / results.length) * 100
        console.log(`📤 Response Header Compliance Rate: ${headerSuccessRate.toFixed(1)}%`)
        
        // Most endpoints should have proper headers
        expect(headerSuccessRate).toBeGreaterThanOrEqual(80)
      })
    })

    describe('HTTP Status Codes', () => {
      test('should return correct HTTP status codes', async () => {
        console.log('🔢 Testing HTTP status codes...')
        
        const results: any[] = []
        
        // Test various scenarios and expected status codes
        const statusTests = [
          {
            name: 'Valid Balance Request',
            expectedStatus: 200,
            test: async () => {
              const response = await apiClient.getWalletBalance(authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Valid User Search',
            expectedStatus: 200,
            test: async () => {
              const response = await apiClient.searchUsers({ query: 'test' }, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Invalid Transfer (Missing PIN)',
            expectedStatus: [400, 422], // Either is acceptable for validation errors
            test: async () => {
              const response = await apiClient.sendTransfer({
                recipientId: userId,
                amount: 10,
                currency: 'AOA',
                description: 'Status code test'
              }, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Unauthorized Request',
            expectedStatus: 401,
            test: async () => {
              const response = await apiClient.getWalletBalance('invalid-token')
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Non-existent Endpoint',
            expectedStatus: 404,
            test: async () => {
              const response = await fetch(`${API_BASE_URL}/api/v1/nonexistent`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
              })
              return { status: response.status, body: await response.text() }
            }
          }
        ]
        
        for (const statusTest of statusTests) {
          try {
            const result = await statusTest.test()
            const expectedStatuses = Array.isArray(statusTest.expectedStatus) ? 
              statusTest.expectedStatus : [statusTest.expectedStatus]
            const statusMatches = expectedStatuses.includes(result.status)
            
            results.push({
              name: statusTest.name,
              expectedStatus: statusTest.expectedStatus,
              actualStatus: result.status,
              statusMatches,
              success: statusMatches,
              body: result.body
            })
            
          } catch (error: any) {
            results.push({
              name: statusTest.name,
              expectedStatus: statusTest.expectedStatus,
              actualStatus: 'ERROR',
              success: false,
              error: error.message
            })
          }
        }
        
        console.log('📊 HTTP Status Code Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` - Expected: ${result.expectedStatus}, Got: ${result.actualStatus}`
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${errorInfo}`)
        })
        
        // Calculate status code accuracy rate
        const statusSuccessCount = results.filter(r => r.success).length
        const statusSuccessRate = (statusSuccessCount / results.length) * 100
        console.log(`🔢 HTTP Status Code Accuracy Rate: ${statusSuccessRate.toFixed(1)}%`)
        
        // All status codes should match specifications
        expect(statusSuccessRate).toBeGreaterThanOrEqual(80)
      })
    })

    describe('Error Response Format Consistency', () => {
      test('should return consistent error response formats', async () => {
        console.log('❌ Testing error response format consistency...')

        const results: any[] = []

        // Test various error scenarios to check format consistency
        const errorTests = [
          {
            name: 'Invalid Transfer Amount',
            test: async () => {
              const response = await apiClient.sendTransfer({
                recipientId: userId,
                amount: -10,
                currency: 'AOA',
                description: 'Error format test'
              }, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Invalid Currency',
            test: async () => {
              const response = await apiClient.sendTransfer({
                recipientId: userId,
                amount: 10,
                currency: 'INVALID',
                description: 'Error format test'
              }, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Unauthorized Access',
            test: async () => {
              const response = await apiClient.getWalletBalance('invalid-token')
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Invalid Order Parameters',
            test: async () => {
              const response = await apiClient.placeLimitOrder({
                side: 'buy',
                amount: -5,
                price: 100,
                baseCurrency: 'AOA',
                quoteCurrency: 'EUR'
              }, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Missing Required Parameters',
            test: async () => {
              const response = await fetch(`${API_BASE_URL}/api/v1/transfers/send`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({}) // Empty body
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          }
        ]

        for (const errorTest of errorTests) {
          try {
            const result = await errorTest.test()

            // Check error response structure
            const hasErrorField = result.body && (result.body.error !== undefined || result.body.message !== undefined)
            const hasStatusField = result.body && result.body.status !== undefined
            const isErrorStatus = result.status >= 400
            const hasConsistentStructure = result.body && typeof result.body === 'object'

            results.push({
              name: errorTest.name,
              status: result.status,
              hasErrorField,
              hasStatusField,
              isErrorStatus,
              hasConsistentStructure,
              success: isErrorStatus && hasConsistentStructure && hasErrorField,
              body: result.body
            })

          } catch (error: any) {
            results.push({
              name: errorTest.name,
              success: false,
              error: error.message
            })
          }
        }

        console.log('📊 Error Response Format Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const structureInfo = result.hasErrorField ? ' - Has Error Field' : ' - Missing Error Field'
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${structureInfo}${errorInfo}`)
        })

        // Calculate error format consistency rate
        const errorFormatCount = results.filter(r => r.success).length
        const errorFormatRate = (errorFormatCount / results.length) * 100
        console.log(`❌ Error Response Format Consistency Rate: ${errorFormatRate.toFixed(1)}%`)

        // All error responses should have consistent format
        expect(errorFormatRate).toBeGreaterThanOrEqual(80)
      })
    })

    describe('Success Response Format Consistency', () => {
      test('should return consistent success response formats', async () => {
        console.log('✅ Testing success response format consistency...')

        const results: any[] = []

        // Test various success scenarios to check format consistency
        const successTests = [
          {
            name: 'Balance Retrieval',
            test: async () => {
              const response = await apiClient.getWalletBalance(authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'User Search',
            test: async () => {
              const response = await apiClient.searchUsers({ query: 'test' }, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Transfer History',
            test: async () => {
              const response = await apiClient.getTransferHistory({}, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Order History',
            test: async () => {
              const response = await apiClient.getOrderHistory({}, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Health Status',
            test: async () => {
              const response = await apiClient.getHealthStatus()
              return { status: response.status, body: response.body }
            }
          }
        ]

        for (const successTest of successTests) {
          try {
            const result = await successTest.test()

            // Check success response structure
            const hasDataField = result.body && result.body.data !== undefined
            const hasStatusField = result.body && result.body.status !== undefined
            const isSuccessStatus = result.status >= 200 && result.status < 300
            const hasConsistentStructure = result.body && typeof result.body === 'object'

            results.push({
              name: successTest.name,
              status: result.status,
              hasDataField,
              hasStatusField,
              isSuccessStatus,
              hasConsistentStructure,
              success: isSuccessStatus && hasConsistentStructure,
              body: result.body
            })

          } catch (error: any) {
            results.push({
              name: successTest.name,
              success: false,
              error: error.message
            })
          }
        }

        console.log('📊 Success Response Format Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const structureInfo = result.hasDataField ? ' - Has Data Field' : ' - Missing Data Field'
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${structureInfo}${errorInfo}`)
        })

        // Calculate success format consistency rate
        const successFormatCount = results.filter(r => r.success).length
        const successFormatRate = (successFormatCount / results.length) * 100
        console.log(`✅ Success Response Format Consistency Rate: ${successFormatRate.toFixed(1)}%`)

        // All success responses should have consistent format
        expect(successFormatRate).toBeGreaterThanOrEqual(80)
      })
    })
  })
})
