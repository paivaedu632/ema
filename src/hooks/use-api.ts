import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { User, WalletBalance, Transaction, TransferRequest } from '@/types'

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
export function useWallets() {
  return useQuery({
    queryKey: queryKeys.wallets,
    queryFn: async () => {
      const response = await apiClient.get<WalletBalance[]>('/wallets/balance')
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch wallets')
      }
      return response.data!
    },
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
export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: async () => {
      const response = await apiClient.get<Transaction[]>('/transfers/history')
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transactions')
      }
      return response.data!
    },
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

export function useMarketDepth() {
  return useQuery({
    queryKey: ['market', 'depth'],
    queryFn: async () => {
      const response = await apiClient.get('/market/depth')
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch market depth')
      }
      return response.data
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}
