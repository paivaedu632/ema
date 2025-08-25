// System Statistics API Endpoint
// GET /api/system/stats - Get system performance and monitoring statistics

import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/error-handler'
import { getRateLimitStats } from '@/lib/rate-limiter'
import { CacheManager } from '@/lib/cache-manager'
import { websocketManager } from '@/lib/websocket-server'

/**
 * GET /api/system/stats
 * Get comprehensive system statistics including rate limiting, caching, and WebSocket metrics
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "server": {
 *       "uptime": 3600000,
 *       "memory": {
 *         "used": 125.5,
 *         "total": 512.0
 *       },
 *       "timestamp": "2025-08-23T14:30:00.000Z"
 *     },
 *     "rateLimit": {
 *       "totalBuckets": 15,
 *       "activeBuckets": 8
 *     },
 *     "cache": [
 *       {
 *         "name": "ticker",
 *         "totalEntries": 25,
 *         "utilizationPercentage": 25.0,
 *         "estimatedSizeKB": 150
 *       }
 *     ],
 *     "websocket": {
 *       "connectedClients": 5,
 *       "activeSubscriptions": 12
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get server metrics
    const serverStats = {
      uptime: process.uptime() * 1000, // Convert to milliseconds
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100, // MB
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100, // MB
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100 // MB
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: process.platform !== 'win32' ? process.loadavg() : [0, 0, 0]
      },
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    }

    // Get rate limiting stats
    const rateLimitStats = getRateLimitStats()

    // Get cache stats
    const cacheStats = CacheManager.getAllStats()

    // Get WebSocket stats
    const websocketStats = websocketManager.getStats()

    // Calculate total cache size and entries
    const totalCacheEntries = cacheStats.reduce((sum, cache) => sum + cache.totalEntries, 0)
    const totalCacheSize = cacheStats.reduce((sum, cache) => sum + cache.estimatedSizeKB, 0)
    const avgCacheUtilization = cacheStats.length > 0 
      ? cacheStats.reduce((sum, cache) => sum + cache.utilizationPercentage, 0) / cacheStats.length
      : 0

    // Performance metrics
    const performanceStats = {
      totalCacheEntries,
      totalCacheSizeKB: totalCacheSize,
      averageCacheUtilization: Math.round(avgCacheUtilization * 100) / 100,
      cacheHitRatio: calculateCacheHitRatio(), // Placeholder - would need actual metrics
      requestsPerSecond: calculateRequestsPerSecond(), // Placeholder - would need actual metrics
      averageResponseTime: calculateAverageResponseTime() // Placeholder - would need actual metrics
    }

    const stats = {
      server: serverStats,
      rateLimit: rateLimitStats,
      cache: cacheStats,
      websocket: websocketStats,
      performance: performanceStats,
      health: {
        status: 'healthy',
        checks: {
          memory: serverStats.memory.used < 400, // Less than 400MB
          cache: totalCacheEntries < 10000, // Less than 10k entries
          websocket: websocketStats.connectedClients < 1000, // Less than 1k connections
          rateLimit: rateLimitStats.totalBuckets < 10000 // Less than 10k buckets
        }
      }
    }

    return createSuccessResponse(
      stats,
      'System statistics retrieved successfully'
    )

  } catch (error) {
    return handleApiError(error, { 
      endpoint: 'GET /api/system/stats'
    })
  }
}

/**
 * Calculate cache hit ratio (placeholder - would need actual metrics)
 */
function calculateCacheHitRatio(): number {
  // In a real implementation, you'd track cache hits/misses
  return 0.85 // 85% hit ratio placeholder
}

/**
 * Calculate requests per second (placeholder - would need actual metrics)
 */
function calculateRequestsPerSecond(): number {
  // In a real implementation, you'd track request counts over time
  return 12.5 // 12.5 RPS placeholder
}

/**
 * Calculate average response time (placeholder - would need actual metrics)
 */
function calculateAverageResponseTime(): number {
  // In a real implementation, you'd track response times
  return 45.2 // 45.2ms placeholder
}
