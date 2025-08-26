/**
 * Transaction API utilities for fetching and managing transaction data
 * Supports the new dual transaction recording and Wise-style transaction IDs
 */

import { supabase } from '@/lib/supabase'
import { formatAmountWithCurrency, formatExchangeRate, type Currency } from '@/lib/format'

export interface TransactionData {
  id: string
  display_id: string
  user_id: string
  type: 'buy' | 'sell' | 'send' | 'receive' | 'deposit' | 'withdraw'
  amount: number
  currency: 'AOA' | 'EUR'
  fee_amount: number
  net_amount: number
  exchange_rate?: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  reference_id?: string
  recipient_info?: any
  metadata?: any
  created_at: string
  updated_at: string
  linked_transaction_id?: string
  exchange_id?: string
  counterparty_user_id?: string
}

export interface EnhancedTransactionData extends TransactionData {
  linked_transaction?: TransactionData
  counterparty_user?: {
    id: string
    full_name?: string
    email: string
  }
}

/**
 * Fetch transaction by display ID (EP-2025-XXXXXX format) or UUID
 * Uses API endpoint to respect RLS policies and ensure user can only access their own transactions
 */
export async function getTransactionById(id: string): Promise<EnhancedTransactionData | null> {
  try {
    const response = await fetch(`/api/transactions/${encodeURIComponent(id)}`)

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Transaction not found or access denied:', id)
        return null
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success) {
      console.error('API error fetching transaction:', result.error)
      return null
    }

    return result.data as EnhancedTransactionData
  } catch (error) {
    console.error('Error in getTransactionById:', error)
    return null
  }
}

/**
 * Get user's transactions with pagination
 */
export async function getUserTransactions(
  userId: string, 
  limit: number = 20, 
  offset: number = 0
): Promise<TransactionData[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching user transactions:', error)
      return []
    }

    return data as TransactionData[]
  } catch (error) {
    console.error('Error in getUserTransactions:', error)
    return []
  }
}

/**
 * Get exchange transactions (both buyer and seller records for a specific exchange)
 */
export async function getExchangeTransactions(exchangeId: string): Promise<TransactionData[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching exchange transactions:', error)
      return []
    }

    return data as TransactionData[]
  } catch (error) {
    console.error('Error in getExchangeTransactions:', error)
    return []
  }
}

/**
 * Format transaction data for display
 */
export function formatTransactionForDisplay(transaction: EnhancedTransactionData) {
  const { type, amount, currency, fee_amount, net_amount, exchange_rate, metadata } = transaction
  
  // Base formatting using centralized system
  const formattedAmount = formatAmountWithCurrency(amount, currency as Currency)
  const formattedFee = formatAmountWithCurrency(fee_amount, currency as Currency)
  const formattedNetAmount = formatAmountWithCurrency(net_amount, currency as Currency)

  // Type-specific formatting
  switch (type) {
    case 'buy':
      const aoaReceived = metadata?.aoa_amount || 0
      const formattedAOA = formatAmountWithCurrency(aoaReceived, 'AOA')

      return {
        title: 'Compra de moeda',
        sentAmount: formattedAmount,
        receivedAmount: formattedAOA,
        fee: formattedFee,
        exchangeRate: exchange_rate ? formatExchangeRate(exchange_rate, 'EUR', 'AOA') : null,
        description: 'Compra de AOA com EUR'
      }

    case 'sell':
      const eurReceived = metadata?.eur_amount || 0
      const formattedEUR = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
      }).format(eurReceived)
      
      return {
        title: 'Venda de moeda',
        sentAmount: formattedAmount,
        receivedAmount: formattedEUR,
        fee: formattedFee,
        exchangeRate: exchange_rate ? `1 EUR = ${exchange_rate.toFixed(4)} AOA` : null,
        description: 'Venda de AOA por EUR'
      }

    case 'send':
      return {
        title: 'Transferência enviada',
        sentAmount: formattedAmount,
        receivedAmount: formattedNetAmount,
        fee: formattedFee,
        recipient: transaction.recipient_info,
        description: `Enviado para ${transaction.recipient_info?.name || 'destinatário'}`
      }

    case 'receive':
      return {
        title: 'Transferência recebida',
        receivedAmount: formattedAmount,
        sender: transaction.recipient_info,
        description: `Recebido de ${transaction.recipient_info?.name || 'remetente'}`
      }

    case 'deposit':
      return {
        title: 'Depósito',
        receivedAmount: formattedAmount,
        fee: formattedFee,
        description: 'Depósito na conta'
      }

    case 'withdraw':
      return {
        title: 'Saque',
        sentAmount: formattedAmount,
        fee: formattedFee,
        description: 'Saque da conta'
      }

    default:
      return {
        title: 'Transação',
        amount: formattedAmount,
        description: 'Transação'
      }
  }
}

/**
 * Get transaction status display info
 */
export function getTransactionStatusInfo(status: string) {
  switch (status) {
    case 'completed':
      return { label: 'Concluída', color: 'text-green-600', bgColor: 'bg-green-50' }
    case 'pending':
      return { label: 'Pendente', color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
    case 'processing':
      return { label: 'Processando', color: 'text-blue-600', bgColor: 'bg-blue-50' }
    case 'failed':
      return { label: 'Falhou', color: 'text-red-600', bgColor: 'bg-red-50' }
    case 'cancelled':
      return { label: 'Cancelada', color: 'text-gray-600', bgColor: 'bg-gray-50' }
    default:
      return { label: status, color: 'text-gray-600', bgColor: 'bg-gray-50' }
  }
}
