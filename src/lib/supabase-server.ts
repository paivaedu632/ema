import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import { Database } from '@/types/database.types'
import * as DatabaseFunctions from '@/lib/database-functions'

// Use remote Supabase for both development and production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Server-side client for authenticated operations with Clerk integration
export function createServerSupabaseClient() {
  return createClient<Database>(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken()
      },
    }
  )
}

// Helper functions for server-side operations
export const getUserByClerkId = async (clerkUserId: string) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single()

  return { data, error }
}

export const createUser = async (userData: {
  clerk_user_id: string
  email: string
  full_name?: string
  phone_number?: string
  profile_image_url?: string
}) => {
  // First check if user already exists
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('clerk_user_id', userData.clerk_user_id)
    .single()

  if (existingUser) {
    return {
      data: existingUser,
      error: { message: 'User already exists', code: 'USER_EXISTS' }
    }
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      ...userData,
      kyc_status: 'not_started',
      kyc_current_step: 1,
      kyc_completion_percentage: 0.00,
      kyc_last_updated: new Date().toISOString()
    })
    .select()
    .single()

  return { data, error }
}

export const createUserWallets = async (userId: string) => {
  const wallets = [
    { user_id: userId, currency: 'AOA', available_balance: 0, reserved_balance: 0 },
    { user_id: userId, currency: 'EUR', available_balance: 0, reserved_balance: 0 }
  ]

  const { data, error } = await supabaseAdmin
    .from('wallets')
    .insert(wallets)
    .select()

  return { data, error }
}

export const updateUserBalance = async (
  userId: string,
  currency: string,
  amount: number,
  type: 'add' | 'subtract' = 'add'
) => {
  const { data: wallet, error: fetchError } = await supabaseAdmin
    .from('wallets')
    .select('available_balance, reserved_balance')
    .eq('user_id', userId)
    .eq('currency', currency)
    .single()

  if (fetchError || !wallet) {
    return { data: null, error: fetchError || new Error('Wallet not found') }
  }

  const newAvailableBalance = type === 'add'
    ? wallet.available_balance + amount
    : wallet.available_balance - amount

  const { data, error } = await supabaseAdmin
    .from('wallets')
    .update({
      available_balance: newAvailableBalance,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('currency', currency)
    .select()
    .single()

  return { data, error }
}

export const createTransaction = async (transactionData: {
  user_id: string
  type: string
  amount: number
  currency: string
  fee_amount: number
  net_amount: number
  status?: string
  exchange_rate?: number
  recipient_info?: any
  metadata?: any
  reference_id?: string
}) => {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      ...transactionData,
      status: transactionData.status || 'pending'
    })
    .select()
    .single()
  
  return { data, error }
}

export const updateTransactionStatus = async (
  transactionId: string,
  status: string,
  metadata?: any
) => {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .update({
      status,
      metadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', transactionId)
    .select()
    .single()

  return { data, error }
}

// KYC Status Management Functions
export const getUserKYCStatus = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('kyc_status, kyc_current_step, kyc_completion_percentage, kyc_last_updated')
    .eq('id', userId)
    .single()

  return { data, error }
}

export const updateKYCStatus = async (
  userId: string,
  status: string,
  currentStep?: number,
  completionPercentage?: number
) => {
  const updateData: any = {
    kyc_status: status,
    kyc_last_updated: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (currentStep !== undefined) {
    updateData.kyc_current_step = currentStep
  }

  if (completionPercentage !== undefined) {
    updateData.kyc_completion_percentage = completionPercentage
  } else {
    // Auto-calculate percentage based on status and step
    if (status === 'approved') {
      updateData.kyc_completion_percentage = 100.00
    } else if (status === 'not_started') {
      updateData.kyc_completion_percentage = 0.00
    } else if (currentStep) {
      updateData.kyc_completion_percentage = (currentStep / 16) * 100
    }
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

// User Limits Management Functions
export const getUserLimits = async (userId: string, currency: string = 'EUR') => {
  const { data, error } = await supabaseAdmin
    .rpc('get_user_limits', {
      user_uuid: userId,
      currency_code: currency
    })
    .single()

  return { data, error }
}

export const checkTransactionLimits = async (
  userId: string,
  amount: number,
  currency: string = 'EUR'
) => {
  const { data, error } = await supabaseAdmin
    .rpc('check_transaction_limits', {
      user_uuid: userId,
      amount: amount,
      currency_code: currency
    })
    .single()

  return { data, error }
}

export const updateUserLimitsUsage = async (
  userId: string,
  amount: number,
  currency: string = 'EUR'
) => {
  const { data, error } = await supabaseAdmin
    .from('user_limits')
    .update({
      daily_used: supabaseAdmin.raw('daily_used + ?', [amount]),
      monthly_used: supabaseAdmin.raw('monthly_used + ?', [amount]),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('currency', currency)
    .select()
    .single()

  return { data, error }
}

// ===== ORDER BOOK DATABASE FUNCTIONS =====
// Re-export typed database functions for easy access

export const OrderBookFunctions = {
  // Essential Order Management
  placeOrder: DatabaseFunctions.placeOrder,
  cancelOrder: DatabaseFunctions.cancelOrder,

  // Essential Market Data
  getBestPrices: DatabaseFunctions.getBestPrices,
  getOrderBookDepth: DatabaseFunctions.getOrderBookDepth,
  getRecentTrades: DatabaseFunctions.getRecentTrades,

  // Essential Fund Management
  createFundReservation: DatabaseFunctions.createFundReservation,
  releaseFundReservation: DatabaseFunctions.releaseFundReservation,

  // Essential Trade Execution
  executeTrade: DatabaseFunctions.executeTrade,

  // Essential Wallet Functions
  getUserWalletBalances: DatabaseFunctions.getUserWalletBalances,
  getWalletBalance: DatabaseFunctions.getWalletBalance,
  upsertWallet: DatabaseFunctions.upsertWallet,

  // Essential Utility Functions
  validateOrderOwnership: DatabaseFunctions.validateOrderOwnership,
  getOrderBookSummary: DatabaseFunctions.getOrderBookSummary,
  checkDatabaseHealth: DatabaseFunctions.checkDatabaseHealth
}

// Legacy compatibility - re-export essential functions only
export const {
  placeOrder,
  cancelOrder,
  getBestPrices,
  getOrderBookDepth,
  getRecentTrades,
  createFundReservation,
  releaseFundReservation,
  executeTrade,
  getUserWalletBalances,
  getWalletBalance,
  upsertWallet,
  validateOrderOwnership,
  getOrderBookSummary,
  checkDatabaseHealth
} = DatabaseFunctions
