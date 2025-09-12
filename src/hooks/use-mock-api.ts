// Mock API hooks for UI development
// These hooks simulate the real API hooks with mock data and loading states

import { useState, useEffect } from 'react'
import { mockApi, mockUser, mockWalletBalances, mockTransactions, mockSearchUsers } from '@/lib/mock-data'

// ===== MOCK USER HOOKS =====

export function useUser() {
  const [data, setData] = useState(mockUser)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return {
    data,
    isLoading,
    error,
    refetch: async () => {
      setIsLoading(true)
      try {
        const result = await mockApi.getCurrentUser()
        setData(result.data)
        setError(null)
      } catch (err) {
        setError('Failed to fetch user')
      } finally {
        setIsLoading(false)
      }
    }
  }
}

// ===== MOCK WALLET HOOKS =====

export function useWallets() {
  const [data, setData] = useState(mockWalletBalances)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return {
    data,
    isLoading,
    error,
    refetch: async () => {
      setIsLoading(true)
      try {
        const result = await mockApi.getWalletBalances()
        setData(result.data)
        setError(null)
      } catch (err) {
        setError('Failed to fetch wallet balances')
      } finally {
        setIsLoading(false)
      }
    }
  }
}

// ===== MOCK TRANSACTION HOOKS =====

export function useTransactions(page = 1, limit = 20) {
  const [data, setData] = useState(mockTransactions)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return {
    data,
    isLoading,
    error,
    refetch: async () => {
      setIsLoading(true)
      try {
        const result = await mockApi.getTransactionHistory(page, limit)
        setData(result.data.transactions)
        setError(null)
      } catch (err) {
        setError('Failed to fetch transactions')
      } finally {
        setIsLoading(false)
      }
    }
  }
}

export function useSendMoney() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMoney = async (data: {
    recipientId: string
    amount: number
    currency: string
    description?: string
  }) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await mockApi.sendMoney(data)
      return result
    } catch (err) {
      setError('Failed to send money')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    sendMoney,
    isLoading,
    error
  }
}

// ===== MOCK USER SEARCH HOOKS =====

export function useUserSearch() {
  const [data, setData] = useState<typeof mockSearchUsers>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setData([])
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const result = await mockApi.searchUsers(query)
      setData(result.data)
    } catch (err) {
      setError('Failed to search users')
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  return {
    data,
    isLoading,
    error,
    searchUsers
  }
}

// ===== MOCK EXCHANGE RATE HOOKS =====

export function useExchangeRates() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const result = await mockApi.getExchangeRates()
        setData(result.data)
        setError(null)
      } catch (err) {
        setError('Failed to fetch exchange rates')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRates()
  }, [])

  return {
    data,
    isLoading,
    error
  }
}

// ===== MOCK TRADING HOOKS =====

export function useTradingOrders() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return {
    data,
    isLoading,
    error,
    refetch: async () => {
      setIsLoading(true)
      try {
        const result = await mockApi.getTradingOrders()
        setData(result.data)
        setError(null)
      } catch (err) {
        setError('Failed to fetch trading orders')
      } finally {
        setIsLoading(false)
      }
    }
  }
}

export function usePlaceLimitOrder() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const placeLimitOrder = async (data: {
    side: string
    baseCurrency: string
    quoteCurrency: string
    quantity: number
    price: number
  }) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await mockApi.placeLimitOrder(data)
      return result
    } catch (err) {
      setError('Failed to place limit order')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    placeLimitOrder,
    isLoading,
    error
  }
}

// ===== MOCK KYC HOOKS =====

export function useKYCStatus() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKYC = async () => {
      try {
        const result = await mockApi.getKYCStatus()
        setData(result.data)
        setError(null)
      } catch (err) {
        setError('Failed to fetch KYC status')
      } finally {
        setIsLoading(false)
      }
    }

    fetchKYC()
  }, [])

  return {
    data,
    isLoading,
    error
  }
}

// ===== UTILITY HOOKS =====

// Mock loading hook for testing loading states
export function useMockLoading(duration = 2000) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  return isLoading
}

// Mock error hook for testing error states
export function useMockError(shouldError = false, errorMessage = 'Something went wrong') {
  return shouldError ? errorMessage : null
}
