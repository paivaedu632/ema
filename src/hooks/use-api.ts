import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'
import type { User, WalletBalance, Transaction, TransferRequest } from '@/types'

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

      const response = await apiClient.get<{ balances: Record<string, any> }>('/wallets/balance')
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch wallets')
      }

      // Transform API response to array format expected by dashboard
      const balances = response.data!.balances
      return Object.values(balances).map((balance: any) => ({
        currency: balance.currency,
        available: Number(balance.availableBalance),
        pending: Number(balance.reservedBalance),
        total: Number(balance.totalBalance),
        lastUpdated: new Date().toISOString()
      })) as WalletBalance[]
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

      const response = await apiClient.get<{ transfers: any[] }>('/transfers/history')
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transactions')
      }

      // Transform API response to format expected by dashboard
      return response.data!.transfers.map((transfer: any) => ({
        id: transfer.id,
        displayId: transfer.displayId,
        type: transfer.type,
        amount: transfer.amount,
        currency: transfer.currency,
        status: transfer.status,
        description: transfer.description,
        createdAt: transfer.createdAt,
        updatedAt: transfer.updatedAt,
        recipientId: transfer.recipientId,
        senderId: transfer.senderId,
        metadata: transfer.metadata || {}
      })) as Transaction[]
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

// Market Data Queries
export function useMarketSummary() {
  return useQuery({
    queryKey: ['market', 'summary'],
    queryFn: async () => {
      const response = await apiClient.get('/market/summary')
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch market summary')
      }
      return response.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Note: useMarketDepth removed - endpoint removed for simplicity

// Current market rate hook for real-time pricing
export function useCurrentMarketRate(
  baseCurrency: 'EUR' | 'AOA',
  quoteCurrency: 'EUR' | 'AOA',
  enabled = true
) {
  return useQuery({
    queryKey: ['market', 'currentRate', baseCurrency, quoteCurrency],
    queryFn: async () => {
      const params = new URLSearchParams({
        baseCurrency,
        quoteCurrency
      });
      const response = await apiClient.get(`/market/current-rate?${params}`)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch current rate')
      }
      return response.data
    },
    enabled: enabled && baseCurrency !== quoteCurrency,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  })
}
