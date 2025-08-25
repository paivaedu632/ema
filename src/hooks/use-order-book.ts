import { useState, useEffect, useCallback } from 'react'

interface OrderBookLevel {
  price: number
  quantity: number
  total: number
  order_count: number
}

interface OrderBookData {
  asks: OrderBookLevel[]
  bids: OrderBookLevel[]
  lastUpdate: string
}

interface UseOrderBookReturn {
  orderBook: OrderBookData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useOrderBook(pair: string, refreshInterval = 5000): UseOrderBookReturn {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrderBook = useCallback(async () => {
    try {
      const [baseCurrency, quoteCurrency] = pair.split('-')
      
      const response = await fetch(`/api/market/order-book?base_currency=${baseCurrency}&quote_currency=${quoteCurrency}`)
      const data = await response.json()

      if (data.success) {
        setOrderBook({
          asks: data.data.asks || [],
          bids: data.data.bids || [],
          lastUpdate: new Date().toISOString()
        })
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch order book')
      }
    } catch (err) {
      console.error('Error fetching order book:', err)
      setError('Network error while fetching order book')
    } finally {
      setIsLoading(false)
    }
  }, [pair])

  const refetch = useCallback(() => {
    setIsLoading(true)
    fetchOrderBook()
  }, [fetchOrderBook])

  useEffect(() => {
    fetchOrderBook()

    // Set up polling for real-time updates
    const interval = setInterval(fetchOrderBook, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchOrderBook, refreshInterval])

  return {
    orderBook,
    isLoading,
    error,
    refetch
  }
}
