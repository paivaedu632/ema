'use client'

// EmaPay Fee Calculation Utilities
// Centralized fee calculation logic for all transaction types

export const EMAPAY_FEE_PERCENTAGE = 0.02 // 2% fee as per user preference

export interface FeeCalculationResult {
  feeAmount: number
  netAmount: number
  totalAmount: number
  feeFormatted: string
  netFormatted: string
  totalFormatted: string
  currency: string
}

export interface TransactionSummary {
  total: string
  net: string
  fee: string
  currency: string
}

/**
 * Calculate fee amount for a given amount and currency
 */
export function calculateFeeAmount(amount: string | number, currency: string): string {
  if (!amount || amount === "0" || amount === "") return "0"
  
  const inputAmount = typeof amount === 'string' ? Number(amount) : amount
  if (isNaN(inputAmount) || inputAmount <= 0) return "0"
  
  const feeAmount = inputAmount * EMAPAY_FEE_PERCENTAGE
  return `${feeAmount.toFixed(2)} ${currency} (2%)`
}

/**
 * Calculate detailed fee breakdown for buy/sell transactions
 */
export function calculateTransactionFees(
  amount: string | number, 
  currency: string
): FeeCalculationResult {
  if (!amount || amount === "0" || amount === "") {
    return {
      feeAmount: 0,
      netAmount: 0,
      totalAmount: 0,
      feeFormatted: `0.00 ${currency}`,
      netFormatted: `0.00 ${currency}`,
      totalFormatted: `0.00 ${currency}`,
      currency
    }
  }

  const inputAmount = typeof amount === 'string' ? Number(amount) : amount
  if (isNaN(inputAmount) || inputAmount <= 0) {
    return {
      feeAmount: 0,
      netAmount: 0,
      totalAmount: 0,
      feeFormatted: `0.00 ${currency}`,
      netFormatted: `0.00 ${currency}`,
      totalFormatted: `0.00 ${currency}`,
      currency
    }
  }

  const feeAmount = inputAmount * EMAPAY_FEE_PERCENTAGE
  const netAmount = inputAmount - feeAmount
  
  return {
    feeAmount,
    netAmount,
    totalAmount: inputAmount,
    feeFormatted: `${feeAmount.toFixed(2)} ${currency}`,
    netFormatted: `${netAmount.toFixed(2)} ${currency}`,
    totalFormatted: `${inputAmount.toFixed(2)} ${currency}`,
    currency
  }
}

/**
 * Get transaction summary for display components
 * Used in buy/sell flows for "Você recebe" sections
 */
export function getTransactionSummary(
  amount: string | number, 
  currency: string
): TransactionSummary {
  const fees = calculateTransactionFees(amount, currency)
  
  return {
    total: fees.netFormatted,
    net: fees.netFormatted,
    fee: fees.feeFormatted,
    currency: fees.currency
  }
}

/**
 * Validate if amount is valid for transaction
 */
export function isValidTransactionAmount(amount: string | number): boolean {
  if (!amount || amount === "0" || amount === "") return false
  
  const numAmount = typeof amount === 'string' ? Number(amount) : amount
  return !isNaN(numAmount) && numAmount > 0
}

/**
 * Format currency amount with proper decimals
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`
}

/**
 * Calculate exchange rate conversion
 */
export function calculateExchangeConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): {
  convertedAmount: number
  formattedResult: string
} {
  const convertedAmount = amount * exchangeRate
  return {
    convertedAmount,
    formattedResult: formatCurrencyAmount(convertedAmount, toCurrency)
  }
}
