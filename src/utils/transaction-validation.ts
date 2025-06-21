/**
 * Shared validation constants and utilities for EmaPay transactions
 * Ensures consistency between frontend and backend validation
 */

// Transaction limits by currency
export const TRANSACTION_LIMITS = {
  EUR: {
    min: 1,
    max: 10000
  },
  AOA: {
    min: 1000,
    max: 1000000000
  }
} as const

// Exchange rate validation constants
export const EXCHANGE_RATE_VALIDATION = {
  // Frontend validation margins (more lenient for UX)
  FRONTEND_MARGIN: 0.20, // 20% margin for frontend validation
  
  // Backend validation margins (stricter for security)
  MARKET_OFFERS_MARGIN: 0.20, // 20% margin for existing offers
  API_BASELINE_MARGIN: 0.50, // 50% margin for API baseline
  
  // Fallback rates for frontend validation (1 EUR = X AOA format)
  FALLBACK_RATES: {
    EUR_TO_AOA: 1100.00, // Updated to match BAI API format
    AOA_TO_EUR: 0.000909  // Inverse for compatibility (1/1100)
  }
} as const

// Portuguese error messages for consistency
export const VALIDATION_MESSAGES = {
  AMOUNT: {
    REQUIRED: "Digite um valor",
    INVALID: "Digite um valor válido",
    MIN: (min: number, currency: string) => `Valor mínimo: ${min.toLocaleString()} ${currency}`,
    MAX: (max: number, currency: string) => `Valor máximo: ${max.toLocaleString()} ${currency}`,
    INSUFFICIENT_BALANCE: "Seu saldo não é suficiente"
  },
  EXCHANGE_RATE: {
    REQUIRED: "Taxa de câmbio é obrigatória",
    INVALID: "Digite uma taxa válida",
    INVALID_POSITIVE: "Taxa de câmbio inválida. Deve ser um número positivo.",
    OUT_OF_RANGE: "Taxa de câmbio fora do intervalo aceitável",
    MIN: (min: number) => `Valor mínimo: ${min.toFixed(2)}`,
    MAX: (max: number) => `Valor máximo: ${max.toFixed(2)} AOA`
  },
  CURRENCY: {
    INVALID: "Moeda inválida. Deve ser EUR ou AOA"
  },
  GENERAL: {
    NETWORK_ERROR: "Erro ao processar. Tente novamente.",
    SERVER_ERROR: "Erro interno do servidor"
  }
} as const

// Currency type definition
export type Currency = 'EUR' | 'AOA'

/**
 * Get transaction limits for a specific currency
 */
export function getTransactionLimits(currency: Currency) {
  return TRANSACTION_LIMITS[currency]
}

/**
 * Validate amount against currency limits
 */
export function validateTransactionAmount(
  amount: number, 
  currency: Currency, 
  availableBalance?: number
): { isValid: boolean; error?: string } {
  const limits = getTransactionLimits(currency)
  
  if (amount <= 0) {
    return { isValid: false, error: VALIDATION_MESSAGES.AMOUNT.INVALID }
  }
  
  if (amount < limits.min) {
    return { isValid: false, error: VALIDATION_MESSAGES.AMOUNT.MIN(limits.min, currency) }
  }
  
  if (amount > limits.max) {
    return { isValid: false, error: VALIDATION_MESSAGES.AMOUNT.MAX(limits.max, currency) }
  }
  
  if (availableBalance !== undefined && amount > availableBalance) {
    return { isValid: false, error: VALIDATION_MESSAGES.AMOUNT.INSUFFICIENT_BALANCE }
  }
  
  return { isValid: true }
}

/**
 * Validate exchange rate format (basic validation)
 */
export function validateExchangeRateFormat(exchangeRate: number): { isValid: boolean; error?: string } {
  if (isNaN(exchangeRate) || exchangeRate <= 0) {
    return { isValid: false, error: VALIDATION_MESSAGES.EXCHANGE_RATE.INVALID }
  }
  
  return { isValid: true }
}

/**
 * Calculate exchange rate range for frontend validation
 */
export function calculateExchangeRateRange(
  baselineRate: number, 
  margin: number = EXCHANGE_RATE_VALIDATION.FRONTEND_MARGIN
): { min: number; max: number } {
  return {
    min: baselineRate * (1 - margin),
    max: baselineRate * (1 + margin)
  }
}

/**
 * Validate exchange rate against a baseline with margin
 */
export function validateExchangeRateRange(
  proposedRate: number,
  baselineRate: number,
  margin: number = EXCHANGE_RATE_VALIDATION.FRONTEND_MARGIN
): { isValid: boolean; error?: string; range?: { min: number; max: number } } {
  const range = calculateExchangeRateRange(baselineRate, margin)
  
  if (proposedRate < range.min) {
    return { 
      isValid: false, 
      error: VALIDATION_MESSAGES.EXCHANGE_RATE.MIN(range.min),
      range 
    }
  }
  
  if (proposedRate > range.max) {
    return { 
      isValid: false, 
      error: VALIDATION_MESSAGES.EXCHANGE_RATE.MAX(range.max),
      range 
    }
  }
  
  return { isValid: true, range }
}

/**
 * Format currency amount for display
 */
export function formatCurrencyAmount(amount: number, currency: Currency): string {
  if (currency === 'AOA') {
    return amount.toLocaleString('pt-AO')
  } else {
    return amount.toLocaleString('pt-PT', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
  }
}

/**
 * Convert exchange rate between different formats
 */
export function convertExchangeRate(
  rate: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) return rate
  
  // If converting from EUR->AOA to AOA->EUR or vice versa
  return 1 / rate
}
