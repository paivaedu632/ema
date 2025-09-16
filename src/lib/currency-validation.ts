import { Currency } from '@/types'

export interface ValidationResult {
  isValid: boolean
  error?: string
  formattedValue?: string
}

export interface CurrencyLimits {
  min: number
  max: number
}

/**
 * Parse Portuguese formatted number string to numeric value
 * Handles formats like "1.250,50" or "1250,50" or "1250.50"
 */
export function parsePortugueseNumber(value: string): number {
  if (!value || value.trim() === '') return 0
  
  // Remove any non-numeric characters except comma and period
  let cleaned = value.replace(/[^\d,.]/g, '')
  
  // Handle Portuguese format: thousands separator (.) and decimal separator (,)
  // If there's a comma, treat everything after the last comma as decimals
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',')
    if (parts.length === 2) {
      // Remove periods from the integer part (thousands separators)
      const integerPart = parts[0].replace(/\./g, '')
      const decimalPart = parts[1].slice(0, 2) // Max 2 decimal places
      cleaned = `${integerPart}.${decimalPart}`
    }
  } else {
    // No comma, remove periods (treat as thousands separators)
    cleaned = cleaned.replace(/\./g, '')
  }
  
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format number for Portuguese input display
 * Converts 1250.50 to "1.250,50"
 */
export function formatPortugueseInput(value: number): string {
  if (isNaN(value) || value === 0) return ''
  
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value).replace(/\s/g, '.')
}

/**
 * Validate input characters - only allow numbers, comma, and period
 */
export function isValidInputCharacter(char: string): boolean {
  return /[0-9,.]/.test(char)
}

/**
 * Clean input string to only allow valid characters
 */
export function cleanInputString(value: string): string {
  return value.replace(/[^0-9,.]/g, '')
}

/**
 * Calculate currency limits based on current exchange rate
 */
export function calculateCurrencyLimits(
  currency: Currency,
  exchangeRate: number
): CurrencyLimits {
  const EUR_MIN = 10.00
  const EUR_MAX = 1000000.00
  
  if (currency === 'EUR') {
    return {
      min: EUR_MIN,
      max: EUR_MAX
    }
  } else {
    // AOA limits based on EUR equivalent
    return {
      min: EUR_MIN * exchangeRate,
      max: EUR_MAX * exchangeRate
    }
  }
}

/**
 * Validate amount against currency limits
 */
export function validateAmount(
  amount: number,
  currency: Currency,
  exchangeRate: number
): ValidationResult {
  if (amount === 0) {
    return { isValid: true }
  }
  
  const limits = calculateCurrencyLimits(currency, exchangeRate)
  
  if (amount < limits.min) {
    return {
      isValid: false,
      error: `Mínimo: ${formatPortugueseInput(limits.min)} ${currency}`
    }
  }
  
  if (amount > limits.max) {
    return {
      isValid: false,
      error: `Máximo: ${formatPortugueseInput(limits.max)} ${currency}`
    }
  }
  
  return { isValid: true }
}

/**
 * Process input change with validation and formatting
 */
export function processInputChange(
  newValue: string,
  currency: Currency,
  exchangeRate: number
): {
  numericValue: number
  formattedValue: string
  validation: ValidationResult
} {
  // Clean the input
  const cleaned = cleanInputString(newValue)
  
  // Parse to numeric value
  const numericValue = parsePortugueseNumber(cleaned)
  
  // Format for display
  const formattedValue = formatPortugueseInput(numericValue)
  
  // Validate
  const validation = validateAmount(numericValue, currency, exchangeRate)
  
  return {
    numericValue,
    formattedValue,
    validation
  }
}

/**
 * Handle input field changes with real-time formatting and validation
 */
export function handleCurrencyInput(
  event: React.ChangeEvent<HTMLInputElement>,
  currency: Currency,
  exchangeRate: number,
  onValueChange: (numericValue: number, formattedValue: string, validation: ValidationResult) => void
) {
  const inputValue = event.target.value
  
  // Allow empty input
  if (inputValue === '') {
    onValueChange(0, '', { isValid: true })
    return
  }
  
  // Process the input
  const result = processInputChange(inputValue, currency, exchangeRate)
  
  // Call the callback with results
  onValueChange(result.numericValue, result.formattedValue, result.validation)
}
