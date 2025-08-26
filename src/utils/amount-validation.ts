/**
 * Amount validation utilities for EmaPay transactions
 * Provides validation rules and error messages for different transaction types
 */

export type TransactionType = 'buy' | 'sell' | 'send' | 'exchange' | 'deposit'
export type Currency = 'AOA' | 'EUR'

export interface ValidationRule {
  min?: number
  max?: number
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errorMessage?: string
}

/**
 * Validation rules for different transaction types and currencies
 */
const VALIDATION_RULES: Record<TransactionType, Record<Currency, ValidationRule[]>> = {
  buy: {
    AOA: [
      { min: 10000, message: "Valor mínimo: 10,000 AOA" }
    ],
    EUR: [
      { min: 10, message: "Valor mínimo: 10 EUR" },
      { max: 50000, message: "Valor máximo: 50,000 EUR" }
    ]
  },
  sell: {
    AOA: [
      { min: 10000, message: "Valor mínimo: 10,000 AOA" }
    ],
    EUR: [
      { min: 10, message: "Valor mínimo: 10 EUR" },
      { max: 100000, message: "Valor máximo: 100,000 EUR" }
    ]
  },
  send: {
    AOA: [
      { min: 1, message: "Mínimo: acima de 0 AOA" },
      { max: 1000000, message: "Valor máximo: 1,000,000 AOA" }
    ],
    EUR: [
      { min: 0.01, message: "Mínimo: acima de 0 EUR" },
      { max: 10000, message: "Valor máximo: 10,000 EUR" }
    ]
  },
  exchange: {
    AOA: [
      { min: 0.01, message: "Mínimo: acima de 0 AOA" }
    ],
    EUR: [
      { min: 0.01, message: "Mínimo: acima de 0 EUR" }
    ]
  },
  deposit: {
    AOA: [
      { min: 0.01, message: "Mínimo: acima de 0 AOA" }
    ],
    EUR: [
      { min: 0.01, message: "Mínimo: acima de 0 EUR" }
    ]
  }
}

/**
 * Validates an amount for a specific transaction type and currency
 */
export function validateAmount(
  amount: string | number,
  currency: Currency,
  transactionType: TransactionType
): ValidationResult {
  // Convert to number
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Check if it's a valid number
  if (isNaN(numericAmount) || numericAmount < 0) {
    return {
      isValid: false,
      errorMessage: "Por favor, insira um valor válido"
    }
  }

  // Get validation rules for this transaction type and currency
  const rules = VALIDATION_RULES[transactionType]?.[currency] || []
  
  // Check each rule
  for (const rule of rules) {
    if (rule.min !== undefined && numericAmount < rule.min) {
      return {
        isValid: false,
        errorMessage: rule.message
      }
    }
    
    if (rule.max !== undefined && numericAmount > rule.max) {
      return {
        isValid: false,
        errorMessage: rule.message
      }
    }
  }

  return { isValid: true }
}

import { formatAmountForInput, type Currency as FormatCurrency } from '@/lib/format'

/**
 * DEPRECATED: Use formatAmountForInput() from @/lib/format instead
 * @deprecated This function is deprecated. Use formatAmountForInput() from @/lib/format
 */
export function formatAmountForDisplay(amount: number, currency: Currency): string {
  console.warn('formatAmountForDisplay is deprecated. Use formatAmountForInput from @/lib/format')
  return formatAmountForInput(amount, currency as FormatCurrency)
}

/**
 * Gets the minimum amount for a transaction type and currency
 */
export function getMinimumAmount(currency: Currency, transactionType: TransactionType): number | undefined {
  const rules = VALIDATION_RULES[transactionType]?.[currency] || []
  const minRule = rules.find(rule => rule.min !== undefined)
  return minRule?.min
}

/**
 * Gets the maximum amount for a transaction type and currency
 */
export function getMaximumAmount(currency: Currency, transactionType: TransactionType): number | undefined {
  const rules = VALIDATION_RULES[transactionType]?.[currency] || []
  const maxRule = rules.find(rule => rule.max !== undefined)
  return maxRule?.max
}
