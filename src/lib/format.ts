/**
 * Portuguese Locale Number Formatting Utilities for EmaPay
 * 
 * This module provides consistent Portuguese locale formatting for all numeric displays
 * across the EmaPay application, supporting both AOA and EUR currencies.
 */

export type Currency = 'AOA' | 'EUR'

/**
 * Format a number with Portuguese locale based on currency
 * @param amount - The numeric amount to format
 * @param currency - The currency type (AOA or EUR)
 * @param options - Additional formatting options
 * @returns Formatted string with Portuguese locale
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

  let formattedAmount: string

  if (currency === 'AOA') {
    // Use pt-AO locale for AOA (Angolan Kwanza)
    formattedAmount = numericAmount.toLocaleString('pt-AO', {
      minimumFractionDigits,
      maximumFractionDigits
    })
  } else {
    // Use pt-PT locale for EUR (Euro)
    formattedAmount = numericAmount.toLocaleString('pt-PT', {
      minimumFractionDigits,
      maximumFractionDigits
    })
  }

  return showCurrency ? `${formattedAmount} ${currency}` : formattedAmount
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
 * @param formattedAmount - Portuguese formatted string (e.g., "1 250,50" or "125 000,75")
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

  // Handle Portuguese number format:
  // - Space as thousands separator: "125 000,75" -> "125000,75"
  // - Comma as decimal separator: "125000,75" -> "125000.75"
  cleanAmount = cleanAmount
    .replace(/\s/g, '') // Remove spaces (thousands separator)
    .replace(',', '.') // Replace comma with dot (decimal separator)

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
 * Format percentage with Portuguese locale
 * @param percentage - Percentage value (e.g., 0.025 for 2.5%)
 * @returns Formatted percentage string
 */
export function formatPercentage(percentage: number | string): string {
  const numericPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage
  
  if (isNaN(numericPercentage)) {
    return '0,00%'
  }

  // Convert to percentage and format with Portuguese locale
  const percentValue = numericPercentage * 100
  return `${percentValue.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`
}

/**
 * Validate if a string is a valid Portuguese formatted number
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

  // Check if it matches Portuguese number format
  // Allows: "1250,50", "1 250,50", "125 000,75", etc.
  const portugueseNumberRegex = /^[\d\s]*,?\d{0,2}$/
  
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
