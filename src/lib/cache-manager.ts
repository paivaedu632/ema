// EmaPay Cache Management System
// In-memory caching with TTL and LRU eviction

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  /** Cached data */
  data: T
  /** Timestamp when cached */
  timestamp: number
  /** Time to live in milliseconds */
  ttl: number
  /** Access count for LRU */
  accessCount: number
  /** Last access timestamp */
  lastAccess: number
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtl: number
  /** Maximum number of entries */
  maxEntries: number
  /** Cache identifier */
  name: string
}

/**
 * In-memory cache with TTL and LRU eviction
 */
class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private config: CacheConfig
  private cleanupInterval: NodeJS.Timeout

  constructor(config: CacheConfig) {
    this.config = config
    
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    // Update access metadata
    entry.accessCount++
    entry.lastAccess = Date.now()
    
    return entry.data
  }

  /**
   * Set value in cache
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const entryTtl = ttl || this.config.defaultTtl

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTtl,
      accessCount: 1,
      lastAccess: now
    }

    this.cache.set(key, entry)
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let expiredCount = 0
    let totalSize = 0

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredCount++
      }
      totalSize += this.estimateSize(entry.data)
    }

    return {
      name: this.config.name,
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      maxEntries: this.config.maxEntries,
      utilizationPercentage: (this.cache.size / this.config.maxEntries) * 100,
      estimatedSizeKB: Math.round(totalSize / 1024),
      defaultTtlMs: this.config.defaultTtl
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return

    // Find the least recently used entry
    let lruKey: string | null = null
    let lruTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key))

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cache ${this.config.name}: Cleaned up ${expiredKeys.length} expired entries`)
    }
  }

  /**
   * Estimate memory size of data (rough approximation)
   */
  private estimateSize(data: T): number {
    try {
      return JSON.stringify(data).length * 2 // Rough estimate (UTF-16)
    } catch {
      return 1024 // Default 1KB if can't serialize
    }
  }

  /**
   * Shutdown cache
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.cache.clear()
  }
}

/**
 * Cache configurations for different data types
 */
export const CACHE_CONFIGS = {
  // Market ticker data - short TTL, high volume
  TICKER: {
    defaultTtl: 5 * 1000, // 5 seconds
    maxEntries: 100,
    name: 'ticker'
  } as CacheConfig,

  // Order book data - very short TTL
  ORDER_BOOK: {
    defaultTtl: 2 * 1000, // 2 seconds
    maxEntries: 50,
    name: 'orderbook'
  } as CacheConfig,

  // Market statistics - medium TTL
  MARKET_STATS: {
    defaultTtl: 30 * 1000, // 30 seconds
    maxEntries: 200,
    name: 'market-stats'
  } as CacheConfig,

  // Price candles - longer TTL
  PRICE_CANDLES: {
    defaultTtl: 60 * 1000, // 1 minute
    maxEntries: 500,
    name: 'price-candles'
  } as CacheConfig,

  // Market analytics - longer TTL
  ANALYTICS: {
    defaultTtl: 2 * 60 * 1000, // 2 minutes
    maxEntries: 100,
    name: 'analytics'
  } as CacheConfig,

  // User data - long TTL
  USER_DATA: {
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    maxEntries: 1000,
    name: 'user-data'
  } as CacheConfig
}

/**
 * Global cache instances
 */
export const caches = {
  ticker: new MemoryCache(CACHE_CONFIGS.TICKER),
  orderbook: new MemoryCache(CACHE_CONFIGS.ORDER_BOOK),
  marketStats: new MemoryCache(CACHE_CONFIGS.MARKET_STATS),
  priceCandles: new MemoryCache(CACHE_CONFIGS.PRICE_CANDLES),
  analytics: new MemoryCache(CACHE_CONFIGS.ANALYTICS),
  userData: new MemoryCache(CACHE_CONFIGS.USER_DATA)
}

/**
 * Cache utility functions
 */
export class CacheManager {
  /**
   * Get from cache with fallback function
   */
  static async getOrSet<T>(
    cache: MemoryCache<T>,
    key: string,
    fallbackFn: () => Promise<T>,
    ttl?: number
  ): Promise<{ data: T; cached: boolean }> {
    // Try to get from cache first
    const cached = cache.get(key)
    if (cached !== null) {
      return { data: cached, cached: true }
    }

    // Execute fallback function
    const data = await fallbackFn()
    
    // Cache the result
    cache.set(key, data, ttl)
    
    return { data, cached: false }
  }

  /**
   * Generate cache key for market data
   */
  static generateMarketDataKey(
    type: string,
    pair: string,
    params?: Record<string, any>
  ): string {
    const paramString = params ? 
      Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|') 
      : ''
    
    return `${type}:${pair}${paramString ? `:${paramString}` : ''}`
  }

  /**
   * Get all cache statistics
   */
  static getAllStats() {
    return Object.entries(caches).map(([name, cache]) => ({
      name,
      ...cache.getStats()
    }))
  }

  /**
   * Clear all caches
   */
  static clearAll(): void {
    Object.values(caches).forEach(cache => cache.clear())
  }

  /**
   * Shutdown all caches
   */
  static shutdownAll(): void {
    Object.values(caches).forEach(cache => cache.shutdown())
  }
}

/**
 * Cache decorator for functions
 */
export function cached<T extends any[], R>(
  cache: MemoryCache<R>,
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: T): Promise<R> {
      const key = keyGenerator(...args)
      
      const result = await CacheManager.getOrSet(
        cache,
        key,
        () => method.apply(this, args),
        ttl
      )
      
      return result.data
    }
  }
}
