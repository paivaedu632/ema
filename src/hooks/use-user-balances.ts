import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'

interface Balance {
  available_balance: number
  reserved_balance: number
  total_balance: number
}

interface UserBalances {
  EUR: Balance
  AOA: Balance
}

interface UseUserBalancesReturn {
  balances: UserBalances | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useUserBalances(): UseUserBalancesReturn {
  const { user } = useUser()
  const [balances, setBalances] = useState<UserBalances | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBalances = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/wallet/balances')
      const data = await response.json()

      if (data.success) {
        // Transform array to object for easier access
        const balanceMap: Partial<UserBalances> = {}
        
        data.data.forEach((balance: any) => {
          balanceMap[balance.currency as keyof UserBalances] = {
            available_balance: balance.available_balance,
            reserved_balance: balance.reserved_balance,
            total_balance: balance.available_balance + balance.reserved_balance
          }
        })

        // Ensure both currencies exist with default values
        setBalances({
          EUR: balanceMap.EUR || { available_balance: 0, reserved_balance: 0, total_balance: 0 },
          AOA: balanceMap.AOA || { available_balance: 0, reserved_balance: 0, total_balance: 0 }
        })
        
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch balances')
      }
    } catch (err) {
      console.error('Error fetching balances:', err)
      setError('Network error while fetching balances')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const refetch = useCallback(() => {
    setIsLoading(true)
    fetchBalances()
  }, [fetchBalances])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  return {
    balances,
    isLoading,
    error,
    refetch
  }
}
