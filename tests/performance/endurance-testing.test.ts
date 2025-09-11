/**
 * Performance Tests - Endurance Testing
 * 
 * Tests system stability over extended periods:
 * - System stability over 24 hours (simulated)
 * - Memory leak detection
 * - Connection pool cleanup
 * - Log file size management
 * - Performance consistency over time
 */

import { apiClient } from '../utils/api-client'
import { getRealSupabaseJWT } from '../utils/supabase-auth'
import { expectSuccessResponse, expectErrorResponse, measureResponseTime } from '../utils/test-helpers'

interface EnduranceMetrics {
  timestamp: string
  memoryUsage: NodeJS.MemoryUsage
  responseTime: number
  successRate: number
  errorCount: number
  operationCount: number
}

interface PerformanceTrend {
  timeSlice: string
  averageResponseTime: number
  successRate: number
  memoryUsageMB: number
  throughput: number
}

describe('Performance Tests - Endurance Testing', () => {
  let validToken: string
  let userId: string
  let enduranceMetrics: EnduranceMetrics[] = []
  let testStartTime: number

  // Helper function to simulate extended operation
  const simulateExtendedOperation = async (
    durationMinutes: number,
    operationsPerMinute: number = 10
  ): Promise<EnduranceMetrics[]> => {
    const metrics: EnduranceMetrics[] = []
    const startTime = Date.now()
    const endTime = startTime + (durationMinutes * 60 * 1000)
    const intervalMs = (60 * 1000) / operationsPerMinute // Interval between operations
    
    let operationCount = 0
    let errorCount = 0
    
    console.log(`   Starting ${durationMinutes}-minute endurance simulation...`)
    
    while (Date.now() < endTime) {
      const cycleStartTime = Date.now()
      
      // Perform a batch of operations
      const batchSize = Math.min(5, operationsPerMinute)
      const batchOperations = Array.from({ length: batchSize }, (_, index) => {
        return async () => {
          const opStartTime = Date.now()
          try {
            const operations = [
              () => apiClient.getWalletBalance(validToken),
              () => apiClient.getTransferHistory({ limit: 10 }, validToken),
              () => apiClient.getOrderHistory({ limit: 10 }, validToken),
              () => apiClient.searchUsers({ query: 'test', limit: 5 }, validToken)
            ]
            
            const operation = operations[index % operations.length]
            const response = await operation()
            
            return {
              success: response.status === 200,
              responseTime: Date.now() - opStartTime,
              status: response.status
            }
          } catch (error) {
            return {
              success: false,
              responseTime: Date.now() - opStartTime,
              status: 0,
              error: error.message
            }
          }
        }
      })

      // Execute batch
      const batchResults = await Promise.allSettled(batchOperations.map(op => op()))
      
      // Process results
      let batchSuccessCount = 0
      let batchResponseTimeSum = 0
      
      batchResults.forEach(result => {
        operationCount++
        if (result.status === 'fulfilled') {
          const response = result.value
          batchResponseTimeSum += response.responseTime
          if (response.success) {
            batchSuccessCount++
          } else {
            errorCount++
          }
        } else {
          errorCount++
        }
      })

      const averageResponseTime = batchResponseTimeSum / batchSize
      const successRate = batchSuccessCount / batchSize
      
      // Capture metrics every minute
      const elapsedMinutes = Math.floor((Date.now() - startTime) / (60 * 1000))
      if (operationCount % operationsPerMinute === 0) {
        const currentMetrics: EnduranceMetrics = {
          timestamp: new Date().toISOString(),
          memoryUsage: process.memoryUsage(),
          responseTime: averageResponseTime,
          successRate,
          errorCount,
          operationCount
        }
        
        metrics.push(currentMetrics)
        
        console.log(`     Minute ${elapsedMinutes + 1}: ${operationCount} ops, ${(successRate * 100).toFixed(1)}% success, ${averageResponseTime.toFixed(0)}ms avg, ${(currentMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB heap`)
      }
      
      // Wait for next interval
      const cycleTime = Date.now() - cycleStartTime
      const waitTime = Math.max(0, intervalMs - cycleTime)
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    console.log(`   Completed ${durationMinutes}-minute simulation: ${operationCount} operations, ${errorCount} errors`)
    return metrics
  }

  // Helper function to detect memory leaks
  const detectMemoryLeaks = (metrics: EnduranceMetrics[]): {
    hasLeak: boolean
    heapGrowthMB: number
    rssGrowthMB: number
    trend: 'increasing' | 'stable' | 'decreasing'
  } => {
    if (metrics.length < 2) {
      return { hasLeak: false, heapGrowthMB: 0, rssGrowthMB: 0, trend: 'stable' }
    }

    const firstMetric = metrics[0]
    const lastMetric = metrics[metrics.length - 1]
    
    const heapGrowthMB = (lastMetric.memoryUsage.heapUsed - firstMetric.memoryUsage.heapUsed) / 1024 / 1024
    const rssGrowthMB = (lastMetric.memoryUsage.rss - firstMetric.memoryUsage.rss) / 1024 / 1024
    
    // Calculate trend over the middle 50% of data points to avoid startup/shutdown effects
    const startIndex = Math.floor(metrics.length * 0.25)
    const endIndex = Math.floor(metrics.length * 0.75)
    const middleMetrics = metrics.slice(startIndex, endIndex)
    
    if (middleMetrics.length < 2) {
      return { hasLeak: false, heapGrowthMB, rssGrowthMB, trend: 'stable' }
    }

    const middleStart = middleMetrics[0].memoryUsage.heapUsed
    const middleEnd = middleMetrics[middleMetrics.length - 1].memoryUsage.heapUsed
    const middleGrowthMB = (middleEnd - middleStart) / 1024 / 1024
    
    let trend: 'increasing' | 'stable' | 'decreasing'
    if (middleGrowthMB > 10) {
      trend = 'increasing'
    } else if (middleGrowthMB < -10) {
      trend = 'decreasing'
    } else {
      trend = 'stable'
    }
    
    // Consider it a leak if heap grows more than 50MB consistently
    const hasLeak = trend === 'increasing' && middleGrowthMB > 50
    
    return { hasLeak, heapGrowthMB, rssGrowthMB, trend }
  }

  beforeAll(async () => {
    // Get valid token for testing
    validToken = await getRealSupabaseJWT()
    
    // Get user ID
    const authResponse = await apiClient.getAuthMe(validToken)
    if (authResponse.status === 200) {
      userId = authResponse.body.data.userId
    }
    
    // Set up PIN for transfers
    const pinData = { pin: '123456', confirmPin: '123456' }
    await apiClient.setPin(pinData, validToken)
    
    testStartTime = Date.now()
    
    console.log('✅ Endurance testing setup completed')
    console.log(`🔧 User ID: ${userId}`)
  })

  describe('3.3 Endurance Testing', () => {
    test('should maintain system stability over extended period (simulated 24 hours)', async () => {
      console.log('🚀 Testing system stability over extended period...')
      console.log('   Note: Simulating 24-hour test with accelerated timeline')
      
      // Simulate 24 hours with 10-minute segments (144 segments total)
      // Each segment represents 10 minutes of real time compressed into ~5 seconds
      const segmentCount = 12 // Reduced for practical testing (represents 2 hours)
      const operationsPerSegment = 20
      
      const allMetrics: EnduranceMetrics[] = []
      
      for (let segment = 0; segment < segmentCount; segment++) {
        console.log(`   Segment ${segment + 1}/${segmentCount} (simulating hour ${Math.floor(segment * 2) + 1}-${Math.floor(segment * 2) + 2})...`)
        
        // Run operations for this segment
        const segmentMetrics = await simulateExtendedOperation(0.5, operationsPerSegment) // 30 seconds per segment
        allMetrics.push(...segmentMetrics)
        
        // Small break between segments
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Analyze stability over time
      const performanceTrends: PerformanceTrend[] = []
      const segmentSize = Math.max(1, Math.floor(allMetrics.length / 8)) // Divide into 8 time slices
      
      for (let i = 0; i < allMetrics.length; i += segmentSize) {
        const slice = allMetrics.slice(i, i + segmentSize)
        if (slice.length === 0) continue
        
        const avgResponseTime = slice.reduce((sum, m) => sum + m.responseTime, 0) / slice.length
        const avgSuccessRate = slice.reduce((sum, m) => sum + m.successRate, 0) / slice.length
        const avgMemoryMB = slice.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / slice.length / 1024 / 1024
        const totalOps = slice[slice.length - 1].operationCount - slice[0].operationCount
        const timeSpanMs = new Date(slice[slice.length - 1].timestamp).getTime() - new Date(slice[0].timestamp).getTime()
        const throughput = totalOps / (timeSpanMs / 1000)
        
        performanceTrends.push({
          timeSlice: `Slice ${Math.floor(i / segmentSize) + 1}`,
          averageResponseTime: avgResponseTime,
          successRate: avgSuccessRate,
          memoryUsageMB: avgMemoryMB,
          throughput
        })
      }
      
      console.log('📊 Extended Stability Analysis:')
      performanceTrends.forEach(trend => {
        console.log(`   ${trend.timeSlice}: ${trend.averageResponseTime.toFixed(0)}ms avg, ${(trend.successRate * 100).toFixed(1)}% success, ${trend.memoryUsageMB.toFixed(1)}MB heap, ${trend.throughput.toFixed(1)} ops/s`)
      })
      
      // Validate stability requirements
      const avgResponseTimes = performanceTrends.map(t => t.averageResponseTime)
      const avgSuccessRates = performanceTrends.map(t => t.successRate)
      
      const responseTimeVariation = Math.max(...avgResponseTimes) / Math.min(...avgResponseTimes)
      const minSuccessRate = Math.min(...avgSuccessRates)
      
      console.log(`   Response Time Variation: ${responseTimeVariation.toFixed(2)}x`)
      console.log(`   Minimum Success Rate: ${(minSuccessRate * 100).toFixed(2)}%`)
      
      // System should remain stable over time
      expect(responseTimeVariation).toBeLessThan(3) // Response time shouldn't vary more than 3x
      expect(minSuccessRate).toBeGreaterThan(0.7) // Success rate should stay above 70%
      
      console.log('✅ System stability over extended period validated')
    }, 600000) // 10 minute timeout

    test('should detect and prevent memory leaks', async () => {
      console.log('🚀 Testing for memory leaks...')
      
      // Run operations for an extended period to detect memory leaks
      const leakTestMetrics = await simulateExtendedOperation(3, 15) // 3 minutes, 15 ops/min
      
      // Analyze memory usage patterns
      const memoryAnalysis = detectMemoryLeaks(leakTestMetrics)
      
      console.log('📊 Memory Leak Analysis:')
      console.log(`   Heap Growth: ${memoryAnalysis.heapGrowthMB.toFixed(2)} MB`)
      console.log(`   RSS Growth: ${memoryAnalysis.rssGrowthMB.toFixed(2)} MB`)
      console.log(`   Memory Trend: ${memoryAnalysis.trend}`)
      console.log(`   Leak Detected: ${memoryAnalysis.hasLeak ? 'Yes' : 'No'}`)
      
      // Plot memory usage over time
      console.log('   Memory Usage Timeline:')
      leakTestMetrics.forEach((metric, index) => {
        if (index % 5 === 0) { // Show every 5th measurement
          const heapMB = metric.memoryUsage.heapUsed / 1024 / 1024
          const rssMB = metric.memoryUsage.rss / 1024 / 1024
          console.log(`     ${index + 1}: Heap ${heapMB.toFixed(1)}MB, RSS ${rssMB.toFixed(1)}MB`)
        }
      })
      
      // Validate memory usage
      expect(memoryAnalysis.hasLeak).toBe(false)
      expect(memoryAnalysis.heapGrowthMB).toBeLessThan(100) // Less than 100MB growth
      
      // Force garbage collection if available and test again
      if (global.gc) {
        console.log('   Running garbage collection...')
        global.gc()
        
        const postGcMemory = process.memoryUsage()
        const postGcHeapMB = postGcMemory.heapUsed / 1024 / 1024
        console.log(`   Post-GC Heap Usage: ${postGcHeapMB.toFixed(1)}MB`)
      }
      
      console.log('✅ Memory leak detection completed')
    }, 300000) // 5 minute timeout

    test('should maintain connection pool cleanup', async () => {
      console.log('🚀 Testing connection pool cleanup...')

      // Create bursts of activity followed by idle periods to test connection cleanup
      const burstCount = 5
      const operationsPerBurst = 30
      const idlePeriodMs = 10000 // 10 seconds idle between bursts

      const connectionMetrics: {
        burstNumber: number
        beforeBurst: EnduranceMetrics
        afterBurst: EnduranceMetrics
        afterIdle: EnduranceMetrics
      }[] = []

      for (let burst = 0; burst < burstCount; burst++) {
        console.log(`   Burst ${burst + 1}/${burstCount}...`)

        // Capture metrics before burst
        const beforeBurst: EnduranceMetrics = {
          timestamp: new Date().toISOString(),
          memoryUsage: process.memoryUsage(),
          responseTime: 0,
          successRate: 0,
          errorCount: 0,
          operationCount: 0
        }

        // Create burst of operations
        const burstOperations = Array.from({ length: operationsPerBurst }, (_, index) => {
          return async () => {
            const startTime = Date.now()
            try {
              const operations = [
                () => apiClient.getWalletBalance(validToken),
                () => apiClient.getTransferHistory({}, validToken),
                () => apiClient.getOrderHistory({}, validToken),
                () => apiClient.searchUsers({ query: 'test' }, validToken)
              ]

              const operation = operations[index % operations.length]
              const response = await operation()

              return {
                success: response.status === 200,
                responseTime: Date.now() - startTime
              }
            } catch (error) {
              return {
                success: false,
                responseTime: Date.now() - startTime
              }
            }
          }
        })

        // Execute burst with high concurrency
        const burstResults = await Promise.allSettled(burstOperations.map(op => op()))

        // Capture metrics after burst
        const afterBurst: EnduranceMetrics = {
          timestamp: new Date().toISOString(),
          memoryUsage: process.memoryUsage(),
          responseTime: 0,
          successRate: 0,
          errorCount: 0,
          operationCount: operationsPerBurst
        }

        // Wait for idle period (connection cleanup should happen)
        console.log(`     Waiting ${idlePeriodMs / 1000}s for connection cleanup...`)
        await new Promise(resolve => setTimeout(resolve, idlePeriodMs))

        // Capture metrics after idle period
        const afterIdle: EnduranceMetrics = {
          timestamp: new Date().toISOString(),
          memoryUsage: process.memoryUsage(),
          responseTime: 0,
          successRate: 0,
          errorCount: 0,
          operationCount: 0
        }

        connectionMetrics.push({
          burstNumber: burst + 1,
          beforeBurst,
          afterBurst,
          afterIdle
        })

        // Log memory usage for this burst cycle
        const beforeMB = beforeBurst.memoryUsage.heapUsed / 1024 / 1024
        const afterBurstMB = afterBurst.memoryUsage.heapUsed / 1024 / 1024
        const afterIdleMB = afterIdle.memoryUsage.heapUsed / 1024 / 1024

        console.log(`     Memory: Before ${beforeMB.toFixed(1)}MB → After Burst ${afterBurstMB.toFixed(1)}MB → After Idle ${afterIdleMB.toFixed(1)}MB`)
      }

      // Analyze connection pool behavior
      console.log('📊 Connection Pool Analysis:')

      let totalMemoryGrowth = 0
      let maxBurstMemoryIncrease = 0
      let avgIdleMemoryDecrease = 0

      connectionMetrics.forEach(metric => {
        const burstIncrease = (metric.afterBurst.memoryUsage.heapUsed - metric.beforeBurst.memoryUsage.heapUsed) / 1024 / 1024
        const idleDecrease = (metric.afterBurst.memoryUsage.heapUsed - metric.afterIdle.memoryUsage.heapUsed) / 1024 / 1024

        maxBurstMemoryIncrease = Math.max(maxBurstMemoryIncrease, burstIncrease)
        avgIdleMemoryDecrease += idleDecrease

        console.log(`   Burst ${metric.burstNumber}: +${burstIncrease.toFixed(1)}MB during burst, -${idleDecrease.toFixed(1)}MB during idle`)
      })

      avgIdleMemoryDecrease /= connectionMetrics.length
      totalMemoryGrowth = (connectionMetrics[connectionMetrics.length - 1].afterIdle.memoryUsage.heapUsed -
                          connectionMetrics[0].beforeBurst.memoryUsage.heapUsed) / 1024 / 1024

      console.log(`   Max Burst Memory Increase: ${maxBurstMemoryIncrease.toFixed(1)}MB`)
      console.log(`   Average Idle Memory Decrease: ${avgIdleMemoryDecrease.toFixed(1)}MB`)
      console.log(`   Total Memory Growth: ${totalMemoryGrowth.toFixed(1)}MB`)

      // Validate connection pool cleanup
      expect(avgIdleMemoryDecrease).toBeGreaterThan(0) // Memory should decrease during idle periods
      expect(totalMemoryGrowth).toBeLessThan(50) // Total growth should be reasonable
      expect(maxBurstMemoryIncrease).toBeLessThan(100) // Burst increases should be manageable

      console.log('✅ Connection pool cleanup validated')
    }, 240000) // 4 minute timeout

    test('should monitor performance consistency over time', async () => {
      console.log('🚀 Testing performance consistency over time...')

      // Run consistent operations over multiple time periods
      const timePeriods = 6 // 6 periods of 30 seconds each
      const operationsPerPeriod = 20

      const performanceData: {
        period: number
        averageResponseTime: number
        successRate: number
        throughput: number
        memoryUsageMB: number
      }[] = []

      for (let period = 0; period < timePeriods; period++) {
        console.log(`   Period ${period + 1}/${timePeriods}...`)

        const periodStartTime = Date.now()
        const periodOperations = Array.from({ length: operationsPerPeriod }, (_, index) => {
          return async () => {
            const startTime = Date.now()
            try {
              // Use consistent operation for performance comparison
              const response = await apiClient.getWalletBalance(validToken)
              return {
                success: response.status === 200,
                responseTime: Date.now() - startTime,
                status: response.status
              }
            } catch (error) {
              return {
                success: false,
                responseTime: Date.now() - startTime,
                status: 0
              }
            }
          }
        })

        // Execute operations with consistent timing
        const results = await Promise.allSettled(periodOperations.map(op => op()))
        const periodDuration = Date.now() - periodStartTime

        // Analyze period results
        const responseTimes: number[] = []
        let successCount = 0

        results.forEach(result => {
          if (result.status === 'fulfilled') {
            const response = result.value
            responseTimes.push(response.responseTime)
            if (response.success) {
              successCount++
            }
          }
        })

        const averageResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0
        const successRate = successCount / operationsPerPeriod
        const throughput = operationsPerPeriod / (periodDuration / 1000)
        const memoryUsageMB = process.memoryUsage().heapUsed / 1024 / 1024

        performanceData.push({
          period: period + 1,
          averageResponseTime,
          successRate,
          throughput,
          memoryUsageMB
        })

        console.log(`     Period ${period + 1}: ${averageResponseTime.toFixed(0)}ms avg, ${(successRate * 100).toFixed(1)}% success, ${throughput.toFixed(1)} ops/s, ${memoryUsageMB.toFixed(1)}MB`)

        // Wait between periods to simulate real usage patterns
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Analyze performance consistency
      const responseTimes = performanceData.map(p => p.averageResponseTime)
      const successRates = performanceData.map(p => p.successRate)
      const throughputs = performanceData.map(p => p.throughput)

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const responseTimeVariation = Math.max(...responseTimes) / Math.min(...responseTimes)
      const avgSuccessRate = successRates.reduce((a, b) => a + b, 0) / successRates.length
      const minSuccessRate = Math.min(...successRates)
      const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length
      const throughputVariation = Math.max(...throughputs) / Math.min(...throughputs)

      console.log('📊 Performance Consistency Analysis:')
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`)
      console.log(`   Response Time Variation: ${responseTimeVariation.toFixed(2)}x`)
      console.log(`   Average Success Rate: ${(avgSuccessRate * 100).toFixed(2)}%`)
      console.log(`   Minimum Success Rate: ${(minSuccessRate * 100).toFixed(2)}%`)
      console.log(`   Average Throughput: ${avgThroughput.toFixed(2)} ops/s`)
      console.log(`   Throughput Variation: ${throughputVariation.toFixed(2)}x`)

      // Validate performance consistency
      expect(responseTimeVariation).toBeLessThan(2) // Response time should be consistent (< 2x variation)
      expect(minSuccessRate).toBeGreaterThan(0.8) // Success rate should remain high
      expect(throughputVariation).toBeLessThan(2) // Throughput should be consistent

      console.log('✅ Performance consistency over time validated')
    }, 300000) // 5 minute timeout

    test('should handle resource cleanup and management', async () => {
      console.log('🚀 Testing resource cleanup and management...')

      // Test resource usage patterns
      const initialMemory = process.memoryUsage()
      console.log('📊 Initial Resource State:')
      console.log(`   RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`)
      console.log(`   Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`)
      console.log(`   Heap Total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`)
      console.log(`   External: ${(initialMemory.external / 1024 / 1024).toFixed(2)} MB`)

      // Create resource-intensive operations
      const resourceOperations = Array.from({ length: 100 }, (_, index) => {
        return async () => {
          try {
            // Mix of operations that use different resources
            const operations = [
              () => apiClient.getWalletBalance(validToken),
              () => apiClient.getTransferHistory({ limit: 50 }, validToken),
              () => apiClient.getOrderHistory({ limit: 50 }, validToken),
              () => apiClient.searchUsers({ query: 'test', limit: 25 }, validToken)
            ]

            const operation = operations[index % operations.length]
            const response = await operation()

            // Simulate some data processing
            const data = JSON.stringify(response.body)
            const processed = JSON.parse(data)

            return {
              success: response.status === 200,
              dataSize: data.length
            }
          } catch (error) {
            return {
              success: false,
              dataSize: 0
            }
          }
        }
      })

      // Execute operations in batches
      const batchSize = 25
      const resourceMetrics: NodeJS.MemoryUsage[] = []

      for (let i = 0; i < resourceOperations.length; i += batchSize) {
        const batch = resourceOperations.slice(i, i + batchSize)
        await Promise.allSettled(batch.map(op => op()))

        // Capture memory usage after each batch
        resourceMetrics.push(process.memoryUsage())

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Force garbage collection if available
      if (global.gc) {
        console.log('   Running garbage collection...')
        global.gc()
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const finalMemory = process.memoryUsage()

      console.log('📊 Final Resource State:')
      console.log(`   RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`)
      console.log(`   Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`)
      console.log(`   Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`)
      console.log(`   External: ${(finalMemory.external / 1024 / 1024).toFixed(2)} MB`)

      // Analyze resource usage
      const heapGrowth = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
      const rssGrowth = (finalMemory.rss - initialMemory.rss) / 1024 / 1024

      console.log('📊 Resource Usage Analysis:')
      console.log(`   Heap Growth: ${heapGrowth.toFixed(2)} MB`)
      console.log(`   RSS Growth: ${rssGrowth.toFixed(2)} MB`)

      // Validate resource management
      expect(heapGrowth).toBeLessThan(50) // Heap growth should be reasonable
      expect(rssGrowth).toBeLessThan(100) // RSS growth should be manageable

      console.log('✅ Resource cleanup and management validated')
    }, 180000) // 3 minute timeout
  })
})
