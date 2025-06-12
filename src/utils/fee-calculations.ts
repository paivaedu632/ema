'use client'

// EmaPay Fee Calculation Utilities
// Centralized fee calculation logic for all transaction types

import { CurrencyUtils, NumberUtils } from './formatting-utils'

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
  if (!CurrencyUtils.isValid(amount)) return "0"

  const inputAmount = CurrencyUtils.parse(amount.toString())
  if (inputAmount <= 0) return "0"

  const feeAmount = inputAmount * EMAPAY_FEE_PERCENTAGE
  return `${CurrencyUtils.formatAmount(feeAmount)} ${currency} (${NumberUtils.formatPercentage(EMAPAY_FEE_PERCENTAGE * 100)})`
}

/**
 * Calculate detailed fee breakdown for buy/sell transactions
 */
export function calculateTransactionFees(
  amount: string | number,
  currency: string
): FeeCalculationResult {
  if (!CurrencyUtils.isValid(amount)) {
    return {
      feeAmount: 0,
      netAmount: 0,
      totalAmount: 0,
      feeFormatted: CurrencyUtils.format(0, currency),
      netFormatted: CurrencyUtils.format(0, currency),
      totalFormatted: CurrencyUtils.format(0, currency),
      currency
    }
  }

  const inputAmount = CurrencyUtils.parse(amount.toString())
  if (inputAmount <= 0) {
    return {
      feeAmount: 0,
      netAmount: 0,
      totalAmount: 0,
      feeFormatted: CurrencyUtils.format(0, currency),
      netFormatted: CurrencyUtils.format(0, currency),
      totalFormatted: CurrencyUtils.format(0, currency),
      currency
    }
  }

  const feeAmount = inputAmount * EMAPAY_FEE_PERCENTAGE
  const netAmount = inputAmount - feeAmount

  return {
    feeAmount,
    netAmount,
    totalAmount: inputAmount,
    feeFormatted: CurrencyUtils.format(feeAmount, currency),
    netFormatted: CurrencyUtils.format(netAmount, currency),
    totalFormatted: CurrencyUtils.format(inputAmount, currency),
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
 * @deprecated Use CurrencyUtils.isValid instead
 */
export function isValidTransactionAmount(amount: string | number): boolean {
  return CurrencyUtils.isValid(amount)
}

/**
 * Format currency amount with proper decimals
 * @deprecated Use CurrencyUtils.format instead
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  return CurrencyUtils.format(amount, currency)
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
    formattedResult: CurrencyUtils.format(convertedAmount, toCurrency)
  }
}
