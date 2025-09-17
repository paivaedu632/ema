import { Currency } from '@/types'

export interface ValidationResult {
  isValid: boolean
  error?: string
  formattedValue?: string
}

export interface PriorityValidationResult {
  isValid: boolean
  message?: string
  messageType?: 'error' | 'warning' | 'info'
  priority: number
}

export enum ValidationPriority {
  FORMAT_ERROR = 1,        // Invalid number format, decimal places
  REQUIRED_FIELD = 2,      // Empty input when required
  MIN_MAX_VIOLATION = 3,   // Minimum/maximum amount violations
  INSUFFICIENT_BALANCE = 4, // Balance warnings
  RECOMMENDATION = 5       // Recommendation messages
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

  // Sanitize input first
  const sanitized = sanitizeInput(value)

  // Remove any non-numeric characters except comma and period
  let cleaned = sanitized.replace(/[^\d,.]/g, '')

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
 * Sanitize input to prevent user confusion
 * - Remove leading zeros
 * - Handle multiple decimal separators
 * - Handle multiple thousand separators
 */
export function sanitizeInput(value: string): string {
  return value
    .replace(/^0+(?=\d)/, '') // Remove leading zeros (but keep single 0)
    .replace(/[,]{2,}/g, ',') // Multiple commas to single comma
    .replace(/[.]{2,}/g, '.') // Multiple periods to single period
}

/**
 * Validate decimal places for currency-specific precision
 * EUR: Maximum 2 decimal places (cents)
 * AOA: Maximum 0 decimal places (no fractional units)
 */
export function validateDecimalPlaces(value: string, currency: Currency): ValidationResult {
  const maxDecimals = currency === 'EUR' ? 2 : 0
  const decimalPart = value.split(',')[1]

  if (decimalPart && decimalPart.length > maxDecimals) {
    const currencyName = currency === 'EUR' ? 'euros' : 'kwanzas'
    const decimalName = currency === 'EUR' ? 'cêntimos' : ''

    if (maxDecimals === 0) {
      return {
        isValid: false,
        error: `${currency} não aceita casas decimais`
      }
    } else {
      return {
        isValid: false,
        error: `Máximo ${maxDecimals} ${decimalName} para ${currencyName}`
      }
    }
  }

  return { isValid: true }
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
 * Enhanced balance validation with standardized message
 */
export function validateBalance(
  amount: number,
  availableBalance: number,
  _currency: Currency
): ValidationResult {
  if (amount > availableBalance) {
    return {
      isValid: false,
      error: `Saldo insuficiente`
    }
  }

  return { isValid: true }
}

/**
 * Validate amount against currency limits
 */
export function validateAmount(
  amount: number,
  currency: Currency,
  exchangeRate: number,
  availableBalance?: number
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

  // Check balance if provided
  if (availableBalance !== undefined) {
    const balanceValidation = validateBalance(amount, availableBalance, currency)
    if (!balanceValidation.isValid) {
      return balanceValidation
    }
  }

  return { isValid: true }
}

/**
 * Get all validation results with priorities
 */
export function getAllValidationResults(
  value: string,
  currency: Currency,
  exchangeRate: number,
  availableBalance?: number,
  isRequired: boolean = false
): PriorityValidationResult[] {
  const results: PriorityValidationResult[] = []

  // Clean the input
  const cleaned = cleanInputString(value)

  // 1. Format/parsing errors (highest priority) - Skip these for standardized messages
  const decimalValidation = validateDecimalPlaces(cleaned, currency)
  if (!decimalValidation.isValid) {
    // Skip format errors - only show standardized messages
    return results
  }

  // Parse to numeric value
  const numericValue = parsePortugueseNumber(cleaned)

  // 2. Required field errors - Skip these for standardized messages
  if (isRequired && numericValue === 0) {
    // Skip required field errors - only show standardized messages
    return results
  }

  // For zero values, don't check other validations
  if (numericValue === 0) {
    return results
  }

  // 3. Min/max violations - Use standardized messages
  const limits = calculateCurrencyLimits(currency, exchangeRate)
  if (numericValue < limits.min) {
    results.push({
      isValid: false,
      message: `Mínimo: ${formatPortugueseInput(limits.min)} ${currency}`,
      messageType: 'error',
      priority: ValidationPriority.MIN_MAX_VIOLATION
    })
  }

  if (numericValue > limits.max) {
    results.push({
      isValid: false,
      message: `Máximo: ${formatPortugueseInput(limits.max)} ${currency}`,
      messageType: 'error',
      priority: ValidationPriority.MIN_MAX_VIOLATION
    })
  }

  // 4. Insufficient balance warnings - Use standardized message
  if (availableBalance !== undefined && numericValue > availableBalance) {
    results.push({
      isValid: false,
      message: `Saldo insuficiente`,
      messageType: 'warning',
      priority: ValidationPriority.INSUFFICIENT_BALANCE
    })
  }

  return results
}

/**
 * Get the highest priority validation message
 */
export function getPriorityValidationMessage(
  value: string,
  currency: Currency,
  exchangeRate: number,
  availableBalance?: number,
  isRequired: boolean = false
): PriorityValidationResult {
  const results = getAllValidationResults(value, currency, exchangeRate, availableBalance, isRequired)

  if (results.length === 0) {
    return {
      isValid: true,
      priority: 0
    }
  }

  // Return the highest priority (lowest number) validation result
  return results.reduce((highest, current) =>
    current.priority < highest.priority ? current : highest
  )
}

/**
 * Process input change with priority-based validation and formatting
 */
export function processInputChangeWithPriority(
  newValue: string,
  currency: Currency,
  exchangeRate: number,
  availableBalance?: number,
  isRequired: boolean = false
): {
  numericValue: number
  formattedValue: string
  validation: ValidationResult
  priorityValidation: PriorityValidationResult
} {
  // Clean the input
  const cleaned = cleanInputString(newValue)

  // Get priority validation
  const priorityValidation = getPriorityValidationMessage(cleaned, currency, exchangeRate, availableBalance, isRequired)

  // Parse to numeric value
  const numericValue = parsePortugueseNumber(cleaned)

  // Format for display (only if no format errors)
  let formattedValue = cleaned
  if (priorityValidation.priority !== ValidationPriority.FORMAT_ERROR) {
    formattedValue = formatPortugueseInput(numericValue)
  }

  // Create legacy validation result for backward compatibility
  const validation: ValidationResult = {
    isValid: priorityValidation.isValid,
    error: priorityValidation.message
  }

  return {
    numericValue,
    formattedValue,
    validation,
    priorityValidation
  }
}

/**
 * Process input change with validation and formatting (legacy function)
 */
export function processInputChange(
  newValue: string,
  currency: Currency,
  exchangeRate: number,
  availableBalance?: number
): {
  numericValue: number
  formattedValue: string
  validation: ValidationResult
} {
  const result = processInputChangeWithPriority(newValue, currency, exchangeRate, availableBalance)
  return {
    numericValue: result.numericValue,
    formattedValue: result.formattedValue,
    validation: result.validation
  }
}

/**
 * Generate recommendation message for manual exchange mode
 */
export function generateRecommendationMessage(
  fromAmount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRate: number
): PriorityValidationResult | null {
  if (fromAmount <= 0) return null

  const marketAmount = fromAmount * exchangeRate
  const lowerBound = marketAmount * 0.8  // 20% below market
  const upperBound = marketAmount * 1.2  // 20% above market

  return {
    isValid: true,
    message: `Recomendado: ${formatPortugueseInput(lowerBound)}-${formatPortugueseInput(upperBound)} ${toCurrency}`,
    messageType: 'info',
    priority: ValidationPriority.RECOMMENDATION
  }
}

/**
 * Get the most appropriate validation message including recommendations
 */
export function getValidationMessageWithRecommendations(
  value: string,
  currency: Currency,
  exchangeRate: number,
  availableBalance?: number,
  isRequired: boolean = false,
  showRecommendations: boolean = false,
  fromAmount?: number,
  fromCurrency?: Currency,
  toCurrency?: Currency
): PriorityValidationResult {
  // Get standard validation first
  const standardValidation = getPriorityValidationMessage(value, currency, exchangeRate, availableBalance, isRequired)

  // If there's an error or warning, return it (higher priority)
  if (!standardValidation.isValid) {
    return standardValidation
  }

  // If no errors and recommendations are enabled, show recommendation
  if (showRecommendations && fromAmount && fromCurrency && toCurrency) {
    const recommendation = generateRecommendationMessage(fromAmount, fromCurrency, toCurrency, exchangeRate)
    if (recommendation) {
      return recommendation
    }
  }

  return standardValidation
}

/**
 * Handle input field changes with real-time formatting and validation
 */
export function handleCurrencyInput(
  event: React.ChangeEvent<HTMLInputElement>,
  currency: Currency,
  exchangeRate: number,
  onValueChange: (numericValue: number, formattedValue: string, validation: ValidationResult) => void,
  availableBalance?: number
) {
  const inputValue = event.target.value

  // Allow empty input
  if (inputValue === '') {
    onValueChange(0, '', { isValid: true })
    return
  }

  // Process the input
  const result = processInputChange(inputValue, currency, exchangeRate, availableBalance)

  // Call the callback with results
  onValueChange(result.numericValue, result.formattedValue, result.validation)
}
