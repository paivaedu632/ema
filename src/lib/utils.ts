import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency values with proper locale and currency symbol
 */
export function formatCurrency(amount: number, currency: 'EUR' | 'AOA'): string {
  const locale = currency === 'EUR' ? 'pt-PT' : 'pt-AO'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'AOA' ? 0 : 2,
      maximumFractionDigits: currency === 'AOA' ? 0 : 2
    }).format(amount)
  } catch (error) {
    // Fallback formatting
    const symbol = currency === 'EUR' ? '€' : 'AOA'
    const decimals = currency === 'AOA' ? 0 : 2
    return `${amount.toFixed(decimals)} ${symbol}`
  }
}

/**
 * Format numbers with proper locale formatting
 */
export function formatNumber(value: number, decimals?: number): string {
  try {
    return new Intl.NumberFormat('pt-PT', {
      minimumFractionDigits: decimals ?? (value % 1 === 0 ? 0 : 2),
      maximumFractionDigits: decimals ?? (value % 1 === 0 ? 0 : 2)
    }).format(value)
  } catch (error) {
    return value.toFixed(decimals ?? 2)
  }
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
