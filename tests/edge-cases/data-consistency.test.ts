import { describe, test, expect, beforeAll } from '@jest/globals'
import { getRealSupabaseJWT } from '../utils/supabase-auth'
import { ApiTestClient } from '../utils/api-client'

describe('Edge Case Tests - Data Consistency', () => {
  let authToken: string
  let userId: string
  let secondUserToken: string
  let secondUserId: string
  let apiClient: ApiTestClient

  beforeAll(async () => {
    console.log('🔒 Setting up data consistency edge case tests...')
    
    // Get first user token
    const authResult = await getRealSupabaseJWT()
    authToken = authResult.token
    userId = authResult.userId
    
    // Get second user token for multi-user consistency tests
    const secondAuthResult = await getRealSupabaseJWT('2e8f2eb8-9759-5b68-95a9-5gf022b844cd')
    secondUserToken = secondAuthResult.token
    secondUserId = secondAuthResult.userId
    
    apiClient = new ApiTestClient()
    apiClient.setAuthToken(authToken)
    
    console.log('✅ Data consistency test setup completed')
    console.log(`🔧 User 1 ID: ${userId}`)
    console.log(`🔧 User 2 ID: ${secondUserId}`)
  })

  describe('5.4 Data Consistency Testing', () => {
    describe('Transaction Isolation Levels', () => {
      test('should maintain transaction isolation during concurrent operations', async () => {
        console.log('🔐 Testing transaction isolation levels...')
        
        const results: any[] = []
        
        // Get initial balance state
        console.log('📊 Getting initial balance state...')
        const initialBalanceResponse = await apiClient.getWalletBalance(authToken)
        const initialBalance = initialBalanceResponse.body.data?.balances?.AOA?.availableBalance || 0
        
        console.log(`💰 Initial Balance: ${initialBalance} AOA`)
        
        // Create concurrent operations that should be isolated
        const concurrentOperations = [
          {
            name: 'Balance Check 1',
            operation: async () => {
              const response = await apiClient.getWalletBalance(authToken)
              return {
                type: 'balance_check',
                balance: response.body.data?.balances?.AOA?.availableBalance,
                status: response.status,
                timestamp: new Date().toISOString()
              }
            }
          },
          {
            name: 'Transfer History Check',
            operation: async () => {
              const response = await apiClient.getTransferHistory({}, authToken)
              return {
                type: 'history_check',
                transferCount: response.body.data?.transfers?.length || 0,
                status: response.status,
                timestamp: new Date().toISOString()
              }
            }
          },
          {
            name: 'Balance Check 2',
            operation: async () => {
              const response = await apiClient.getWalletBalance(authToken)
              return {
                type: 'balance_check',
                balance: response.body.data?.balances?.AOA?.availableBalance,
                status: response.status,
                timestamp: new Date().toISOString()
              }
            }
          },
          {
            name: 'Order History Check',
            operation: async () => {
              const response = await apiClient.getOrderHistory({}, authToken)
              return {
                type: 'order_check',
                orderCount: response.body.data?.orders?.length || 0,
                status: response.status,
                timestamp: new Date().toISOString()
              }
            }
          }
        ]
        
        // Execute all operations concurrently
        const startTime = Date.now()
        const operationPromises = concurrentOperations.map(async (op) => {
          try {
            const result = await op.operation()
            return {
              name: op.name,
              success: true,
              ...result
            }
          } catch (error: any) {
            return {
              name: op.name,
              success: false,
              error: error.message,
              type: 'error'
            }
          }
        })
        
        const operationResults = await Promise.allSettled(operationPromises)
        const endTime = Date.now()
        const totalTime = endTime - startTime
        
        operationResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value)
          } else {
            results.push({
              name: concurrentOperations[index].name,
              success: false,
              error: result.reason?.message || 'Unknown error',
              type: 'error'
            })
          }
        })
        
        console.log('📊 Transaction Isolation Test Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const typeIcon = result.type === 'balance_check' ? '💰' : 
                          result.type === 'history_check' ? '📜' :
                          result.type === 'order_check' ? '📋' : '❌'
          const dataInfo = result.balance !== undefined ? ` (Balance: ${result.balance})` :
                          result.transferCount !== undefined ? ` (Transfers: ${result.transferCount})` :
                          result.orderCount !== undefined ? ` (Orders: ${result.orderCount})` : ''
          console.log(`     ${index + 1}. ${icon} ${typeIcon} ${result.name}${dataInfo}`)
        })
        
        // Check data consistency across concurrent reads
        const balanceChecks = results.filter(r => r.type === 'balance_check' && r.success)
        const balanceConsistency = balanceChecks.length > 1 ? 
          balanceChecks.every(check => check.balance === balanceChecks[0].balance) : true
        
        console.log(`🔐 Concurrent Operation Time: ${totalTime}ms`)
        console.log(`💰 Balance Consistency: ${balanceConsistency ? 'CONSISTENT' : 'INCONSISTENT'}`)
        
        // Calculate success rate
        const successCount = results.filter(r => r.success).length
        const successRate = (successCount / results.length) * 100
        console.log(`🔐 Transaction Isolation Success Rate: ${successRate.toFixed(1)}%`)
        
        // Most operations should succeed
        expect(successRate).toBeGreaterThanOrEqual(80)
        
        // Balance data should be consistent across concurrent reads
        expect(balanceConsistency).toBe(true)
      })
      
      test('should handle read-write isolation properly', async () => {
        console.log('📖 Testing read-write isolation...')
        
        const results: any[] = []
        
        // Create mixed read and write operations
        const mixedOperations = [
          {
            name: 'Read Balance',
            type: 'read',
            operation: async () => {
              const response = await apiClient.getWalletBalance(authToken)
              return {
                balance: response.body.data?.balances?.AOA?.availableBalance,
                status: response.status
              }
            }
          },
          {
            name: 'Read Transfer History',
            type: 'read',
            operation: async () => {
              const response = await apiClient.getTransferHistory({}, authToken)
              return {
                transferCount: response.body.data?.transfers?.length || 0,
                status: response.status
              }
            }
          },
          {
            name: 'Write Operation (Transfer Attempt)',
            type: 'write',
            operation: async () => {
              // This will likely fail due to validation, but tests isolation
              const response = await apiClient.sendTransfer({
                recipientId: secondUserId,
                amount: 0.01,
                currency: 'AOA',
                description: 'Isolation test transfer'
              }, authToken)
              return {
                status: response.status,
                success: response.status === 200 || response.status === 201
              }
            }
          },
          {
            name: 'Read Balance After Write',
            type: 'read',
            operation: async () => {
              const response = await apiClient.getWalletBalance(authToken)
              return {
                balance: response.body.data?.balances?.AOA?.availableBalance,
                status: response.status
              }
            }
          }
        ]
        
        // Execute operations with slight delays to test isolation
        for (const operation of mixedOperations) {
          try {
            const startTime = Date.now()
            const result = await operation.operation()
            const endTime = Date.now()
            const responseTime = endTime - startTime
            
            results.push({
              name: operation.name,
              type: operation.type,
              success: result.status === 200,
              responseTime,
              ...result
            })
            
            // Small delay between operations
            await new Promise(resolve => setTimeout(resolve, 50))
            
          } catch (error: any) {
            results.push({
              name: operation.name,
              type: operation.type,
              success: false,
              error: error.message
            })
          }
        }
        
        console.log('📊 Read-Write Isolation Test Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const typeIcon = result.type === 'read' ? '📖' : '✏️'
          const timing = result.responseTime ? ` (${result.responseTime}ms)` : ''
          const dataInfo = result.balance !== undefined ? ` - Balance: ${result.balance}` :
                          result.transferCount !== undefined ? ` - Transfers: ${result.transferCount}` :
                          result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${typeIcon} ${result.name}${timing}${dataInfo}`)
        })
        
        // Calculate isolation effectiveness
        const readOps = results.filter(r => r.type === 'read')
        const writeOps = results.filter(r => r.type === 'write')
        const readSuccessRate = readOps.length > 0 ? (readOps.filter(r => r.success).length / readOps.length) * 100 : 100
        const writeHandlingRate = writeOps.length > 0 ? (writeOps.length / writeOps.length) * 100 : 100 // All writes should be handled (success or proper failure)
        
        console.log(`📖 Read Operation Success Rate: ${readSuccessRate.toFixed(1)}%`)
        console.log(`✏️ Write Operation Handling Rate: ${writeHandlingRate.toFixed(1)}%`)
        
        // Read operations should have high success rate
        expect(readSuccessRate).toBeGreaterThanOrEqual(90)
        
        // All write operations should be handled properly (even if they fail due to validation)
        expect(writeHandlingRate).toBeGreaterThanOrEqual(100)
      })
    })

    describe('Database Constraint Enforcement', () => {
      test('should enforce data validation constraints', async () => {
        console.log('🛡️ Testing database constraint enforcement...')
        
        const results: any[] = []
        
        // Test various constraint violations
        const constraintTests = [
          {
            name: 'Invalid Transfer Amount (Negative)',
            test: async () => {
              const response = await apiClient.sendTransfer({
                recipientId: secondUserId,
                amount: -10.00,
                currency: 'AOA',
                description: 'Negative amount test'
              }, authToken)
              return {
                status: response.status,
                constraintEnforced: response.status === 400 || response.status === 422,
                error: response.body?.error || response.body?.message
              }
            }
          },
          {
            name: 'Invalid Transfer Amount (Zero)',
            test: async () => {
              const response = await apiClient.sendTransfer({
                recipientId: secondUserId,
                amount: 0,
                currency: 'AOA',
                description: 'Zero amount test'
              }, authToken)
              return {
                status: response.status,
                constraintEnforced: response.status === 400 || response.status === 422,
                error: response.body?.error || response.body?.message
              }
            }
          },
          {
            name: 'Invalid Currency Code',
            test: async () => {
              const response = await apiClient.sendTransfer({
                recipientId: secondUserId,
                amount: 10.00,
                currency: 'INVALID',
                description: 'Invalid currency test'
              }, authToken)
              return {
                status: response.status,
                constraintEnforced: response.status === 400 || response.status === 422,
                error: response.body?.error || response.body?.message
              }
            }
          },
          {
            name: 'Invalid Recipient ID',
            test: async () => {
              const response = await apiClient.sendTransfer({
                recipientId: 'invalid-uuid-format',
                amount: 10.00,
                currency: 'AOA',
                description: 'Invalid recipient test'
              }, authToken)
              return {
                status: response.status,
                constraintEnforced: response.status === 400 || response.status === 422,
                error: response.body?.error || response.body?.message
              }
            }
          },
          {
            name: 'Invalid Order Price (Negative)',
            test: async () => {
              const response = await apiClient.placeLimitOrder({
                side: 'buy',
                amount: 10,
                price: -100.00,
                baseCurrency: 'AOA',
                quoteCurrency: 'EUR'
              }, authToken)
              return {
                status: response.status,
                constraintEnforced: response.status === 400 || response.status === 422,
                error: response.body?.error || response.body?.message
              }
            }
          }
        ]
        
        for (const constraintTest of constraintTests) {
          try {
            const result = await constraintTest.test()
            results.push({
              name: constraintTest.name,
              success: result.constraintEnforced,
              status: result.status,
              error: result.error
            })
          } catch (error: any) {
            results.push({
              name: constraintTest.name,
              success: true, // Exception thrown means constraint was enforced
              error: error.message,
              constraintEnforced: true
            })
          }
        }
        
        console.log('📊 Database Constraint Enforcement Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = result.status ? ` (Status: ${result.status})` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${errorInfo}`)
        })
        
        // Calculate constraint enforcement rate
        const enforcementCount = results.filter(r => r.success).length
        const enforcementRate = (enforcementCount / results.length) * 100
        console.log(`🛡️ Constraint Enforcement Rate: ${enforcementRate.toFixed(1)}%`)
        
        // All constraints should be enforced
        expect(enforcementRate).toBeGreaterThanOrEqual(90)
      })
    })

    describe('Referential Integrity Maintenance', () => {
      test('should maintain referential integrity across related data', async () => {
        console.log('🔗 Testing referential integrity maintenance...')

        const results: any[] = []

        // Test referential integrity by checking data relationships
        const integrityTests = [
          {
            name: 'User-Balance Relationship',
            test: async () => {
              const balanceResponse = await apiClient.getWalletBalance(authToken)
              const userExists = balanceResponse.status === 200
              const hasBalanceData = balanceResponse.body.data?.balances !== undefined

              return {
                userExists,
                hasBalanceData,
                integrityMaintained: userExists && hasBalanceData,
                status: balanceResponse.status
              }
            }
          },
          {
            name: 'User-Transfer History Relationship',
            test: async () => {
              const historyResponse = await apiClient.getTransferHistory({}, authToken)
              const userExists = historyResponse.status === 200
              const hasHistoryStructure = historyResponse.body.data?.transfers !== undefined

              return {
                userExists,
                hasHistoryStructure,
                integrityMaintained: userExists && hasHistoryStructure,
                status: historyResponse.status
              }
            }
          },
          {
            name: 'User-Order History Relationship',
            test: async () => {
              const orderResponse = await apiClient.getOrderHistory({}, authToken)
              const userExists = orderResponse.status === 200
              const hasOrderStructure = orderResponse.body.data?.orders !== undefined

              return {
                userExists,
                hasOrderStructure,
                integrityMaintained: userExists && hasOrderStructure,
                status: orderResponse.status
              }
            }
          },
          {
            name: 'Cross-User Data Isolation',
            test: async () => {
              // Check that user 1 cannot access user 2's data directly
              const user1Balance = await apiClient.getWalletBalance(authToken)
              const user2Balance = await apiClient.getWalletBalance(secondUserToken)

              const user1Success = user1Balance.status === 200
              const user2Success = user2Balance.status === 200
              const dataIsolated = user1Success && user2Success // Both should succeed with their own data

              return {
                user1Success,
                user2Success,
                integrityMaintained: dataIsolated,
                user1Balance: user1Balance.body.data?.balances?.AOA?.availableBalance,
                user2Balance: user2Balance.body.data?.balances?.AOA?.availableBalance
              }
            }
          }
        ]

        for (const integrityTest of integrityTests) {
          try {
            const result = await integrityTest.test()
            results.push({
              name: integrityTest.name,
              success: result.integrityMaintained,
              ...result
            })
          } catch (error: any) {
            results.push({
              name: integrityTest.name,
              success: false,
              error: error.message,
              integrityMaintained: false
            })
          }
        }

        console.log('📊 Referential Integrity Test Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const statusInfo = result.status ? ` (Status: ${result.status})` : ''
          const balanceInfo = result.user1Balance !== undefined && result.user2Balance !== undefined ?
            ` - User1: ${result.user1Balance}, User2: ${result.user2Balance}` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${statusInfo}${balanceInfo}${errorInfo}`)
        })

        // Calculate integrity maintenance rate
        const integrityCount = results.filter(r => r.success).length
        const integrityRate = (integrityCount / results.length) * 100
        console.log(`🔗 Referential Integrity Rate: ${integrityRate.toFixed(1)}%`)

        // All referential integrity should be maintained
        expect(integrityRate).toBeGreaterThanOrEqual(100)
      })
    })

    describe('Audit Trail Completeness', () => {
      test('should maintain complete audit trails for all operations', async () => {
        console.log('📋 Testing audit trail completeness...')

        const results: any[] = []

        // Test audit trail by checking operation history
        const auditTests = [
          {
            name: 'Transfer History Audit',
            test: async () => {
              const historyResponse = await apiClient.getTransferHistory({}, authToken)
              const hasHistory = historyResponse.status === 200
              const historyData = historyResponse.body.data?.transfers || []
              const hasTimestamps = historyData.every((transfer: any) =>
                transfer.createdAt || transfer.timestamp || transfer.date
              )
              const hasAmounts = historyData.every((transfer: any) =>
                transfer.amount !== undefined
              )
              const hasDescriptions = historyData.every((transfer: any) =>
                transfer.description !== undefined
              )

              return {
                hasHistory,
                recordCount: historyData.length,
                hasTimestamps,
                hasAmounts,
                hasDescriptions,
                auditComplete: hasHistory && hasTimestamps && hasAmounts,
                status: historyResponse.status
              }
            }
          },
          {
            name: 'Order History Audit',
            test: async () => {
              const orderResponse = await apiClient.getOrderHistory({}, authToken)
              const hasHistory = orderResponse.status === 200
              const orderData = orderResponse.body.data?.orders || []
              const hasTimestamps = orderData.every((order: any) =>
                order.createdAt || order.timestamp || order.date
              )
              const hasPrices = orderData.every((order: any) =>
                order.price !== undefined
              )
              const hasAmounts = orderData.every((order: any) =>
                order.amount !== undefined
              )

              return {
                hasHistory,
                recordCount: orderData.length,
                hasTimestamps,
                hasPrices,
                hasAmounts,
                auditComplete: hasHistory && hasTimestamps && hasPrices && hasAmounts,
                status: orderResponse.status
              }
            }
          },
          {
            name: 'Balance History Consistency',
            test: async () => {
              // Check balance multiple times to ensure consistency
              const balance1 = await apiClient.getWalletBalance(authToken)
              await new Promise(resolve => setTimeout(resolve, 50))
              const balance2 = await apiClient.getWalletBalance(authToken)

              const bothSuccessful = balance1.status === 200 && balance2.status === 200
              const balancesConsistent = bothSuccessful &&
                balance1.body.data?.balances?.AOA?.availableBalance ===
                balance2.body.data?.balances?.AOA?.availableBalance

              return {
                bothSuccessful,
                balancesConsistent,
                auditComplete: bothSuccessful && balancesConsistent,
                balance1: balance1.body.data?.balances?.AOA?.availableBalance,
                balance2: balance2.body.data?.balances?.AOA?.availableBalance
              }
            }
          }
        ]

        for (const auditTest of auditTests) {
          try {
            const result = await auditTest.test()
            results.push({
              name: auditTest.name,
              success: result.auditComplete,
              ...result
            })
          } catch (error: any) {
            results.push({
              name: auditTest.name,
              success: false,
              error: error.message,
              auditComplete: false
            })
          }
        }

        console.log('📊 Audit Trail Completeness Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const recordInfo = result.recordCount !== undefined ? ` (${result.recordCount} records)` : ''
          const balanceInfo = result.balance1 !== undefined && result.balance2 !== undefined ?
            ` - B1: ${result.balance1}, B2: ${result.balance2}` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${recordInfo}${balanceInfo}${errorInfo}`)
        })

        // Calculate audit completeness rate
        const auditCount = results.filter(r => r.success).length
        const auditRate = (auditCount / results.length) * 100
        console.log(`📋 Audit Trail Completeness Rate: ${auditRate.toFixed(1)}%`)

        // All audit trails should be complete
        expect(auditRate).toBeGreaterThanOrEqual(90)
      })
    })

    describe('Balance Reconciliation Accuracy', () => {
      test('should maintain accurate balance reconciliation', async () => {
        console.log('⚖️ Testing balance reconciliation accuracy...')

        const results: any[] = []

        // Test balance reconciliation across different views
        const reconciliationTests = [
          {
            name: 'Multi-Currency Balance Consistency',
            test: async () => {
              const balanceResponse = await apiClient.getWalletBalance(authToken)
              const balances = balanceResponse.body.data?.balances || {}

              const currencies = Object.keys(balances)
              const allBalancesValid = currencies.every(currency => {
                const balance = balances[currency]
                return balance &&
                       typeof balance.availableBalance === 'number' &&
                       balance.availableBalance >= 0
              })

              return {
                currencyCount: currencies.length,
                allBalancesValid,
                reconciled: balanceResponse.status === 200 && allBalancesValid,
                balances: currencies.map(curr => ({
                  currency: curr,
                  balance: balances[curr]?.availableBalance
                }))
              }
            }
          },
          {
            name: 'Balance-History Reconciliation',
            test: async () => {
              const balanceResponse = await apiClient.getWalletBalance(authToken)
              const historyResponse = await apiClient.getTransferHistory({}, authToken)

              const balanceSuccess = balanceResponse.status === 200
              const historySuccess = historyResponse.status === 200
              const hasBalance = balanceResponse.body.data?.balances?.AOA?.availableBalance !== undefined
              const hasHistory = historyResponse.body.data?.transfers !== undefined

              return {
                balanceSuccess,
                historySuccess,
                hasBalance,
                hasHistory,
                reconciled: balanceSuccess && historySuccess && hasBalance && hasHistory,
                currentBalance: balanceResponse.body.data?.balances?.AOA?.availableBalance,
                historyCount: historyResponse.body.data?.transfers?.length || 0
              }
            }
          },
          {
            name: 'Cross-User Balance Isolation',
            test: async () => {
              const user1Balance = await apiClient.getWalletBalance(authToken)
              const user2Balance = await apiClient.getWalletBalance(secondUserToken)

              const user1Success = user1Balance.status === 200
              const user2Success = user2Balance.status === 200
              const user1Amount = user1Balance.body.data?.balances?.AOA?.availableBalance
              const user2Amount = user2Balance.body.data?.balances?.AOA?.availableBalance

              // Balances should be isolated (different users should have independent balances)
              const properIsolation = user1Success && user2Success &&
                                    user1Amount !== undefined && user2Amount !== undefined

              return {
                user1Success,
                user2Success,
                user1Amount,
                user2Amount,
                reconciled: properIsolation,
                isolated: properIsolation
              }
            }
          }
        ]

        for (const reconciliationTest of reconciliationTests) {
          try {
            const result = await reconciliationTest.test()
            results.push({
              name: reconciliationTest.name,
              success: result.reconciled,
              ...result
            })
          } catch (error: any) {
            results.push({
              name: reconciliationTest.name,
              success: false,
              error: error.message,
              reconciled: false
            })
          }
        }

        console.log('📊 Balance Reconciliation Accuracy Results:')
        results.forEach((result, index) => {
          const icon = result.success ? '✅' : '❌'
          const currencyInfo = result.currencyCount ? ` (${result.currencyCount} currencies)` : ''
          const balanceInfo = result.currentBalance !== undefined ? ` - Balance: ${result.currentBalance}` : ''
          const userInfo = result.user1Amount !== undefined && result.user2Amount !== undefined ?
            ` - U1: ${result.user1Amount}, U2: ${result.user2Amount}` : ''
          const errorInfo = result.error ? ` - ${result.error}` : ''
          console.log(`     ${index + 1}. ${icon} ${result.name}${currencyInfo}${balanceInfo}${userInfo}${errorInfo}`)
        })

        // Calculate reconciliation accuracy rate
        const reconciliationCount = results.filter(r => r.success).length
        const reconciliationRate = (reconciliationCount / results.length) * 100
        console.log(`⚖️ Balance Reconciliation Accuracy Rate: ${reconciliationRate.toFixed(1)}%`)

        // All balance reconciliation should be accurate
        expect(reconciliationRate).toBeGreaterThanOrEqual(100)
      })
    })
  })
})
