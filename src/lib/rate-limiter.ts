// EmaPay Rate Limiting System
// Token bucket rate limiting with Redis-like in-memory storage

import { NextRequest } from 'next/server'
import { RateLimitInfo } from '@/types/market-data'

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Identifier for the rate limit (e.g., 'market-data', 'orders') */
  identifier: string
}

/**
 * Rate limit bucket for tracking requests
 */
interface RateLimitBucket {
  /** Number of tokens remaining */
  tokens: number
  /** Last refill timestamp */
  lastRefill: number
  /** Window start time */
  windowStart: number
}

/**
 * In-memory rate limit storage
 */
class RateLimitStore {
  private buckets = new Map<string, RateLimitBucket>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired buckets every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Get or create a rate limit bucket
   */
  getBucket(key: string, config: RateLimitConfig): RateLimitBucket {
    const now = Date.now()
    let bucket = this.buckets.get(key)

    if (!bucket) {
      bucket = {
        tokens: config.maxRequests,
        lastRefill: now,
        windowStart: now
      }
      this.buckets.set(key, bucket)
      return bucket
    }

    // Check if we need to start a new window
    if (now - bucket.windowStart >= config.windowMs) {
      bucket.tokens = config.maxRequests
      bucket.windowStart = now
      bucket.lastRefill = now
    }

    return bucket
  }

  /**
   * Update bucket after consuming tokens
   */
  updateBucket(key: string, bucket: RateLimitBucket): void {
    this.buckets.set(key, bucket)
  }

  /**
   * Clean up expired buckets
   */
  private cleanup(): void {
    const now = Date.now()
    const expireTime = 60 * 60 * 1000 // 1 hour

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > expireTime) {
        this.buckets.delete(key)
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalBuckets: this.buckets.size,
      activeBuckets: Array.from(this.buckets.entries()).filter(
        ([_, bucket]) => Date.now() - bucket.lastRefill < 60000
      ).length
    }
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore()

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Market data endpoints - higher limits for public data
  MARKET_DATA: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'market-data'
  } as RateLimitConfig,

  // WebSocket connections - moderate limits
  WEBSOCKET: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'websocket'
  } as RateLimitConfig,

  // Order operations - stricter limits
  ORDERS: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'orders'
  } as RateLimitConfig,

  // Authentication - very strict limits
  AUTH: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'auth'
  } as RateLimitConfig,

  // General API - moderate limits
  GENERAL: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'general'
  } as RateLimitConfig
}

/**
 * Extract client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from auth headers (if authenticated)
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // Extract user ID from JWT or session (simplified)
    const userId = extractUserIdFromAuth(authHeader)
    if (userId) return `user:${userId}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  return `ip:${ip}`
}

/**
 * Extract user ID from authorization header (simplified)
 */
function extractUserIdFromAuth(authHeader: string): string | null {
  try {
    // This is a simplified implementation
    // In a real app, you'd decode the JWT token
    if (authHeader.startsWith('Bearer ')) {
      // For now, just return a hash of the token
      const token = authHeader.substring(7)
      return `token_${token.substring(0, 8)}`
    }
    return null
  } catch {
    return null
  }
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: NextRequest, 
  config: RateLimitConfig
): { allowed: boolean; info: RateLimitInfo } {
  const clientId = getClientIdentifier(request)
  const key = `${config.identifier}:${clientId}`
  
  const bucket = rateLimitStore.getBucket(key, config)
  const now = Date.now()

  // Check if request is allowed
  const allowed = bucket.tokens > 0

  if (allowed) {
    bucket.tokens--
    bucket.lastRefill = now
    rateLimitStore.updateBucket(key, bucket)
  }

  // Calculate reset time
  const resetTime = new Date(bucket.windowStart + config.windowMs).toISOString()

  const info: RateLimitInfo = {
    remaining: Math.max(0, bucket.tokens),
    limit: config.maxRequests,
    resetTime,
    windowStart: new Date(bucket.windowStart).toISOString()
  }

  return { allowed, info }
}

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (request: NextRequest) => {
    return checkRateLimit(request, config)
  }
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats() {
  return rateLimitStore.getStats()
}

/**
 * Shutdown rate limiter
 */
export function shutdownRateLimiter() {
  rateLimitStore.shutdown()
}

// Default rate limiters for common use cases
export const marketDataRateLimit = createRateLimitMiddleware(RATE_LIMITS.MARKET_DATA)
export const orderRateLimit = createRateLimitMiddleware(RATE_LIMITS.ORDERS)
export const authRateLimit = createRateLimitMiddleware(RATE_LIMITS.AUTH)
export const generalRateLimit = createRateLimitMiddleware(RATE_LIMITS.GENERAL)
export const websocketRateLimit = createRateLimitMiddleware(RATE_LIMITS.WEBSOCKET)

// Export store for testing
export { rateLimitStore }
