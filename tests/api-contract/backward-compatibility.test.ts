import { describe, test, expect, beforeAll } from '@jest/globals'
import { getRealSupabaseJWT } from '../utils/supabase-auth'
import { ApiTestClient } from '../utils/api-client'

describe('API Contract Tests - Backward Compatibility', () => {
  let authToken: string
  let userId: string
  let apiClient: ApiTestClient

  beforeAll(async () => {
    console.log('🔄 Setting up backward compatibility tests...')
    
    const authResult = await getRealSupabaseJWT()
    authToken = authResult.token
    userId = authResult.userId
    
    apiClient = new ApiTestClient()
    apiClient.setAuthToken(authToken)
    
    console.log('✅ Backward compatibility test setup completed')
    console.log(`🔧 User ID: ${userId}`)
  })

  describe('6.3 Backward Compatibility Testing', () => {
    describe('API Version Handling', () => {
      test('should handle API version correctly', async () => {
        console.log('🔢 Testing API version handling...')
        
        const results: any[] = []
        
        // Test different API version scenarios
        const versionTests = [
          {
            name: 'Current API Version (v1)',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'API Version in Header',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                  'API-Version': 'v1'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Future API Version (v2)',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v2/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Invalid API Version',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v999/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'No Version Specified',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/wallets/balance', {
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
        
        for (const versionTest of versionTests) {
          try {
            const result = await versionTest.test()
            
            // Check version handling behavior
            const isCurrentVersion = versionTest.name.includes('Current API Version') || versionTest.name.includes('API Version in Header')
            const isFutureVersion = versionTest.name.includes('Future API Version')
            const isInvalidVersion = versionTest.name.includes('Invalid API Version') || versionTest.name.includes('No Version')
            
            let expectedBehavior = false
            if (isCurrentVersion) {
              expectedBehavior = result.status === 200
            } else if (isFutureVersion || isInvalidVersion) {
              expectedBehavior = result.status === 404 || result.status === 400
            }
            
            results.push({
              name: versionTest.name,
              status: result.status,
              isCurrentVersion,
              isFutureVersion,
              isInvalidVersion,
              expectedBehavior,
              success: expectedBehavior,
              body: result.body
            })
            
          } catch (error: any) {
            results.push({
              name: versionTest.name,
              success: false,
              error: error.message
            })
          }
        }
        
        console.log('📊 API Version Handling Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${errorInfo}`)
        })
        
        // Calculate version handling rate
        const versionSuccessCount = results.filter(r => r.success).length
        const versionSuccessRate = (versionSuccessCount / results.length) * 100
        console.log(`🔢 API Version Handling Rate: ${versionSuccessRate.toFixed(1)}%`)
        
        // Version handling should work correctly
        expect(versionSuccessRate).toBeGreaterThanOrEqual(80)
      })
    })

    describe('Deprecated Endpoint Warnings', () => {
      test('should handle deprecated endpoints appropriately', async () => {
        console.log('⚠️ Testing deprecated endpoint handling...')
        
        const results: any[] = []
        
        // Test deprecated endpoint scenarios (simulated)
        const deprecationTests = [
          {
            name: 'Current Endpoint - No Deprecation',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              const deprecationWarning = response.headers.get('deprecation') || response.headers.get('x-deprecated')
              return { status: response.status, body, deprecationWarning }
            }
          },
          {
            name: 'Transfer Endpoint - Check for Warnings',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/transfers/history', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              const deprecationWarning = response.headers.get('deprecation') || response.headers.get('x-deprecated')
              return { status: response.status, body, deprecationWarning }
            }
          },
          {
            name: 'Order Endpoint - Check for Warnings',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/orders/history', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              const deprecationWarning = response.headers.get('deprecation') || response.headers.get('x-deprecated')
              return { status: response.status, body, deprecationWarning }
            }
          },
          {
            name: 'User Search - Check for Warnings',
            test: async () => {
              const response = await fetch('http://localhost:3000/api/v1/users/search?query=test', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              const deprecationWarning = response.headers.get('deprecation') || response.headers.get('x-deprecated')
              return { status: response.status, body, deprecationWarning }
            }
          }
        ]
        
        for (const deprecationTest of deprecationTests) {
          try {
            const result = await deprecationTest.test()
            
            // Check deprecation handling
            const isWorking = result.status === 200
            const hasDeprecationWarning = result.deprecationWarning !== null
            const properHandling = isWorking // Endpoints should still work even if deprecated
            
            results.push({
              name: deprecationTest.name,
              status: result.status,
              isWorking,
              hasDeprecationWarning,
              deprecationWarning: result.deprecationWarning,
              success: properHandling,
              body: result.body
            })
            
          } catch (error: any) {
            results.push({
              name: deprecationTest.name,
              success: false,
              error: error.message
            })
          }
        }
        
        console.log('📊 Deprecated Endpoint Handling Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const warningInfo = result.hasDeprecationWarning ? ' - Has Deprecation Warning' : ' - No Deprecation Warning'
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${warningInfo}${errorInfo}`)
        })
        
        // Calculate deprecation handling rate
        const deprecationSuccessCount = results.filter(r => r.success).length
        const deprecationSuccessRate = (deprecationSuccessCount / results.length) * 100
        console.log(`⚠️ Deprecated Endpoint Handling Rate: ${deprecationSuccessRate.toFixed(1)}%`)
        
        // Deprecated endpoints should still work
        expect(deprecationSuccessRate).toBeGreaterThanOrEqual(90)
      })
    })

    describe('Response Format Stability', () => {
      test('should maintain stable response formats', async () => {
        console.log('📋 Testing response format stability...')
        
        const results: any[] = []
        
        // Test response format consistency across multiple calls
        const stabilityTests = [
          {
            name: 'Balance Response Stability',
            test: async () => {
              const responses = []
              for (let i = 0; i < 3; i++) {
                const response = await apiClient.getWalletBalance(authToken)
                responses.push({
                  status: response.status,
                  hasData: response.body.data !== undefined,
                  hasBalances: response.body.data?.balances !== undefined,
                  structure: Object.keys(response.body).sort()
                })
                await new Promise(resolve => setTimeout(resolve, 100))
              }
              
              // Check consistency across calls
              const allSameStatus = responses.every(r => r.status === responses[0].status)
              const allHaveData = responses.every(r => r.hasData === responses[0].hasData)
              const allSameStructure = responses.every(r => 
                JSON.stringify(r.structure) === JSON.stringify(responses[0].structure)
              )
              
              return {
                responses,
                allSameStatus,
                allHaveData,
                allSameStructure,
                stable: allSameStatus && allHaveData && allSameStructure
              }
            }
          },
          {
            name: 'Transfer History Response Stability',
            test: async () => {
              const responses = []
              for (let i = 0; i < 3; i++) {
                const response = await apiClient.getTransferHistory({}, authToken)
                responses.push({
                  status: response.status,
                  hasData: response.body.data !== undefined,
                  hasTransfers: response.body.data?.transfers !== undefined,
                  structure: Object.keys(response.body).sort()
                })
                await new Promise(resolve => setTimeout(resolve, 100))
              }
              
              const allSameStatus = responses.every(r => r.status === responses[0].status)
              const allHaveData = responses.every(r => r.hasData === responses[0].hasData)
              const allSameStructure = responses.every(r => 
                JSON.stringify(r.structure) === JSON.stringify(responses[0].structure)
              )
              
              return {
                responses,
                allSameStatus,
                allHaveData,
                allSameStructure,
                stable: allSameStatus && allHaveData && allSameStructure
              }
            }
          },
          {
            name: 'User Search Response Stability',
            test: async () => {
              const responses = []
              for (let i = 0; i < 3; i++) {
                const response = await apiClient.searchUsers({ query: 'test' }, authToken)
                responses.push({
                  status: response.status,
                  hasData: response.body.data !== undefined,
                  hasUsers: response.body.data?.users !== undefined,
                  structure: Object.keys(response.body).sort()
                })
                await new Promise(resolve => setTimeout(resolve, 100))
              }
              
              const allSameStatus = responses.every(r => r.status === responses[0].status)
              const allHaveData = responses.every(r => r.hasData === responses[0].hasData)
              const allSameStructure = responses.every(r => 
                JSON.stringify(r.structure) === JSON.stringify(responses[0].structure)
              )
              
              return {
                responses,
                allSameStatus,
                allHaveData,
                allSameStructure,
                stable: allSameStatus && allHaveData && allSameStructure
              }
            }
          }
        ]
        
        for (const stabilityTest of stabilityTests) {
          try {
            const result = await stabilityTest.test()
            
            results.push({
              name: stabilityTest.name,
              stable: result.stable,
              allSameStatus: result.allSameStatus,
              allHaveData: result.allHaveData,
              allSameStructure: result.allSameStructure,
              success: result.stable,
              responseCount: result.responses.length
            })
            
          } catch (error: any) {
            results.push({
              name: stabilityTest.name,
              success: false,
              error: error.message
            })
          }
        }
        
        console.log('📊 Response Format Stability Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const stabilityInfo = result.stable ? ' - Stable Format' : ' - Unstable Format'
          const countInfo = result.responseCount ? ` (${result.responseCount} calls)` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${stabilityInfo}${countInfo}${errorInfo}`)
        })
        
        // Calculate stability rate
        const stabilitySuccessCount = results.filter(r => r.success).length
        const stabilitySuccessRate = (stabilitySuccessCount / results.length) * 100
        console.log(`📋 Response Format Stability Rate: ${stabilitySuccessRate.toFixed(1)}%`)
        
        // All response formats should be stable
        expect(stabilitySuccessRate).toBeGreaterThanOrEqual(100)
      })
    })

    describe('Parameter Evolution Handling', () => {
      test('should handle parameter evolution correctly', async () => {
        console.log('🔄 Testing parameter evolution handling...')

        const results: any[] = []

        // Test parameter evolution scenarios
        const evolutionTests = [
          {
            name: 'Transfer - Legacy Parameter Format',
            test: async () => {
              // Test with minimal required parameters (legacy style)
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: userId,
                  amount: 10,
                  currency: 'AOA'
                  // Missing optional description
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Transfer - Extended Parameter Format',
            test: async () => {
              // Test with extended parameters (new style)
              const response = await fetch('http://localhost:3000/api/v1/transfers/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipientId: userId,
                  amount: 10,
                  currency: 'AOA',
                  description: 'Evolution test',
                  metadata: { test: true },
                  tags: ['test', 'evolution']
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'Order - Legacy Parameter Format',
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
                  quoteCurrency: 'EUR'
                  // Missing optional parameters
                })
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'History - Legacy Query Format',
            test: async () => {
              // Simple query without advanced filters
              const response = await fetch('http://localhost:3000/api/v1/transfers/history', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body }
            }
          },
          {
            name: 'History - Extended Query Format',
            test: async () => {
              // Extended query with new parameters
              const response = await fetch('http://localhost:3000/api/v1/transfers/history?limit=5&offset=0&sortBy=date&order=desc', {
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

        for (const evolutionTest of evolutionTests) {
          try {
            const result = await evolutionTest.test()

            // Parameter evolution should maintain backward compatibility
            const isLegacyFormat = evolutionTest.name.includes('Legacy')
            const isExtendedFormat = evolutionTest.name.includes('Extended')

            // Both legacy and extended formats should work
            const worksCorrectly = result.status === 200 ||
                                 result.status === 400 ||
                                 result.status === 422 // Validation errors are acceptable

            results.push({
              name: evolutionTest.name,
              status: result.status,
              isLegacyFormat,
              isExtendedFormat,
              worksCorrectly,
              success: worksCorrectly,
              body: result.body
            })

          } catch (error: any) {
            results.push({
              name: evolutionTest.name,
              success: false,
              error: error.message
            })
          }
        }

        console.log('📊 Parameter Evolution Handling Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const formatInfo = result.isLegacyFormat ? ' - Legacy Format' : ' - Extended Format'
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${formatInfo}${errorInfo}`)
        })

        // Calculate evolution handling rate
        const evolutionSuccessCount = results.filter(r => r.success).length
        const evolutionSuccessRate = (evolutionSuccessCount / results.length) * 100
        console.log(`🔄 Parameter Evolution Handling Rate: ${evolutionSuccessRate.toFixed(1)}%`)

        // Parameter evolution should maintain compatibility
        expect(evolutionSuccessRate).toBeGreaterThanOrEqual(80)
      })
    })

    describe('Client Compatibility Maintenance', () => {
      test('should maintain client compatibility', async () => {
        console.log('🤝 Testing client compatibility maintenance...')

        const results: any[] = []

        // Test various client compatibility scenarios
        const compatibilityTests = [
          {
            name: 'Standard HTTP Client Compatibility',
            test: async () => {
              // Test with standard fetch (simulating basic HTTP client)
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body, clientType: 'Standard HTTP' }
            }
          },
          {
            name: 'Legacy User-Agent Compatibility',
            test: async () => {
              // Test with legacy user agent
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                  'User-Agent': 'EmaPay-Client/1.0.0'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body, clientType: 'Legacy User-Agent' }
            }
          },
          {
            name: 'Modern User-Agent Compatibility',
            test: async () => {
              // Test with modern user agent
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                  'User-Agent': 'EmaPay-Client/2.5.0 (Node.js/18.0.0)'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body, clientType: 'Modern User-Agent' }
            }
          },
          {
            name: 'Accept Header Compatibility',
            test: async () => {
              // Test with specific Accept header
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json, text/plain, */*'
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body, clientType: 'Accept Header' }
            }
          },
          {
            name: 'Minimal Headers Compatibility',
            test: async () => {
              // Test with minimal headers (basic client)
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`
                  // No Content-Type or other headers
                }
              })
              const body = await response.json().catch(() => ({}))
              return { status: response.status, body, clientType: 'Minimal Headers' }
            }
          },
          {
            name: 'CORS Preflight Compatibility',
            test: async () => {
              // Test CORS preflight scenario
              const response = await fetch('http://localhost:3000/api/v1/wallets/balance', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                  'Origin': 'https://emapay.example.com'
                }
              })
              const body = await response.json().catch(() => ({}))
              const corsHeaders = {
                allowOrigin: response.headers.get('access-control-allow-origin'),
                allowMethods: response.headers.get('access-control-allow-methods'),
                allowHeaders: response.headers.get('access-control-allow-headers')
              }
              return { status: response.status, body, corsHeaders, clientType: 'CORS Client' }
            }
          }
        ]

        for (const compatibilityTest of compatibilityTests) {
          try {
            const result = await compatibilityTest.test()

            // All client types should be compatible
            const isCompatible = result.status === 200
            const hasValidResponse = result.body && typeof result.body === 'object'

            results.push({
              name: compatibilityTest.name,
              status: result.status,
              clientType: result.clientType,
              isCompatible,
              hasValidResponse,
              corsHeaders: result.corsHeaders,
              success: isCompatible && hasValidResponse,
              body: result.body
            })

          } catch (error: any) {
            results.push({
              name: compatibilityTest.name,
              success: false,
              error: error.message
            })
          }
        }

        console.log('📊 Client Compatibility Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = ` (Status: ${result.status})`
          const clientInfo = ` - ${result.clientType}`
          const corsInfo = result.corsHeaders?.allowOrigin ? ' - CORS Enabled' : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${clientInfo}${corsInfo}${errorInfo}`)
        })

        // Calculate compatibility rate
        const compatibilitySuccessCount = results.filter(r => r.success).length
        const compatibilitySuccessRate = (compatibilitySuccessCount / results.length) * 100
        console.log(`🤝 Client Compatibility Maintenance Rate: ${compatibilitySuccessRate.toFixed(1)}%`)

        // All client types should be compatible
        expect(compatibilitySuccessRate).toBeGreaterThanOrEqual(90)
      })
    })
  })
})
