/**
 * Portuguese Locale Number Formatting Utilities for EmaPay
 * 
 * This module provides consistent Portuguese locale formatting for all numeric displays
 * across the EmaPay application, supporting both AOA and EUR currencies.
 */

export type Currency = 'AOA' | 'EUR'

/**
 * Format a number with Portuguese locale based on currency
 * Uses dot (.) as thousands separator and comma (,) as decimal separator
 * @param amount - The numeric amount to format
 * @param currency - The currency type (AOA or EUR)
 * @param options - Additional formatting options
 * @returns Formatted string with Portuguese locale (dot thousands, comma decimal)
 */
export function formatCurrency(
  amount: number | string,
  currency: Currency,
  options: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    showCurrency?: boolean
  } = {}
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numericAmount)) {
    return '0,00'
  }

  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showCurrency = false
  } = options

  // Custom formatting for Portuguese locale with dot thousands separator
  // Format: 1.234.567,89 (dot as thousands, comma as decimal)
  const formattedAmount = formatPortugueseCurrency(numericAmount, minimumFractionDigits, maximumFractionDigits)

  return showCurrency ? `${formattedAmount} ${currency}` : formattedAmount
}

/**
 * Internal helper function to format currency with Portuguese conventions
 * @param amount - Numeric amount to format
 * @param minDecimals - Minimum decimal places
 * @param maxDecimals - Maximum decimal places
 * @returns Formatted string with dot thousands separator and comma decimal separator
 */
function formatPortugueseCurrency(amount: number, minDecimals: number = 2, maxDecimals: number = 2): string {
  // First format with standard locale to get proper decimal handling
  const standardFormatted = amount.toFixed(maxDecimals)

  // Split into integer and decimal parts
  const [integerPart, decimalPart] = standardFormatted.split('.')

  // Add dot thousands separators to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  // Ensure proper decimal places
  const paddedDecimal = decimalPart.padEnd(minDecimals, '0')

  // Combine with comma as decimal separator
  return `${formattedInteger},${paddedDecimal}`
}

/**
 * Format amount for display with currency symbol
 * @param amount - The numeric amount
 * @param currency - The currency type
 * @returns Formatted string with currency
 */
export function formatAmountWithCurrency(amount: number | string, currency: Currency): string {
  return formatCurrency(amount, currency, { showCurrency: true })
}

/**
 * Format amount for input fields (without currency symbol)
 * @param amount - The numeric amount
 * @param currency - The currency type
 * @returns Formatted string without currency
 */
export function formatAmountForInput(amount: number | string, currency: Currency): string {
  return formatCurrency(amount, currency, { showCurrency: false })
}

/**
 * Parse Portuguese formatted string back to number
 * Handles dot thousands separator and comma decimal separator
 * @param formattedAmount - Portuguese formatted string (e.g., "1.250,50" or "125.000,75")
 * @returns Numeric value
 */
export function parsePortugueseNumber(formattedAmount: string): number {
  if (!formattedAmount || typeof formattedAmount !== 'string') {
    return 0
  }

  // Remove currency symbols and extra spaces
  let cleanAmount = formattedAmount
    .replace(/AOA|EUR/g, '')
    .trim()

  // Handle Portuguese number format with dot thousands separator:
  // - Dot as thousands separator: "125.000,75" -> "125000,75"
  // - Comma as decimal separator: "125000,75" -> "125000.75"

  // Find the last comma (decimal separator)
  const lastCommaIndex = cleanAmount.lastIndexOf(',')

  if (lastCommaIndex !== -1) {
    // Split at the last comma
    const integerPart = cleanAmount.substring(0, lastCommaIndex)
    const decimalPart = cleanAmount.substring(lastCommaIndex + 1)

    // Remove dots from integer part (thousands separators)
    const cleanInteger = integerPart.replace(/\./g, '')

    // Reconstruct with dot as decimal separator
    cleanAmount = `${cleanInteger}.${decimalPart}`
  } else {
    // No decimal part, just remove dots (thousands separators)
    cleanAmount = cleanAmount.replace(/\./g, '')
  }

  const parsed = parseFloat(cleanAmount)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format exchange rate for display
 * @param rate - Exchange rate value
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @returns Formatted exchange rate string
 */
export function formatExchangeRate(
  rate: number | string, 
  fromCurrency: Currency, 
  toCurrency: Currency
): string {
  const numericRate = typeof rate === 'string' ? parseFloat(rate) : rate
  
  if (isNaN(numericRate)) {
    return `1 ${fromCurrency} = 0,00 ${toCurrency}`
  }

  const formattedRate = formatCurrency(numericRate, toCurrency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6 // Allow more precision for exchange rates
  })

  return `1 ${fromCurrency} = ${formattedRate} ${toCurrency}`
}

/**
 * Format percentage with Portuguese locale (dot thousands, comma decimal)
 * @param percentage - Percentage value (e.g., 0.025 for 2.5%)
 * @returns Formatted percentage string
 */
export function formatPercentage(percentage: number | string): string {
  const numericPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage

  if (isNaN(numericPercentage)) {
    return '0,00%'
  }

  // Convert to percentage and format with Portuguese conventions
  const percentValue = numericPercentage * 100
  const formattedPercent = formatPortugueseCurrency(percentValue, 2, 2)
  return `${formattedPercent}%`
}

/**
 * Validate if a string is a valid Portuguese formatted number
 * Handles dot thousands separator and comma decimal separator
 * @param value - String to validate
 * @returns Boolean indicating if valid
 */
export function isValidPortugueseNumber(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }

  // Remove currency symbols and spaces
  const cleanValue = value
    .replace(/AOA|EUR/g, '')
    .trim()

  // Check if it matches Portuguese number format with dot thousands separator
  // Allows: "1250,50", "1.250,50", "125.000,75", etc.
  // Pattern: optional digits, optional groups of (dot + 3 digits), optional comma + up to 2 digits
  const portugueseNumberRegex = /^\d{1,3}(?:\.\d{3})*(?:,\d{0,2})?$/

  return portugueseNumberRegex.test(cleanValue) && !isNaN(parsePortugueseNumber(value))
}

/**
 * Format number for API calls (always use dot as decimal separator)
 * @param amount - Amount to format for API
 * @returns String formatted for API consumption
 */
export function formatForAPI(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parsePortugueseNumber(amount) : amount
  return numericAmount.toFixed(2)
}

/**
 * Format compact numbers with K/M suffixes (Portuguese locale)
 * @param num - Number to format compactly
 * @returns Formatted compact number string
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    const millions = (num / 1000000).toLocaleString('pt-PT', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
    return `${millions}M`
  } else if (num >= 1000) {
    const thousands = (num / 1000).toLocaleString('pt-PT', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
    return `${thousands}K`
  }
  return formatCurrency(num, 'EUR', { showCurrency: false })
}

/**
 * Format date and time for Portuguese locale
 * @param dateString - Date string to format
 * @returns Formatted date and time string
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
 * @param dateString - Date string to format
 * @returns Formatted date string
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
 * @param dateString - Date string to format
 * @returns Formatted time string
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
 * DEPRECATED: Use formatAmountForInput() instead
 * @deprecated This function is deprecated. Use formatAmountForInput() from @/lib/format
 */
export function formatAmountForDisplay(amount: number, currency: Currency): string {
  console.warn('formatAmountForDisplay is deprecated. Use formatAmountForInput from @/lib/format')
  return formatAmountForInput(amount, currency)
}

/**
 * DEPRECATED: Use formatAmountWithCurrency() instead
 * @deprecated This function is deprecated. Use formatAmountWithCurrency() from @/lib/format
 */
export function formatCurrencyAmount(amount: number, currency: Currency): string {
  console.warn('formatCurrencyAmount is deprecated. Use formatAmountWithCurrency from @/lib/format')
  return formatAmountWithCurrency(amount, currency)
}
