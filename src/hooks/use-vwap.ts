import { useState, useEffect, useCallback } from 'react'

interface VWAPData {
  vwap: number | null
  total_volume: number
  trade_count: number
  calculation_period: string
  market_activity: {
    active: boolean
    sufficient_volume: boolean
    data_quality: 'excellent' | 'good' | 'limited' | 'insufficient'
  }
  price_range: {
    min_price: number
    max_price: number
    price_spread: number
    spread_percentage: number
  } | null
  calculated_at: string
}

interface UseVWAPReturn {
  vwapData: VWAPData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useVWAP(pair: string, hours = 12, refreshInterval = 60000): UseVWAPReturn {
  const [vwapData, setVwapData] = useState<VWAPData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVWAP = useCallback(async () => {
    try {
      const response = await fetch(`/api/market/vwap/${pair}?hours=${hours}`)
      const data = await response.json()

      if (data.success) {
        setVwapData(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch VWAP data')
        // Set empty data on error but don't clear existing data immediately
        if (!vwapData) {
          setVwapData(null)
        }
      }
    } catch (err) {
      console.error('Error fetching VWAP:', err)
      setError('Network error while fetching VWAP data')
      if (!vwapData) {
        setVwapData(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [pair, hours, vwapData])

  const refetch = useCallback(() => {
    setIsLoading(true)
    fetchVWAP()
  }, [fetchVWAP])

  useEffect(() => {
    fetchVWAP()

    // Set up polling for VWAP updates (less frequent than order book)
    const interval = setInterval(fetchVWAP, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchVWAP, refreshInterval])

  return {
    vwapData,
    isLoading,
    error,
    refetch
  }
}
