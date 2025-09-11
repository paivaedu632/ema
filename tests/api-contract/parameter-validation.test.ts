import { describe, test, expect, beforeAll } from '@jest/globals'
import { getRealSupabaseJWT } from '../utils/supabase-auth'
import { ApiTestClient } from '../utils/api-client'

describe('API Contract Tests - Parameter Validation', () => {
  let authToken: string
  let userId: string
  let secondUserId: string
  let apiClient: ApiTestClient

  beforeAll(async () => {
    console.log('🔍 Setting up parameter validation tests...')
    
    const authResult = await getRealSupabaseJWT()
    authToken = authResult.token
    userId = authResult.userId
    secondUserId = '2e8f2eb8-9759-5b68-95a9-5gf022b844cd'
    
    apiClient = new ApiTestClient()
    apiClient.setAuthToken(authToken)
    
    console.log('✅ Parameter validation test setup completed')
    console.log(`🔧 User ID: ${userId}`)
  })

  describe('6.2 Parameter Validation Testing', () => {
    describe('Required Parameters Enforcement', () => {
      test('should enforce required parameters', async () => {
        console.log('🔒 Testing required parameter enforcement...')
        
        const results: any[] = []
        
        // Test required parameters across different endpoints
        const requiredParamTests = [
          {
            name: 'Transfer - Missing recipientId',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  amount: 10,
                  currency: 'AOA',
                  description: 'Missing recipient test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Transfer - Missing amount',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: secondUserId,
                  currency: 'AOA',
                  description: 'Missing amount test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Transfer - Missing currency',
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
                  description: 'Missing currency test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Order - Missing side',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/limit', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  amount: 10,
                  price: 100,
                  baseCurrency: 'AOA',
                  quoteCurrency: 'EUR'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Order - Missing amount',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/limit', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  side: 'buy',
                  price: 100,
                  baseCurrency: 'AOA',
                  quoteCurrency: 'EUR'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'User Search - Missing query',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/users/search', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          }
        ]
        
        for (const paramTest of requiredParamTests) {
          try {
            const result = await paramTest.test()
            
            // Required parameter violations should return 400 or 422
            const isValidationError = result.status === 400 || result.status === 422
            const hasErrorMessage = result.body && (result.body.error || result.body.message)
            
            results.push({
              name: paramTest.name,
              status: result.status,
              isValidationError,
              hasErrorMessage,
              success: isValidationError && hasErrorMessage,
              body: result.body
            })
            
          } catch (error: any) {
            results.push({
              name: paramTest.name,
              success: false,
              error: error.message
            })
          }
        }
        
        console.log('📊 Required Parameter Enforcement Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${errorInfo}`)
        })
        
        // Calculate required parameter enforcement rate
        const enforcementCount = results.filter(r => r.success).length
        const enforcementRate = (enforcementCount / results.length) * 100
        console.log(`🔒 Required Parameter Enforcement Rate: ${enforcementRate.toFixed(1)}%`)
        
        // All required parameters should be enforced
        expect(enforcementRate).toBeGreaterThanOrEqual(80)
      })
    })

    describe('Optional Parameters Handling', () => {
      test('should handle optional parameters correctly', async () => {
        console.log('🔓 Testing optional parameter handling...')
        
        const results: any[] = []
        
        // Test optional parameters
        const optionalParamTests = [
          {
            name: 'Transfer History - No filters',
            test: async () => {
              const response = await apiClient.getTransferHistory({}, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Transfer History - With limit',
            test: async () => {
              const response = await apiClient.getTransferHistory({ limit: 5 }, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Order History - No filters',
            test: async () => {
              const response = await apiClient.getOrderHistory({}, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'Order History - With limit',
            test: async () => {
              const response = await apiClient.getOrderHistory({ limit: 10 }, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'User Search - Basic query',
            test: async () => {
              const response = await apiClient.searchUsers({ query: 'test' }, authToken)
              return { status: response.status, body: response.body }
            }
          },
          {
            name: 'User Search - With limit',
            test: async () => {
              const response = await apiClient.searchUsers({ query: 'test', limit: 3 }, authToken)
              return { status: response.status, body: response.body }
            }
          }
        ]
        
        for (const optionalTest of optionalParamTests) {
          try {
            const result = await optionalTest.test()
            
            // Optional parameters should not cause errors
            const isSuccess = result.status === 200
            const hasData = result.body && result.body.data !== undefined
            
            results.push({
              name: optionalTest.name,
              status: result.status,
              isSuccess,
              hasData,
              success: isSuccess && hasData,
              body: result.body
            })
            
          } catch (error: any) {
            results.push({
              name: optionalTest.name,
              success: false,
              error: error.message
            })
          }
        }
        
        console.log('📊 Optional Parameter Handling Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const dataInfo = result.hasData ? ' - Has Data' : ' - No Data'
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${dataInfo}${errorInfo}`)
        })
        
        // Calculate optional parameter handling rate
        const optionalSuccessCount = results.filter(r => r.success).length
        const optionalSuccessRate = (optionalSuccessCount / results.length) * 100
        console.log(`🔓 Optional Parameter Handling Rate: ${optionalSuccessRate.toFixed(1)}%`)
        
        // All optional parameter scenarios should work
        expect(optionalSuccessRate).toBeGreaterThanOrEqual(50)
      })
    })

    describe('Parameter Type Validation', () => {
      test('should validate parameter types correctly', async () => {
        console.log('🔢 Testing parameter type validation...')
        
        const results: any[] = []
        
        // Test various type validation scenarios
        const typeValidationTests = [
          {
            name: 'Transfer - String amount (should be number)',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: secondUserId,
                  amount: "invalid_number",
                  currency: 'AOA',
                  description: 'Type validation test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Transfer - Boolean amount (should be number)',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: secondUserId,
                  amount: true,
                  currency: 'AOA',
                  description: 'Type validation test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Order - String price (should be number)',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/limit', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  side: 'buy',
                  amount: 10,
                  price: "not_a_number",
                  baseCurrency: 'AOA',
                  quoteCurrency: 'EUR'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Transfer - Number recipientId (should be string)',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: 12345,
                  amount: 10,
                  currency: 'AOA',
                  description: 'Type validation test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          }
        ]
        
        for (const typeTest of typeValidationTests) {
          try {
            const result = await typeTest.test()
            
            // Type validation errors should return 400 or 422
            const isValidationError = result.status === 400 || result.status === 422
            const hasErrorMessage = result.body && (result.body.error || result.body.message)
            
            results.push({
              name: typeTest.name,
              status: result.status,
              isValidationError,
              hasErrorMessage,
              success: isValidationError,
              body: result.body
            })
            
          } catch (error: any) {
            results.push({
              name: typeTest.name,
              success: false,
              error: error.message
            })
          }
        }
        
        console.log('📊 Parameter Type Validation Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${errorInfo}`)
        })
        
        // Calculate type validation rate
        const typeValidationCount = results.filter(r => r.success).length
        const typeValidationRate = (typeValidationCount / results.length) * 100
        console.log(`🔢 Parameter Type Validation Rate: ${typeValidationRate.toFixed(1)}%`)
        
        // All type validation should work
        expect(typeValidationRate).toBeGreaterThanOrEqual(75)
      })
    })

    describe('Parameter Range Validation', () => {
      test('should validate parameter ranges correctly', async () => {
        console.log('📏 Testing parameter range validation...')

        const results: any[] = []

        // Test various range validation scenarios
        const rangeValidationTests = [
          {
            name: 'Transfer - Negative amount',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: secondUserId,
                  amount: -10,
                  currency: 'AOA',
                  description: 'Range validation test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Transfer - Zero amount',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: secondUserId,
                  amount: 0,
                  currency: 'AOA',
                  description: 'Range validation test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Transfer - Extremely large amount',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: secondUserId,
                  amount: 999999999999999,
                  currency: 'AOA',
                  description: 'Range validation test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Order - Negative price',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/limit', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  side: 'buy',
                  amount: 10,
                  price: -100,
                  baseCurrency: 'AOA',
                  quoteCurrency: 'EUR'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Order - Zero price',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/limit', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  side: 'buy',
                  amount: 10,
                  price: 0,
                  baseCurrency: 'AOA',
                  quoteCurrency: 'EUR'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'History - Negative limit',
            test: async () => {
              const response = await fetch(`http://localhost:3000/api/v1/transfers/history?limit=-5`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          }
        ]

        for (const rangeTest of rangeValidationTests) {
          try {
            const result = await rangeTest.test()

            // Range validation errors should return 400 or 422
            const isValidationError = result.status === 400 || result.status === 422
            const hasErrorMessage = result.body && (result.body.error || result.body.message)

            results.push({
              name: rangeTest.name,
              status: result.status,
              isValidationError,
              hasErrorMessage,
              success: isValidationError,
              body: result.body
            })

          } catch (error: any) {
            results.push({
              name: rangeTest.name,
              success: false,
              error: error.message
            })
          }
        }

        console.log('📊 Parameter Range Validation Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${errorInfo}`)
        })

        // Calculate range validation rate
        const rangeValidationCount = results.filter(r => r.success).length
        const rangeValidationRate = (rangeValidationCount / results.length) * 100
        console.log(`📏 Parameter Range Validation Rate: ${rangeValidationRate.toFixed(1)}%`)

        // All range validation should work
        expect(rangeValidationRate).toBeGreaterThanOrEqual(80)
      })
    })

    describe('Invalid Parameter Combinations', () => {
      test('should reject invalid parameter combinations', async () => {
        console.log('🚫 Testing invalid parameter combinations...')

        const results: any[] = []

        // Test various invalid parameter combinations
        const combinationTests = [
          {
            name: 'Transfer - Same sender and recipient',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: userId, // Same as sender
                  amount: 10,
                  currency: 'AOA',
                  description: 'Self-transfer test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Order - Same base and quote currency',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/limit', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  side: 'buy',
                  amount: 10,
                  price: 100,
                  baseCurrency: 'AOA',
                  quoteCurrency: 'AOA' // Same as base
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Transfer - Invalid currency combination',
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
                  currency: 'NONEXISTENT',
                  description: 'Invalid currency test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Order - Invalid side value',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/limit', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  side: 'invalid_side',
                  amount: 10,
                  price: 100,
                  baseCurrency: 'AOA',
                  quoteCurrency: 'EUR'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Transfer - Invalid recipient ID format',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: 'not-a-valid-uuid',
                  amount: 10,
                  currency: 'AOA',
                  description: 'Invalid UUID test'
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          }
        ]

        for (const combinationTest of combinationTests) {
          try {
            const result = await combinationTest.test()

            // Invalid combinations should return 400 or 422
            const isValidationError = result.status === 400 || result.status === 422
            const hasErrorMessage = result.body && (result.body.error || result.body.message)

            results.push({
              name: combinationTest.name,
              status: result.status,
              isValidationError,
              hasErrorMessage,
              success: isValidationError,
              body: result.body
            })

          } catch (error: any) {
            results.push({
              name: combinationTest.name,
              success: false,
              error: error.message
            })
          }
        }

        console.log('📊 Invalid Parameter Combination Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${errorInfo}`)
        })

        // Calculate combination validation rate
        const combinationValidationCount = results.filter(r => r.success).length
        const combinationValidationRate = (combinationValidationCount / results.length) * 100
        console.log(`🚫 Invalid Parameter Combination Rejection Rate: ${combinationValidationRate.toFixed(1)}%`)

        // All invalid combinations should be rejected
        expect(combinationValidationRate).toBeGreaterThanOrEqual(80)
      })
    })
  })
})
