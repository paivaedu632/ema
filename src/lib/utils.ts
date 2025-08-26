import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * DEPRECATED: Use formatAmountWithCurrency() from @/lib/format instead
 * @deprecated This function is deprecated. Use formatAmountWithCurrency() from @/lib/format
 */
export function formatCurrency(amount: number, currency: 'EUR' | 'AOA'): string {
  console.warn('formatCurrency from utils is deprecated. Use formatAmountWithCurrency from @/lib/format')

  // Import the centralized function dynamically to avoid circular imports
  const { formatAmountWithCurrency } = require('@/lib/format')
  return formatAmountWithCurrency(amount, currency)
}

/**
 * DEPRECATED: Use formatAmountForInput() from @/lib/format instead
 * @deprecated This function is deprecated. Use formatAmountForInput() from @/lib/format
 */
export function formatNumber(value: number, decimals?: number): string {
  console.warn('formatNumber from utils is deprecated. Use formatAmountForInput from @/lib/format')

  // Import the centralized function dynamically to avoid circular imports
  const { formatAmountForInput } = require('@/lib/format')
  return formatAmountForInput(value, 'EUR') // Default to EUR for number formatting
}

/**
 * Format date and time for Portuguese locale
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  } catch (error) {
    return dateString
  }
}

/**
 * Format date only for Portuguese locale
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  } catch (error) {
    return dateString
  }
}

/**
 * Format time only for Portuguese locale
 */
export function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  } catch (error) {
    return dateString
  }
}

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
