import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'
import type { User, WalletBalance, Transaction, TransferRequest, MarketOrderRequest, LimitOrderRequest, OrderResponse, LiquidityCheckResponse } from '@/types'

// Helper function to get authentication token
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
}

// Query Keys
export const queryKeys = {
  user: ['user'] as const,
  wallets: ['wallets'] as const,
  wallet: (currency: string) => ['wallet', currency] as const,
  transactions: ['transactions'] as const,
  transaction: (id: string) => ['transaction', id] as const,
  orders: ['orders'] as const,
  users: {
    search: (query: string) => ['users', 'search', query] as const,
  },
} as const

// User Queries
export function useUser() {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      const response = await apiClient.get<User>('/auth/me')
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user')
      }
      return response.data!
    },
  })
}

export function useUserSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.search(query),
    queryFn: async () => {
      const response = await apiClient.get<User[]>(`/users/search?query=${encodeURIComponent(query)}`)
      if (!response.success) {
        throw new Error(response.error || 'Failed to search users')
      }
      return response.data!
    },
    enabled: enabled && query.length > 0,
  })
}

// Wallet Queries
export function useWallets(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.wallets,
    queryFn: async () => {
      const token = await getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      // Set auth token for this request
      apiClient.setAuthToken(token)

      const response = await apiClient.get<{ balances: Record<string, unknown> }>('/wallets/balance')
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch wallets')
      }

      // Transform API response to array format expected by dashboard
      const balances = response.data!.balances
      return Object.values(balances).map((balance: unknown) => {
        const b = balance as Record<string, unknown>
        return {
          currency: b.currency as string,
          available: Number(b.availableBalance),
          pending: Number(b.reservedBalance),
          total: Number(b.totalBalance),
          lastUpdated: new Date().toISOString()
        }
      }) as WalletBalance[]
    },
    enabled, // Only run when enabled
  })
}

export function useWallet(currency: 'EUR' | 'AOA') {
  return useQuery({
    queryKey: queryKeys.wallet(currency),
    queryFn: async () => {
      const response = await apiClient.get<WalletBalance>(`/wallets/${currency}`)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch wallet')
      }
      return response.data!
    },
  })
}

// Transaction Queries
export function useTransactions(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: async () => {
      const token = await getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      // Set auth token for this request
      apiClient.setAuthToken(token)

      const response = await apiClient.get<{ transfers: unknown[] }>('/transfers/history')
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transactions')
      }

      // Transform API response to format expected by dashboard
      return response.data!.transfers.map((transfer: unknown) => {
        const t = transfer as Record<string, unknown>
        return {
          id: t.id as string,
          displayId: t.displayId as string,
          type: t.type as string,
          amount: t.amount as number,
          currency: t.currency as string,
          status: t.status as string,
          description: t.description as string,
          createdAt: t.createdAt as string,
          updatedAt: t.updatedAt as string,
          recipientId: t.recipientId as string,
          senderId: t.senderId as string,
          metadata: (t.metadata as Record<string, unknown>) || {}
        }
      }) as Transaction[]
    },
    enabled, // Only run when enabled
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: async () => {
      const response = await apiClient.get<Transaction>(`/transfers/${id}`)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transaction')
      }
      return response.data!
    },
    enabled: !!id,
  })
}

// Mutations
export function useSendMoney() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: TransferRequest) => {
      const response = await apiClient.post<Transaction>('/transfers/send', data)
      if (!response.success) {
        throw new Error(response.error || 'Failed to send money')
      }
      return response.data!
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}

export function useVerifyPin() {
  return useMutation({
    mutationFn: async (pin: string) => {
      const response = await apiClient.post<{ valid: boolean }>('/security/pin/verify', { pin })
      if (!response.success) {
        throw new Error(response.error || 'Failed to verify PIN')
      }
      return response.data!
    },
  })
}

export function useSetPin() {
  return useMutation({
    mutationFn: async (pin: string) => {
      const response = await apiClient.post<{ success: boolean }>('/security/pin', { pin })
      if (!response.success) {
        throw new Error(response.error || 'Failed to set PIN')
      }
      return response.data!
    },
  })
}

// Exchange Rate Queries
export function useMidpointExchangeRate(
  baseCurrency: 'EUR' | 'AOA' = 'EUR',
  quoteCurrency: 'EUR' | 'AOA' = 'AOA',
  enabled = true
) {
  return useQuery({
    queryKey: ['exchange-rates', 'midpoint', baseCurrency, quoteCurrency],
    queryFn: async () => {
      const params = new URLSearchParams({
        baseCurrency,
        quoteCurrency
      });
      const response = await apiClient.get(`/exchange-rates/midpoint?${params}`)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch midpoint exchange rate')
      }
      return response.data
    },
    enabled: enabled && baseCurrency !== quoteCurrency,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  })
}

// Legacy hook for backward compatibility - will be removed
export function useMarketSummary() {
  return useMidpointExchangeRate('EUR', 'AOA');
}

// Note: useMarketDepth removed - endpoint removed for simplicity



// Order Mutations
export function usePlaceMarketOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderData: MarketOrderRequest) => {
      const token = await getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      // Set auth token for this request
      apiClient.setAuthToken(token)

      const response = await apiClient.post<OrderResponse>('/orders/market', orderData)
      if (!response.success) {
        throw new Error(response.error || 'Failed to place market order')
      }
      return response.data!
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders })
    },
  })
}

export function usePlaceLimitOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderData: LimitOrderRequest) => {
      const token = await getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      // Set auth token for this request
      apiClient.setAuthToken(token)

      const response = await apiClient.post<OrderResponse>('/orders/limit', orderData)
      if (!response.success) {
        throw new Error(response.error || 'Failed to place limit order')
      }
      return response.data!
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders })
    },
  })
}

// Liquidity Check Query
export function useLiquidityCheck(
  side: 'buy' | 'sell',
  baseCurrency: 'EUR' | 'AOA',
  quoteCurrency: 'EUR' | 'AOA',
  quantity: number,
  maxSlippage = 5.0,
  enabled = true
) {
  return useQuery({
    queryKey: ['market', 'liquidity', side, baseCurrency, quoteCurrency, quantity, maxSlippage],
    queryFn: async () => {
      const params = new URLSearchParams({
        side,
        baseCurrency,
        quoteCurrency,
        quantity: quantity.toString(),
        maxSlippage: maxSlippage.toString()
      });

      const response = await apiClient.get<LiquidityCheckResponse>(`/market/liquidity?${params}`)
      if (!response.success) {
        throw new Error(response.error || 'Failed to check liquidity')
      }
      return response.data!
    },
    enabled: enabled && quantity > 0 && baseCurrency !== quoteCurrency,
    staleTime: 10000, // Consider data stale after 10 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
  })
}

// Liquidity Reservation Mutation
export function useReserveLiquidity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      side: 'buy' | 'sell'
      baseCurrency: 'EUR' | 'AOA'
      quoteCurrency: 'EUR' | 'AOA'
      quantity: number
      maxSlippage?: number
      reservationDuration?: number
    }) => {
      const token = await getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      apiClient.setAuthToken(token)

      const searchParams = new URLSearchParams({
        side: params.side,
        baseCurrency: params.baseCurrency,
        quoteCurrency: params.quoteCurrency,
        quantity: params.quantity.toString(),
        maxSlippage: (params.maxSlippage || 5.0).toString(),
        reservationDuration: (params.reservationDuration || 30).toString()
      });

      const response = await apiClient.post<LiquidityCheckResponse>(`/market/reserve?${searchParams}`)
      if (!response.success) {
        throw new Error(response.error || 'Failed to reserve liquidity')
      }
      return response.data!
    },
    onSuccess: () => {
      // Invalidate liquidity checks to refresh data
      queryClient.invalidateQueries({ queryKey: ['market', 'liquidity'] })
    },
  })
}
