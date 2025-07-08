'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { transformTransactionsForDisplay, type TransactionData } from '@/utils/transaction-formatting'

interface TransactionFilters {
  type?: string
  status?: string
  currency?: string
  limit?: number
  offset?: number
}

interface TransactionResponse {
  success: boolean
  data: TransactionData[]
  pagination: {
    page: number
    limit: number
    offset: number
    total: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
  filters: TransactionFilters
  timestamp: string
}

interface UseTransactionsReturn {
  transactions: ReturnType<typeof transformTransactionsForDisplay>
  loading: boolean
  error: string | null
  pagination: TransactionResponse['pagination'] | null
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>
  refreshTransactions: () => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
}

// Simple in-memory cache for transaction data
const transactionCache = new Map<string, { data: TransactionResponse; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

/**
 * Optimized hook for fetching and managing transaction data
 * Includes caching, error handling, and pagination support
 */
export function useTransactions(initialFilters: TransactionFilters = {}): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<ReturnType<typeof transformTransactionsForDisplay>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<TransactionResponse['pagination'] | null>(null)
  const [currentFilters, setCurrentFilters] = useState<TransactionFilters>(initialFilters)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  // Generate cache key from filters
  const getCacheKey = useCallback((filters: TransactionFilters) => {
    return JSON.stringify(filters)
  }, [])

  // Check if cached data is still valid
  const getCachedData = useCallback((filters: TransactionFilters) => {
    const cacheKey = getCacheKey(filters)
    const cached = transactionCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    return null
  }, [getCacheKey])

  // Store data in cache
  const setCachedData = useCallback((filters: TransactionFilters, data: TransactionResponse) => {
    const cacheKey = getCacheKey(filters)
    transactionCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
  }, [getCacheKey])

  const fetchTransactions = useCallback(async (filters: TransactionFilters = {}) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      setLoading(true)
      setError(null)

      const mergedFilters = { ...currentFilters, ...filters }
      setCurrentFilters(mergedFilters)

      // Check cache first
      const cachedData = getCachedData(mergedFilters)
      if (cachedData) {
        const transformedTransactions = transformTransactionsForDisplay(cachedData.data)
        setTransactions(transformedTransactions)
        setPagination(cachedData.pagination)
        setLoading(false)
        return
      }

      // Build query parameters
      const params = new URLSearchParams()
      if (mergedFilters.limit) params.append('limit', mergedFilters.limit.toString())
      if (mergedFilters.offset) params.append('offset', mergedFilters.offset.toString())
      if (mergedFilters.type) params.append('type', mergedFilters.type)
      if (mergedFilters.status) params.append('status', mergedFilters.status)
      if (mergedFilters.currency) params.append('currency', mergedFilters.currency)

      const response = await fetch(`/api/transactions?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'max-age=30'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`)
      }

      const result: TransactionResponse = await response.json()

      if (result.success) {
        // Cache the response
        setCachedData(mergedFilters, result)

        // Transform and set data
        const transformedTransactions = transformTransactionsForDisplay(result.data)
        setTransactions(transformedTransactions)
        setPagination(result.pagination)
      } else {
        throw new Error('Failed to fetch transactions')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't update state
        return
      }
      
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setTransactions([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [currentFilters, getCachedData, setCachedData])

  const refreshTransactions = useCallback(async () => {
    // Clear cache for current filters
    const cacheKey = getCacheKey(currentFilters)
    transactionCache.delete(cacheKey)
    
    await fetchTransactions(currentFilters)
  }, [currentFilters, fetchTransactions, getCacheKey])

  const loadMore = useCallback(async () => {
    if (!pagination?.has_next || loading) return

    const nextOffset = pagination.offset + pagination.limit
    await fetchTransactions({ ...currentFilters, offset: nextOffset })
  }, [pagination, loading, currentFilters, fetchTransactions])

  // Initial fetch
  useEffect(() => {
    fetchTransactions(initialFilters)
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, []) // Only run on mount

  const hasMore = pagination?.has_next || false

  return {
    transactions,
    loading,
    error,
    pagination,
    fetchTransactions,
    refreshTransactions,
    hasMore,
    loadMore
  }
}
