// EmaPay API Middleware
// Combined rate limiting, caching, and response enhancement

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limiter'
import { CacheManager, caches } from '@/lib/cache-manager'
import { createErrorResponse } from '@/lib/api-response'
import { MarketDataResponse } from '@/types/market-data'

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig
  /** Cache configuration */
  cache?: {
    /** Cache instance to use */
    instance: any
    /** Cache key generator */
    keyGenerator: (request: NextRequest) => string
    /** TTL override */
    ttl?: number
  }
  /** Whether to add CORS headers */
  cors?: boolean
  /** Custom headers to add */
  headers?: Record<string, string>
}

/**
 * Enhanced API response with middleware metadata
 */
export interface EnhancedApiResponse<T> extends MarketDataResponse<T> {
  /** Rate limiting information */
  rateLimit?: {
    remaining: number
    limit: number
    resetTime: string
  }
  /** Cache information */
  cache?: {
    cached: boolean
    expiresAt: string
  }
}

/**
 * Apply rate limiting to request
 */
function applyRateLimit(request: NextRequest, config: RateLimitConfig): NextResponse | null {
  const { allowed, info } = checkRateLimit(request, config)
  
  if (!allowed) {
    const response = createErrorResponse(
      'Rate limit exceeded',
      429,
      'RATE_LIMIT_EXCEEDED',
      {
        rateLimit: {
          remaining: info.remaining,
          limit: info.limit,
          resetTime: info.resetTime
        }
      }
    )
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', info.limit.toString())
    response.headers.set('X-RateLimit-Remaining', info.remaining.toString())
    response.headers.set('X-RateLimit-Reset', info.resetTime)
    response.headers.set('Retry-After', Math.ceil((new Date(info.resetTime).getTime() - Date.now()) / 1000).toString())
    
    return response
  }
  
  return null // Continue processing
}

/**
 * Apply CORS headers
 */
function applyCorsHeaders(response: NextResponse): void {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Max-Age', '86400')
}

/**
 * Apply custom headers
 */
function applyCustomHeaders(response: NextResponse, headers: Record<string, string>): void {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
}

/**
 * Create API middleware wrapper
 */
export function withApiMiddleware(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  config: MiddlewareConfig = {}
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Handle OPTIONS requests for CORS
      if (request.method === 'OPTIONS' && config.cors) {
        const response = new NextResponse(null, { status: 200 })
        applyCorsHeaders(response)
        return response
      }

      // Apply rate limiting
      if (config.rateLimit) {
        const rateLimitResponse = applyRateLimit(request, config.rateLimit)
        if (rateLimitResponse) {
          if (config.cors) applyCorsHeaders(rateLimitResponse)
          return rateLimitResponse
        }
      }

      // Try to get from cache if configured
      let cacheResult: { data: any; cached: boolean } | null = null
      let cacheKey: string | null = null
      
      if (config.cache && request.method === 'GET') {
        cacheKey = config.cache.keyGenerator(request)
        const cached = config.cache.instance.get(cacheKey)
        
        if (cached !== null) {
          cacheResult = { data: cached, cached: true }
        }
      }

      let response: NextResponse

      if (cacheResult?.cached) {
        // Return cached response
        const cachedResponse: EnhancedApiResponse<any> = {
          success: true,
          data: cacheResult.data,
          timestamp: new Date().toISOString(),
          cache: {
            cached: true,
            expiresAt: new Date(Date.now() + (config.cache?.ttl || 60000)).toISOString()
          }
        }

        response = NextResponse.json(cachedResponse)
      } else {
        // Execute handler
        response = await handler(request, ...args)
        
        // Cache the response if configured and successful
        if (config.cache && request.method === 'GET' && cacheKey && response.status === 200) {
          try {
            const responseData = await response.clone().json()
            if (responseData.success && responseData.data) {
              config.cache.instance.set(cacheKey, responseData.data, config.cache.ttl)
            }
          } catch (error) {
            console.warn('Failed to cache response:', error)
          }
        }
      }

      // Add rate limit headers if configured
      if (config.rateLimit) {
        const { info } = checkRateLimit(request, config.rateLimit)
        response.headers.set('X-RateLimit-Limit', info.limit.toString())
        response.headers.set('X-RateLimit-Remaining', info.remaining.toString())
        response.headers.set('X-RateLimit-Reset', info.resetTime)
      }

      // Add CORS headers if configured
      if (config.cors) {
        applyCorsHeaders(response)
      }

      // Add custom headers if configured
      if (config.headers) {
        applyCustomHeaders(response, config.headers)
      }

      // Add performance headers
      response.headers.set('X-Response-Time', Date.now().toString())
      response.headers.set('X-Powered-By', 'EmaPay API')

      return response

    } catch (error) {
      console.error('API middleware error:', error)
      
      const errorResponse = createErrorResponse(
        'Internal server error',
        500,
        'INTERNAL_ERROR'
      )
      
      if (config.cors) applyCorsHeaders(errorResponse)
      return errorResponse
    }
  }
}

/**
 * Predefined middleware configurations
 */
export const MIDDLEWARE_CONFIGS = {
  // Market data endpoints - high rate limits, short cache
  MARKET_DATA: {
    rateLimit: {
      maxRequests: 100,
      windowMs: 60 * 1000,
      identifier: 'market-data'
    },
    cors: true,
    headers: {
      'Cache-Control': 'public, max-age=5',
      'X-Content-Type-Options': 'nosniff'
    }
  } as MiddlewareConfig,

  // Order endpoints - strict rate limits, no cache
  ORDERS: {
    rateLimit: {
      maxRequests: 20,
      windowMs: 60 * 1000,
      identifier: 'orders'
    },
    cors: true,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    }
  } as MiddlewareConfig,

  // Public endpoints - moderate limits, longer cache
  PUBLIC: {
    rateLimit: {
      maxRequests: 60,
      windowMs: 60 * 1000,
      identifier: 'public'
    },
    cors: true,
    headers: {
      'Cache-Control': 'public, max-age=30',
      'X-Content-Type-Options': 'nosniff'
    }
  } as MiddlewareConfig
}

/**
 * Create market data middleware with caching
 */
export function createMarketDataMiddleware(cacheInstance: any, keyPrefix: string) {
  return withApiMiddleware.bind(null, undefined as any, {
    ...MIDDLEWARE_CONFIGS.MARKET_DATA,
    cache: {
      instance: cacheInstance,
      keyGenerator: (request: NextRequest) => {
        const url = new URL(request.url)
        const pathParts = url.pathname.split('/').filter(Boolean)
        const params = Array.from(url.searchParams.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
        
        return `${keyPrefix}:${pathParts.join(':')}${params ? `:${params}` : ''}`
      },
      ttl: 5000 // 5 seconds
    }
  })
}

/**
 * Middleware statistics
 */
export function getMiddlewareStats() {
  return {
    caches: CacheManager.getAllStats(),
    timestamp: new Date().toISOString()
  }
}
