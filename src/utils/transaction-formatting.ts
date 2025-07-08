/**
 * Unified transaction formatting utilities for consistent display across EmaPay
 * Provides standardized formatting for transaction descriptions, amounts, and dates
 */

export type Currency = 'AOA' | 'EUR'

export interface TransactionData {
  id: string
  display_id?: string // New Wise-style transaction ID
  type: string
  amount: number
  currency: Currency
  status: string
  recipient_info?: any
  metadata?: any
  created_at: string
  fee_amount?: number
  net_amount?: number
  exchange_rate?: number
}

/**
 * Get standardized transaction description based on type and recipient info
 */
export function getTransactionDescription(transaction: TransactionData): string {
  const { type, recipient_info, metadata } = transaction

  switch (type) {
    case 'buy':
    case 'purchase':
      return 'Compra de moeda'
    
    case 'sell':
      return 'Venda de moeda'
    
    case 'send':
    case 'sent':
      if (recipient_info?.name) {
        return `Enviado para ${recipient_info.name}`
      }
      return 'Transferência enviada'
    
    case 'receive':
    case 'received':
      if (recipient_info?.name) {
        return `Recebido de ${recipient_info.name}`
      }
      return 'Transferência recebida'
    
    case 'deposit':
      return 'Depósito'
    
    case 'withdraw':
      return 'Saque'
    
    default:
      return metadata?.description || 'Transação'
  }
}

/**
 * Format transaction amount with proper sign and currency
 */
export function formatTransactionAmount(transaction: TransactionData): string {
  const { type, amount, currency } = transaction

  // Determine if amount should be positive or negative based on transaction type
  const isIncoming = ['receive', 'received', 'deposit', 'buy'].includes(type)
  const sign = isIncoming ? '+' : '-'

  // Format amount with currency using simple formatting
  const formattedAmount = `${Math.abs(amount).toFixed(2)} ${currency}`

  return `${sign} ${formattedAmount}`
}

/**
 * Format transaction date for display
 */
export function formatTransactionDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    // If less than 24 hours ago, show "Hoje"
    if (diffInHours < 24 && date.getDate() === now.getDate()) {
      return 'Hoje'
    }
    
    // If yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.getDate() === yesterday.getDate() && 
        date.getMonth() === yesterday.getMonth() && 
        date.getFullYear() === yesterday.getFullYear()) {
      return 'Ontem'
    }
    
    // If within current year, show day/month
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('pt-PT', { 
        day: '2-digit', 
        month: '2-digit' 
      })
    }
    
    // Otherwise show full date
    return date.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  } catch (error) {
    console.warn('Error formatting transaction date:', error)
    return 'Data inválida'
  }
}

/**
 * Transform raw API transaction data to component-ready format
 */
export function transformTransactionForDisplay(transaction: TransactionData) {
  return {
    id: transaction.id,
    displayId: transaction.display_id, // Include Wise-style transaction ID
    type: transaction.type,
    status: transaction.status,
    description: getTransactionDescription(transaction),
    amount: formatTransactionAmount(transaction),
    date: formatTransactionDate(transaction.created_at),
    rawData: transaction // Keep original data for detailed views
  }
}

/**
 * Transform multiple transactions for display
 */
export function transformTransactionsForDisplay(transactions: TransactionData[]) {
  return transactions.map(transformTransactionForDisplay)
}

/**
 * Get transaction type display name in Portuguese
 */
export function getTransactionTypeDisplayName(type: string): string {
  switch (type) {
    case 'buy':
    case 'purchase':
      return 'Compra'
    case 'sell':
      return 'Venda'
    case 'send':
    case 'sent':
      return 'Envio'
    case 'receive':
    case 'received':
      return 'Recebimento'
    case 'deposit':
      return 'Depósito'
    case 'withdraw':
      return 'Saque'
    default:
      return 'Transação'
  }
}

/**
 * Get transaction status display name in Portuguese
 */
export function getTransactionStatusDisplayName(status: string): string {
  switch (status) {
    case 'completed':
      return 'Concluída'
    case 'pending':
      return 'Pendente'
    case 'failed':
      return 'Falhou'
    case 'declined':
      return 'Recusada'
    case 'cancelled':
      return 'Cancelada'
    default:
      return status
  }
}
