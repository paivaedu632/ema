import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date/time formatting functions are in @/lib/format - use those instead

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ===== AMOUNT VALIDATION UTILITIES =====

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
 * Validate amount for a specific transaction type and currency
 */
export function validateAmount(
  amount: number,
  transactionType: TransactionType,
  currency: Currency
): ValidationResult {
  // Simple validation rules
  const minAmounts = {
    buy: { AOA: 10000, EUR: 10 },
    sell: { AOA: 10000, EUR: 10 },
    send: { AOA: 1000, EUR: 1 },
    exchange: { AOA: 10000, EUR: 10 },
    deposit: { AOA: 5000, EUR: 5 }
  }

  const maxAmounts = {
    buy: { AOA: Infinity, EUR: 50000 },
    sell: { AOA: Infinity, EUR: 50000 },
    send: { AOA: 1000000, EUR: 10000 },
    exchange: { AOA: Infinity, EUR: Infinity },
    deposit: { AOA: Infinity, EUR: Infinity }
  }

  const min = minAmounts[transactionType]?.[currency] || 0
  const max = maxAmounts[transactionType]?.[currency] || Infinity

  if (amount < min) {
    return {
      isValid: false,
      errorMessage: `Valor mínimo: ${min.toLocaleString()} ${currency}`
    }
  }

  if (amount > max) {
    return {
      isValid: false,
      errorMessage: `Valor máximo: ${max.toLocaleString()} ${currency}`
    }
  }

  return { isValid: true }
}

// ===== DATE FORMATTING UTILITIES =====

/**
 * Format date input with DD/MM/AAAA pattern
 */
export function formatDateInput(value: string): string {
  const numbers = value.replace(/\D/g, '')

  if (numbers.length <= 2) {
    return numbers
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
  }
}

/**
 * Validate date format DD/MM/AAAA
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
  if (!dateRegex.test(date)) return false

  const [day, month, year] = date.split('/').map(Number)
  const dateObj = new Date(year, month - 1, day)

  return dateObj.getDate() === day &&
         dateObj.getMonth() === month - 1 &&
         dateObj.getFullYear() === year
}

/**
 * Format currency amount with proper Portuguese locale formatting using currency codes
 * Ensures thousands separators for ALL numbers ≥ 1,000
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const locale = currency === 'EUR' ? 'pt-PT' : currency === 'AOA' ? 'pt-AO' : 'pt-PT'

  // Format the number with Portuguese locale, explicitly using grouping
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true, // Explicitly enable thousands separators
  }).format(amount)

  // Replace space thousands separator with dot for Portuguese standard
  // Handle both space and non-breaking space characters
  const portugueseFormatted = formattedNumber.replace(/[\s\u00A0]/g, '.')

  // Return with currency code instead of symbol
  return `${portugueseFormatted} ${currency}`
}

/**
 * Format number with Portuguese locale formatting (no currency symbol)
 */
export function formatNumber(amount: number, minimumFractionDigits: number = 2): string {
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(amount)
}

/**
 * Format amount for input fields (without currency symbol) - Unified approach
 * Replaces the complex formatAmountForInput from format.ts
 */
export function formatAmountForInput(amount: number | string, currency: Currency): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numericAmount)) return '0,00'

  const locale = currency === 'EUR' ? 'pt-PT' : currency === 'AOA' ? 'pt-AO' : 'pt-PT'

  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true, // Explicitly enable thousands separators
  }).format(numericAmount)

  // Replace space thousands separator with dot for Portuguese standard
  // Handle both space and non-breaking space characters
  return formattedNumber.replace(/[\s\u00A0]/g, '.')
}

/**
 * Format amount with currency (replaces formatAmountWithCurrency from format.ts)
 */
export function formatAmountWithCurrency(amount: number | string, currency: Currency): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numericAmount)) return `0,00 ${currency}`

  return formatCurrency(numericAmount, currency)
}

/**
 * Format amount without currency code (for use when currency is already displayed elsewhere)
 */
export function formatAmountOnly(amount: number, currency: Currency): string {
  const locale = currency === 'EUR' ? 'pt-PT' : currency === 'AOA' ? 'pt-AO' : 'pt-PT'

  // Format the number with Portuguese locale, explicitly using grouping
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true, // Explicitly enable thousands separators
  }).format(amount)

  // Replace space thousands separator with dot for Portuguese standard
  // Handle both space and non-breaking space characters
  return formattedNumber.replace(/[\s\u00A0]/g, '.')
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.startsWith('244')) {
    // Angola format: +244 XXX XXX XXX
    return `+244 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
  } else if (cleaned.startsWith('351')) {
    // Portugal format: +351 XXX XXX XXX
    return `+351 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
  }

  return phone
}

// ===== MISSING EXPORTS FOR BACKWARD COMPATIBILITY =====

// DateUtils object for backward compatibility
export const DateUtils = {
  formatDateInput,
  isValidDateFormat,
  formatCurrency,
  formatPhoneNumber
}

// Transaction limits for backward compatibility
export const TRANSACTION_LIMITS = {
  buy: { AOA: { min: 10000, max: Infinity }, EUR: { min: 10, max: 50000 } },
  sell: { AOA: { min: 10000, max: Infinity }, EUR: { min: 10, max: 50000 } },
  send: { AOA: { min: 1000, max: 1000000 }, EUR: { min: 1, max: 10000 } },
  exchange: { AOA: { min: 10000, max: Infinity }, EUR: { min: 10, max: Infinity } },
  deposit: { AOA: { min: 5000, max: Infinity }, EUR: { min: 5, max: Infinity } }
}

// Validation messages for forms
export const VALIDATION_MESSAGES = {
  AMOUNT: {
    REQUIRED: 'Este campo é obrigatório',
    INVALID: 'Valor inválido',
    MIN: (min: number, currency: Currency) => `Valor mínimo: ${formatCurrency(min, currency)}`,
    MAX: (max: number, currency: Currency) => `Valor máximo: ${formatCurrency(max, currency)}`,
    INSUFFICIENT_BALANCE: 'Saldo insuficiente'
  },
  REQUIRED: 'Este campo é obrigatório',
  INVALID_EMAIL: 'Email inválido',
  INVALID_PHONE: 'Número de telefone inválido',
  INVALID_DATE: 'Data inválida',
  AMOUNT_TOO_LOW: 'Valor muito baixo',
  AMOUNT_TOO_HIGH: 'Valor muito alto',
  INSUFFICIENT_BALANCE: 'Saldo insuficiente',
  INVALID_CURRENCY: 'Moeda inválida'
}
