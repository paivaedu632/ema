import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Type-safe table references
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Wallet = Database['public']['Tables']['wallets']['Row']
export type WalletInsert = Database['public']['Tables']['wallets']['Insert']
export type WalletUpdate = Database['public']['Tables']['wallets']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type KycRecord = Database['public']['Tables']['kyc_records']['Row']
export type KycRecordInsert = Database['public']['Tables']['kyc_records']['Insert']
export type KycRecordUpdate = Database['public']['Tables']['kyc_records']['Update']

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row']
export type ExchangeRateInsert = Database['public']['Tables']['exchange_rates']['Insert']
export type ExchangeRateUpdate = Database['public']['Tables']['exchange_rates']['Update']

export type UserLimits = Database['public']['Tables']['user_limits']['Row']
export type UserLimitsInsert = Database['public']['Tables']['user_limits']['Insert']
export type UserLimitsUpdate = Database['public']['Tables']['user_limits']['Update']

// KYC Status Types
export type KYCStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'requires_update'

export interface KYCStatusInfo {
  status: KYCStatus
  current_step: number
  total_steps: number
  completion_percentage: number
  last_updated?: string
  next_step_url?: string
  benefits?: string[]
}

export interface TransactionLimits {
  daily_limit: number
  monthly_limit: number
  transaction_limit: number
  daily_used: number
  monthly_used: number
  daily_remaining: number
  monthly_remaining: number
  currency: string
}

export interface LimitCheckResult {
  within_limits: boolean
  limit_type?: 'transaction' | 'daily' | 'monthly'
  current_limit?: number
  would_exceed_by?: number
  requires_kyc?: boolean
}

// Helper functions for common database operations
export const getUserById = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export const getUserByClerkId = async (clerkUserId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single()
  
  return { data, error }
}

export const getUserWallets = async (userId: string) => {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
  
  return { data, error }
}

export const getUserTransactions = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

// KYC and Limits Helper Functions
export const getUserKYCStatusClient = async (clerkUserId: string): Promise<{ data: KYCStatusInfo | null, error: any }> => {
  try {
    const response = await fetch('/api/kyc/status')
    if (!response.ok) {
      throw new Error('Failed to fetch KYC status')
    }
    const result = await response.json()
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const getUserLimitsClient = async (currency: string = 'EUR'): Promise<{ data: TransactionLimits | null, error: any }> => {
  try {
    const response = await fetch(`/api/user/limits?currency=${currency}`)
    if (!response.ok) {
      throw new Error('Failed to fetch user limits')
    }
    const result = await response.json()
    return { data: result.data.limits[currency], error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const checkTransactionLimitsClient = async (
  amount: number,
  currency: string = 'EUR',
  transactionType?: string
): Promise<{ data: LimitCheckResult | null, error: any }> => {
  try {
    const response = await fetch('/api/user/limits/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, transaction_type: transactionType })
    })

    const result = await response.json()

    if (!response.ok) {
      return { data: result.data, error: result.error }
    }

    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const getActiveExchangeRate = async (fromCurrency: string, toCurrency: string) => {
  const { data, error } = await supabase
    .rpc('get_active_exchange_rate', {
      from_curr: fromCurrency,
      to_curr: toCurrency
    })
  
  return { data, error }
}

export const getUserBalance = async (userId: string, currency: string) => {
  const { data, error } = await supabase
    .rpc('get_user_balance', {
      user_uuid: userId,
      currency_code: currency
    })
  
  return { data, error }
}

export const getUserAvailableBalance = async (userId: string, currency: string) => {
  const { data, error } = await supabase
    .rpc('get_user_available_balance', {
      user_uuid: userId,
      currency_code: currency
    })
  
  return { data, error }
}
